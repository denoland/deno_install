// deno-lint-ignore-file require-await

import { _environmentImpl, type Environment } from "../environment.ts";

const testNameRegex = /^##test##(.+)$/;

type Callsite = {
  getFunctionName(): string | null;
  getFileName(): string | null;
  getLineNumber(): number;
  getColumnNumber(): number;
};

function getCallsites(): Callsite[] {
  const old = (Error as Any).prepareStackTrace;
  let callsites: Any[] = [];
  (Error as Any).prepareStackTrace = (_: Error, stack: Any[]) => {
    callsites = stack;
  };
  const err: { stack?: Any } = {};
  Error.captureStackTrace(err);
  err.stack;
  (Error as Any).prepareStackTrace = old;
  callsites.shift();
  return callsites;
}

function getTestName(): string {
  const callsites = getCallsites();
  const index = callsites.findIndex((callsite) => {
    const functionName = callsite.getFunctionName();
    return functionName !== null && testNameRegex.test(functionName);
  });
  if (index === -1) {
    throw new Error("Could not find test name");
  }
  const callsite = callsites[index];
  const match = testNameRegex.exec(callsite.getFunctionName()!);
  if (match === null) {
    throw new Error("Could not find test name");
  }
  return match[1];
}

class PerTestStore<T> {
  #store: Map<string, T>;
  #constr: new () => T;

  constructor(constr: new () => T) {
    this.#store = new Map();
    this.#constr = constr;
  }

  registerTest(testName: string) {
    this.#store.set(testName, new this.#constr());
    return this.#store.get(testName)!;
  }

  currentTest(): T {
    const testName = getTestName();
    if (!this.#store.has(testName)) {
      this.#store.set(testName, new this.#constr());
    }
    return this.#store.get(testName)!;
  }
}

class InMemoryStore {
  #store: Map<string, string>;

  constructor() {
    this.#store = new Map();
  }

  get(path: string): string | undefined {
    return this.#store.get(path);
  }

  set(path: string, contents: string) {
    this.#store.set(path, contents);
  }

  has(path: string): boolean {
    return this.#store.has(path);
  }

