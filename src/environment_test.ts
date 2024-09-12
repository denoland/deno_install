import { fallback } from "./environment.ts";
import { assertEquals } from "@std/assert";

const { joinPaths, dirname } = fallback;

Deno.test(function fallbackJoinTest() {
  assertEquals(
    joinPaths("/foo/bar/baz", "ooo/jii"),
    "/foo/bar/baz/ooo/jii",
  );
});

Deno.test(function fallbackDirnameTest() {
  assertEquals(
    dirname("/foo/bar/.baz"),
    "/foo/bar",
  );
});
