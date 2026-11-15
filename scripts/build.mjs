import { execSync } from "node:child_process";

const esbuild = "npx --yes esbuild@0.28.2";

console.log("Building server half...");
// Bundled into one file: the shared types module lives outside src/server and
// would otherwise be imported by a path that does not exist in lib/.
execSync(
  `${esbuild} src/server/index.ts --outfile=lib/index.js --bundle --platform=node --format=esm --target=node22 --sourcemap`,
  { stdio: "inherit" },
);

console.log("Building browser half...");
const banner = 'window.__ModuleLoader__.load({ id: "token-contribution", factory: (require) => { var module = { exports: {} }; var exports = module.exports;';
const footer = "return module.exports; } });";
execSync(
  `${esbuild} src/client/index.tsx --outfile=lib/client.js --platform=browser --format=cjs --target=es2022 --bundle --external:react --external:react-dom --external:react-dom/client --banner:js='${banner}' --footer:js='${footer}' --sourcemap`,
  { stdio: "inherit" },
);

console.log("Build complete.");