  toString(): string {
    return JSON.stringify(Object.fromEntries(this.#store));
  }
}

const fsFunctions = [
  "isExistingDir",
  "isExistingFile",
  "mkdir",
  "pathExists",
  "readTextFile",
  "writeTextFile",
] as const;

type FsFunctions = typeof fsFunctions[number];

// abstract class FsNode {
// }

type DirNode = {
  type: "dir";
  entries: Map<string, FsNode>;
};

function newDirNode(entries: Map<string, FsNode> = new Map()): DirNode {
  return {
    type: "dir",
    entries,
  };
}

function newFileNode(contents: string = ""): FileNode {
  return {
    type: "file",
    contents,
  };
}

type FileNode = {
  type: "file";
  contents: string;
};

type FsNode = DirNode | FileNode;

function assertNever(never: never): never {
  throw new Error(`unreachable: ${never}`);
}

class InMemoryFs implements
  Pick<
    Environment,
    FsFunctions
  > {
  root: DirNode;

  constructor() {
    this.root = newDirNode();
    this.mkdir("/test/home", {
      recursive: true,
    });
  }

  [Symbol.dispose]() {
    this.reset();
  }

  reset() {
    this.root = newDirNode();
    this.mkdir("/test/home", {
      recursive: true,
    });
  }

  #findNode(path: string): FsNode | undefined {
    const parts = path.replace(/\/$/, "").replace(/^\//, "").split("/");
    let current: FsNode = this.root;
    for (const part of parts) {
      if (current.type !== "dir") {
        return undefined;
      }
      const node = current.entries.get(part);
      if (!node) {
        return undefined;
      }
      current = node;
    }
    return current;
  }

  #findFileOrParentDir(path: string): FsNode | undefined {
    const parts = path.replace(/\/$/, "").replace(/^\//, "").split("/");
    let current: FsNode = this.root;
    for (const part of parts) {
      if (current.type !== "dir") {
        return undefined;
      }
      const node = current.entries.get(part);
      if (!node) {
        return current;
      }
      current = node;
    }
    if (current.type === "dir") {
      throw new Deno.errors.IsADirectory();
    }
    return current;
  }

  exists(path: string): boolean {
    return this.#findNode(path) !== undefined;
  }

  async isExistingFile(path: string): Promise<boolean> {
    return this.#findNode(path)?.type === "file";
  }

  async isExistingDir(path: string): Promise<boolean> {
    return this.#findNode(path)?.type === "dir";
  }

  fileInfo(path: string): { isFile: boolean; isDirectory: boolean } {
    const node = this.#findNode(path);
    let isFile = false, isDirectory = false;
    switch (node?.type) {
      case "dir": {
        isDirectory = true;
        break;
      }
      case "file": {
        isFile = true;
        break;
      }
      case undefined: {
        throw new Deno.errors.NotFound();
      }
      default: {
        assertNever(node);
      }
    }
    return { isFile: isFile, isDirectory: isDirectory };
  }

  async readTextFile(
    path: string | URL,
    _options?: Deno.ReadFileOptions,
  ): Promise<string> {
    const node = this.#findNode(path.toString());
    if (node?.type !== "file") {
      throw new Deno.errors.NotFound();
    }
    return node.contents;
  }

  async writeTextFile(
    path: string | URL,
    contents: string | ReadableStream<string>,
    options?: Deno.WriteFileOptions,
  ): Promise<void> {
    const {
      append = false,
      create = true,
      createNew = false,
    } = options ?? {};
    const node = this.#findFileOrParentDir(path.toString());
    if (createNew && node?.type === "file") {
      throw new Deno.errors.AlreadyExists();
    }
    if (!create && node?.type === "dir") {
      throw new Deno.errors.NotFound();
    }
    if (!node) {
      throw new Deno.errors.NotFound();
    }

    let fileNode: FsNode;
    if (node.type === "dir") {
      fileNode = newFileNode("");
      node.entries.set(path.toString().split("/").pop()!, fileNode);
    } else {
      fileNode = node;
    }
    let newContents = "";
    if (typeof contents === "string") {
      newContents = append ? fileNode.contents + contents : contents;
    } else {
      for await (const chunk of contents) {
        newContents += chunk;
      }
    }
    fileNode.contents = newContents;
  }

  async pathExists(path: string): Promise<boolean> {
    return this.exists(path);
  }

  async mkdir(path: string | URL, options?: Deno.MkdirOptions): Promise<void> {
    const { recursive = false } = options ?? {};
    path = path.toString().replace(/\/$/, "").replace(/^\//, "");
    const parts = path.split("/");
    let current: FsNode = this.root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current.type !== "dir") {
        throw new Deno.errors.NotADirectory();
      }
      if (!current.entries.has(part)) {
        if (i === parts.length - 1 || recursive) {
          current.entries.set(part, newDirNode());
        } else {
          throw new Deno.errors.NotFound();
        }
      }
      current = current.entries.get(part)!;
    }
  }

  tree(): string {
    let output = "/\n";
    const walk = (node: FsNode, indent: string) => {
      if (node.type === "dir") {
        for (const [name, child] of node.entries) {
          console.log("child", name, child);
          if (child.type === "dir") {
            output += `${indent}${name}/\n`;
            walk(child, indent + "  ");
          } else {
            output += `${indent}${name}\n`;
          }
        }
      }
    };
    walk(this.root, "  ");
    return output.trimEnd();
  }
}

class FileStore extends PerTestStore<InMemoryFs> {
  constructor() {
    super(InMemoryFs);
  }
}

class EnvStore extends PerTestStore<InMemoryStore> {
  constructor() {
    super(InMemoryStore);
  }
}

const mockEnvironment = (
  fileStore: FileStore,
  envVars: EnvStore,
): Environment => {
  const fsMocksSetup: Partial<Pick<Environment, FsFunctions>> = {};
  for (const fn of fsFunctions) {
    (fsMocksSetup as Any)[fn] = async (...args: unknown[]) => {
      return await ((fileStore.currentTest()[fn] as Any)(...args));
    };
  }
  const fsMocks = fsMocksSetup as Pick<Environment, FsFunctions>;
  return {
    ...fsMocks,
    homeDir: "/test/home",
    async findCmd(command: string) {
      return await which(command, {
        stat: async (path) => {
          return fileStore.currentTest().fileInfo(path);
        },
        env: (name) => envVars.currentTest().get(name),
        os: Deno.build.os,
      });
    },
    runCmd(_cmd: string, _args?: string[]): Promise<Deno.CommandOutput> {
      throw new Error("Not implemented");
    },
    getEnv(name: string): string | undefined {
      return envVars.currentTest().get(name);
    },
  };
};

function setupMockEnvironment() {
  const fileStore = new FileStore();
  const envVars = new EnvStore();
  const env = mockEnvironment(fileStore, envVars);
  Object.assign(_environmentImpl, env);
  return { fileStore, envVars };
}

const globalTestEnv = setupMockEnvironment();

import { which } from "@david/which";

// deno-lint-ignore no-explicit-any
type Any = any;

const allTestNames = new Set<string>();

export function test(
  name: string,
  body: (testEnv: {
    fileStore: InMemoryFs;
    envVars: InMemoryStore;
  }) => void | Promise<void>,
) {
  if (allTestNames.has(name)) {
    throw new Error(
      `Duplicate test name already exists: ${name}. Choose a unique name.`,
    );
  }
  allTestNames.add(name);

  const fullTestBody = async () => {
    await body({
      fileStore: globalTestEnv.fileStore.registerTest(name),
      envVars: globalTestEnv.envVars.registerTest(name),
    });
  };
  Object.defineProperty(fullTestBody, "name", { value: name });
  Object.defineProperty(body, "name", { value: `##test##${name}` });
  Deno.test(name, fullTestBody);
}
