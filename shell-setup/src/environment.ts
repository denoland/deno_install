/**
 * A collection of functions that interact with the environment, to allow
 * for potentially mocking in tests in the future.
 */
import { which } from "@david/which";
import { homedir as getHomeDir } from "node:os";

async function tryStat(path: string): Promise<Deno.FileInfo | undefined> {
  try {
    return await Deno.stat(path);
  } catch (error) {
    if (
      error instanceof Deno.errors.NotFound ||
      (error instanceof Deno.errors.PermissionDenied &&
        (await Deno.permissions.query({ name: "read", path })).state ==
          "granted")
    ) {
      return;
    }
    throw error;
  }
}

export const environment = {
  writeTextFile: Deno.writeTextFile,
  readTextFile: Deno.readTextFile,
  async isExistingFile(path: string): Promise<boolean> {
    const info = await tryStat(path);
    return info?.isFile ?? false;
  },
  async isExistingDir(path: string): Promise<boolean> {
    const info = await tryStat(path);
    return info?.isDirectory ?? false;
  },
  pathExists(path: string): Promise<boolean> {
    return tryStat(path).then((info) => info !== undefined);
  },
  mkdir: Deno.mkdir,
  homeDir: getHomeDir(),
  findCmd: which,
  getEnv(name: string): string | undefined {
    return Deno.env.get(name);
  },
  async runCmd(
    cmd: string,
    args?: string[],
  ): Promise<Deno.CommandOutput> {
    return await new Deno.Command(cmd, {
      args,
      stderr: "piped",
      stdout: "piped",
      stdin: "null",
    }).output();
  },
};
