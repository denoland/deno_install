import { environment } from "./environment.ts";
const { isExistingDir, mkdir } = environment;

export function withContext(ctx: string, error?: unknown) {
  return new Error(ctx, { cause: error });
}

export async function filterAsync<T>(
  arr: T[],
  pred: (v: T) => Promise<boolean>,
): Promise<T[]> {
  const filtered = await Promise.all(arr.map((v) => pred(v)));
  return arr.filter((_, i) => filtered[i]);
}

export function withEnvVar<T>(
  name: string,
  f: (value: string | undefined) => T,
): T {
  const value = environment.getEnv(name);
  return f(value);
}

export function shellEnvContains(s: string): boolean {
  return withEnvVar("SHELL", (sh) => sh !== undefined && sh.includes(s));
}

export function warn(s: string) {
  console.error(`%cwarning%c: ${s}`, "color: yellow", "color: inherit");
}

export function info(s: string) {
  console.error(`%cinfo%c: ${s}`, "color: green", "color: inherit");
}

export async function ensureExists(dirPath: string): Promise<void> {
  if (!await isExistingDir(dirPath)) {
    await mkdir(dirPath, {
      recursive: true,
    });
  }
}

export function ensureEndsWith(s: string, suffix: string): string {
  if (!s.endsWith(suffix)) {
    return s + suffix;
  }
  return s;
}

export function ensureStartsWith(s: string, prefix: string): string {
  if (!s.startsWith(prefix)) {
    return prefix + s;
  }
  return s;
}
