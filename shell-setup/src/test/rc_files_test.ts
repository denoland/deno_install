import { test } from "./common.ts";
import { RcBackups, updateRcFile } from "../rc_files.ts";
import { assertEquals } from "@std/assert";

test("updateRcFile includes trailing newline", async ({ fileStore }) => {
  for (
    const existingContent of [
      "echo 'existing content'",
      "echo 'existing content'\n",
    ]
  ) {
    await fileStore.mkdir("/test/backups/", { recursive: true });
    await fileStore.writeTextFile(
      "/test/home/.bashrc",
      existingContent,
    );
    const backups = new RcBackups("/test/backups/");
    await updateRcFile("/test/home/.bashrc", "install deno", backups);
    const contents = await fileStore.readTextFile("/test/home/.bashrc");
    assertEquals(contents, "echo 'existing content'\ninstall deno\n");

    const backupsContents = await fileStore.readTextFile(
      "/test/backups/.bashrc.bak",
    );
    assertEquals(backupsContents, existingContent);
  }
});
