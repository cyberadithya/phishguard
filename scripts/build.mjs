import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

const entries = [
  { in: "src/content/gmail.ts", out: "content/gmail.js" },
  { in: "src/background/service-worker.ts", out: "background/service-worker.js" },
  { in: "src/popup/popup.ts", out: "popup/popup.js" },
];

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyStaticAssets() {
  ensureDir(join(dist, "popup"));
  ensureDir(join(dist, "icons"));

  copyFileSync(join(root, "src/manifest.json"), join(dist, "manifest.json"));
  copyFileSync(join(root, "src/popup/popup.html"), join(dist, "popup/popup.html"));
  copyFileSync(join(root, "src/popup/popup.css"), join(dist, "popup/popup.css"));

  for (const size of [16, 48, 128]) {
    const src = join(root, "icons", `icon${size}.png`);
    if (existsSync(src)) {
      copyFileSync(src, join(dist, "icons", `icon${size}.png`));
    }
  }
}

async function build() {
  ensureDir(dist);

  const iconsDir = join(root, "icons");
  if (!existsSync(join(iconsDir, "icon16.png"))) {
    const { execSync } = await import("child_process");
    execSync("node scripts/generate-icons.mjs", { cwd: root, stdio: "inherit" });
  }

  copyStaticAssets();

  const context = await esbuild.context({
    entryPoints: entries.map((e) => join(root, e.in)),
    outbase: join(root, "src"),
    outdir: dist,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: true,
    logLevel: "info",
  });

  if (watch) {
    await context.watch();
    console.log("Watching for changes...");
  } else {
    await context.rebuild();
    await context.dispose();
    console.log("Build complete → dist/");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
