const stub = () => {
  throw new Error("unreachable");
};

async function orFallback<F>(f: () => Promise<F> | F, fallback: F) {
  try {
    return await f();
  } catch (_error) {
    return fallback;
  }
}

export const system = {
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
  getHomeDir(): string {
    return stub();
  },
  findCmd(_name: string): Promise<string | undefined> {
    return stub();
  },
  joinPaths(..._paths: string[]): string {
    return stub();
  },
  dirname(_path: string): string {
    return stub();
  },
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
};

export const findCmdFallback: typeof system.findCmd = async (cmd) => {
  const path = system.getEnv("PATH");
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
    if (await system.isExistingFile(filePath)) {
      return filePath;
    }
  }
  return undefined;
};

system.findCmd = await orFallback(
  async () => (await import("@david/which")).which,
  findCmdFallback,
);

export const fallbackJoinPaths: typeof system.joinPaths = (...paths) => {
  return paths.filter((path) => path.length > 0).join("/");
};

export const fallbackDirname: typeof system.dirname = (path) => {
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
};

export const fallbackHomeDir: typeof system.getHomeDir = () => {
  const home = system.getEnv("HOME");
  if (!home) {
    throw new Error("Could not determine home directory");
  }
  return home;
};

try {
  const nodeOs = await import("node:os");
  if (typeof nodeOs.homedir === "function") {
    system.getHomeDir = nodeOs.homedir;
  } else {
    system.getHomeDir = fallbackHomeDir;
  }
} catch (_error) {
  system.getHomeDir = fallbackHomeDir;
}

try {
  const path = await import("@std/path");
  system.joinPaths = path.join;
  system.dirname = path.dirname;
} catch (_error) {
  system.joinPaths = fallbackJoinPaths;
  system.dirname = fallbackDirname;
}
