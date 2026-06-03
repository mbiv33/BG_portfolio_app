#!/usr/bin/env python3
"""
copy_artifacts.py
-----------------
Copies and renames artifact PNG images from Projects/ into public/artifacts/,
then updates the manifest JSON files to reference the new images.
"""

import re
import os
import shutil
import json
from pathlib import Path
from collections import defaultdict

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE = Path("/Users/marcusbivines/Library/CloudStorage/Dropbox/My Mac (Marcuss-MacBook-Pro.local)/Documents/BG_portfolio_app")
PROJECTS_DIR = BASE / "Projects"
PUBLIC_ARTIFACTS = BASE / "public" / "artifacts"
MANIFESTS_DIR = BASE / "public" / "manifests"

# Maps (category/project subfolder) → project-id
PROJECT_MAP = {
    "Business Consulting/Valet Vault Client": "valet-vault",
    "Development Project Samples/Infinity Belize Development Project": "infinity-belize",
    "Development Project Samples/O2 Project": "o2-project",
    "Development Project Samples/Sports Complex": "sports-complex",
    "Communications & Media Projects/HealthQUEST APS": "healthquest-atl",
    "Communications & Media Projects/inspirED Summer APS": "inspired-summer",
    "Communications & Media Projects/ARA SURVEY": "ara-survey",
}

# Projects with no manifest yet — still copy, skip manifest update
NO_MANIFEST_PROJECTS = {"ara-survey"}

# ---------------------------------------------------------------------------
# Folder → artifact ID mapping
# Where explicit mappings exist they are used; otherwise we match by name.
# ---------------------------------------------------------------------------

EXPLICIT_ARTIFACT_MAP = {
    # (project_id, artifact_slug) → artifact_id
    ("valet-vault", "vv-pitch-deck"): "valet-pitch-deck",
    ("valet-vault", "exsum-summary"): "valet-executive-summary",
    ("healthquest-atl", "outreach-strategy"): "healthquest-strategy",
}

# ---------------------------------------------------------------------------
# New artifact specs for folders that need a brand-new manifest entry
# ---------------------------------------------------------------------------

