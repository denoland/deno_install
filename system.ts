import * as nodeOs from "node:os";
import { which } from "@david/which";

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
  getHomeDir() {
    if (typeof nodeOs.homedir === "function") {
      return nodeOs.homedir();
    } else {
      return system.getEnv("HOME");
    }
  },
  findCmd(name: string): Promise<string | undefined> {
    return which(name);
  },
  getEnv(name: string): string | undefined {
    return Deno.env.get(name);
  },
  async runCmd(cmd: string, args?: string[]): Promise<Deno.CommandOutput> {
    return await new Deno.Command(cmd, {
      args,
      stderr: "piped",
      stdout: "piped",
      stdin: "null",
    }).output();
  },
};
