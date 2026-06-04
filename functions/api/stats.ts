// GET /api/stats — aggregated analytics for the admin dashboard.
// Protected by the ADMIN_STATS_TOKEN secret (sent via X-Admin-Token header).
import { safeEqual, type Env } from "./_shared";

// Build a shared WHERE clause + bindings from the request filters so every
// section of the dashboard respects the active filter set.
function buildFilter(url: URL): { where: string; binds: unknown[] } {
  const clauses: string[] = [];
  const binds: unknown[] = [];

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const user = url.searchParams.get("user");
  const ip = url.searchParams.get("ip");
  const device = url.searchParams.get("device");
  const project = url.searchParams.get("project");

  if (from) {
    const n = Number(from);
    if (isFinite(n)) {
      clauses.push("ts >= ?");
      binds.push(n);
    }
  }
  if (to) {
    const n = Number(to);
    if (isFinite(n)) {
      clauses.push("ts <= ?");
      binds.push(n);
    }
  }
  if (user) {
    if (user === "anonymous") {
      clauses.push("user_email IS NULL");
    } else {
      clauses.push("user_email = ?");
      binds.push(user);
    }
  }
  if (ip) {
    clauses.push("ip LIKE ?");
    binds.push(`%${ip}%`);
  }
  if (device) {
    clauses.push("device = ?");
    binds.push(device);
  }
  if (project) {
    clauses.push("project_id = ?");
    binds.push(project);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, binds };
}

async function all<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  binds: unknown[]
): Promise<T[]> {
  const res = await db.prepare(sql).bind(...binds).all<T>();
  return res.results ?? [];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const token = request.headers.get("X-Admin-Token") ?? "";
  if (!env.ADMIN_STATS_TOKEN || !safeEqual(token, env.ADMIN_STATS_TOKEN)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const { where, binds } = buildFilter(url);
  const db = env.DB;

  try {
    const [
      totalsRows,
      loginRows,
      durationRows,
      topProjects,
      topArtifacts,
      deviceSplit,
      browserSplit,
      osSplit,
      countrySplit,
      referrerSplit,
      perUser,
      daily,
      feed,
      userList,
    ] = await Promise.all([
      all(
        db,
        `SELECT COUNT(*) AS events,
                COUNT(DISTINCT session_id) AS sessions,
                COUNT(DISTINCT visitor_id) AS visitors
           FROM events ${where}`,
        binds
      ),
      all(
        db,
        `SELECT event_type, COUNT(*) AS n FROM events ${where}
          ${where ? "AND" : "WHERE"} event_type IN ('login','login_failed')
          GROUP BY event_type`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(SUM(duration_ms),0) AS total_ms,
                COUNT(DISTINCT session_id) AS sessions
           FROM events ${where}
           ${where ? "AND" : "WHERE"} event_type = 'heartbeat'`,
        binds
      ),
      all(
        db,
        `SELECT project_id, COUNT(*) AS n FROM events ${where}
          ${where ? "AND" : "WHERE"} event_type = 'project_view' AND project_id IS NOT NULL
          GROUP BY project_id ORDER BY n DESC LIMIT 15`,
        binds
      ),
      all(
        db,
        `SELECT artifact_id, project_id, COUNT(*) AS n FROM events ${where}
          ${where ? "AND" : "WHERE"} event_type = 'artifact_view' AND artifact_id IS NOT NULL
          GROUP BY artifact_id ORDER BY n DESC LIMIT 15`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(device,'unknown') AS k, COUNT(*) AS n FROM events ${where}
          GROUP BY device ORDER BY n DESC`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(browser,'Unknown') AS k, COUNT(*) AS n FROM events ${where}
          GROUP BY browser ORDER BY n DESC LIMIT 10`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(os,'Unknown') AS k, COUNT(*) AS n FROM events ${where}
          GROUP BY os ORDER BY n DESC LIMIT 10`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(country,'??') AS k, COUNT(*) AS n FROM events ${where}
          GROUP BY country ORDER BY n DESC LIMIT 10`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(NULLIF(referrer,''),'direct') AS k, COUNT(*) AS n FROM events ${where}
          GROUP BY k ORDER BY n DESC LIMIT 10`,
        binds
      ),
      all(
        db,
        `SELECT COALESCE(user_email,'anonymous') AS user_email,
                COUNT(*) AS events,
                COUNT(DISTINCT session_id) AS sessions,
                MAX(ts) AS last_seen
           FROM events ${where}
          GROUP BY user_email ORDER BY events DESC`,
        binds
      ),
      all(
        db,
        `SELECT date(ts/1000,'unixepoch') AS day, COUNT(*) AS n,
                COUNT(DISTINCT session_id) AS sessions
           FROM events ${where}
          GROUP BY day ORDER BY day DESC LIMIT 30`,
        binds
      ),
      all(
        db,
        `SELECT ts, event_type, user_email, project_id, artifact_id, label,
                device, browser, os, ip, country, city
           FROM events ${where}
          ORDER BY ts DESC LIMIT 50`,
        binds
      ),
      // Distinct users across ALL data (unfiltered) to populate the filter dropdown.
      all(
        db,
        `SELECT DISTINCT user_email FROM events WHERE user_email IS NOT NULL ORDER BY user_email`,
        []
      ),
    ]);

    const t = totalsRows[0] ?? {};
    const logins = loginRows.find((r) => r.event_type === "login")?.n ?? 0;
    const loginFails =
      loginRows.find((r) => r.event_type === "login_failed")?.n ?? 0;
    const dur = durationRows[0] ?? {};
    const totalMs = Number(dur.total_ms ?? 0);
    const durSessions = Number(dur.sessions ?? 0);

    return new Response(
      JSON.stringify({
        totals: {
          events: Number(t.events ?? 0),
          sessions: Number(t.sessions ?? 0),
          visitors: Number(t.visitors ?? 0),
          logins: Number(logins),
          loginFails: Number(loginFails),
          totalTimeMs: totalMs,
          avgSessionMs: durSessions ? Math.round(totalMs / durSessions) : 0,
        },
        topProjects,
        topArtifacts,
        deviceSplit,
        browserSplit,
        osSplit,
        countrySplit,
        referrerSplit,
        perUser,
        daily: daily.slice().reverse(),
        feed,
        users: userList.map((u) => u.user_email),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "query_failed", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
