#!/usr/bin/env python3
"""
Sync gallery image folders and video artifacts from Projects/ into public/artifacts/
and add manifest entries for the portfolio artifact viewer.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
PROJECTS = BASE / "Projects"
PUBLIC_ARTIFACTS = BASE / "public" / "artifacts"
MANIFESTS = BASE / "public" / "manifests"
GITHUB_FILE_LIMIT_BYTES = 95 * 1024 * 1024


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def safe_filename(value: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("_")
    return stem or "artifact"


def mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".ogv": "video/ogg",
    }.get(suffix, "application/octet-stream")


def copy_files(project_id: str, source_dir: Path, artifact_slug: str, extensions: set[str]) -> list[str]:
    dest_dir = PUBLIC_ARTIFACTS / project_id / artifact_slug
    dest_dir.mkdir(parents=True, exist_ok=True)

    copied: list[str] = []
    source_files = sorted(
        file for file in source_dir.iterdir()
        if (
            file.is_file()
            and file.suffix.lower() in extensions
            and file.stat().st_size <= GITHUB_FILE_LIMIT_BYTES
        )
    )

    for index, source in enumerate(source_files, start=1):
        dest_name = f"{index:02d}-{safe_filename(source.name)}"
        shutil.copy2(source, dest_dir / dest_name)
        copied.append(f"./artifacts/{project_id}/{artifact_slug}/{dest_name}")

    return copied


def load_manifest(project_id: str) -> dict:
    with open(MANIFESTS / f"{project_id}.json") as fp:
        return json.load(fp)


def save_manifest(project_id: str, data: dict) -> None:
    with open(MANIFESTS / f"{project_id}.json", "w") as fp:
        json.dump(data, fp, indent=2)
        fp.write("\n")


def upsert_artifact(data: dict, artifact: dict) -> str:
    artifacts = data.setdefault("artifacts", [])
    existing = next((item for item in artifacts if item["id"] == artifact["id"]), None)
    if existing:
        existing.update(artifact)
        return "updated"
    artifacts.append(artifact)
    return "added"


MEDIA_SPECS = [
    {
        "project_id": "ara-survey",
        "source": PROJECTS / "Communications & Media Projects/ARA SURVEY/Artifacts/ARA Ads",
        "slug": "ara-ads",
        "extensions": {".mp4", ".mov", ".webm", ".m4v", ".ogv"},
        "artifact": {
            "id": "ara-ads-video",
            "title": "ARA social ad reels",
            "category": "Video",
            "type": "Video",
            "summary": "Preview-safe social ad reels produced for the ARA survey outreach campaign.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Bivines Group"],
            "relatedNodeIds": ["media-workflow"],
        },
    },
    {
        "project_id": "healthquest-atl",
        "source": PROJECTS / "Communications & Media Projects/HealthQUEST APS/Artifacts/Mental Health Teen Summit/Influencer Posts",
        "slug": "mental-health-teen-summit-influencer-posts",
        "extensions": {".mp4", ".mov", ".webm", ".m4v", ".ogv"},
        "artifact": {
            "id": "healthquest-influencer-posts",
            "title": "Mental Health Teen Summit influencer posts",
            "category": "Video",
            "type": "Video",
            "summary": "Influencer video posts supporting the Mental Health Teen Summit event activation.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Bivines Group", "Health Quest ATL"],
            "relatedNodeIds": ["event-activation"],
        },
    },
    {
        "project_id": "infinity-belize",
        "source": PROJECTS / "Development Project Samples/Infinity Belize Development Project/Artifacts/Prime_Minister_Gallery",
        "slug": "prime-minister-gallery",
        "extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "viewer_kind": "gallery",
        "artifact": {
            "id": "prime-minister-gallery",
            "title": "Prime Minister meeting gallery",
            "category": "Gallery",
            "type": "Images",
            "summary": "Gallery images from Prime Minister-level engagement during the Infinity Belize project.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Bivines Group", "Infinity Belize project team"],
            "relatedNodeIds": ["investor-campaign"],
        },
    },
    {
        "project_id": "infinity-belize",
        "source": PROJECTS / "Development Project Samples/Infinity Belize Development Project/Artifacts/Prime_Minister_Gallery",
        "slug": "prime-minister-videos",
        "extensions": {".mp4", ".mov", ".webm", ".m4v", ".ogv"},
        "artifact": {
            "id": "prime-minister-video-clips",
            "title": "Prime Minister meeting video clips",
            "category": "Video",
            "type": "Video",
            "summary": "Video clips documenting Prime Minister-level project engagement in Belize.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Bivines Group", "Infinity Belize project team"],
            "relatedNodeIds": ["investor-campaign"],
        },
    },
    {
        "project_id": "infinity-belize",
        "source": PROJECTS / "Development Project Samples/Infinity Belize Development Project/Artifacts/Project_Media_Gallery",
        "slug": "project-media-gallery",
        "extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "viewer_kind": "gallery",
        "artifact": {
            "id": "project-media-gallery",
            "title": "Project media gallery",
            "category": "Gallery",
            "type": "Images",
            "summary": "Site and project media gallery from the Infinity Belize development work.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Bivines Group", "Infinity Belize project team"],
            "relatedNodeIds": ["site-program"],
        },
    },
    {
        "project_id": "o2-project",
        "source": PROJECTS / "Development Project Samples/O2 Project/Artifacts/Arch_Render_Gallery",
        "slug": "arch-render-gallery",
        "extensions": {".jpg", ".jpeg", ".png", ".webp"},
        "viewer_kind": "gallery",
        "artifact": {
            "id": "o2-arch-render-gallery",
            "title": "Architecture render gallery",
            "category": "Gallery",
            "type": "Images",
            "summary": "Rendering gallery for the O2 concept and Deep Deuce Club visual direction.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Project design team"],
            "relatedNodeIds": ["visual-concept"],
        },
    },
    {
        "project_id": "o2-project",
        "source": PROJECTS / "Development Project Samples/O2 Project/Artifacts/Arch_3D_Diagram_video",
        "slug": "arch-3d-diagram-video",
        "extensions": {".mp4", ".mov", ".webm", ".m4v", ".ogv"},
        "artifact": {
            "id": "o2-arch-3d-diagram-video",
            "title": "Live 3D architecture diagram",
            "category": "Video",
            "type": "Video",
            "summary": "Video walkthrough of the O2 3D architecture diagram.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Project design team"],
            "relatedNodeIds": ["planning-stack"],
        },
    },
    {
        "project_id": "o2-project",
        "source": PROJECTS / "Development Project Samples/O2 Project/Artifacts/Arch_O2_Sizzle_Reel",
        "slug": "arch-o2-sizzle-reel",
        "extensions": {".mp4", ".mov", ".webm", ".m4v", ".ogv"},
        "artifact": {
            "id": "o2-sizzle-reel",
            "title": "O2 sizzle reel",
            "category": "Video",
            "type": "Video",
            "summary": "Sizzle reel used to communicate the O2 concept and experience.",
            "status": "preview",
            "sensitivity": "public-preview",
            "parties": ["Project design team"],
            "relatedNodeIds": ["visual-concept"],
        },
    },
]


def main() -> None:
    manifest_cache: dict[str, dict] = {}
    changes: list[str] = []

    for spec in MEDIA_SPECS:
        project_id = spec["project_id"]
        source = spec["source"]
        if not source.is_dir():
            changes.append(f"missing source: {source}")
            continue

        paths = copy_files(project_id, source, spec["slug"], spec["extensions"])
        if not paths:
            changes.append(f"no matching files: {project_id}/{spec['slug']}")
            continue

        data = manifest_cache.setdefault(project_id, load_manifest(project_id))
        artifact = dict(spec["artifact"])
        if spec.get("viewer_kind") == "gallery":
            artifact["viewer"] = {"kind": "gallery", "images": paths}
        else:
            artifact["viewer"] = {
                "kind": "video",
                "sources": [{"src": path, "type": mime_type(Path(path))} for path in paths],
            }

        status = upsert_artifact(data, artifact)
        changes.append(f"{status}: {project_id}/{artifact['id']} ({len(paths)} files)")

    for project_id, data in manifest_cache.items():
        save_manifest(project_id, data)

    print("\n".join(changes))


if __name__ == "__main__":
    main()
