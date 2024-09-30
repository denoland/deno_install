import * as esbuild from "npm:esbuild";

import { fromFileUrl } from "@std/path/from-file-url";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

const result = await esbuild.build({
  plugins: denoPlugins({
    configPath: fromFileUrl(import.meta.resolve("./deno.json")),
    lockPath: fromFileUrl(import.meta.resolve("./deno.lock")),
  }),
  entryPoints: ["./src/main.ts"],
  outfile: "./bundled.esm.js",
  bundle: true,
  format: "esm",
});

if (result.errors.length || result.warnings.length) {
  console.error(`Errors: ${result.errors}, warnings: ${result.warnings}`);
}

await esbuild.stop();
