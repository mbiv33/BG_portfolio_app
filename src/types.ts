export type ArtifactViewer =
  | { kind: "html"; src: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "none" };

export type Artifact = {
  id: string;
  title: string;
  category: string;
  type: string;
  summary: string;
  status: "preview" | "restricted";
  sensitivity: "public-preview" | "redacted" | "confidential";
  parties: string[];
  relatedNodeIds: string[];
  viewer: ArtifactViewer;
};

export type GalleryItem = {
  id: string;
  title: string;
  caption: string;
  imageSrc?: string;
  alt?: string;
  category: string;
  parties?: string[];
  date?: string;
  role?: string;
  visibility: "public-preview" | "redacted";
  relatedArtifactIds?: string[];
};

export type Kpi = {
  label: string;
  value: string;
  subtext: string;
};

export type KpiSummary = {
  budget: string;
  rates: string;
  outcomes: string;
  challenges: string[];
};

export type CarouselCard = {
  title: string;
  heading: string;
  content: string;
};

export type SliderConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type SandboxConfig = {
  title: string;
  explanation: string;
  formulaId:
    | "infinity_belize"
    | "valet_vault_saas"
    | "conyers_sports_academy"
    | "healthquest_campaign"
    | "inspired_campaign"
    | "o2_development";
  slider1: SliderConfig;
  slider2: SliderConfig;
  slider3: SliderConfig;
  outputs: [string, string, string, string];
};

export type BlueprintPhase = {
  label: string;
  desc: string;
};

export type BlueprintEntity = {
  from: string;
  connection: string;
  to: string;
};

export type Blueprint = {
  title: string;
  phases: BlueprintPhase[];
  entities: BlueprintEntity[];
};

export type DnaNode = {
  id: string;
  label: string;
  category: string;
  detail: string;
  relatedArtifactIds: string[];
};

export type DnaMap = {
  title: string;
  nodes: DnaNode[];
};

export type ProjectManifest = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  duration: string;
  location: string;
  summary: string;
  capabilities: string[];
  kpis: Kpi[];
  kpiSummary: KpiSummary;
  carousel: CarouselCard[];
  sandbox: SandboxConfig;
  blueprint: Blueprint;
  dnaMap: DnaMap;
  artifacts: Artifact[];
  gallery: GalleryItem[];
};

export type ProjectIndexEntry = {
  id: string;
  manifest: string;
};
