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

export const _environmentImpl = {
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
  async pathExists(path: string): Promise<boolean> {
    const info = await tryStat(path);
    return info !== undefined;
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

export type Environment = typeof _environmentImpl;

function makeWrapper() {
  const wrapperEnv: Partial<Environment> = {};
  for (const keyString in _environmentImpl) {
    const key = keyString as keyof Environment;
    if (typeof _environmentImpl[key] === "function") {
      // deno-lint-ignore no-explicit-any
      wrapperEnv[key] = function (...args: any[]) {
        // deno-lint-ignore no-explicit-any
        return (_environmentImpl[key] as any)(...args);
        // deno-lint-ignore no-explicit-any
      } as any;
    }
  }
  Object.defineProperty(wrapperEnv, "homeDir", {
    get: () => _environmentImpl.homeDir,
  });
  return wrapperEnv as Environment;
}

export const environment: Environment = makeWrapper();
