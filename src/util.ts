import { environment } from "./environment.ts";

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
