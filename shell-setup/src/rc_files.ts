import { environment } from "./environment.ts";
import { basename, dirname, join } from "@std/path";
import {
  ensureEndsWith,
  ensureExists,
  ensureStartsWith,
  info,
  withContext,
} from "./util.ts";
import type { UpdateRcFile } from "./shell.ts";

/** A little class to manage backing up shell rc files */
export class RcBackups {
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
    await environment.writeTextFile(dest, contents);
    this.backedUp.add(path);
  }
}

/** Updates an rc file (e.g. `.bashrc`) with a command string.
 * If the file already contains the command, it will not be updated.
 * @param rc - path to the rc file
 * @param command - either the command to append, or an object with commands to prepend and/or append
 * @param backups - manager for rc file backups
 */
export async function updateRcFile(
  rc: string,
  command: string | UpdateRcFile,
  backups: RcBackups,
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
    contents = await environment.readTextFile(rc);
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
        // add new line to start + end
        append = ensureEndsWith(ensureStartsWith(append, "\n"), "\n");
      } else {
        append = ensureEndsWith(append, "\n");
      }
    }
  } catch (_error) {
    prepend = prepend ? ensureEndsWith(prepend, "\n") : prepend;
    append = append ? ensureEndsWith(append, "\n") : append;
  }
  if (!prepend && !append) {
    return false;
  }

  if (contents !== undefined) {
    await backups.add(rc, contents);
  }

  await ensureExists(dirname(rc));

  try {
    await environment.writeTextFile(rc, prepend + (contents ?? "") + append, {
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
