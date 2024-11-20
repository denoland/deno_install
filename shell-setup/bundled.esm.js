// https://jsr.io/@david/which/0.4.1/mod.ts
var RealEnvironment = class {
  env(key) {
    return Deno.env.get(key);
  }
  stat(path) {
    return Deno.stat(path);
  }
  statSync(path) {
    return Deno.statSync(path);
  }
  get os() {
    return Deno.build.os;
  }
};
async function which(command, environment2 = new RealEnvironment()) {
  const systemInfo = getSystemInfo(command, environment2);
  if (systemInfo == null) {
    return void 0;
  }
  for (const pathItem of systemInfo.pathItems) {
    const filePath = pathItem + command;
    if (systemInfo.pathExts) {
      environment2.requestPermission?.(pathItem);
      for (const pathExt of systemInfo.pathExts) {
        const filePath2 = pathItem + command + pathExt;
        if (await pathMatches(environment2, filePath2)) {
          return filePath2;
        }
      }
    } else if (await pathMatches(environment2, filePath)) {
      return filePath;
    }
  }
  return void 0;
}
async function pathMatches(environment2, path) {
  try {
    const result = await environment2.stat(path);
    return result.isFile;
  } catch (err) {
    if (err instanceof Deno.errors.PermissionDenied) {
      throw err;
    }
    return false;
  }
}
function getSystemInfo(command, environment2) {
  const isWindows2 = environment2.os === "windows";
  const envValueSeparator = isWindows2 ? ";" : ":";
  const path = environment2.env("PATH");
  const pathSeparator = isWindows2 ? "\\" : "/";
  if (path == null) {
    return void 0;
  }
  return {
    pathItems: splitEnvValue(path).map((item) => normalizeDir(item)),
    pathExts: getPathExts(),
    isNameMatch: isWindows2 ? (a, b) => a.toLowerCase() === b.toLowerCase() : (a, b) => a === b
  };
  function getPathExts() {
    if (!isWindows2) {
      return void 0;
    }
    const pathExtText = environment2.env("PATHEXT") ?? ".EXE;.CMD;.BAT;.COM";
    const pathExts = splitEnvValue(pathExtText);
    const lowerCaseCommand = command.toLowerCase();
    for (const pathExt of pathExts) {
      if (lowerCaseCommand.endsWith(pathExt.toLowerCase())) {
        return void 0;
      }
    }
    return pathExts;
  }
  function splitEnvValue(value) {
    return value.split(envValueSeparator).map((item) => item.trim()).filter((item) => item.length > 0);
  }
  function normalizeDir(dirPath) {
    if (!dirPath.endsWith(pathSeparator)) {
      dirPath += pathSeparator;
    }
    return dirPath;
  }
}

// src/environment.ts
import { homedir as getHomeDir } from "node:os";
async function tryStat(path) {
  try {
    return await Deno.stat(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof Deno.errors.PermissionDenied && (await Deno.permissions.query({ name: "read", path })).state == "granted") {
      return;
    }
    throw error;
  }
}
var environment = {
  writeTextFile: Deno.writeTextFile,
  readTextFile: Deno.readTextFile,
  async isExistingFile(path) {
    const info2 = await tryStat(path);
    return info2?.isFile ?? false;
  },
  async isExistingDir(path) {
    const info2 = await tryStat(path);
    return info2?.isDirectory ?? false;
  },
  pathExists(path) {
    return tryStat(path).then((info2) => info2 !== void 0);
  },
  mkdir: Deno.mkdir,
  homeDir: getHomeDir(),
  findCmd: which,
  getEnv(name) {
    return Deno.env.get(name);
  },
  async runCmd(cmd, args) {
    return await new Deno.Command(cmd, {
      args,
      stderr: "piped",
      stdout: "piped",
      stdin: "null"
    }).output();
  }
};

// https://jsr.io/@std/path/1.0.6/_os.ts
var isWindows = globalThis.Deno?.build.os === "windows" || globalThis.navigator?.platform?.startsWith("Win") || globalThis.process?.platform?.startsWith("win") || false;

// https://jsr.io/@std/path/1.0.6/_common/assert_path.ts
function assertPath(path) {
  if (typeof path !== "string") {
    throw new TypeError(
      `Path must be a string, received "${JSON.stringify(path)}"`
    );
  }
}

// https://jsr.io/@std/path/1.0.6/_common/basename.ts
function stripSuffix(name, suffix) {
  if (suffix.length >= name.length) {
    return name;
  }
  const lenDiff = name.length - suffix.length;
  for (let i = suffix.length - 1; i >= 0; --i) {
    if (name.charCodeAt(lenDiff + i) !== suffix.charCodeAt(i)) {
      return name;
    }
  }
  return name.slice(0, -suffix.length);
}
function lastPathSegment(path, isSep, start = 0) {
  let matchedNonSeparator = false;
  let end = path.length;
  for (let i = path.length - 1; i >= start; --i) {
    if (isSep(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        start = i + 1;
        break;
      }
    } else if (!matchedNonSeparator) {
      matchedNonSeparator = true;
      end = i + 1;
    }
  }
  return path.slice(start, end);
}
function assertArgs(path, suffix) {
  assertPath(path);
  if (path.length === 0) return path;
  if (typeof suffix !== "string") {
    throw new TypeError(
      `Suffix must be a string, received "${JSON.stringify(suffix)}"`
    );
  }
}

// https://jsr.io/@std/path/1.0.6/_common/strip_trailing_separators.ts
function stripTrailingSeparators(segment, isSep) {
  if (segment.length <= 1) {
    return segment;
  }
  let end = segment.length;
  for (let i = segment.length - 1; i > 0; i--) {
    if (isSep(segment.charCodeAt(i))) {
      end = i;
    } else {
      break;
    }
  }
  return segment.slice(0, end);
}

