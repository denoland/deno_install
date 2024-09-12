import { system } from "./system.ts";

const {
  joinPaths,
  dirname,
} = system;

// import * as path from "@std/path";

const homeDir = system.getHomeDir();

function withContext(ctx: string, error?: unknown) {
  return new Error(ctx, { cause: error });
}

async function filterAsync<T>(
  arr: T[],
  pred: (v: T) => Promise<boolean>,
): Promise<T[]> {
  const filtered = await Promise.all(arr.map((v) => pred(v)));
  return arr.filter((_, i) => filtered[i]);
}

function withEnvVar<T>(name: string, f: (value: string | undefined) => T): T {
  const value = system.getEnv(name);
  return f(value);
}

function shellEnvContains(s: string): boolean {
  return withEnvVar("SHELL", (sh) => sh !== undefined && sh.includes(s));
}

class ShellScript {
  constructor(public name: string, public contents: string) {}

  equals(other: ShellScript): boolean {
    return this.name === other.name && this.contents === other.contents;
  }

  async write(denoInstallDir: string): Promise<boolean> {
    const envFilePath = joinPaths(denoInstallDir, this.name);
    try {
      await system.writeTextFile(envFilePath, this.contents);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        return false;
      }
      throw withContext(
        `Failed to write ${this.name} file to ${envFilePath}`,
        error,
      );
    }
  }
}

const shEnvScript = (installDir: string) =>
  new ShellScript(
    "env",
    `#!/bin/sh
# deno shell setup; adapted from rustup
# affix colons on either side of $PATH to simplify matching
case ":\${PATH}:" in
    *:"${installDir}/bin":*)
        ;;
    *)
        # Prepending path in case a system-installed rustc needs to be overridden
        export PATH="${installDir}/bin:$PATH"
        ;;
esac
`,
  );

const shSourceString = (installDir: string) => {
  return `. "${installDir}/env"`;
};

type MaybePromise<T> = Promise<T> | T;

interface UnixShell {
  name: string;
  exists(installDir: string): MaybePromise<boolean>;
  rcfiles(installDir: string): MaybePromise<string[]>;
  rcsToUpdate(installDir: string): MaybePromise<string[]>;
  envScript?(installDir: string): ShellScript;
  sourceString?(installDir: string): MaybePromise<string>;
}

class Posix implements UnixShell {
  name = "sh";
  exists(): boolean {
    return true;
  }
  rcfiles(): string[] {
    return [joinPaths(homeDir, ".profile")];
  }
  rcsToUpdate(): string[] {
    return this.rcfiles();
  }
}

class Bash implements UnixShell {
  name = "bash";
  async exists(): Promise<boolean> {
    return (await this.rcsToUpdate()).length > 0;
  }
  rcfiles(): string[] {
    return [".bash_profile", ".bash_login", ".bashrc"]
      .map((rc) => joinPaths(homeDir, rc));
  }
  rcsToUpdate(): Promise<string[]> {
    return filterAsync(this.rcfiles(), system.isExistingFile);
  }
}

class Zsh implements UnixShell {
  name = "zsh";
  async exists(): Promise<boolean> {
    if (
      shellEnvContains("zsh") || (await system.findCmd("zsh"))
    ) {
      return true;
    }
    return false;
  }
  async getZshDotDir(): Promise<string | undefined> {
    let zshDotDir;
    if (
      withEnvVar("SHELL", (sh) => sh && sh.includes("zsh"))
    ) {
      zshDotDir = system.getEnv("ZDOTDIR");
    } else {
      const output = await system.runCmd("zsh", ["-c", "echo -n $ZDOTDIR"]);
      const stdout = new TextDecoder().decode(output.stdout).trim();
      zshDotDir = stdout;
    }

    return zshDotDir;
  }
  async rcfiles(): Promise<string[]> {
    const zshDotDir = await this.getZshDotDir();
    return [zshDotDir, homeDir].map((dir) =>
      dir ? joinPaths(dir, ".zshenv") : undefined
    ).filter((dir) => dir !== undefined);
  }
  async rcsToUpdate(): Promise<string[]> {
    let out = await filterAsync(await this.rcfiles(), system.isExistingFile);
    if (out.length === 0) {
      out = await this.rcfiles();
    }
    return out;
  }
}

