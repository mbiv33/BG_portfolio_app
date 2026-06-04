import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Compass,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Key,
  Layers,
  LogOut,
  Map,
  Network,
  ShieldAlert,
  ShieldCheck,
  User,
  X
} from "lucide-react";
import { calculateSandboxOutputs } from "./lib/formulas";
import { loadProjects } from "./lib/content";
import type { Artifact, DnaNode, ProjectManifest } from "./types";
import { DocumentPageViewer } from "./components/DocumentPageViewer";

type TabId = "overview" | "sandbox" | "blueprint" | "dnamap";

const PROJECT_COLORS: Record<string, string> = {
  "infinity-belize": "#91000D",
  "valet-vault": "#193661",
  "sports-complex": "#808080",
  "healthquest-atl": "#2d6a4f",
  "ara-survey": "#7a1420",
  "inspired-summer": "#c77dff",
  "o2-project": "#1d4e89"
};

const CONSULTING_NEEDS = [
  "Campaign Design/Management",
  "Financial Modeling",
  "Project/Corporate Finance",
  "Media Management",
  "Enterprise Project Management",
  "Investor Relations",
  "Brand Strategy/Identity",
  "PR Strategy",
  "Business Planning",
  "Strategy Consulting"
] as const;

const PROJECT_CAPABILITY_MAP: Record<string, readonly string[]> = {
  "sports-complex": [
    "Financial Modeling",
    "Project/Corporate Finance",
    "Investor Relations",
    "Enterprise Project Management",
    "Business Planning",
    "Strategy Consulting"
  ],
  "infinity-belize": [
    "Financial Modeling",
    "Project/Corporate Finance",
    "Investor Relations",
    "Enterprise Project Management",
    "Campaign Design/Management",
    "Strategy Consulting",
    "Business Planning"
  ],
  "valet-vault": [
    "Financial Modeling",
    "Strategy Consulting",
    "Business Planning",
    "Campaign Design/Management"
  ],
  "healthquest-atl": [
    "Campaign Design/Management",
    "Media Management",
    "PR Strategy",
    "Enterprise Project Management"
  ],
  "ara-survey": [
    "Campaign Design/Management",
    "Media Management",
    "PR Strategy",
    "Enterprise Project Management"
  ],
  "inspired-summer": [
    "Campaign Design/Management",
    "Media Management",
    "Brand Strategy/Identity",
    "Enterprise Project Management"
  ],
  "o2-project": [
    "Brand Strategy/Identity",
    "Business Planning",
    "Strategy Consulting",
    "Investor Relations",
    "Project/Corporate Finance"
  ]
};

const PROJECT_MENU_LABELS: Record<string, string> = {
  "sports-complex": "Premier Prospects Academy (Conyers Sports Complex)",
  "infinity-belize": "Infinity Belize (IBF Fund)",
  "healthquest-atl": "VE360 / APS Health Quest ATL",
  "ara-survey": "OpinionatED Minds / APS ARA Survey",
  "inspired-summer": "inspirED Summer / EDcendent"
};

