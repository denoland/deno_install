import { environment } from "./environment.ts";
import {
  Bash,
  Fish,
  Posix,
  type ShellScript,
  shEnvScript,
  shSourceString,
  type UnixShell,
  Zsh,
} from "./shell.ts";
import { withContext } from "./util.ts";
const {
  dirname,
  mkdir,
  isExistingDir,
  readTextFile,
  runCmd,
  writeTextFile,
} = environment;

function warn(s: string) {
  console.error(`%cwarning%c: ${s}`, "color: yellow", "color: none");
}

async function ensureExists(dirPath: string): Promise<void> {
  if (!await isExistingDir(dirPath)) {
    await mkdir(dirPath, {
      recursive: true,
    });
  }
}

type CompletionWriteResult = "fail" | "success" | "up-to-date" | null;

async function writeCompletionFiles(
  availableShells: UnixShell[],
  installDir: string,
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
      const completionFilePath = await shell.completionsFilePath?.(installDir);
      if (!completionFilePath) {
        results.push(null);
        continue;
      }
      await ensureExists(dirname(completionFilePath));
      console.log("running deno completinos for ", shell.name);
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
        results.push("success");
      } else {
        results.push("up-to-date");
      }
      written.add(completionFilePath);
    } catch (error) {
      warn(`Failed to install completions for ${shell.name}: ${error}`);
      results.push("fail");
      continue;
    }
  }
  return results;
}

async function writeCompletionRcCommands(
  availableShells: UnixShell[],
  installDir: string,
) {
  for (const shell of availableShells) {
    if (!shell.supportsCompletion) continue;

    const rcCmd = await shell.completionsSourceString?.(installDir);
    if (!rcCmd) continue;

    for (const rc of await shell.rcsToUpdate(installDir)) {
      await updateRcFile(rc, rcCmd);
    }
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

async function updateRcFile(rc: string, cmd: string): Promise<boolean> {
  const cmdWithNewline = cmd.startsWith("\n") ? cmd : `\n${cmd}`;

  let cmdToWrite = cmd;
  try {
    const contents = await readTextFile(rc);
    if (contents.includes(cmd)) {
      return false;
    }
    if (!contents.endsWith("\n")) {
      cmdToWrite = cmdWithNewline;
    }
  } catch (_error) {
    // nothing
  }
  await ensureExists(dirname(rc));

  try {
    await writeTextFile(rc, cmdToWrite, {
      append: true,
    });
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      return false;
    }
    throw withContext(`Failed to amend shell rc file: ${rc}`, error);
  }
}

async function addToPath(availableShells: UnixShell[], installDir: string) {
  for (const shell of availableShells) {
    const sourceCmd = await (shell.sourceString ?? shSourceString)(installDir);

    for (const rc of await shell.rcsToUpdate(installDir)) {
      await updateRcFile(rc, sourceCmd);
    }
  }
}

async function setupShells(installDir: string) {
  const availableShells = await getAvailableShells(installDir);

  await writeEnvFiles(availableShells, installDir);
  await addToPath(availableShells, installDir);

  const ans = prompt(
    "Would you like to install shell completions for deno? (y/n)\n",
    "n",
  ) ?? "n";
  if (ans.toLowerCase().trim() === "y") {
    const results = await writeCompletionFiles(availableShells, installDir);
    await writeCompletionRcCommands(
      shells.filter((_s, i) => results[i] !== "fail"),
      installDir,
    );
  }
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