class Fish implements UnixShell {
  name = "fish";
  async exists(): Promise<boolean> {
    if (
      shellEnvContains("fish") ||
      (await system.findCmd("fish"))
    ) {
      return true;
    }
    return false;
  }

  rcfiles(): string[] {
    // XDG_CONFIG_HOME/fish/conf.d or ~/.config/fish/conf.d
    const conf = "fish/conf.d/deno.fish";
    const first = withEnvVar("XDG_CONFIG_HOME", (p) => {
      if (!p) return undefined;
      return joinPaths(p, conf);
    });
    return [first ?? joinPaths(homeDir, ".config", conf)];
  }

  rcsToUpdate(): string[] {
    return this.rcfiles();
  }

  envScript(installDir: string): ShellScript {
    const fishEnv = `
# deno shell setup
if not contains "${installDir}/bin" $PATH
  # prepend to path to take precedence over potential package manager deno installations
  set -x PATH "${installDir}/bin" $PATH
end
`;
    return new ShellScript("env.fish", fishEnv);
  }

  sourceString(installDir: string): MaybePromise<string> {
    return `source "${installDir}/env.fish"`;
  }
}

async function writeEnvFiles(availableShells: UnixShell[], installDir: string) {
  const written = new Array<ShellScript>();

  let i = 0;
  while (i < availableShells.length) {
    const shell = availableShells[i];
    const script = (shell.envScript ?? shEnvScript)(installDir);

    if (!written.some((s) => s.equals(script))) {
      if (await script.write(installDir)) {
        written.push(script);
      } else {
        availableShells.splice(i);
        continue;
      }
    }

    i++;
  }
}

const shells: UnixShell[] = [
  new Posix(),
  new Bash(),
  new Zsh(),
  new Fish(),
];

async function getAvailableShells(installDir: string): Promise<UnixShell[]> {
  const present = [];
  for (const shell of shells) {
    if (await shell.exists(installDir)) {
      present.push(shell);
    }
  }
  return present;
}

async function addToPath(availableShells: UnixShell[], installDir: string) {
  for (const shell of availableShells) {
    const sourceCmd = await (shell.sourceString ?? shSourceString)(installDir);
    const sourceCmdWithNewline = `\n${sourceCmd}`;

    for (const rc of await shell.rcsToUpdate(installDir)) {
      let cmdToWrite = sourceCmd;
      try {
        const contents = await system.readTextFile(rc);
        if (contents.includes(sourceCmd)) {
          continue;
        }
        if (!contents.endsWith("\n")) {
          cmdToWrite = sourceCmdWithNewline;
        }
      } catch (_error) {
        // nothing
      }
      const rcDir = dirname(rc);
      console.log("rcDir", rcDir, rc);
      if (!(await system.isExistingDir(rcDir))) {
        await system.mkdir(rcDir, {
          recursive: true,
        });
      }

      try {
        await system.writeTextFile(rc, cmdToWrite, {
          append: true,
        });
      } catch (error) {
        if (error instanceof Deno.errors.PermissionDenied) {
          continue;
        }
        throw withContext(`Failed to amend shell rc file: ${rc}`, error);
      }
    }
  }
}

async function setupShells(installDir: string) {
  const availableShells = await getAvailableShells(installDir);

  await writeEnvFiles(availableShells, installDir);
  await addToPath(availableShells, installDir);
}

async function main() {
  if (Deno.build.os === "windows") {
    // the powershell script already handles setting up the path
    return;
  }

  if (Deno.args.length === 0) {
    throw new Error(
      "Expected the deno install directory as the first argument",
    );
  }

  const installDir = Deno.args[0].trim();
  await setupShells(installDir);
}

if (import.meta.main) {
  await main();
}
