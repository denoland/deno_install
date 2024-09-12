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
  writeTextFile,
} = environment;

// import * as path from "@std/path";

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
        const contents = await readTextFile(rc);
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
      if (!(await isExistingDir(rcDir))) {
        await mkdir(rcDir, {
          recursive: true,
        });
      }

      try {
        await writeTextFile(rc, cmdToWrite, {
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
