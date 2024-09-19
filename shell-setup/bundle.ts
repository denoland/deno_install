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
  minify: true,
  format: "esm",
});

console.log(result.outputFiles);

await esbuild.stop();