NEW_ARTIFACT_SPECS = {
    ("valet-vault", "exsum-research"): {
        "id": "valet-exsum-research",
        "title": "Executive Summary Research",
        "category": "Research",
        "type": "Pages",
        "status": "preview",
        "sensitivity": "public-preview",
        "parties": ["Bivines Group"],
        "relatedNodeIds": ["executive-summary"],
        "summary": "Research and source materials compiled for the executive summary.",
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def folder_to_slug(folder_name: str) -> str:
    """Convert artifact folder name to a URL slug (lowercase, spaces/underscores → hyphens)."""
    slug = folder_name.replace(" ", "-").replace("_", "-")
    return slug.lower()


def folder_to_underscore(folder_name: str) -> str:
    """Convert artifact folder name to underscore form for the filename suffix.
    Keeps existing underscores and case, replaces spaces with underscores."""
    return folder_name.replace(" ", "_")


def parse_artboard_number(filename_stem: str):
    """Extract the integer N from 'Artboard N' or 'Asset N' at the start."""
    m = re.match(r"(?:Artboard|Asset)\s+(\d+)", filename_stem, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def cleaned_stem(raw_name: str) -> str:
    """Strip @0.5x / @.5x variants and trailing -N before parsing."""
    stem = Path(raw_name).stem
    # Remove @0.5x, @.5x, @0.5x (all equivalent)
    stem = re.sub(r"@\.?0?5x", "", stem, flags=re.IGNORECASE)
    # Remove trailing -N where N is digits
    stem = re.sub(r"-\d+$", "", stem)
    return stem.strip()


def make_dest_filename(raw_png_name: str, folder_name: str):
    """Return the destination filename, or None if the file can't be parsed."""
    stem = cleaned_stem(raw_png_name)
    n = parse_artboard_number(stem)
    if n is None:
        # Non-standard name — still copy but use a fallback
        return None
    padded = f"{n:02d}"
    suffix = folder_to_underscore(folder_name)
    return f"{padded}-{suffix}.png"


def best_artifact_match(project_id: str, artifact_slug: str, artifacts: list):
    """Find the best matching artifact in the manifest for a given artifact slug."""
    # Check explicit map first
    explicit = EXPLICIT_ARTIFACT_MAP.get((project_id, artifact_slug))
    if explicit:
        for a in artifacts:
            if a["id"] == explicit:
                return a

    # Fuzzy: normalise both sides and look for overlap
    slug_tokens = set(artifact_slug.replace("-", " ").lower().split())
    best = None
    best_score = 0
    for a in artifacts:
        title_tokens = set(a["title"].lower().split())
        id_tokens = set(a["id"].replace("-", " ").lower().split())
        combined = title_tokens | id_tokens
        score = len(slug_tokens & combined)
        if score > best_score:
            best_score = score
            best = a
    # Only accept if there's at least one token in common
    return best if best_score > 0 else None


# ---------------------------------------------------------------------------
# STEP 1 — Copy and rename images
# ---------------------------------------------------------------------------

# collected_images[(project_id, artifact_slug)] = sorted list of dest relative paths
collected_images: dict[tuple, list[str]] = {}
total_copied = 0
skipped_folders = []

print("=" * 70)
print("STEP 1 — Copying and renaming artifact images")
print("=" * 70)

for rel_path, project_id in PROJECT_MAP.items():
    artifacts_dir = PROJECTS_DIR / rel_path / "Artifacts"
    if not artifacts_dir.is_dir():
        print(f"\n[SKIP] No Artifacts folder: {rel_path}")
        continue

    for artifact_folder in sorted(artifacts_dir.iterdir()):
        if not artifact_folder.is_dir():
            continue

        folder_name = artifact_folder.name
        artifact_slug = folder_to_slug(folder_name)

        # Collect only DIRECT PNG children (depth=1)
        direct_pngs = sorted(
            [f for f in artifact_folder.iterdir() if f.is_file() and f.suffix.lower() == ".png"]
        )

        if not direct_pngs:
            skipped_folders.append(f"{project_id}/{folder_name} (no direct PNGs)")
            print(f"  [SKIP-empty] {project_id}/{folder_name}")
            continue

        dest_dir = PUBLIC_ARTIFACTS / project_id / artifact_slug
        dest_dir.mkdir(parents=True, exist_ok=True)

        copied_this_folder = 0
        dest_paths = []

        for png in direct_pngs:
            dest_name = make_dest_filename(png.name, folder_name)
            if dest_name is None:
                # Non-standard name: use sanitised original name
                safe_name = re.sub(r"[^\w.\-]", "_", png.name)
                dest_name = safe_name
                print(f"    [WARN] Non-standard filename kept as: {dest_name}")

            dest_file = dest_dir / dest_name
            shutil.copy2(png, dest_file)
            rel_path_str = f"./artifacts/{project_id}/{artifact_slug}/{dest_name}"
            dest_paths.append(rel_path_str)
            copied_this_folder += 1

        dest_paths.sort()
        collected_images[(project_id, artifact_slug)] = dest_paths
        total_copied += copied_this_folder
        print(f"  [COPY] {project_id}/{folder_name}")
        print(f"         → public/artifacts/{project_id}/{artifact_slug}/")
        print(f"         {copied_this_folder} files copied")


print(f"\nTotal images copied: {total_copied}")

if skipped_folders:
    print("\nSkipped folders (no direct PNGs):")
    for sf in skipped_folders:
        print(f"  - {sf}")

print("\nFull image manifest by project/artifact-slug:")
for (project_id, artifact_slug), paths in sorted(collected_images.items()):
    print(f"\n  {project_id}/{artifact_slug}:")
    for p in paths:
        print(f"    {p}")


# ---------------------------------------------------------------------------
# STEP 2 — Update manifest JSON files
# ---------------------------------------------------------------------------

print("\n" + "=" * 70)
print("STEP 2 — Updating manifest JSON files")
print("=" * 70)

manifest_changes: dict[str, list[str]] = defaultdict(list)

for rel_path, project_id in PROJECT_MAP.items():
    if project_id in NO_MANIFEST_PROJECTS:
        print(f"\n[SKIP-manifest] {project_id} has no manifest (copy was done)")
        continue

    manifest_file = MANIFESTS_DIR / f"{project_id}.json"
    if not manifest_file.exists():
        print(f"\n[SKIP-manifest] {manifest_file.name} not found")
        continue

    with open(manifest_file) as fp:
        data = json.load(fp)

    artifacts = data.get("artifacts", [])
    gallery = data.get("gallery", [])
    modified = False

    # Find all artifact slugs for this project
    project_slugs = [
        (slug, paths)
        for (pid, slug), paths in collected_images.items()
        if pid == project_id
    ]

    for artifact_slug, image_paths in project_slugs:
        viewer_update = {
            "kind": "pages",
            "images": image_paths,
        }

        # Check explicit new-artifact specs first
        new_spec = NEW_ARTIFACT_SPECS.get((project_id, artifact_slug))
        if new_spec:
            # Check if already exists
            existing = next((a for a in artifacts if a["id"] == new_spec["id"]), None)
            if existing:
                existing["viewer"] = viewer_update
                manifest_changes[project_id].append(f"Updated existing artifact: {new_spec['id']}")
            else:
                new_artifact = dict(new_spec)
                new_artifact["viewer"] = viewer_update
                artifacts.append(new_artifact)
                manifest_changes[project_id].append(f"Added NEW artifact: {new_spec['id']}")

                # Add gallery entry
                gallery_id = f"gallery-{new_spec['id']}"
                # Derive human title from folder name
                folder_name = artifact_slug.replace("-", " ").title()
                gallery_entry = {
                    "id": gallery_id,
                    "title": new_spec["title"],
                    "caption": f"Project artifact pages.",
                    "category": new_spec["category"],
                    "parties": new_spec["parties"],
                    "visibility": new_spec["sensitivity"],
                    "relatedArtifactIds": [new_spec["id"]],
                }
                gallery.append(gallery_entry)
                manifest_changes[project_id].append(f"Added NEW gallery entry: {gallery_id}")
            modified = True
            continue

        # Otherwise match to existing artifact
        matched = best_artifact_match(project_id, artifact_slug, artifacts)

        if matched:
            old_viewer = matched.get("viewer", {})
            if old_viewer.get("kind") == "none":
                matched["viewer"] = viewer_update
                manifest_changes[project_id].append(f"Updated artifact: {matched['id']} (viewer: none → pages, {len(image_paths)} images)")
                modified = True
            else:
                # Already has a viewer — still update images list
                matched["viewer"] = viewer_update
                manifest_changes[project_id].append(f"Updated artifact: {matched['id']} (refreshed pages, {len(image_paths)} images)")
                modified = True
        else:
            # No match — create a new artifact
            folder_display = artifact_slug.replace("-", " ")
            new_id = f"{project_id}-{artifact_slug}"
            new_artifact = {
                "id": new_id,
                "title": folder_display.title(),
                "category": "Deliverable",
                "type": "Pages",
                "summary": f"Project artifact: {folder_display}.",
                "status": "preview",
                "sensitivity": "public-preview",
                "parties": ["Bivines Group"],
                "relatedNodeIds": [],
                "viewer": viewer_update,
            }
            artifacts.append(new_artifact)
            manifest_changes[project_id].append(f"Added NEW artifact: {new_id}")

            gallery_id = f"gallery-{new_id}"
            gallery_entry = {
                "id": gallery_id,
                "title": folder_display.title(),
                "caption": "Project artifact pages.",
                "category": "Deliverable",
                "parties": ["Bivines Group"],
                "visibility": "public-preview",
                "relatedArtifactIds": [new_id],
            }
            gallery.append(gallery_entry)
            manifest_changes[project_id].append(f"Added NEW gallery entry: {gallery_id}")
            modified = True

    if modified:
        data["artifacts"] = artifacts
        data["gallery"] = gallery
        with open(manifest_file, "w") as fp:
            json.dump(data, fp, indent=2)
        print(f"\n[UPDATED] {manifest_file.name}")
        for change in manifest_changes[project_id]:
            print(f"  - {change}")
    else:
        print(f"\n[NO CHANGE] {manifest_file.name}")


# ---------------------------------------------------------------------------
# STEP 3 — Final summary
# ---------------------------------------------------------------------------

print("\n" + "=" * 70)
print("STEP 3 — Final Summary")
print("=" * 70)
print(f"\nTotal images copied across all projects: {total_copied}")

print("\nManifest updates:")
for project_id, changes in sorted(manifest_changes.items()):
    print(f"\n  {project_id}.json:")
    for c in changes:
        print(f"    - {c}")

if skipped_folders:
    print("\nFolders skipped (no direct PNGs):")
    for sf in skipped_folders:
        print(f"  - {sf}")

print("\nDone.")
