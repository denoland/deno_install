import { environment } from "./environment.ts";
import { basename, dirname, join } from "@std/path";
import { confirm, multiSelect } from "@nathanwhit/promptly";
import { parseArgs } from "@std/cli/parse-args";

import {
  Bash,
  Fish,
  Posix,
  type ShellScript,
  shEnvScript,
  shSourceString,
  type UnixShell,
  type UpdateRcFile,
  Zsh,
} from "./shell.ts";
import {
  ensureEndsWith,
  ensureExists,
  ensureStartsWith,
  info,
  warn,
  withContext,
} from "./util.ts";
const {
  readTextFile,
  runCmd,
  writeTextFile,
} = environment;

type CompletionWriteResult = "fail" | "success" | null;

/** Write completion files to the appropriate locations for all supported shells */
async function writeCompletionFiles(
  availableShells: UnixShell[],
): Promise<CompletionWriteResult[]> {
  const written = new Set<string>();
  const results: CompletionWriteResult[] = [];

  const decoder = new TextDecoder();

  for (const shell of availableShells) {
    if (!shell.supportsCompletion) {
      results.push(null);
      continue;
    }

    try {
      const completionFilePath = await shell.completionsFilePath?.();
      if (!completionFilePath) {
        results.push(null);
        continue;
      }
      await ensureExists(dirname(completionFilePath));
      // deno completions <shell>
      const output = await runCmd(Deno.execPath(), ["completions", shell.name]);
      if (!output.success) {
        throw new Error(
          `deno completions subcommand failed, stderr was: ${
            decoder.decode(output.stderr)
          }`,
        );
      }
      const completionFileContents = decoder.decode(output.stdout);
      if (!completionFileContents) {
        warn(`Completions were empty, skipping ${shell.name}`);
        results.push("fail");
        continue;
      }
      let currentContents = null;
      try {
        currentContents = await readTextFile(completionFilePath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        } else {
          // nothing
        }
      }
      if (currentContents !== completionFileContents) {
        if (currentContents !== null) {
          warn(
            `an existing completion file for deno already exists at ${completionFilePath}, but is out of date. overwriting with new contents`,
          );
        }
        await writeTextFile(completionFilePath, completionFileContents);
      }
      results.push("success");
      written.add(completionFilePath);
    } catch (error) {
      warn(`Failed to install completions for ${shell.name}: ${error}`);
      results.push("fail");
      continue;
    }
  }
  return results;
}

/** A little class to manage backing up shell rc files */
class Backups {
  backedUp = new Set<string>();
  constructor(public backupDir: string) {}

  async add(path: string, contents: string): Promise<void> {
    if (this.backedUp.has(path)) {
      return;
    }
    const dest = join(this.backupDir, basename(path)) + `.bak`;
    info(
      `backing '${path}' up to '${dest}'`,
    );
    await Deno.writeTextFile(dest, contents);
    this.backedUp.add(path);
  }
}

/** Write commands necessary to set up completions to shell rc files */
async function writeCompletionRcCommands(
  availableShells: UnixShell[],
  backups: Backups,
) {
  for (const shell of availableShells) {
    if (!shell.supportsCompletion) continue;

    const rcCmd = await shell.completionsSourceString?.();
    if (!rcCmd) continue;

    for (const rc of await shell.rcsToUpdate()) {
      await updateRcFile(rc, rcCmd, backups);
    }
  }
}

/** Write the files setting up the PATH vars (and potentially others in the future) for all shells */
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
        continue;
      }
    }

    i++;
  }
}

/** Updates an rc file (e.g. `.bashrc`) with a command string.
 * If the file already contains the command, it will not be updated.
 * @param rc - path to the rc file
 * @param command - either the command to append, or an object with commands to prepend and/or append
 * @param backups - manager for rc file backups
 */
async function updateRcFile(
  rc: string,
  command: string | UpdateRcFile,
  backups: Backups,
): Promise<boolean> {
  let prepend = "";
  let append = "";
  if (typeof command === "string") {
    append = command;
  } else {
    prepend = command.prepend ?? "";
    append = command.append ?? "";
  }
  if (!prepend && !append) {
    return false;
  }

  let contents: string | undefined;
  try {
    contents = await readTextFile(rc);
    if (prepend) {
      if (contents.includes(prepend)) {
        // nothing to prepend
        prepend = "";
      } else {
        // always add a newline
        prepend = ensureEndsWith(prepend, "\n");
      }
    }
    if (append) {
      if (contents.includes(append)) {
        // nothing to append
        append = "";
      } else if (!contents.endsWith("\n")) {
        // add new line to start
        append = ensureStartsWith(append, "\n");
      }
    }
  } catch (_error) {
    prepend = prepend ? ensureEndsWith(prepend, "\n") : prepend;
  }
  if (!prepend && !append) {
    return false;
  }

  if (contents !== undefined) {
    await backups.add(rc, contents);
  }

  await ensureExists(dirname(rc));

  try {
    await writeTextFile(rc, prepend + (contents ?? "") + append, {
      create: true,
    });

    return true;
  } catch (error) {
    if (
      error instanceof Deno.errors.PermissionDenied ||
      // deno-lint-ignore no-explicit-any
      error instanceof (Deno.errors as any).NotCapable
    ) {
      return false;
    }
    throw withContext(`Failed to update shell rc file: ${rc}`, error);
  }
}

