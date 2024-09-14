import { environment } from "./environment.ts";
import {
  filterAsync,
  shellEnvContains,
  withContext,
  withEnvVar,
} from "./util.ts";
const {
  joinPaths,
  isExistingFile,
  writeTextFile,
  homeDir,
  findCmd,
  runCmd,
  getEnv,
} = environment;

export class ShellScript {
  constructor(public name: string, public contents: string) {}

  equals(other: ShellScript): boolean {
    return this.name === other.name && this.contents === other.contents;
  }

  async write(denoInstallDir: string): Promise<boolean> {
    const envFilePath = joinPaths(denoInstallDir, this.name);
    try {
      await writeTextFile(envFilePath, this.contents);
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

/**
 * An env script to set up the PATH, suitable for `sh` compatible shells.
 */
export const shEnvScript = (installDir: string) =>
  new ShellScript(
    "env",
    `#!/bin/sh
# deno shell setup; adapted from rustup
# affix colons on either side of $PATH to simplify matching
case ":\${PATH}:" in
    *:"${installDir}/bin":*)
        ;;
    *)
        # Prepending path in case a system-installed deno executable needs to be overridden
        export PATH="${installDir}/bin:$PATH"
        ;;
esac
`,
  );

/**
 * A command for `sh` compatible shells to source the env file.
 */
export const shSourceString = (installDir: string) => {
  return `. "${installDir}/env"`;
};

export type MaybePromise<T> = Promise<T> | T;

export interface UnixShell {
  name: string;
  supportsCompletion: boolean;
  exists(installDir: string): MaybePromise<boolean>;
  rcfiles(installDir: string): MaybePromise<string[]>;
  rcsToUpdate(installDir: string): MaybePromise<string[]>;
  envScript?(installDir: string): ShellScript;
  sourceString?(installDir: string): MaybePromise<string>;
  completionsFilePath?(installDir: string): MaybePromise<string>;
  completionsSourceString?(installDir: string): MaybePromise<string>;
}

export class Posix implements UnixShell {
  name = "sh";
  supportsCompletion = false;
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

export class Bash implements UnixShell {
  name = "bash";
  supportsCompletion = true;
  async exists(): Promise<boolean> {
    return (await this.rcsToUpdate()).length > 0;
  }
  rcfiles(): string[] {
    return [".bash_profile", ".bash_login", ".bashrc"]
      .map((rc) => joinPaths(homeDir, rc));
  }
  rcsToUpdate(): Promise<string[]> {
    return filterAsync(this.rcfiles(), isExistingFile);
  }
  completionsFilePath(): string {
    return "/usr/local/etc/bash_completion.d/deno.bash";
  }
  completionsSourceString(): string {
    return `source ${this.completionsFilePath()}`;
  }
}

export class Zsh implements UnixShell {
  name = "zsh";
  supportsCompletion = true;
  async exists(): Promise<boolean> {
    if (
      shellEnvContains("zsh") || (await findCmd("zsh"))
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
      zshDotDir = getEnv("ZDOTDIR");
    } else {
      const output = await runCmd("zsh", [
        "-c",
        "echo -n $ZDOTDIR",
      ]);
      const stdout = new TextDecoder().decode(output.stdout).trim();
      zshDotDir = stdout;
    }

    return zshDotDir;
  }
  async rcfiles(): Promise<string[]> {
    const zshDotDir = await this.getZshDotDir();
    return [zshDotDir, homeDir].map((dir) =>
      dir ? joinPaths(dir, ".zshrc") : undefined
    ).filter((dir) => dir !== undefined);
  }
  async rcsToUpdate(): Promise<string[]> {
    let out = await filterAsync(
      await this.rcfiles(),
      isExistingFile,
    );
    if (out.length === 0) {
      out = await this.rcfiles();
    }
    return out;
  }
  async completionsFilePath(): Promise<string> {
    let zshDotDir = await this.getZshDotDir();
    if (!zshDotDir) {
      zshDotDir = joinPaths(homeDir, ".zsh");
    }
    return joinPaths(zshDotDir, "completions", "_deno.zsh");
  }
  async completionsSourceString(): Promise<string> {
    const filePath = await this.completionsFilePath();
    const completionDir = environment.dirname(filePath);
    return `if [[ ":$FPATH:" != *":${completionDir}:"* ]]; then export FPATH="${completionDir}:$FPATH"; fi`;
  }
}

export class Fish implements UnixShell {
  name = "fish";
  supportsCompletion = true;
  async exists(): Promise<boolean> {
    if (
      shellEnvContains("fish") ||
      (await findCmd("fish"))
    ) {
      return true;
    }
    return false;
  }

  fishConfigDir(): string {
    const first = withEnvVar("XDG_CONFIG_HOME", (p) => {
      if (!p) return;
      return joinPaths(p, "fish");
    });
    return first ?? joinPaths(homeDir, ".config", "fish");
  }

  rcfiles(): string[] {
    // XDG_CONFIG_HOME/fish/conf.d or ~/.config/fish/conf.d
    const conf = "conf.d/deno.fish";
    return [joinPaths(this.fishConfigDir(), conf)];
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

  completionsFilePath(): string {
    return joinPaths(this.fishConfigDir(), "completions", "deno.fish");
  }

  // no further config needed for completions
}
