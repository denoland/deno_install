/**
 * Shell-specific handling. Largely adapted from rustup
 * (https://github.com/rust-lang/rustup/blob/ccc668ccf852b7f37a4072150a6dd2aac5844d38/src/cli/self_update/shell.rs)
 */

import { environment } from "./environment.ts";
import { join } from "@std/path/join";
import { dirname } from "@std/path/dirname";
import {
  filterAsync,
  shellEnvContains,
  withContext,
  withEnvVar,
} from "./util.ts";
const {
  isExistingFile,
  writeTextFile,
  homeDir,
  findCmd,
  runCmd,
  getEnv,
  pathExists,
} = environment;

/** A shell script, for instance an `env` file. Abstraction adapted from
 * rustup (see above)
 */
export class ShellScript {
  constructor(public name: string, public contents: string) {}

  equals(other: ShellScript): boolean {
    return this.name === other.name && this.contents === other.contents;
  }

  async write(denoInstallDir: string): Promise<boolean> {
    const envFilePath = join(denoInstallDir, this.name);
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

export type UpdateRcFile = { prepend?: string; append?: string };

/** Abstraction of a Unix-y shell. */
export interface UnixShell {
  name: string;
  /** Does deno support completions for the shell? If a string, implies true
   * and the string will appear to the user as a note when prompting for completion install
   */
  supportsCompletion: boolean | string;
  /** Does the shell exist on the system? */
  exists(): MaybePromise<boolean>;
  /** List of potential config files for the shell */
  rcfiles(): MaybePromise<string[]>;
  /** List of config files to update */
  rcsToUpdate(): MaybePromise<string[]>;
  /** Script to set up env vars (PATH, and potentially others in the future) */
  envScript?(installDir: string): ShellScript;
  /** Command to source the env script */
  sourceString?(installDir: string): MaybePromise<string>;
  /** Path to write completions to */
  completionsFilePath?(): MaybePromise<string>;
  /** Command to source the completion file */
  completionsSourceString?(): MaybePromise<string | UpdateRcFile>;
}

export class Posix implements UnixShell {
  name = "sh";
  supportsCompletion = false;
  exists(): boolean {
    return true;
  }
  rcfiles(): string[] {
    return [join(homeDir, ".profile")];
  }
  rcsToUpdate(): string[] {
    return this.rcfiles();
  }
}

export class Bash implements UnixShell {
  name = "bash";
  get supportsCompletion() {
    if (Deno.build.os === "darwin") {
      return "not recommended on macOS";
    }
    return true;
  }
  async exists(): Promise<boolean> {
    return (await this.rcsToUpdate()).length > 0;
  }
  rcfiles(): string[] {
    return [".bash_profile", ".bash_login", ".bashrc"]
      .map((rc) => join(homeDir, rc));
  }
  rcsToUpdate(): Promise<string[]> {
    return filterAsync(this.rcfiles(), isExistingFile);
  }
  completionsFilePath(): string {
    const USER = Deno.env.get("USER");
    if (USER === "root") {
      return "/usr/local/etc/bash_completion.d/deno.bash";
    }
    return join(homeDir, ".local/share/bash-completion/completions/deno.bash");
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
      shellEnvContains("zsh")
    ) {
      zshDotDir = getEnv("ZDOTDIR");
    } else {
      const output = await runCmd("zsh", [
        "-c",
        "echo -n $ZDOTDIR",
      ]);
      const stdout = new TextDecoder().decode(output.stdout).trim();
      zshDotDir = stdout.length > 0 ? stdout : undefined;
    }

    return zshDotDir;
  }
  async rcfiles(): Promise<string[]> {
    const zshDotDir = await this.getZshDotDir();
    return [zshDotDir, homeDir].map((dir) =>
      dir ? join(dir, ".zshrc") : undefined
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
      zshDotDir = join(homeDir, ".zsh");
    }
    return join(zshDotDir, "completions", "_deno.zsh");
  }
  async completionsSourceString(): Promise<UpdateRcFile> {
    const filePath = await this.completionsFilePath();
    const completionDir = dirname(filePath);
    const fpathSetup =
      `# Add deno completions to search path\nif [[ ":$FPATH:" != *":${completionDir}:"* ]]; then export FPATH="${completionDir}:$FPATH"; fi`;

    const zshDotDir = (await this.getZshDotDir()) ?? homeDir;
    // try to figure out whether the user already has `compinit` being called

    let append: string | undefined;
    if (
      (await filterAsync(
        [".zcompdump", ".oh_my_zsh", ".zprezto"],
        (f) => pathExists(join(zshDotDir, f)),
      )).length == 0
    ) {
      append =
        "# Initialize zsh completions (added by deno install script)\nautoload -Uz compinit\ncompinit";
    }
    return {
      prepend: fpathSetup,
      append,
    };
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
      return join(p, "fish");
    });
    return first ?? join(homeDir, ".config", "fish");
  }

  rcfiles(): string[] {
    // XDG_CONFIG_HOME/fish/conf.d or ~/.config/fish/conf.d
    const conf = "conf.d/deno.fish";
    return [join(this.fishConfigDir(), conf)];
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
    return join(this.fishConfigDir(), "completions", "deno.fish");
  }

  // no further config needed for completions
}