/** Write the commands necessary to source the env file (which sets up the path).
 * Up until this point, we have not modified any shell config files.
 */
async function addToPath(
  availableShells: UnixShell[],
  installDir: string,
  backups: Backups,
) {
  for (const shell of availableShells) {
    const sourceCmd = await (shell.sourceString ?? shSourceString)(installDir);

    for (const rc of await shell.rcsToUpdate()) {
      await updateRcFile(rc, sourceCmd, backups);
    }
  }
}

// Update this when adding support for a new shell
const shells: UnixShell[] = [
  new Posix(),
  new Bash(),
  new Zsh(),
  new Fish(),
];

async function getAvailableShells(): Promise<UnixShell[]> {
  const present = [];
  for (const shell of shells) {
    try {
      if (await shell.exists()) {
        present.push(shell);
      }
    } catch (_e) {
      continue;
    }
  }
  return present;
}

interface SetupOpts {
  skipPrompts: boolean;
  noModifyPath: boolean;
}

async function setupShells(
  installDir: string,
  backupDir: string,
  opts: SetupOpts,
) {
  const {
    skipPrompts,
    noModifyPath,
  } = opts;
  const availableShells = await getAvailableShells();

  await writeEnvFiles(availableShells, installDir);

  const backups = new Backups(backupDir);

  if (
    (skipPrompts && !noModifyPath) || (!skipPrompts &&
      await confirm(`Edit shell configs to add deno to the PATH?`, {
        default: true,
      }))
  ) {
    await ensureExists(backupDir);
    await addToPath(availableShells, installDir, backups);
    console.log(
      "\nDeno was added to the PATH.\nYou may need to restart your shell for it to become available.\n",
    );
  }

  const shellsWithCompletion = availableShells.filter((s) =>
    s.supportsCompletion !== false
  );
  const selected = skipPrompts ? [] : await multiSelect(
    {
      message: `Set up completions?`,
      options: shellsWithCompletion.map((s) => {
        const maybeNotes = typeof s.supportsCompletion === "string"
          ? ` (${s.supportsCompletion})`
          : "";
        return s.name +
          maybeNotes;
      }),
    },
  );
  const completionsToSetup = selected.map((idx) => shellsWithCompletion[idx]);

  if (
    completionsToSetup.length > 0
  ) {
    await ensureExists(backupDir);
    const results = await writeCompletionFiles(completionsToSetup);
    await writeCompletionRcCommands(
      completionsToSetup.filter((_s, i) => results[i] !== "fail"),
      backups,
    );
  }
}

function printHelp() {
  console.log(`\n
Setup script for installing deno

Options:
  -y, --yes
    Skip interactive prompts and accept defaults
  --no-modify-path
    Don't add deno to the PATH environment variable
  -h, --help
    Print help\n`);
}

async function main() {
  if (Deno.args.length === 0) {
    throw new Error(
      "Expected the deno install directory as the first argument",
    );
  }

  const args = parseArgs(Deno.args.slice(1), {
    boolean: ["yes", "no-modify-path", "help"],
    alias: {
      "yes": "y",
      "help": "h",
    },
    default: {
      yes: false,
      "no-modify-path": false,
    },
    unknown: (arg: string) => {
      if (arg.startsWith("-")) {
        printHelp();
        console.error(`Unknown flag ${arg}. Shell will not be configured`);
        Deno.exit(1);
      }
      return false;
    },
  });

  if (args.help) {
    printHelp();
    return;
  }

  if (
    Deno.build.os === "windows" || (!args.yes && !(Deno.stdin.isTerminal() &&
      Deno.stdout.isTerminal()))
  ) {
    // the powershell script already handles setting up the path
    return;
  }

  const installDir = Deno.args[0].trim();

  const backupDir = join(installDir, ".shellRcBackups");

  try {
    await setupShells(installDir, backupDir, {
      skipPrompts: args.yes,
      noModifyPath: args["no-modify-path"],
    });
  } catch (_e) {
    warn(
      `Failed to configure your shell environments, you may need to manually add deno to your PATH environment variable.

Manually add the directory to your $HOME/.bashrc (or similar)":
  export DENO_INSTALL="${installDir}"
  export PATH="${installDir}/bin:$PATH"\n`,
    );
  }
}

if (import.meta.main) {
  await main();
}