// https://jsr.io/@std/path/1.0.6/_common/constants.ts
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;

// https://jsr.io/@std/path/1.0.6/posix/_util.ts
function isPosixPathSeparator(code2) {
  return code2 === CHAR_FORWARD_SLASH;
}

// https://jsr.io/@std/path/1.0.6/posix/basename.ts
function basename(path, suffix = "") {
  assertArgs(path, suffix);
  const lastSegment = lastPathSegment(path, isPosixPathSeparator);
  const strippedSegment = stripTrailingSeparators(
    lastSegment,
    isPosixPathSeparator
  );
  return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}

// https://jsr.io/@std/path/1.0.6/windows/_util.ts
function isPosixPathSeparator2(code2) {
  return code2 === CHAR_FORWARD_SLASH;
}
function isPathSeparator(code2) {
  return code2 === CHAR_FORWARD_SLASH || code2 === CHAR_BACKWARD_SLASH;
}
function isWindowsDeviceRoot(code2) {
  return code2 >= CHAR_LOWERCASE_A && code2 <= CHAR_LOWERCASE_Z || code2 >= CHAR_UPPERCASE_A && code2 <= CHAR_UPPERCASE_Z;
}

// https://jsr.io/@std/path/1.0.6/windows/basename.ts
function basename2(path, suffix = "") {
  assertArgs(path, suffix);
  let start = 0;
  if (path.length >= 2) {
    const drive = path.charCodeAt(0);
    if (isWindowsDeviceRoot(drive)) {
      if (path.charCodeAt(1) === CHAR_COLON) start = 2;
    }
  }
  const lastSegment = lastPathSegment(path, isPathSeparator, start);
  const strippedSegment = stripTrailingSeparators(lastSegment, isPathSeparator);
  return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}

// https://jsr.io/@std/path/1.0.6/basename.ts
function basename3(path, suffix = "") {
  return isWindows ? basename2(path, suffix) : basename(path, suffix);
}

// https://jsr.io/@std/path/1.0.6/_common/dirname.ts
function assertArg(path) {
  assertPath(path);
  if (path.length === 0) return ".";
}

// https://jsr.io/@std/path/1.0.6/posix/dirname.ts
function dirname(path) {
  assertArg(path);
  let end = -1;
  let matchedNonSeparator = false;
  for (let i = path.length - 1; i >= 1; --i) {
    if (isPosixPathSeparator(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        end = i;
        break;
      }
    } else {
      matchedNonSeparator = true;
    }
  }
  if (end === -1) {
    return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
  }
  return stripTrailingSeparators(
    path.slice(0, end),
    isPosixPathSeparator
  );
}

