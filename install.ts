import {
  Process,
  args,
  chmod,
  copyFile,
  env,
  exit,
  platform,
  writeFile,
  removeAll,
  rename,
  run,
  makeTempDir
} from "deno";

import { mkdirp } from "https://deno.land/x/std/fs/mkdirp.ts";
import { join, resolve } from "https://deno.land/x/std/fs/path/mod.ts";

const MAX_FOLLOWS: number = 4;
const isWindows: boolean = platform.os === "win";
const procEnv: { [key: string]: any } = env();
const PATH: string = procEnv.PATH || procEnv.Path;

function getHome(): string {
  return isWindows
    ? resolve(procEnv.HOMEDRIVE, procEnv.HOMEPATH)
    : procEnv.HOME;
}

const RELEASE_URL: string =
  "https://api.github.com/repos/denoland/deno/releases";
const LATEST_RELEASE_URL: string = `${RELEASE_URL}/latest`;
const TAG_RELEASE_URL: string = `${RELEASE_URL}/tags`;

const DENO_DIR: string = join(getHome(), ".deno");
const DENO_BIN_DIR: string = join(DENO_DIR, "bin");
const DENO_BIN: string = join(DENO_BIN_DIR, isWindows ? "deno.exe" : "deno");
const OLD_DENO_BIN: string = DENO_BIN.replace(/deno(\.exe)?$/, "old_deno$1");
const LINUX_GZIP: string = "deno_linux_x64.gz";
const OSX_GZIP: string = "deno_osx_x64.gz";
const WIN_ZIP: string = "deno_win_x64.zip";

function panic(err?: Error): void {
  if (err) {
    console.error("[deno-install error]", err.stack);
  }
  console.error("[deno-install error]", "Installation failed");
  exit(1);
}

function pinup(...args: any): void {
  console.log("[deno-install info]", ...args);
}

async function runBufferStdout(args: string[]): Promise<string> {
  const p = run({ args, stdout: "piped" });
  const stdout = await p.output();
  if (!(await p.status()).success) {
    panic(Error(`Running ${args} failed`));
  }
  p.close();
  return new TextDecoder().decode(stdout);
}

async function follow(url: string): Promise<any> {
  let res: any; // TODO: annotate deno Response
  let located: boolean = false;
  let count: number = 0;
  while (!located) {
    res = await fetch(url, { headers: { "User-Agent": "deno" } });
    if (res.status >= 300 && res.status < 400) {
      if (++count >= MAX_FOLLOWS) {
        panic(Error(`Unable to fetch from ${url}`));
      }
      url = res.headers.get("Location");
    } else if (res.status === 200) {
      located = true;
    } else {
      panic(Error(`HTTP error ${res.status} ${res.statusText}`));
    }
  }
  return res;
}

async function releaseUrl(tag?: string): Promise<{ [key: string]: string }> {
  const url: string = tag ? `${TAG_RELEASE_URL}/${tag}` : LATEST_RELEASE_URL;
  let filename: string;
  switch (platform.os) {
    case "linux":
      filename = LINUX_GZIP;
      break;
    case "mac":
      filename = OSX_GZIP;
      break;
    case "win":
      filename = WIN_ZIP;
      break;
    default:
      panic(Error(`Unsupported operating system ${platform.os}`));
  }
  const res: any = await follow(url); // TODO: annotate deno Response
  const release: { [key: string]: any } = await res.json();
  const archive: { [key: string]: any } = release.assets.find(
    (asset: { [key: string]: any }) => asset.name === filename
  );
  if (!archive || !archive.browser_download_url) {
    panic(Error(`Unable to find ${filename} @ ${url}`));
  }
  return {
    url: archive.browser_download_url,
    tag: archive.browser_download_url.replace(/^.*(v\d+\.\d+\.\d+).*$/, "$1")
  };
}

async function tempDownload(
  tempDir: string,
  url: string,
  suffix: string
): Promise<string> {
  const res: any = await follow(url); // TODO: annotate deno Response
  const tempFile: string = join(tempDir, `${Date.now()}.${suffix}`);
  await writeFile(tempFile, new Uint8Array(await res.arrayBuffer()));
  return tempFile;
}

async function unpackBin(archive: string): Promise<void> {
  await mkdirp(DENO_BIN_DIR);
  let args: string[];
  if (isWindows) {
    await rename(DENO_BIN, OLD_DENO_BIN);
    args = [
      "powershell.exe",
      "-Command",
      `Expand-Archive "${archive}" -DestinationPath "${DENO_BIN_DIR}"`
    ];
  } else {
    args = ["gunzip", "-d", archive];
  }
  const p: Process = run({ args });
  if (!(await p.status()).success) {
    panic(Error(`Running ${args} failed`));
  }
  p.close();
  if (!isWindows) {
    if (platform.os === "linux") {
      await rename(DENO_BIN, OLD_DENO_BIN);
    }
    await copyFile(archive.replace(/\.gz$/, ""), DENO_BIN);
  }
}

async function makeHandy(): Promise<void> {
  if (isWindows) {
    if (!PATH.toLocaleLowerCase().includes(DENO_BIN_DIR.toLocaleLowerCase())) {
      let updatedPath: string = PATH;
      if (PATH.endsWith(";")) {
        updatedPath += DENO_BIN_DIR;
      } else {
        updatedPath += `;${DENO_BIN_DIR}`;
      }
      const args: string[] = [
        "powershell.exe",
        "-Command",
        `[Environment]::SetEnvironmentVariable("PATH","${updatedPath}",` +
          `[EnvironmentVariableTarget]::User)`
      ];
      const p: Process = run({ args });
      if (!(await p.status()).success) {
        panic(Error(`Running ${args} failed`));
      }
      p.close();
    }
  } else {
    await chmod(DENO_DIR, 0o744);
    await chmod(DENO_BIN, 0o744);
    if (!PATH.includes(DENO_BIN_DIR)) {
      pinup(
        `Now manually add ${DENO_BIN_DIR} to your $PATH.\nExample:\n\t\t` +
          `echo "export PATH=${DENO_BIN_DIR}:$PATH" >> $HOME/.bash_profile`
      );
    }
  }
}

async function checkVersion(tag: string): Promise<void> {
  const output: string = await runBufferStdout(["deno", "--version"]);
  if (!RegExp(tag.replace(/^v/, "").replace(/\./g, "\\.")).test(output)) {
    panic(Error("Version mismatch"));
  }
}

async function main(): Promise<void> {
  let tag: string;
  // if we got a truthy first argument that is a version use it as tag
  // else if we got a truthy first argument that is not a version panic
  // else tag remains undefined and releaseUrl(tag?) falls back to latest
  if (/^v\d+\.\d+\.\d+$/.test(args[1])) {
    tag = args[1];
  } else if (args[1]) {
    panic(Error("Malformatted tag. Examples: v0.2.7, v0.3.0"));
  }
  pinup(tag ? `Installing deno ${tag}` : "Installing deno@latest");
  const actual: { [key: string]: string } = await releaseUrl(tag);
  const tempDir: string = await makeTempDir();
  pinup(`Downloading ${actual.url}`);
  const tempFile: string = await tempDownload(
    tempDir,
    actual.url,
    isWindows ? "zip" : "gz"
  );
  await unpackBin(tempFile);
  await makeHandy();
  await checkVersion(actual.tag);
  await removeAll(tempDir);
  pinup(`Successfully installed deno ${actual.tag}`);
}

main();
