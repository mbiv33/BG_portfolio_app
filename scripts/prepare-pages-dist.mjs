import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const execFileAsync = promisify(execFile);

const oversizedAssets = [
  "artifacts/infinity-belize/prime-minister-videos/01-PM_Endorsement_Clip.mp4",
  "artifacts/infinity-belize/prime-minister-videos/02-Prime_Minister_Meeting_Clip.mp4",
  "artifacts/o2-project/arch-3d-diagram-video/01-Live_3D_O2_diagram.mp4"
];

const artifactIdsToHide = new Set([
  "prime-minister-video-clips",
  "o2-arch-3d-diagram-video"
]);

async function removeOversizedAssets() {
  for (const assetPath of oversizedAssets) {
    const fullPath = path.join(distDir, assetPath);
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
      console.log(`Removed Pages-incompatible asset: ${assetPath}`);
    }
  }
}

function pruneArtifactIds(value) {
  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = [];

    for (const item of value) {
      if (item && artifactIdsToHide.has(item.id)) {
        changed = true;
        continue;
      }

      const result = pruneArtifactIds(item);
      changed ||= result.changed;
      nextValue.push(result.value);
    }

    return { value: nextValue, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    for (const [key, child] of Object.entries(value)) {
      const result = pruneArtifactIds(child);
      changed ||= result.changed;
      value[key] = result.value;
    }

    return { value, changed };
  }

  return { value, changed: false };
}

async function pruneManifests() {
  const manifestsDir = path.join(distDir, "manifests");
  if (!existsSync(manifestsDir)) {
    return;
  }

  const entries = await fs.readdir(manifestsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) {
      continue;
    }

    const manifestPath = path.join(manifestsDir, entry);
    const original = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(original);
    const pruned = pruneArtifactIds(parsed);

    if (pruned.changed) {
      const next = `${JSON.stringify(pruned.value, null, 2)}\n`;
      await fs.writeFile(manifestPath, next);
      console.log(`Pruned Pages-incompatible video entries from ${entry}`);
    }
  }
}

async function compilePagesFunctions() {
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  await execFileAsync(
    npxBin,
    [
      "wrangler",
      "pages",
      "functions",
      "build",
      "functions",
      "--outdir=dist",
      "--output-routes-path=dist/_routes.json",
      "--project-directory=.",
      "--minify",
    ],
    { cwd: rootDir, stdio: "inherit" }
  );

  await fs.rename(
    path.join(distDir, "index.js"),
    path.join(distDir, "_worker.js")
  );

  console.log("Compiled Pages Functions into dist/_worker.js");
}

await removeOversizedAssets();
await pruneManifests();
await compilePagesFunctions();
