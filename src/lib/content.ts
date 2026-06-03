import type { ProjectIndexEntry, ProjectManifest } from "../types";

const withBase = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export async function loadProjects(): Promise<ProjectManifest[]> {
  const indexResponse = await fetch(withBase("manifests/projects-index.json"));

  if (!indexResponse.ok) {
    throw new Error("Unable to load project index.");
  }

  const indexData = (await indexResponse.json()) as { projects: ProjectIndexEntry[] };
  const manifests = await Promise.all(
    indexData.projects.map(async (entry) => {
      const response = await fetch(withBase(entry.manifest));

      if (!response.ok) {
        throw new Error(`Unable to load manifest for ${entry.id}.`);
      }

      return (await response.json()) as ProjectManifest;
    })
  );

  return manifests;
}
