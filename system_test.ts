import { fallbackDirname, fallbackJoinPaths } from "./system.ts";
import { assertEquals } from "@std/assert";

Deno.test(function fallbackJoin() {
  assertEquals(
    fallbackJoinPaths("/foo/bar/baz", "ooo/jii"),
    "/foo/bar/baz/ooo/jii",
  );
});

Deno.test(function fallbackDirnameTest() {
  assertEquals(
    fallbackDirname("/foo/bar/.baz"),
    "/foo/bar",
  );
});
