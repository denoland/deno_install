import $, { Path } from "jsr:@david/dax";
import { Pty } from "jsr:@sigma/pty-ffi";
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";

Deno.test(
  { name: "install skip prompts", ignore: Deno.build.os === "windows" },
  async () => {
    await using testEnv = await TestEnv.setup();
    const { env, tempDir, installScript, installDir } = testEnv;
    await testEnv.homeDir.join(".bashrc").ensureFile();

    console.log("installscript contents", await installScript.readText());

    const shellOutput = await runInBash(
      [`cat "${installScript.toString()}" | sh -s -- -y v2.0.0-rc.6`],
      { env, cwd: tempDir },
    );
    console.log(shellOutput);

    assertStringIncludes(shellOutput, "Deno was added to the PATH");

    const deno = installDir.join("bin/deno");
    assert(await deno.exists());

    // Check that it's on the PATH now, and that it's the correct version.
    const output = await new Deno.Command("bash", {
      args: ["-i", "-c", "deno --version"],
      env,
    }).output();
    const stdout = new TextDecoder().decode(output.stdout).trim();

    const versionRe = /deno (\d+\.\d+\.\d+\S*)/;
    const match = stdout.match(versionRe);

    assert(match !== null);
    assertEquals(match[1], "2.0.0-rc.6");
  },
);

Deno.test(
  { name: "install no modify path", ignore: Deno.build.os === "windows" },
  async () => {
    await using testEnv = await TestEnv.setup();
    const { env, tempDir, installScript, installDir } = testEnv;
    await testEnv.homeDir.join(".bashrc").ensureFile();

    const shellOutput = await runInBash(
      [`cat "${installScript.toString()}" | sh -s -- -y v2.0.0-rc.6 --no-modify-path`],
      { env, cwd: tempDir },
    );

    assert(
      !shellOutput.includes("Deno was added to the PATH"),
      `Unexpected output, shouldn't have added to the PATH:\n${shellOutput}`,
    );

    const deno = installDir.join("bin/deno");
    assert(await deno.exists());
  },
);

class TestEnv implements AsyncDisposable, Disposable {
  #tempDir: Path;
  private constructor(
    tempDir: Path,
    public homeDir: Path,
    public installDir: Path,
    public installScript: Path,
    public env: Record<string, string>,
  ) {
    this.#tempDir = tempDir;
  }
  get tempDir() {
    return this.#tempDir;
  }
  static async setup({ env = {} }: { env?: Record<string, string> } = {}) {
    const tempDir = $.path(await Deno.makeTempDir());
    const homeDir = await tempDir.join("home").ensureDir();
    const installDir = tempDir.join(".deno");

    const tempSetup = tempDir.join("shell-setup.js");
    await $.path(resolve("./shell-setup/bundled.esm.js")).copyFile(tempSetup);

    // Copy the install script to a temp location, and modify it to
    // run the shell setup script from the local source instead of JSR.
    const contents = await Deno.readTextFile(resolve("./install.sh"));
    const contentsLocal = contents.replaceAll(
      "jsr:@deno/installer-shell-setup/bundled",
      tempSetup.toString(),
    );
    if (contents === contentsLocal) {
      throw new Error("Failed to point installer at local source");
    }
    const installScript = tempDir.join("install.sh");
    await installScript.writeText(contentsLocal);

    await Deno.chmod(installScript.toString(), 0o755);

    // Ensure that the necessary binaries are in the PATH.
    // It's not perfect, but the idea is to keep the test environment
    // as clean as possible to make it less host dependent.
    const needed = ["bash", "unzip", "cat", "sh"];
    const binPaths = await Promise.all(needed.map((n) => $.which(n)));
    const searchPaths = new Set(
      binPaths.map((p, i) => {
        if (p === undefined) {
          throw new Error(`missing dependency: ${needed[i]}`);
        }
        return $.path(p).parentOrThrow().toString();
      }),
    );
    const newEnv = {
      HOME: homeDir.toString(),
      XDG_CONFIG_HOME: homeDir.toString(),
      DENO_INSTALL: installDir.toString(),
      PATH: searchPaths.values().toArray().join(":"),
      ZDOTDIR: homeDir.toString(),
      SHELL: "/bin/bash",
      CI: "",
    };
    Object.assign(newEnv, env);
    return new TestEnv(tempDir, homeDir, installDir, installScript, newEnv);
  }
  async [Symbol.asyncDispose]() {
    await this.#tempDir.remove({ recursive: true });
  }
  [Symbol.dispose]() {
    this.#tempDir.removeSync({ recursive: true });
  }
}

async function runInBash(
  commands: string[],
  options: { cwd?: Path; env: Record<string, string> },
): Promise<string> {
  const { cwd, env } = options;
  const bash = await $.which("bash") ?? "bash";
  const pty = new Pty({
    env: Object.entries(env),
    cmd: bash,
    args: [],
  });
  if (cwd) {
    await pty.write(`cd "${cwd.toString()}"\n`);
  }

  for (const command of commands) {
    await pty.write(command + "\n");
  }
  await pty.write("exit\n");
  let output = "";
  while (true) {
    const { data, done } = await pty.read();
    output += data;
    if (done) {
      break;
    }
  }
  pty.close();
  return output;
}

function resolve(s: string): URL {
  return new URL(import.meta.resolve(s));
}
