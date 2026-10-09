import { execSync } from "node:child_process";

console.log("Building server backend...");
execSync("npx esbuild src/server/index.ts src/server/aggregator.ts --outdir=lib --platform=node --format=esm --target=node20 --sourcemap", { stdio: "inherit" });

console.log("Building client frontend bundle...");
execSync("npx esbuild src/client/index.tsx --outfile=lib/client.js --platform=browser --format=esm --target=es2022 --bundle --external:react --external:react-dom --external:react-dom/client --sourcemap", { stdio: "inherit" });

console.log("Build complete!");
