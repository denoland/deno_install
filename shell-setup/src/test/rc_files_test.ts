import { test } from "./common.ts";
import { RcBackups, updateRcFile } from "../rc_files.ts";
import { assertEquals } from "@std/assert";

test("updateRcFile", async ({ fileStore }) => {
  const backups = new RcBackups("/test/backups");
  await updateRcFile("/test/home/.bashrc", "install deno", backups);
  const contents = await fileStore.readTextFile("/test/home/.bashrc");
  assertEquals(contents, "install deno\n");
});
