# Manifest Guide

Each project added to the portfolio app should have one JSON manifest in `public/manifests/`.

## Minimum workflow

1. Create a new manifest file such as `public/manifests/o2-project.json`.
2. Add an entry to `public/manifests/projects-index.json`.
3. Copy only preview-safe assets into `public/artifacts/<project-id>/` or `public/media/<project-id>/`.
4. Keep raw PDFs, XLSX files, decks, ZIPs, and confidential source files in the archive until they have a redacted preview.

## What belongs in `artifacts`

- Use `artifacts` for deliverables such as workbooks, decks, summaries, contracts, diagrams, and HTML highlights.
- Use `viewer.kind: "html"` or `viewer.kind: "image"` only when you have a safe public preview.
- Use `viewer.kind: "none"` and `status: "restricted"` for items that should appear in the portfolio but not open publicly.

## What belongs in `gallery`

- Use `gallery` for visual proof points.
- Recommended fields:
  - `title`
  - `caption`
  - `imageSrc` when available
  - `category`
  - `parties`
  - `date`
  - `role`

## Hosting note

This app is structured for static hosting, including GitHub Pages. Only files placed under `public/` are served by the site, so keep the large source archive out of git and move in only curated preview-safe material.