function renderCarouselContent(content: string) {
  return content.split(/\n{2,}/).map((block, blockIndex) => {
    const lines = block.split("\n").filter(Boolean);
    const isList = lines.length > 0 && lines.every((line) => line.trim().startsWith("- "));

    if (isList) {
      return (
        <ul key={blockIndex} className="list-disc pl-5 space-y-1 text-sm text-slate-300 leading-relaxed">
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{line.trim().replace(/^- /, "")}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={blockIndex} className="text-sm text-slate-300 leading-relaxed">
        {block}
      </p>
    );
  });
}

function getArtifactSourcePaths(artifact: Artifact) {
  switch (artifact.viewer.kind) {
    case "html":
    case "image":
      return [artifact.viewer.src];
    case "pages":
    case "gallery":
      return artifact.viewer.images;
    case "video":
      return artifact.viewer.sources?.map((source) => source.src) ?? (artifact.viewer.src ? [artifact.viewer.src] : []);
    case "none":
      return [];
  }
}

function getArtifactFolder(projectId: string, artifact: Artifact) {
  const paths = getArtifactSourcePaths(artifact);

  if (paths.length === 0) {
    return null;
  }

  if (paths.every((src) => /^https?:\/\//.test(src))) {
    return "external";
  }

  const folders = paths.map((src) => {
    const match = src.match(new RegExp(`(?:^|/)artifacts/${projectId}/([^/]+)/`));
    return match?.[1] ?? null;
  });

  if (folders.some((folder) => !folder)) {
    return null;
  }

  const uniqueFolders = new Set(folders);
  return uniqueFolders.size === 1 ? folders[0] : null;
}

const PORTAL_USERS: Record<string, { name: string; clearance: string }> = {
  "admin@bivinesgroup.com":                  { name: "Admin",    clearance: "Sovereign Partners" },
  "sbyrd@sowegarising.org":                  { name: "Sherrell", clearance: "Sovereign Partners" },
  "thomie.venisee@thevictorygroupllc.com":   { name: "Thomie",   clearance: "Sovereign Partners" },
};

const PORTAL_PASSCODES: Record<string, string> = {
  "admin@bivinesgroup.com":                  "BG2026",
  "sbyrd@sowegarising.org":                  "SOWEGA2026",
  "thomie.venisee@thevictorygroupllc.com":   "VICTORY2026",
};

// ── Per-user welcome messages (shown once per login) ────────────
const WELCOME_EMAIL = "sbyrd@sowegarising.org";
const WELCOME_STORAGE_KEY = "bg-welcome-dismissed-sbyrd";

type PortalUser = { email: string; name: string; clearance: string };

function App() {
  // ── Auth state ──────────────────────────────────────────────
  const [authed, setAuthed] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [shaking, setShaking]       = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const passcodeRef = useRef<HTMLInputElement>(null);

  // ── Portfolio state ─────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [activeCapability, setActiveCapability] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>("");
  const [sandboxVar1, setSandboxVar1] = useState(100);
  const [sandboxVar2, setSandboxVar2] = useState(1);
  const [sandboxVar3, setSandboxVar3] = useState(60);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const user  = PORTAL_USERS[email];
    if (user && PORTAL_PASSCODES[email] === loginPass.trim()) {
      setPortalUser({ email, ...user });
      setLoginError(false);
      setAuthed(true);
      const dismissed =
        typeof window !== "undefined" &&
        window.localStorage.getItem(WELCOME_STORAGE_KEY) === "true";
      setShowWelcome(email === WELCOME_EMAIL && !dismissed);
    } else {
      setLoginError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      passcodeRef.current?.focus();
    }
  }

  function handleSignOut() {
    setAuthed(false);
    setPortalUser(null);
    setLoginEmail("");
    setLoginPass("");
    setLoginError(false);
    setShowWelcome(false);
  }

  function handleWelcomeDontShowAgain() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    }
    setShowWelcome(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const manifests = await loadProjects();
        if (cancelled) return;
        setProjects(manifests);
        const first = manifests[0];
        if (first) {
          setActiveProjectId(first.id);
          setSandboxVar1(first.sandbox.slider1.default);
          setSandboxVar2(first.sandbox.slider2.default);
          setSandboxVar3(first.sandbox.slider3.default);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load content.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, []);

  const project = projects.find((p) => p.id === activeProjectId) ?? null;

  const filteredProjects = useMemo(() => {
    if (activeCapability === "All") return projects;
    return projects.filter((entry) => PROJECT_CAPABILITY_MAP[entry.id]?.includes(activeCapability));
  }, [activeCapability, projects]);

  const currentProjectArtifacts = useMemo(
    () => (project ? project.artifacts.filter((artifact) => getArtifactFolder(project.id, artifact)) : []),
    [project]
  );

  const activeNode = useMemo<DnaNode | null>(() => {
    if (!project) return null;
    return project.dnaMap.nodes.find((n) => n.id === selectedNodeId) ?? project.dnaMap.nodes[0] ?? null;
  }, [project, selectedNodeId]);

  const selectedArtifact = useMemo<Artifact | null>(
    () =>
      currentProjectArtifacts.find((a) => a.id === selectedArtifactId) ??
      currentProjectArtifacts[0] ??
      null,
    [currentProjectArtifacts, selectedArtifactId]
  );

  const relatedNodesForArtifact = useMemo<DnaNode[]>(
    () =>
      project && selectedArtifact
        ? project.dnaMap.nodes.filter((node) => selectedArtifact.relatedNodeIds.includes(node.id))
        : [],
    [project, selectedArtifact]
  );

  const primaryRelatedNode = relatedNodesForArtifact[0] ?? activeNode ?? null;

  const handleProjectSwitch = (id: string) => {
    const next = projects.find((p) => p.id === id);
    if (!next) return;
    setActiveProjectId(id);
    setActiveTab("overview");
    setCarouselIndex(0);
    setSelectedNodeId(next.dnaMap.nodes[0]?.id ?? "");
    setSelectedArtifactId(next.artifacts.find((a) => getArtifactFolder(next.id, a))?.id ?? "");
    setSandboxVar1(next.sandbox.slider1.default);
    setSandboxVar2(next.sandbox.slider2.default);
    setSandboxVar3(next.sandbox.slider3.default);
  };

  const handleCapabilitySelect = (capability: string) => {
    setActiveCapability(capability);
  };

  useEffect(() => {
    if (!filteredProjects.length) return;
    if (!filteredProjects.some((entry) => entry.id === activeProjectId)) {
      handleProjectSwitch(filteredProjects[0].id);
    }
  }, [activeProjectId, filteredProjects]);

  useEffect(() => {
    if (!project) return;
    if (!selectedNodeId || !project.dnaMap.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(project.dnaMap.nodes[0]?.id ?? "");
    }
    if (!currentProjectArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(currentProjectArtifacts[0]?.id ?? "");
    }
  }, [currentProjectArtifacts, project, selectedArtifactId, selectedNodeId]);

  // ── LOGIN GATE ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-[#090909] px-4"
        style={{ fontFamily: '"Montserrat", "Avenir Next", sans-serif' }}
      >
        {/* grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-md w-full bg-[rgba(21,21,21,0.75)] backdrop-blur-xl border border-[#333333] rounded-2xl p-8 text-center shadow-2xl">
          {/* icon + title */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-full bg-[#151515] border border-[#333333] flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-[#91000D]" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#91000D] flex items-center justify-center gap-1.5 mb-1">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block animate-pulse" />
                Secured Partner Access
              </span>
              <h1 className="text-lg font-extrabold tracking-tight text-white uppercase">Bivines Group Portal</h1>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            This platform contains unredacted financial pro formas, legal deal agreements, and strategic pitch models for active institutional clients and capital sponsors.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
            {/* email */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-slate-500" />
              </span>
              <input
                type="email"
                autoComplete="email"
                placeholder="Enter authorized email..."
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(false); }}
                className="w-full bg-[#0e0e0e] border border-[#333333] rounded-lg py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#91000D] transition-colors"
              />
            </div>

            {/* passcode */}
            <div className={`relative ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
              style={shaking ? { animation: "shake 0.4s ease-in-out" } : {}}>
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Key className="w-4 h-4 text-slate-500" />
              </span>
              <input
                ref={passcodeRef}
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter authorized clearance key..."
                value={loginPass}
                onChange={(e) => { setLoginPass(e.target.value); setLoginError(false); }}
                className={`w-full bg-[#0e0e0e] border rounded-lg py-3 pl-10 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors ${loginError ? "border-red-600" : "border-[#333333] focus:border-[#91000D]"}`}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {loginError && (
              <p className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1.5">
                Incorrect credentials. Access attempt logged.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#91000D] hover:bg-[#b00c19] text-white text-xs font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify Clearance
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#333333] flex justify-between items-center text-[10px] text-slate-500">
            <span>Clearance Level 3</span>
            <span>NDA-Protected Access</span>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-slate-600 uppercase tracking-widest font-mono z-10">
          All login attempts, IP signatures, and credentials are logged under NDA parameters.
        </p>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#151515", fontFamily: '"Montserrat", "Avenir Next", sans-serif' }}
      >
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-10 max-w-sm w-full text-center">
          <p className="text-[#91000D] text-xs uppercase tracking-widest font-bold mb-3">Bivines Group Portfolio</p>
          <h1 className="text-white text-xl font-extrabold animate-pulse">Loading curated project manifests…</h1>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#151515", fontFamily: '"Montserrat", "Avenir Next", sans-serif' }}
      >
        <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-10 max-w-sm w-full text-center">
          <p className="text-[#91000D] text-xs uppercase tracking-widest font-bold mb-3">Bivines Group Portfolio</p>
          <h1 className="text-white text-xl font-extrabold mb-2">Unable to load portfolio.</h1>
          <p className="text-slate-400 text-sm">{error || "No projects found."}</p>
        </div>
      </div>
    );
  }

  const accentColor = PROJECT_COLORS[project.id] ?? "#91000D";

  const outputs = calculateSandboxOutputs(
    project.sandbox.formulaId,
    sandboxVar1,
    sandboxVar2,
    sandboxVar3
  );

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col selection:text-white"
      style={{
        backgroundColor: "#151515",
        fontFamily: '"Montserrat", "Avenir Next", sans-serif',
        // @ts-expect-error css var
        "--accent": accentColor
      }}
    >
      {showWelcome && (
        <WelcomeModal
          name={portalUser?.name ?? "there"}
          accentColor={accentColor}
          onClose={() => setShowWelcome(false)}
          onDontShowAgain={handleWelcomeDontShowAgain}
        />
      )}

      {/* HEADER */}
      <header className="border-b border-[#333333] bg-[#1e1e1e]/90 backdrop-blur sticky top-0 z-40 px-6 py-3 lg:h-[100px]">
        <div className="max-w-7xl h-full mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src="./brand/navy-red-logo.png"
              alt="Bivines Group"
              className="w-16 md:w-18 h-auto flex-shrink-0"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="min-w-0 flex-1 max-w-[800px]">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-white text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-sm flex items-center gap-1.5"
                  style={{ backgroundColor: "#91000D" }}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Clearance Key Active
                </span>
                <span className="text-slate-500 text-[10px] font-mono hidden sm:inline">
                  Clearance Level: {portalUser?.clearance}
                </span>
              </div>
              <h1
                aria-label="Bivines Group Portfolio"
                className="w-full lg:w-[800px] max-w-[800px] text-[34px] md:text-[38px] font-extrabold tracking-tight text-white leading-[0.9]"
              >
                Bivines Group Portfolio
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[420px]">Case studies, strategy systems, and project evidence.</p>
            </div>
          </div>

          {/* Viewer badge + sign out */}
          <div className="flex items-center gap-3 self-center">
            <div className="flex items-center gap-3 bg-[#0e0e0e] border border-[#333333] px-3 py-2 rounded-lg">
              <User className="text-[#91000D] w-4 h-4 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-200">{portalUser?.email}</p>
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  {portalUser?.clearance} · NDA Verified
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-red-400 transition-colors font-bold uppercase tracking-wider"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* LEFT SIDEBAR */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[#333333] pb-2.5">
              <Compass className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-xs uppercase tracking-widest text-slate-300 font-extrabold">Consulting Needs</h3>
            </div>

            <div className="flex flex-wrap gap-1">
              {["All", ...CONSULTING_NEEDS].map((capability) => {
                const isActive = activeCapability === capability;
                const hasMatches =
                  capability === "All" ||
                  projects.some((entry) => PROJECT_CAPABILITY_MAP[entry.id]?.includes(capability));
                return (
                <button
                  key={capability}
                  type="button"
                  onClick={() => handleCapabilitySelect(capability)}
                  disabled={!hasMatches}
                  className="w-[120px] min-h-8 px-1.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-normal leading-tight text-center transition-all flex items-center justify-center"
                  style={
                    isActive
                      ? {
                          backgroundColor: `${accentColor}22`,
                          borderColor: accentColor,
                          color: "#fff"
                        }
                      : {
                          backgroundColor: "#151515",
                          borderColor: "#333333",
                          color: hasMatches ? "#cbd5e1" : "#64748b",
                          opacity: hasMatches ? 1 : 0.45
                        }
                  }
                >
                  {capability}
                </button>
              )})}
            </div>

            <div className="h-px bg-[#333333]" />

            <div className="flex flex-col gap-2">
              <strong className="text-slate-400 block uppercase text-[10px] tracking-wider mb-1">
                {activeCapability === "All" ? "Case Study Menu" : `${activeCapability} Case Studies`}
              </strong>
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProjectSwitch(p.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border text-xs font-bold transition-all"
                  style={
                    activeProjectId === p.id
                      ? {
                          backgroundColor: `${PROJECT_COLORS[p.id] ?? "#91000D"}22`,
                          borderColor: PROJECT_COLORS[p.id] ?? "#91000D",
                          color: "#fff"
                        }
                      : {
                          backgroundColor: "#151515",
                          borderColor: "#333333",
                          color: "#94a3b8"
                        }
                  }
                >
                  {PROJECT_MENU_LABELS[p.id] ?? p.title}
                </button>
              ))}
              {!filteredProjects.length && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  No loaded case study matches this consulting need yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="lg:col-span-3 bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-2xl p-6 flex flex-col gap-6 min-h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5 border-b border-[#333333] pb-4">
            <div className="bg-[#151515] border border-[#333333] rounded-xl p-2 shadow-inner flex flex-col gap-2 md:order-1">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-3 py-1.5">
                Sections:
              </span>
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
                {(
                  [
                    { id: "overview" as TabId, label: "1. Narrative Case Deck", Icon: FileText },
                    { id: "sandbox" as TabId, label: "2. Financial Model Sandbox", Icon: BarChart3 },
                    { id: "blueprint" as TabId, label: "3. Master Blueprint", Icon: Map },
                    { id: "dnamap" as TabId, label: "4. DNA Map + Artifacts", Icon: Network }
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-bold transition-all text-slate-400 hover:text-white hover:bg-[#1e1e1e] whitespace-nowrap md:whitespace-normal flex-shrink-0 md:flex-shrink md:w-full"
                    style={
                      activeTab === id
                        ? { backgroundColor: "#1e1e1e", border: "1px solid #333333", color: "#fff" }
                        : {}
                    }
                  >
                    <Icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: activeTab === id ? accentColor : undefined }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0 md:order-2">
              <Compass className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: accentColor }} />
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-white">{project.title}</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{project.subtitle}</p>
              </div>
            </div>
          </div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div key={`overview-${project.id}`} className="flex flex-col gap-6 h-full animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    Project Case study
                  </p>
                </div>
                <div className="bg-[#151515] border border-[#333333] text-[10px] text-slate-400 font-bold px-2.5 py-1 rounded flex-shrink-0">
                  {carouselIndex + 1} / {project.carousel.length}
                </div>
              </div>

              <div className="bg-[#151515] border border-[#333333] rounded-xl p-8 flex-1 flex flex-col justify-between shadow-inner min-h-[220px] overflow-hidden">
                <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>
                    {project.carousel[carouselIndex].title}
                  </span>
                  <h3 className="text-lg font-extrabold text-white leading-tight">
                    {project.carousel[carouselIndex].heading}
                  </h3>
                  <div className="flex flex-col gap-3 max-w-2xl mt-1">
                    {renderCarouselContent(project.carousel[carouselIndex].content)}
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 mt-8">
                  <button
                    onClick={() => setCarouselIndex((c) => Math.max(0, c - 1))}
                    disabled={carouselIndex === 0}
                    className="px-4 py-2 bg-[#1e1e1e] border border-[#333333] rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <div className="flex gap-1.5 items-center justify-center">
                    {project.carousel.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIndex(i)}
                        aria-label={`Go to step ${i + 1}`}
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: carouselIndex === i ? "1.5rem" : "0.5rem",
                          backgroundColor: carouselIndex === i ? accentColor : "#333333"
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCarouselIndex((c) => Math.min(project.carousel.length - 1, c + 1))}
                    disabled={carouselIndex === project.carousel.length - 1}
                    className="px-4 py-2 text-white rounded-lg text-xs font-bold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 transition-all"
                    style={{ backgroundColor: accentColor }}
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SANDBOX */}
          {activeTab === "sandbox" && (
            <div key={`sandbox-${project.id}`} className="flex flex-col gap-5 animate-fade-in">
              <div className="flex justify-between items-start border-b border-[#333333] pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: accentColor }} />
                    {project.sandbox.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Interact with real variables from the pro forma to test financial sensitivity curves.
                  </p>
                </div>
              </div>

              <div className="bg-[#151515] p-4 rounded-xl border border-[#333333] text-xs flex gap-3 leading-relaxed">
                <FileSpreadsheet className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <div>
                  <strong className="text-white block mb-0.5 font-bold">Model Assumptions</strong>
                  <span className="text-slate-400">{project.sandbox.explanation}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
                <div className="md:col-span-5 bg-[#151515]/60 p-4 rounded-xl border border-[#333333] flex flex-col gap-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block border-b border-[#333333] pb-1.5">
                    Modifying Parameters
                  </span>
                  {(
                    [
                      { config: project.sandbox.slider1, value: sandboxVar1, set: setSandboxVar1 },
                      { config: project.sandbox.slider2, value: sandboxVar2, set: setSandboxVar2 },
                      { config: project.sandbox.slider3, value: sandboxVar3, set: setSandboxVar3 }
                    ] as const
                  ).map(({ config, value, set }, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">{config.label}</span>
                        <strong className="text-white">
                          {Number.isInteger(value) ? value : value.toFixed(1)}
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={value}
                        onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>

                <div className="md:col-span-7 flex flex-col gap-4">
                  <div className="bg-gradient-to-br from-[#151515] to-[#1e1e1e] p-5 rounded-xl border border-[#333333] flex flex-col gap-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      Calculated Output Yields
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      {(
                        [
                          { label: project.sandbox.outputs[0], value: outputs.metric1 },
                          { label: project.sandbox.outputs[1], value: outputs.metric2 },
                          { label: project.sandbox.outputs[2], value: outputs.metric3 },
                          { label: project.sandbox.outputs[3], value: outputs.metric4 }
                        ] as const
                      ).map(({ label, value }) => (
                        <div key={label} className="pl-3" style={{ borderLeft: `2px solid ${accentColor}` }}>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold leading-tight mb-1">
                            {label}
                          </span>
                          <span className="text-xl font-bold text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    * Outputs are mathematically generated from formulas mapped directly from the project pro forma.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BLUEPRINT */}
          {activeTab === "blueprint" && (
            <div key={`blueprint-${project.id}`} className="flex flex-col gap-6 animate-fade-in">
              <div className="flex justify-between items-start border-b border-[#333333] pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Map className="w-5 h-5" style={{ color: accentColor }} />
                    {project.blueprint.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    SOW execution sequence, trigger gates, and parties/entities mapping.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 bg-[#151515]/60 p-5 rounded-xl border border-[#333333] flex flex-col gap-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Execution Milestones
                  </span>
                  <div className="flex flex-col gap-3 relative pl-4 border-l border-[#333333]">
                    {project.blueprint.phases.map((phase, i) => (
                      <div key={i} className="relative flex flex-col gap-1">
                        <span
                          className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#151515]"
                          style={{ backgroundColor: accentColor }}
                        />
                        <strong className="text-xs text-slate-100 font-bold">{phase.label}</strong>
                        <p className="text-[11px] text-slate-400 leading-tight">{phase.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 bg-[#151515]/40 p-4 rounded-xl border border-[#333333] flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Parties &amp; Entities
                  </span>
                  <div className="flex flex-col gap-2 mt-1">
                    {project.blueprint.entities.map((entity, i) => (
                      <div key={i} className="bg-[#1e1e1e]/50 p-2.5 rounded border border-[#333333] flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-white font-bold">{entity.from}</span>
                          <span className="font-extrabold" style={{ color: accentColor }}>→</span>
                          <span className="text-white font-bold">{entity.to}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-medium italic">
                          {entity.connection}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DNA MAP */}
          {activeTab === "dnamap" && (
            <div key={`dnamap-${project.id}`} className="flex flex-col gap-5 animate-fade-in">
              <div className="flex justify-between items-start border-b border-[#333333] pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5" style={{ color: accentColor }} />
                    {project.dnaMap.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select an artifact to open its preview or restricted record in the viewer.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Artifact list */}
                <div className="md:col-span-4 bg-[#151515] rounded-xl p-4 border border-[#333333] flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                    Project Artifacts:
                  </span>
                  {currentProjectArtifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => {
                        setSelectedArtifactId(artifact.id);
                        setSelectedNodeId(artifact.relatedNodeIds[0] ?? project.dnaMap.nodes[0]?.id ?? "");
                      }}
                      className="w-full p-3 rounded-lg border text-left flex flex-col gap-1 transition-all"
                      style={
                        selectedArtifact?.id === artifact.id
                          ? { backgroundColor: `${accentColor}18`, borderColor: accentColor }
                          : { backgroundColor: "#1e1e1e40", borderColor: "#333333" }
                      }
                    >
                      <div className="flex justify-between items-center gap-2">
                        <strong className="text-xs text-white font-bold">{artifact.title}</strong>
                        <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-[#333333] text-slate-300 font-extrabold">
                          {artifact.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                        {artifact.status === "preview" ? "Preview available" : "Restricted record"}
                      </span>
                    </button>
                  ))}
                  {!currentProjectArtifacts.length && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      No folder-backed artifacts are available yet.
                    </p>
                  )}
                </div>

                {/* Viewer column */}
                <div className="md:col-span-8 flex flex-col gap-3">
                  {selectedArtifact && (
                    <>
                      <div className="bg-[#151515] border border-[#333333] p-5 rounded-xl flex flex-col gap-3">
                        <div className="flex justify-end items-center border-b border-[#333333] pb-2">
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            Verified
                          </span>
                        </div>
                        <h3 className="font-extrabold text-white text-sm">{selectedArtifact.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed bg-[#1e1e1e]/40 p-4 rounded border border-[#333333]">
                          {selectedArtifact.summary}
                        </p>
                        {primaryRelatedNode ? (
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Context: {primaryRelatedNode.label}
                          </div>
                        ) : null}
                      </div>

                      {selectedArtifact && (
                        <ArtifactViewer
                          artifact={selectedArtifact}
                          accentColor={accentColor}
                          projectId={project.id}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#333333] bg-[#1e1e1e]/40 px-6 py-6 mt-6">
        <div className="max-w-7xl mx-auto flex items-center text-xs text-slate-500">
          <span>&copy; 2026 Bivines Group Consulting, LLC. All rights reserved. Principal: Marcus Bivines, Esq.</span>
        </div>
      </footer>
    </div>
  );
}

function ArtifactViewer({
  artifact,
  accentColor,
  projectId
}: {
  artifact: Artifact;
  accentColor: string;
  projectId: string;
}) {
  const artifactFolder = getArtifactFolder(projectId, artifact);
  const isGallery =
    artifact.viewer.kind === "gallery" || Boolean(artifactFolder?.toLowerCase().includes("gallery"));

  return (
    <section className="bg-[#151515] border border-[#333333] rounded-xl p-4 flex flex-col gap-3 animate-scale-up">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Artifact Viewer</p>
          <h3 className="text-sm font-extrabold text-white">{artifact.title}</h3>
        </div>
      </div>
      <p className="text-xs text-slate-400">{artifact.summary}</p>
      <p className="text-[10px] text-slate-500">{artifact.parties.join(" / ")}</p>
      {artifact.viewer.kind === "html" && (
        <iframe
          className="w-full rounded-lg bg-white border-0"
          style={{ minHeight: "420px" }}
          title={artifact.title}
          src={artifact.viewer.src}
        />
      )}
      {artifact.viewer.kind === "image" && (
        <DocumentPageViewer
          images={[artifact.viewer.src]}
          accentColor={accentColor}
          title={artifact.title}
          mode="gallery"
        />
      )}
      {(artifact.viewer.kind === "pages" || artifact.viewer.kind === "gallery") && (
        <DocumentPageViewer
          images={artifact.viewer.images}
          accentColor={accentColor}
          title={artifact.title}
          mode={isGallery ? "gallery" : "pages"}
        />
      )}
      {artifact.viewer.kind === "video" && <VideoArtifactViewer artifact={artifact} />}
      {artifact.viewer.kind === "none" && (
        <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#333333] text-xs text-slate-500">
          <p>This item is intentionally not exposed as a raw file in the public app.</p>
        </div>
      )}
    </section>
  );
}

function VideoArtifactViewer({ artifact }: { artifact: Artifact }) {
  if (artifact.viewer.kind !== "video") return null;

  const sources = artifact.viewer.sources ?? (artifact.viewer.src ? [{ src: artifact.viewer.src }] : []);
  const primarySource = sources[0]?.src;
  const youtubeEmbedSrc = primarySource ? getYouTubeEmbedSrc(primarySource) : null;

  if (youtubeEmbedSrc) {
    return (
      <div className="rounded-xl border border-[#333333] overflow-hidden bg-black aspect-video">
        <iframe
          className="w-full h-full border-0"
          title={artifact.title}
          src={youtubeEmbedSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#333333] overflow-hidden bg-black">
      <video
        className="w-full max-h-[560px] bg-black"
        controls
        playsInline
        preload="metadata"
        poster={artifact.viewer.poster}
      >
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
        Your browser does not support this video format.
      </video>
    </div>
  );
}

function getYouTubeEmbedSrc(src: string) {
  try {
    const url = new URL(src);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function WelcomeModal({
  name,
  accentColor,
  onClose,
  onDontShowAgain
}: {
  name: string;
  accentColor: string;
  onClose: () => void;
  onDontShowAgain: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome message"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-2xl animate-scale-up"
        style={{ fontFamily: '"Montserrat", "Avenir Next", sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close welcome message"
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* accent bar */}
        <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: accentColor }} />

        <div className="p-7 md:p-9 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-sm text-white"
              style={{ backgroundColor: accentColor }}
            >
              Private &amp; Confidential · NDA
            </span>
          </div>

          <div className="flex flex-col gap-4 text-sm text-slate-300 leading-relaxed">
            <p className="text-white text-lg font-extrabold">{name},</p>

            <p>
              Thank you again for the conversation — and for trusting us with the SOWEGA RISING
              materials under NDA.
            </p>
            <p>
              We built this private page as a single, calm reference point for you and your team.
              This portfolio portal gathers sample work, project frameworks, and examples of how we
              approach complex real estate, community development, capital strategy, and
              public-interest projects.
            </p>

            <div>
              <h3 className="text-white font-extrabold text-sm mb-2">How we see SOWEGA RISING</h3>
              <p>
                From our conversation, SOWEGA RISING is far more than a historic preservation effort.
                A vision at that scale needs more than a feasibility study. It needs a project
                control strategy, disciplined financial modeling, capital readiness, coordinated
                partners, and a communications plan that protects the organization while advancing
                the vision.
              </p>
            </div>

            <div>
              <h3 className="text-white font-extrabold text-sm mb-2">
                What you&apos;ll find here
              </h3>
              <p className="mb-2">Examples of how we think through:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>project strategy and early-stage development planning</li>
                <li>capital stack design and financial modeling</li>
                <li>public, private, and philanthropic funding approaches</li>
                <li>project management and implementation sequencing</li>
                <li>partner and stakeholder alignment</li>
                <li>communications, narrative, and positioning</li>
              </ul>
            </div>

            <p>
              Take your time and explore at whatever pace is useful. Everything here is illustrative
              of our approach — when you&apos;re ready, we&apos;ll map it directly to SOWEGA RISING.
            </p>

            <p className="text-white font-bold">— Marcus Bivines, Bivines Group</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#333333] pt-5">
            <button
              type="button"
              onClick={onDontShowAgain}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors font-semibold uppercase tracking-wider self-start"
            >
              Don&apos;t show this again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <Compass className="w-4 h-4" />
              Enter the Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