// https://jsr.io/@std/path/1.0.6/windows/dirname.ts
function dirname2(path) {
  assertArg(path);
  const len = path.length;
  let rootEnd = -1;
  let end = -1;
  let matchedSlash = true;
  let offset = 0;
  const code2 = path.charCodeAt(0);
  if (len > 1) {
    if (isPathSeparator(code2)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        for (; j < len; ++j) {
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
          last = j;
          for (; j < len; ++j) {
            if (!isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            last = j;
            for (; j < len; ++j) {
              if (isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code2)) {
      if (path.charCodeAt(1) === CHAR_COLON) {
        rootEnd = offset = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
        }
      }
    }
  } else if (isPathSeparator(code2)) {
    return path;
  }
  for (let i = len - 1; i >= offset; --i) {
    if (isPathSeparator(path.charCodeAt(i))) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else {
      matchedSlash = false;
    }
  }
  if (end === -1) {
    if (rootEnd === -1) return ".";
    else end = rootEnd;
  }
  return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator2);
}

// https://jsr.io/@std/path/1.0.6/dirname.ts
function dirname3(path) {
  return isWindows ? dirname2(path) : dirname(path);
}

// https://jsr.io/@std/path/1.0.6/_common/normalize.ts
function assertArg4(path) {
  assertPath(path);
  if (path.length === 0) return ".";
}

// https://jsr.io/@std/path/1.0.6/_common/normalize_string.ts
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code2;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code2 = path.charCodeAt(i);
    else if (isPathSeparator2(code2)) break;
    else code2 = CHAR_FORWARD_SLASH;
    if (isPathSeparator2(code2)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length === 2 || res.length === 1) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += `${separator}..`;
          else res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code2 === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

// https://jsr.io/@std/path/1.0.6/posix/normalize.ts
function normalize(path) {
  assertArg4(path);
  const isAbsolute3 = isPosixPathSeparator(path.charCodeAt(0));
  const trailingSeparator = isPosixPathSeparator(
    path.charCodeAt(path.length - 1)
  );
  path = normalizeString(path, !isAbsolute3, "/", isPosixPathSeparator);
  if (path.length === 0 && !isAbsolute3) path = ".";
  if (path.length > 0 && trailingSeparator) path += "/";
  if (isAbsolute3) return `/${path}`;
  return path;
}

// https://jsr.io/@std/path/1.0.6/posix/join.ts
function join(...paths) {
  if (paths.length === 0) return ".";
  paths.forEach((path) => assertPath(path));
  const joined = paths.filter((path) => path.length > 0).join("/");
  return joined === "" ? "." : normalize(joined);
}

// https://jsr.io/@std/path/1.0.6/windows/normalize.ts
function normalize2(path) {
  assertArg4(path);
  const len = path.length;
  let rootEnd = 0;
  let device;
  let isAbsolute3 = false;
  const code2 = path.charCodeAt(0);
  if (len > 1) {
    if (isPathSeparator(code2)) {
      isAbsolute3 = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        for (; j < len; ++j) {
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          for (; j < len; ++j) {
            if (!isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            last = j;
            for (; j < len; ++j) {
              if (isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            } else if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code2)) {
      if (path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) {
            isAbsolute3 = true;
            rootEnd = 3;
          }
        }
      }
    }
  } else if (isPathSeparator(code2)) {
    return "\\";
  }
  let tail;
  if (rootEnd < len) {
    tail = normalizeString(
      path.slice(rootEnd),
      !isAbsolute3,
      "\\",
      isPathSeparator
    );
  } else {
    tail = "";
  }
  if (tail.length === 0 && !isAbsolute3) tail = ".";
  if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
    tail += "\\";
  }
  if (device === void 0) {
    if (isAbsolute3) {
      if (tail.length > 0) return `\\${tail}`;
      else return "\\";
    }
    return tail;
  } else if (isAbsolute3) {
    if (tail.length > 0) return `${device}\\${tail}`;
    else return `${device}\\`;
  }
  return device + tail;
}

// https://jsr.io/@std/path/1.0.6/windows/join.ts
function join2(...paths) {
  paths.forEach((path) => assertPath(path));
  paths = paths.filter((path) => path.length > 0);
  if (paths.length === 0) return ".";
  let needsReplace = true;
  let slashCount = 0;
  const firstPart = paths[0];
  if (isPathSeparator(firstPart.charCodeAt(0))) {
    ++slashCount;
    const firstLen = firstPart.length;
    if (firstLen > 1) {
      if (isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
          else {
            needsReplace = false;
          }
        }
      }
    }
  }
  let joined = paths.join("\\");
  if (needsReplace) {
    for (; slashCount < joined.length; ++slashCount) {
      if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
    }
    if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
  }
  return normalize2(joined);
}

// https://jsr.io/@std/path/1.0.6/join.ts
function join3(...paths) {
  return isWindows ? join2(...paths) : join(...paths);
}

// https://jsr.io/@std/fmt/1.0.2/colors.ts
var { Deno: Deno2 } = globalThis;
var noColor = typeof Deno2?.noColor === "boolean" ? Deno2.noColor : false;
var enabled = !noColor;
function code(open, close) {
  return {
    open: `\x1B[${open.join(";")}m`,
    close: `\x1B[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, "g")
  };
}
function run(str, code2) {
  return enabled ? `${code2.open}${str.replace(code2.regexp, code2.open)}${code2.close}` : str;
}
function bold(str) {
  return run(str, code([1], 22));
}
function italic(str) {
  return run(str, code([3], 23));
}
function blue(str) {
  return run(str, code([34], 39));
}
var ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TXZcf-nq-uy=><~]))"
  ].join("|"),
  "g"
);
function stripAnsiCode(string) {
  return string.replace(ANSI_PATTERN, "");
}

// https://jsr.io/@nathanwhit/promptly/0.1.2/mod.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
async function* readKeys() {
  loop: while (true) {
    const buf = new Uint8Array(8);
    const byteCount = await Deno.stdin.read(buf);
    if (byteCount == null) {
      break;
    } else if (byteCount === 3) {
      if (buf[0] === 27 && buf[1] === 91) {
        switch (buf[2]) {
          // ESC[A -> cursor up
          case 65:
            yield 0 /* Up */;
            continue;
          // ESC[B -> cursor down
          case 66:
            yield 1 /* Down */;
            continue;
          // ESC[C -> cursor right
          case 67:
            yield 3 /* Right */;
            continue;
          // ESC[D -> cursor left
          case 68:
            yield 2 /* Left */;
            continue;
        }
      }
    } else if (byteCount === 1) {
      const c = buf[0];
      switch (c) {
        case 3:
          break loop;
        case 13:
          yield 4 /* Enter */;
          continue;
        case 32:
          yield 5 /* Space */;
          continue;
        case 127:
          yield 6 /* Backspace */;
          continue;
      }
    }
    const text = stripAnsiCode(decoder.decode(buf.subarray(0, byteCount ?? 0)));
    if (text.length > 0) {
      yield text;
    }
  }
}
function writeAll(writer, buf) {
  let pos = 0;
  while (pos < buf.byteLength) {
    pos += writer.writeSync(buf.subarray(pos));
  }
}
var charCodes = (...cs) => {
  const map = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    map[c.charAt(0)] = c.charCodeAt(0);
  }
  return map;
};
function assertUnreachable(_x) {
  throw new Error("unreachable");
}
var codes = charCodes("A", "B", "C", "D", "G", "0", "K");
function moveCursor(writer, dir, n) {
  const seq = [27, 91];
  if (n != void 0) {
    seq.push(...encoder.encode(n.toString()));
  }
  switch (dir) {
    case 0 /* Up */:
      seq.push(codes.A);
      break;
    case 1 /* Down */:
      seq.push(codes.B);
      break;
    case 2 /* Left */:
      seq.push(codes.D);
      break;
    case 3 /* Right */:
      seq.push(codes.C);
      break;
    case 4 /* Column */:
      seq.push(codes.G);
      break;
    default:
      assertUnreachable(dir);
  }
  const buf = new Uint8Array(seq);
  writeAll(writer, buf);
}
function eraseToEnd(writer) {
  writeAll(writer, new Uint8Array([27, 91, codes[0], codes.K]));
}
function hideCursor(writer) {
  writeAll(writer, encoder.encode("\x1B[?25l"));
}
function showCursor(writer) {
  writeAll(writer, encoder.encode("\x1B[?25h"));
}
var lastPromise = Promise.resolve();
function ensureSingleSelection(action) {
  const currentLastPromise = lastPromise;
  const currentPromise = (async () => {
    try {
      await currentLastPromise;
    } catch {
    }
    hideCursor(Deno.stdout);
    try {
      Deno.stdin.setRaw(true);
      try {
        return await action();
      } finally {
        Deno.stdin.setRaw(false);
      }
    } finally {
      showCursor(Deno.stdout);
    }
  })();
  lastPromise = currentPromise;
  return currentPromise;
}
function clearRow(writer) {
  moveCursor(writer, 4 /* Column */);
  eraseToEnd(writer);
}
var row = 0;
function writeLines(writer, lines) {
  while (row > 0) {
    clearRow(writer);
    moveCursor(writer, 0 /* Up */);
    row--;
  }
  clearRow(writer);
  for (const [i, line] of lines.entries()) {
    moveCursor(writer, 4 /* Column */);
    let suffix = "";
    if (i < lines.length - 1) {
      suffix = "\n";
      row++;
    }
    writer.writeSync(
      encoder.encode(line + suffix)
    );
  }
  moveCursor(writer, 4 /* Column */);
}
function createSelection(options) {
  row = 0;
  return ensureSingleSelection(async () => {
    writeLines(Deno.stdout, options.render());
    for await (const key of readKeys()) {
      const keyResult = options.onKey(key);
      if (keyResult != null) {
        writeLines(Deno.stdout, []);
        if (options.noClear) {
          writeLines(Deno.stdout, options.render());
          console.log();
        }
        return keyResult;
      }
      writeLines(Deno.stdout, options.render());
    }
    writeLines(Deno.stdout, []);
    return void 0;
  });
}
function resultOrExit(result) {
  if (result == null) {
    Deno.exit(120);
  } else {
    return result;
  }
}
async function multiSelect(options) {
  const result = await maybeMultiSelect(options);
  return resultOrExit(result);
}
function maybeMultiSelect(options) {
  const state = {
    title: options.message,
    activeIndex: 0,
    items: options.options.map((option) => {
      if (typeof option === "string") {
        option = {
          text: option
        };
      }
      return {
        selected: option.selected ?? false,
        text: option.text
      };
    }),
    hasCompleted: false
  };
  const {
    selected = "[x]",
    unselected = "[ ]",
    pointer = ">",
    listBullet = "-",
    messageStyle = (s) => bold(blue(s))
  } = options.styling ?? {};
  const style = {
    selected,
    unselected,
    pointer,
    listBullet,
    messageStyle
  };
  return createSelection({
    message: options.message,
    noClear: options.noClear,
    render: () => renderMultiSelect(state, style),
    onKey: (key) => {
      switch (key) {
        case 0 /* Up */:
        case "k":
          if (state.activeIndex === 0) {
            state.activeIndex = state.items.length - 1;
          } else {
            state.activeIndex--;
          }
          break;
        case 1 /* Down */:
        case "j":
          state.activeIndex = (state.activeIndex + 1) % state.items.length;
          break;
        case 5 /* Space */: {
          const item = state.items[state.activeIndex];
          item.selected = !item.selected;
          break;
        }
        case 4 /* Enter */:
          state.hasCompleted = true;
          return state.items.map((value, index) => [value, index]).filter(([value]) => value.selected).map(([, index]) => index);
      }
    }
  });
}
function renderMultiSelect(state, style) {
  const items = [];
  items.push(style.messageStyle(state.title));
  if (state.hasCompleted) {
    if (state.items.some((i) => i.selected)) {
      for (const item of state.items) {
        if (item.selected) {
          items.push(
            `${" ".repeat(
              style.pointer.length + style.selected.length - style.listBullet.length - 2
            )}${style.listBullet} ${item.text}`
          );
        }
      }
    } else {
      items.push(italic(" <None>"));
    }
  } else {
    for (const [i, item] of state.items.entries()) {
      const prefix = i === state.activeIndex ? `${style.pointer} ` : `${" ".repeat(style.pointer.length + 1)}`;
      items.push(
        `${prefix}${item.selected ? style.selected : style.unselected} ${item.text}`
      );
    }
  }
  return items;
}
async function confirm(optsOrMessage, options) {
  const result = await maybeConfirm(optsOrMessage, options);
  return resultOrExit(result);
}
function maybeConfirm(optsOrMessage, options) {
  const opts = typeof optsOrMessage === "string" ? { message: optsOrMessage, ...options } : optsOrMessage;
  return innerConfirm(opts);
}
function innerConfirm(options) {
  const {
    messageStyle = (s) => bold(blue(s))
  } = options.styling ?? {};
  const style = {
    messageStyle
  };
  const state = {
    title: options.message,
    default: options.default,
    inputText: "",
    hasCompleted: false
  };
  return createSelection({
    message: options.message,
    noClear: options.noClear,
    render: () => renderConfirm(state, style),
    onKey: (key) => {
      switch (key) {
        case "Y":
        case "y":
          state.inputText = "Y";
          break;
        case "N":
        case "n":
          state.inputText = "N";
          break;
        case 6 /* Backspace */:
          state.inputText = "";
          break;
        case 4 /* Enter */:
          if (state.inputText.length === 0) {
            if (state.default == null) {
              return void 0;
            }
            state.inputText = state.default ? "Y" : "N";
          }
          state.hasCompleted = true;
          return state.inputText === "Y" ? true : state.inputText === "N" ? false : state.default;
      }
    }
  });
}
function renderConfirm(state, style) {
  return [
    style.messageStyle(state.title) + " " + (state.hasCompleted ? "" : state.default == null ? "(Y/N) " : state.default ? "(Y/n) " : "(y/N) ") + state.inputText + (state.hasCompleted ? "" : "\u2588")
  ];
}

// https://jsr.io/@std/cli/1.0.6/parse_args.ts
var FLAG_REGEXP = /^(?:-(?:(?<doubleDash>-)(?<negated>no-)?)?)(?<key>.+?)(?:=(?<value>.+?))?$/s;
var LETTER_REGEXP = /[A-Za-z]/;
var NUMBER_REGEXP = /-?\d+(\.\d*)?(e-?\d+)?$/;
var HYPHEN_REGEXP = /^(-|--)[^-]/;
var VALUE_REGEXP = /=(?<value>.+)/;
var FLAG_NAME_REGEXP = /^--[^=]+$/;
var SPECIAL_CHAR_REGEXP = /\W/;
var NON_WHITESPACE_REGEXP = /\S/;
function isNumber(string) {
  return NON_WHITESPACE_REGEXP.test(string) && Number.isFinite(Number(string));
}
function setNested(object, keys, value, collect = false) {
  keys = [...keys];
  const key = keys.pop();
  keys.forEach((key2) => object = object[key2] ??= {});
  if (collect) {
    const v = object[key];
    if (Array.isArray(v)) {
      v.push(value);
      return;
    }
    value = v ? [v, value] : [value];
  }
  object[key] = value;
}
function hasNested(object, keys) {
  for (const key of keys) {
    const value = object[key];
    if (!Object.hasOwn(object, key)) return false;
    object = value;
  }
  return true;
}
function aliasIsBoolean(aliasMap, booleanSet, key) {
  const set = aliasMap.get(key);
  if (set === void 0) return false;
  for (const alias of set) if (booleanSet.has(alias)) return true;
  return false;
}
function isBooleanString(value) {
  return value === "true" || value === "false";
}
function parseBooleanString(value) {
  return value !== "false";
}
function parseArgs(args, options) {
  const {
    "--": doubleDash = false,
    alias = {},
    boolean = false,
    default: defaults = {},
    stopEarly = false,
    string = [],
    collect = [],
    negatable = [],
    unknown: unknownFn = (i) => i
  } = options ?? {};
  const aliasMap = /* @__PURE__ */ new Map();
  const booleanSet = /* @__PURE__ */ new Set();
  const stringSet = /* @__PURE__ */ new Set();
  const collectSet = /* @__PURE__ */ new Set();
  const negatableSet = /* @__PURE__ */ new Set();
  let allBools = false;
  if (alias) {
    for (const [key, value] of Object.entries(alias)) {
      if (value === void 0) {
        throw new TypeError("Alias value must be defined");
      }
      const aliases = Array.isArray(value) ? value : [value];
      aliasMap.set(key, new Set(aliases));
      aliases.forEach(
        (alias2) => aliasMap.set(
          alias2,
          /* @__PURE__ */ new Set([key, ...aliases.filter((it) => it !== alias2)])
        )
      );
    }
  }
  if (boolean) {
    if (typeof boolean === "boolean") {
      allBools = boolean;
    } else {
      const booleanArgs = Array.isArray(boolean) ? boolean : [boolean];
      for (const key of booleanArgs.filter(Boolean)) {
        booleanSet.add(key);
        aliasMap.get(key)?.forEach((al) => {
          booleanSet.add(al);
        });
      }
    }
  }
  if (string) {
    const stringArgs = Array.isArray(string) ? string : [string];
    for (const key of stringArgs.filter(Boolean)) {
      stringSet.add(key);
      aliasMap.get(key)?.forEach((al) => stringSet.add(al));
    }
  }
  if (collect) {
    const collectArgs = Array.isArray(collect) ? collect : [collect];
    for (const key of collectArgs.filter(Boolean)) {
      collectSet.add(key);
      aliasMap.get(key)?.forEach((al) => collectSet.add(al));
    }
  }
  if (negatable) {
    const negatableArgs = Array.isArray(negatable) ? negatable : [negatable];
    for (const key of negatableArgs.filter(Boolean)) {
      negatableSet.add(key);
      aliasMap.get(key)?.forEach((alias2) => negatableSet.add(alias2));
    }
  }
  const argv = { _: [] };
  function setArgument(key, value, arg, collect2) {
    if (!booleanSet.has(key) && !stringSet.has(key) && !aliasMap.has(key) && !(allBools && FLAG_NAME_REGEXP.test(arg)) && unknownFn?.(arg, key, value) === false) {
      return;
    }
    if (typeof value === "string" && !stringSet.has(key)) {
      value = isNumber(value) ? Number(value) : value;
    }
    const collectable = collect2 && collectSet.has(key);
    setNested(argv, key.split("."), value, collectable);
    aliasMap.get(key)?.forEach((key2) => {
      setNested(argv, key2.split("."), value, collectable);
    });
  }
  let notFlags = [];
  const index = args.indexOf("--");
  if (index !== -1) {
    notFlags = args.slice(index + 1);
    args = args.slice(0, index);
  }
  argsLoop:
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const groups = arg.match(FLAG_REGEXP)?.groups;
      if (groups) {
        const { doubleDash: doubleDash2, negated } = groups;
        let key = groups.key;
        let value = groups.value;
        if (doubleDash2) {
          if (value) {
            if (booleanSet.has(key)) value = parseBooleanString(value);
            setArgument(key, value, arg, true);
            continue;
          }
          if (negated) {
            if (negatableSet.has(key)) {
              setArgument(key, false, arg, false);
              continue;
            }
            key = `no-${key}`;
          }
          const next = args[i + 1];
          if (next) {
            if (!booleanSet.has(key) && !allBools && !next.startsWith("-") && (!aliasMap.has(key) || !aliasIsBoolean(aliasMap, booleanSet, key))) {
              value = next;
              i++;
              setArgument(key, value, arg, true);
              continue;
            }
            if (isBooleanString(next)) {
              value = parseBooleanString(next);
              i++;
              setArgument(key, value, arg, true);
              continue;
            }
          }
          value = stringSet.has(key) ? "" : true;
          setArgument(key, value, arg, true);
          continue;
        }
        const letters = arg.slice(1, -1).split("");
        for (const [j, letter] of letters.entries()) {
          const next = arg.slice(j + 2);
          if (next === "-") {
            setArgument(letter, next, arg, true);
            continue;
          }
          if (LETTER_REGEXP.test(letter)) {
            const groups2 = VALUE_REGEXP.exec(next)?.groups;
            if (groups2) {
              setArgument(letter, groups2.value, arg, true);
              continue argsLoop;
            }
            if (NUMBER_REGEXP.test(next)) {
              setArgument(letter, next, arg, true);
              continue argsLoop;
            }
          }
          if (letters[j + 1]?.match(SPECIAL_CHAR_REGEXP)) {
            setArgument(letter, arg.slice(j + 2), arg, true);
            continue argsLoop;
          }
          setArgument(letter, stringSet.has(letter) ? "" : true, arg, true);
        }
        key = arg.slice(-1);
        if (key === "-") continue;
        const nextArg = args[i + 1];
        if (nextArg) {
          if (!HYPHEN_REGEXP.test(nextArg) && !booleanSet.has(key) && (!aliasMap.has(key) || !aliasIsBoolean(aliasMap, booleanSet, key))) {
            setArgument(key, nextArg, arg, true);
            i++;
            continue;
          }
          if (isBooleanString(nextArg)) {
            const value2 = parseBooleanString(nextArg);
            setArgument(key, value2, arg, true);
            i++;
            continue;
          }
        }
        setArgument(key, stringSet.has(key) ? "" : true, arg, true);
        continue;
      }
      if (unknownFn?.(arg) !== false) {
        argv._.push(
          stringSet.has("_") || !isNumber(arg) ? arg : Number(arg)
        );
      }
      if (stopEarly) {
        argv._.push(...args.slice(i + 1));
        break;
      }
    }
  for (const [key, value] of Object.entries(defaults)) {
    const keys = key.split(".");
    if (!hasNested(argv, keys)) {
      setNested(argv, keys, value);
      aliasMap.get(key)?.forEach(
        (key2) => setNested(argv, key2.split("."), value)
      );
    }
  }
  for (const key of booleanSet.keys()) {
    const keys = key.split(".");
    if (!hasNested(argv, keys)) {
      const value = collectSet.has(key) ? [] : false;
      setNested(argv, keys, value);
    }
  }
  for (const key of stringSet.keys()) {
    const keys = key.split(".");
    if (!hasNested(argv, keys) && collectSet.has(key)) {
      setNested(argv, keys, []);
    }
  }
  if (doubleDash) {
    argv["--"] = notFlags;
  } else {
    argv._.push(...notFlags);
  }
  return argv;
}

// src/util.ts
var { isExistingDir, mkdir } = environment;
function withContext(ctx, error) {
  return new Error(ctx, { cause: error });
}
async function filterAsync(arr, pred) {
  const filtered = await Promise.all(arr.map((v) => pred(v)));
  return arr.filter((_, i) => filtered[i]);
}
function withEnvVar(name, f) {
  const value = environment.getEnv(name);
  return f(value);
}
function shellEnvContains(s) {
  return withEnvVar("SHELL", (sh) => sh !== void 0 && sh.includes(s));
}
function warn(s) {
  console.error(`%cwarning%c: ${s}`, "color: yellow", "color: inherit");
}
function info(s) {
  console.error(`%cinfo%c: ${s}`, "color: green", "color: inherit");
}
async function ensureExists(dirPath) {
  if (!await isExistingDir(dirPath)) {
    await mkdir(dirPath, {
      recursive: true
    });
  }
}
function ensureEndsWith(s, suffix) {
  if (!s.endsWith(suffix)) {
    return s + suffix;
  }
  return s;
}
function ensureStartsWith(s, prefix) {
  if (!s.startsWith(prefix)) {
    return prefix + s;
  }
  return s;
}

// src/shell.ts
var {
  isExistingFile,
  writeTextFile,
  homeDir,
  findCmd,
  runCmd,
  getEnv,
  pathExists
} = environment;
var ShellScript = class {
  constructor(name, contents) {
    this.name = name;
    this.contents = contents;
  }
  equals(other) {
    return this.name === other.name && this.contents === other.contents;
  }
  async write(denoInstallDir) {
    const envFilePath = join3(denoInstallDir, this.name);
    try {
      await writeTextFile(envFilePath, this.contents);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        return false;
      }
      throw withContext(
        `Failed to write ${this.name} file to ${envFilePath}`,
        error
      );
    }
  }
};
var shEnvScript = (installDir) => new ShellScript(
  "env",
  `#!/bin/sh
# deno shell setup; adapted from rustup
# affix colons on either side of $PATH to simplify matching
case ":\${PATH}:" in
    *:"${installDir}/bin":*)
        ;;
    *)
        # Prepending path in case a system-installed deno executable needs to be overridden
        export PATH="${installDir}/bin:$PATH"
        ;;
esac
`
);
var shSourceString = (installDir) => {
  return `. "${installDir}/env"`;
};
var Posix = class {
  name = "sh";
  supportsCompletion = false;
  exists() {
    return true;
  }
  rcfiles() {
    return [join3(homeDir, ".profile")];
  }
  rcsToUpdate() {
    return this.rcfiles();
  }
};
var Bash = class {
  name = "bash";
  get supportsCompletion() {
    if (Deno.build.os === "darwin") {
      return "not recommended on macOS";
    }
    return true;
  }
  async exists() {
    return (await this.rcsToUpdate()).length > 0;
  }
  rcfiles() {
    return [".bash_profile", ".bash_login", ".bashrc"].map((rc) => join3(homeDir, rc));
  }
  rcsToUpdate() {
    return filterAsync(this.rcfiles(), isExistingFile);
  }
  completionsFilePath() {
    const USER = Deno.env.get("USER");
    if (USER === "root") {
      return "/usr/local/etc/bash_completion.d/deno.bash";
    }
    return join3(homeDir, ".local/share/bash-completion/completions/deno.bash");
  }
  completionsSourceString() {
    return `source ${this.completionsFilePath()}`;
  }
};
var Zsh = class {
  name = "zsh";
  supportsCompletion = true;
  async exists() {
    if (shellEnvContains("zsh") || await findCmd("zsh")) {
      return true;
    }
    return false;
  }
  async getZshDotDir() {
    let zshDotDir;
    if (shellEnvContains("zsh")) {
      zshDotDir = getEnv("ZDOTDIR");
    } else {
      const output = await runCmd("zsh", [
        "-c",
        "echo -n $ZDOTDIR"
      ]);
      const stdout = new TextDecoder().decode(output.stdout).trim();
      zshDotDir = stdout.length > 0 ? stdout : void 0;
    }
    return zshDotDir;
  }
  async rcfiles() {
    const zshDotDir = await this.getZshDotDir();
    return [zshDotDir, homeDir].map(
      (dir) => dir ? join3(dir, ".zshrc") : void 0
    ).filter((dir) => dir !== void 0);
  }
  async rcsToUpdate() {
    let out = await filterAsync(
      await this.rcfiles(),
      isExistingFile
    );
    if (out.length === 0) {
      out = await this.rcfiles();
    }
    return out;
  }
  async completionsFilePath() {
    let zshDotDir = await this.getZshDotDir();
    if (!zshDotDir) {
      zshDotDir = join3(homeDir, ".zsh");
    }
    return join3(zshDotDir, "completions", "_deno.zsh");
  }
  async completionsSourceString() {
    const filePath = await this.completionsFilePath();
    const completionDir = dirname3(filePath);
    const fpathSetup = `# Add deno completions to search path
if [[ ":$FPATH:" != *":${completionDir}:"* ]]; then export FPATH="${completionDir}:$FPATH"; fi`;
    const zshDotDir = await this.getZshDotDir() ?? homeDir;
    let append;
    if ((await filterAsync(
      [".zcompdump", ".oh_my_zsh", ".zprezto"],
      (f) => pathExists(join3(zshDotDir, f))
    )).length == 0) {
      append = "# Initialize zsh completions (added by deno install script)\nautoload -Uz compinit\ncompinit";
    }
    return {
      prepend: fpathSetup,
      append
    };
  }
};
var Fish = class {
  name = "fish";
  supportsCompletion = true;
  async exists() {
    if (shellEnvContains("fish") || await findCmd("fish")) {
      return true;
    }
    return false;
  }
  fishConfigDir() {
    const first = withEnvVar("XDG_CONFIG_HOME", (p) => {
      if (!p) return;
      return join3(p, "fish");
    });
    return first ?? join3(homeDir, ".config", "fish");
  }
  rcfiles() {
    const conf = "conf.d/deno.fish";
    return [join3(this.fishConfigDir(), conf)];
  }
  rcsToUpdate() {
    return this.rcfiles();
  }
  envScript(installDir) {
    const fishEnv = `
# deno shell setup
if not contains "${installDir}/bin" $PATH
  # prepend to path to take precedence over potential package manager deno installations
  set -x PATH "${installDir}/bin" $PATH
end
`;
    return new ShellScript("env.fish", fishEnv);
  }
  sourceString(installDir) {
    return `source "${installDir}/env.fish"`;
  }
  completionsFilePath() {
    return join3(this.fishConfigDir(), "completions", "deno.fish");
  }
  // no further config needed for completions
};

// src/main.ts
var {
  readTextFile,
  runCmd: runCmd2,
  writeTextFile: writeTextFile2
} = environment;
async function writeCompletionFiles(availableShells) {
  const written = /* @__PURE__ */ new Set();
  const results = [];
  const decoder2 = new TextDecoder();
  for (const shell of availableShells) {
    if (!shell.supportsCompletion) {
      results.push(null);
      continue;
    }
    try {
      const completionFilePath = await shell.completionsFilePath?.();
      if (!completionFilePath) {
        results.push(null);
        continue;
      }
      await ensureExists(dirname3(completionFilePath));
      const output = await runCmd2(Deno.execPath(), ["completions", shell.name]);
      if (!output.success) {
        throw new Error(
          `deno completions subcommand failed, stderr was: ${decoder2.decode(output.stderr)}`
        );
      }
      const completionFileContents = decoder2.decode(output.stdout);
      if (!completionFileContents) {
        warn(`Completions were empty, skipping ${shell.name}`);
        results.push("fail");
        continue;
      }
      let currentContents = null;
      try {
        currentContents = await readTextFile(completionFilePath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        } else {
        }
      }
      if (currentContents !== completionFileContents) {
        if (currentContents !== null) {
          warn(
            `an existing completion file for deno already exists at ${completionFilePath}, but is out of date. overwriting with new contents`
          );
        }
        await writeTextFile2(completionFilePath, completionFileContents);
      }
      results.push("success");
      written.add(completionFilePath);
    } catch (error) {
      warn(`Failed to install completions for ${shell.name}: ${error}`);
      results.push("fail");
      continue;
    }
  }
  return results;
}
var Backups = class {
  constructor(backupDir) {
    this.backupDir = backupDir;
  }
  backedUp = /* @__PURE__ */ new Set();
  async add(path, contents) {
    if (this.backedUp.has(path)) {
      return;
    }
    const dest = join3(this.backupDir, basename3(path)) + `.bak`;
    info(
      `backing '${path}' up to '${dest}'`
    );
    await Deno.writeTextFile(dest, contents);
    this.backedUp.add(path);
  }
};
async function writeCompletionRcCommands(availableShells, backups) {
  for (const shell of availableShells) {
    if (!shell.supportsCompletion) continue;
    const rcCmd = await shell.completionsSourceString?.();
    if (!rcCmd) continue;
    for (const rc of await shell.rcsToUpdate()) {
      await updateRcFile(rc, rcCmd, backups);
    }
  }
}
async function writeEnvFiles(availableShells, installDir) {
  const written = new Array();
  let i = 0;
  while (i < availableShells.length) {
    const shell = availableShells[i];
    const script = (shell.envScript ?? shEnvScript)(installDir);
    if (!written.some((s) => s.equals(script))) {
      if (await script.write(installDir)) {
        written.push(script);
      } else {
        continue;
      }
    }
    i++;
  }
}
async function updateRcFile(rc, command, backups) {
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
  let contents;
  try {
    contents = await readTextFile(rc);
    if (prepend) {
      if (contents.includes(prepend)) {
        prepend = "";
      } else {
        prepend = ensureEndsWith(prepend, "\n");
      }
    }
    if (append) {
      if (contents.includes(append)) {
        append = "";
      } else if (!contents.endsWith("\n")) {
        append = ensureStartsWith(append, "\n");
      }
    }
  } catch (_error) {
    prepend = prepend ? ensureEndsWith(prepend, "\n") : prepend;
  }
  if (!prepend && !append) {
    return false;
  }
  if (contents !== void 0) {
    await backups.add(rc, contents);
  }
  await ensureExists(dirname3(rc));
  try {
    await writeTextFile2(rc, prepend + (contents ?? "") + append, {
      create: true
    });
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied || // deno-lint-ignore no-explicit-any
    error instanceof Deno.errors.NotCapable) {
      return false;
    }
    throw withContext(`Failed to update shell rc file: ${rc}`, error);
  }
}
async function addToPath(availableShells, installDir, backups) {
  for (const shell of availableShells) {
    const sourceCmd = await (shell.sourceString ?? shSourceString)(installDir);
    for (const rc of await shell.rcsToUpdate()) {
      await updateRcFile(rc, sourceCmd, backups);
    }
  }
}
var shells = [
  new Posix(),
  new Bash(),
  new Zsh(),
  new Fish()
];
async function getAvailableShells() {
  const present = [];
  for (const shell of shells) {
    try {
      if (await shell.exists()) {
        present.push(shell);
      }
    } catch (_e) {
      continue;
    }
  }
  return present;
}
async function setupShells(installDir, backupDir, opts) {
  const {
    skipPrompts,
    noModifyPath
  } = opts;
  const availableShells = await getAvailableShells();
  await writeEnvFiles(availableShells, installDir);
  const backups = new Backups(backupDir);
  if (skipPrompts && !noModifyPath || !skipPrompts && await confirm(`Edit shell configs to add deno to the PATH?`, {
    default: true
  })) {
    await ensureExists(backupDir);
    await addToPath(availableShells, installDir, backups);
    console.log(
      "\nDeno was added to the PATH.\nYou may need to restart your shell for it to become available.\n"
    );
  }
  const shellsWithCompletion = availableShells.filter(
    (s) => s.supportsCompletion !== false
  );
  const selected = skipPrompts ? [] : await multiSelect(
    {
      message: `Set up completions?`,
      options: shellsWithCompletion.map((s) => {
        const maybeNotes = typeof s.supportsCompletion === "string" ? ` (${s.supportsCompletion})` : "";
        return s.name + maybeNotes;
      })
    }
  );
  const completionsToSetup = selected.map((idx) => shellsWithCompletion[idx]);
  if (completionsToSetup.length > 0) {
    await ensureExists(backupDir);
    const results = await writeCompletionFiles(completionsToSetup);
    await writeCompletionRcCommands(
      completionsToSetup.filter((_s, i) => results[i] !== "fail"),
      backups
    );
  }
}
function printHelp() {
  console.log(`

Setup script for installing deno

Options:
  -y, --yes
    Skip interactive prompts and accept defaults
  --no-modify-path
    Don't add deno to the PATH environment variable
  -h, --help
    Print help
`);
}
async function main() {
  if (Deno.args.length === 0) {
    throw new Error(
      "Expected the deno install directory as the first argument"
    );
  }
  const args = parseArgs(Deno.args.slice(1), {
    boolean: ["yes", "no-modify-path", "help"],
    alias: {
      "yes": "y",
      "help": "h"
    },
    default: {
      yes: false,
      "no-modify-path": false
    },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        printHelp();
        console.error(`Unknown flag ${arg}. Shell will not be configured`);
        Deno.exit(1);
      }
      return false;
    }
  });
  if (args.help) {
    printHelp();
    return;
  }
  if (Deno.build.os === "windows" || !args.yes && !(Deno.stdin.isTerminal() && Deno.stdout.isTerminal())) {
    return;
  }
  const installDir = Deno.args[0].trim();
  const backupDir = join3(installDir, ".shellRcBackups");
  try {
    await setupShells(installDir, backupDir, {
      skipPrompts: args.yes,
      noModifyPath: args["no-modify-path"]
    });
  } catch (_e) {
    warn(
      `Failed to configure your shell environments, you may need to manually add deno to your PATH environment variable.

Manually add the directory to your $HOME/.bashrc (or similar)":
  export DENO_INSTALL="${installDir}"
  export PATH="${installDir}/bin:$PATH"
`
    );
  }
}
if (import.meta.main) {
  await main();
}
