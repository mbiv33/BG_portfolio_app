# Bivines Group Portfolio App

This repository contains the GitHub-hostable React/Vite portfolio app driven by per-project JSON manifests and curated public-safe assets.

## Structure

- `src/`: React app, viewer logic, and sandbox formulas
- `public/manifests/`: manifest index and project manifests
- `public/artifacts/`: preview-safe HTML artifacts
- `public/media/`: curated preview-safe images
- `schemas/`: JSON schema for project manifests
- `docs/manifest-guide.md`: how to onboard more projects

The large working archive in `Projects/` is intentionally kept out of git. Only app code plus curated public-safe assets should be pushed to GitHub.

## Run locally

```bash
npm install
npm run dev
```

## Build for GitHub Pages

```bash
npm run build
```

The Vite config uses `base: "./"` so the built site can be served from a repository subpath.
