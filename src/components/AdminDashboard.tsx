import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  Globe,
  Key,
  LogIn,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Users,
  X,
} from "lucide-react";

const TOKEN_KEY = "bg-admin-stats-token";

type Bucket = { k: string; n: number };
type Stats = {
  totals: {
    events: number;
    sessions: number;
    visitors: number;
    logins: number;
    loginFails: number;
    totalTimeMs: number;
    avgSessionMs: number;
  };
  topProjects: { project_id: string; n: number }[];
  topArtifacts: { artifact_id: string; project_id: string; n: number }[];
  deviceSplit: Bucket[];
  browserSplit: Bucket[];
  osSplit: Bucket[];
  countrySplit: Bucket[];
  referrerSplit: Bucket[];
  perUser: { user_email: string; events: number; sessions: number; last_seen: number }[];
  daily: { day: string; n: number; sessions: number }[];
  feed: FeedRow[];
  users: string[];
};

type FeedRow = {
  ts: number;
  event_type: string;
  user_email: string | null;
  project_id: string | null;
  artifact_id: string | null;
  label: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
};

const RANGES: { label: string; ms: number | null }[] = [
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "All", ms: null },
];

function fmtDuration(ms: number): string {
  if (!ms) return "0s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string>(
    () => (typeof window !== "undefined" && window.sessionStorage.getItem(TOKEN_KEY)) || ""
  );
  const [tokenInput, setTokenInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [rangeIdx, setRangeIdx] = useState(1); // default 7d
  const [user, setUser] = useState("");
  const [ip, setIp] = useState("");
  const [device, setDevice] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const range = RANGES[rangeIdx];
      if (range.ms) params.set("from", String(Date.now() - range.ms));
      if (user) params.set("user", user);
      if (ip.trim()) params.set("ip", ip.trim());
      if (device) params.set("device", device);

      const res = await fetch(`/api/stats?${params.toString()}`, {
        headers: { "X-Admin-Token": token },
      });
      if (res.status === 401) {
        setError("Invalid admin token.");
        setToken("");
        window.sessionStorage.removeItem(TOKEN_KEY);
        return;
      }
      if (!res.ok) {
        setError(`Request failed (${res.status}).`);
        return;
      }
      setStats((await res.json()) as Stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [token, rangeIdx, user, ip, device]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = useMemo(
    () => Math.max(1, ...(stats?.daily.map((d) => d.n) ?? [1])),
    [stats]
  );

  // ── Token gate ───────────────────────────────────────────────
  if (!token) {
    return (
      <Shell onClose={onClose}>
        <div className="max-w-sm mx-auto mt-24 bg-[#151515] border border-[#333333] rounded-2xl p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-[#91000D] mx-auto mb-3" />
          <h2 className="text-white font-bold mb-1">Admin Token Required</h2>
          <p className="text-xs text-slate-400 mb-5">
            Enter the analytics access token to view activity data.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = tokenInput.trim();
              if (!t) return;
              window.sessionStorage.setItem(TOKEN_KEY, t);
              setToken(t);
            }}
            className="flex flex-col gap-3"
          >
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                autoFocus
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Admin stats token"
                className="w-full bg-[#0e0e0e] border border-[#333333] focus:border-[#91000D] rounded-lg py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#91000D] hover:bg-[#b3101e] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-[#0e0e0e] border border-[#333333] rounded-lg overflow-hidden">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${
                i === rangeIdx ? "bg-[#91000D] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <select
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="bg-[#0e0e0e] border border-[#333333] rounded-lg px-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-[#91000D]"
        >
          <option value="">All users</option>
          <option value="anonymous">Anonymous</option>
          {stats?.users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="bg-[#0e0e0e] border border-[#333333] rounded-lg px-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-[#91000D]"
        >
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>

        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="Filter by IP…"
          className="bg-[#0e0e0e] border border-[#333333] rounded-lg px-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#91000D] w-36"
        />

        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-[#0e0e0e] border border-[#333333] hover:border-[#91000D] px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!stats && loading && <p className="text-slate-500 text-sm">Loading…</p>}

      {stats && (
        <div className="flex flex-col gap-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={<Users className="w-4 h-4" />} label="Visitors" value={stats.totals.visitors} />
            <StatCard icon={<Activity className="w-4 h-4" />} label="Sessions" value={stats.totals.sessions} />
            <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Events" value={stats.totals.events} />
            <StatCard icon={<LogIn className="w-4 h-4" />} label="Logins" value={stats.totals.logins} sub={`${stats.totals.loginFails} failed`} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Total time" value={fmtDuration(stats.totals.totalTimeMs)} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Avg session" value={fmtDuration(stats.totals.avgSessionMs)} />
          </div>

          {/* Daily trend */}
          <Panel title="Activity over time" icon={<BarChart3 className="w-4 h-4" />}>
            {stats.daily.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex items-end gap-1 h-32">
                {stats.daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end group">
                    <div
                      className="w-full bg-[#91000D]/70 group-hover:bg-[#91000D] rounded-t transition-colors"
                      style={{ height: `${(d.n / maxDaily) * 100}%`, minHeight: d.n ? "2px" : "0" }}
                      title={`${d.day}: ${d.n} events, ${d.sessions} sessions`}
                    />
                    <span className="text-[8px] text-slate-600 mt-1 rotate-0 truncate w-full text-center">
                      {d.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Most viewed projects" icon={<BarChart3 className="w-4 h-4" />}>
              <RankBars items={stats.topProjects.map((p) => ({ k: p.project_id, n: p.n }))} />
            </Panel>
            <Panel title="Most viewed artifacts" icon={<BarChart3 className="w-4 h-4" />}>
              <RankBars items={stats.topArtifacts.map((a) => ({ k: a.artifact_id, n: a.n }))} />
            </Panel>
            <Panel title="Devices" icon={<Smartphone className="w-4 h-4" />}>
              <RankBars items={stats.deviceSplit} />
            </Panel>
            <Panel title="Browsers" icon={<Monitor className="w-4 h-4" />}>
              <RankBars items={stats.browserSplit} />
            </Panel>
            <Panel title="Operating systems" icon={<Monitor className="w-4 h-4" />}>
              <RankBars items={stats.osSplit} />
            </Panel>
            <Panel title="Top countries" icon={<Globe className="w-4 h-4" />}>
              <RankBars items={stats.countrySplit} />
            </Panel>
          </div>

          {/* Per-user table */}
          <Panel title="Activity by user" icon={<Users className="w-4 h-4" />}>
            {stats.perUser.length === 0 ? (
              <Empty />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-[#2a2a2a]">
                    <th className="py-2 font-semibold">User</th>
                    <th className="py-2 font-semibold text-right">Sessions</th>
                    <th className="py-2 font-semibold text-right">Events</th>
                    <th className="py-2 font-semibold text-right">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perUser.map((u) => (
                    <tr key={u.user_email} className="border-b border-[#1c1c1c]">
                      <td className="py-2 text-slate-200">{u.user_email}</td>
                      <td className="py-2 text-right text-slate-400">{u.sessions}</td>
                      <td className="py-2 text-right text-slate-400">{u.events}</td>
                      <td className="py-2 text-right text-slate-500">{fmtTime(u.last_seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {/* Live feed */}
          <Panel title="Recent activity" icon={<Activity className="w-4 h-4" />}>
            {stats.feed.length === 0 ? (
              <Empty />
            ) : (
              <div className="flex flex-col divide-y divide-[#1c1c1c] max-h-96 overflow-y-auto">
                {stats.feed.map((f, i) => (
                  <div key={i} className="py-2 flex items-center gap-3 text-xs">
                    <span className="text-slate-600 w-28 flex-shrink-0">{fmtTime(f.ts)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#91000D]/20 text-[#e0707a] font-mono text-[10px] w-28 flex-shrink-0 text-center">
                      {f.event_type}
                    </span>
                    <span className="text-slate-300 flex-shrink-0 w-44 truncate">
                      {f.user_email ?? "anonymous"}
                    </span>
                    <span className="text-slate-500 truncate flex-1">
                      {[f.project_id, f.artifact_id, f.label].filter(Boolean).join(" · ")}
                    </span>
                    <span className="text-slate-600 flex-shrink-0 hidden md:inline">
                      {[f.device, f.country, f.ip].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#090909] overflow-y-auto"
      style={{ fontFamily: '"Montserrat", "Avenir Next", sans-serif' }}
    >
      <div className="sticky top-0 z-10 bg-[#1e1e1e]/95 backdrop-blur border-b border-[#333333] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#91000D]" />
          <h1 className="text-white font-extrabold uppercase tracking-tight text-sm">
            Activity Analytics
          </h1>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-1.5">
        <span className="text-[#91000D]">{icon}</span>
        {label}
      </div>
      <div className="text-white text-2xl font-extrabold leading-none">{value}</div>
      {sub && <div className="text-slate-600 text-[10px] mt-1">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-1.5 text-slate-300 text-xs uppercase tracking-wider font-bold mb-4">
        <span className="text-[#91000D]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function RankBars({ items }: { items: Bucket[] }) {
  if (!items.length) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.k} className="flex items-center gap-3 text-xs">
          <span className="w-40 truncate text-slate-300" title={item.k}>
            {item.k || "—"}
          </span>
          <div className="flex-1 bg-[#0e0e0e] rounded h-4 overflow-hidden">
            <div
              className="h-full bg-[#91000D]/70 rounded"
              style={{ width: `${(item.n / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-slate-400 tabular-nums">{item.n}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-slate-600 text-xs italic">No data for this filter.</p>;
}
