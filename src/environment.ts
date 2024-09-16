import { which } from "@david/which";
import { homedir as getHomeDir } from "node:os";

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
