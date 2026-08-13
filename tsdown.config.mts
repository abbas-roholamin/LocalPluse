import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["cjs", "esm"],
  target: "es2018",
  dts: true,
  treeshake: true,
  clean: true,
  // Fail the build on a broken package.json / exports map or on type
  // declarations that resolve wrongly for a consumer.
  publint: true,
  attw: true,
});
