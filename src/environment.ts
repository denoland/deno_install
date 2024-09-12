async function tryOrFallback<F>(f: () => Promise<F>, fallback: F) {
  try {
    return await f();
  } catch (_error) {
    return fallback;
  }
}

export const fallback = {
  getHomeDir() {
    const home = environment.getEnv("HOME");
    if (!home) {
      throw new Error("Could not determine home directory");
    }
    return home;
  },
  joinPaths(...paths: string[]) {
    return paths.filter((path) => path.length > 0).join("/");
  },
  dirname(path: string) {
    let end = -1;
    let foundNonSep = false;
    for (let i = path.length - 1; i >= 1; i--) {
      if (path.charAt(i) === "/") {
        if (foundNonSep) {
          end = i;
          break;
        }
      } else {
        foundNonSep = true;
      }
    }
    if (end === -1) {
      return path.charAt(0) === "/" ? "/" : ".";
    }

    while (end >= 1) {
      if (path.charAt(end - 1) === "/") {
        end--;
      } else {
        break;
      }
    }
    return path.slice(0, end);
  },
  async findCmd(cmd: string): Promise<string | undefined> {
    const path = environment.getEnv("PATH");
    if (!path) {
      return;
    }
    const items = path.split(":").map((item) => item.trim()).filter((item) =>
      item.length > 0
    ).map((dir) => {
      if (!dir.endsWith("/")) {
        dir += "/";
      }
      return dir;
    });
    for (const item of items) {
      const filePath = item + cmd;
      if (await environment.isExistingFile(filePath)) {
        return filePath;
      }
    }
    return undefined;
  },
};

const pathMethods = await tryOrFallback(async () => {
  const { join, dirname } = await import("@std/path");
  return { joinPaths: join, dirname };
}, { joinPaths: fallback.joinPaths, dirname: fallback.dirname });

const getHomeDir: () => string = await tryOrFallback(
  async () => {
    if (Number(Deno.version.deno.split(".")[1]) <= 6) {
      throw null;
    }
    const { homedir } = await import("node:os");
    if (typeof homedir === "function") {
      return homedir;
    }
    throw null;
  },
  fallback.getHomeDir,
);

const homeDir = getHomeDir();

export const environment = {
  writeTextFile: Deno.writeTextFile,
  readTextFile: Deno.readTextFile,
  async isExistingFile(path: string): Promise<boolean> {
    try {
      const fileInfo = await Deno.stat(path);
      return fileInfo.isFile;
    } catch (_error) {
      return false;
    }
  },
  async isExistingDir(path: string): Promise<boolean> {
    try {
      const fileInfo = await Deno.stat(path);
      return fileInfo.isDirectory;
    } catch (_error) {
      return false;
    }
  },
  mkdir: Deno.mkdir,
  homeDir,
  findCmd: await tryOrFallback(
    async () => (await import("@david/which")).which,
    fallback.findCmd,
  ),
  getEnv(name: string): string | undefined {
    return Deno.env.get(name);
  },
  async runCmd(
    cmd: string,
    args?: string[],
  ): Promise<Omit<Deno.CommandOutput, "signal">> {
    if (typeof Deno.Command === "function") {
      return await new Deno.Command(cmd, {
        args,
        stderr: "piped",
        stdout: "piped",
        stdin: "null",
      }).output();
    } else {
      // deno-lint-ignore no-deprecated-deno-api
      const result = Deno.run({
        cmd: [cmd, ...args ?? []],
        stderr: "piped",
        stdout: "piped",
        stdin: "null",
      });
      return {
        stdout: await result.output(),
        stderr: await result.stderrOutput(),
        ...(await result.status()),
      };
    }
  },
  ...pathMethods,
};
