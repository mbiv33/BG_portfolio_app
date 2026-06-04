// POST /api/track — ingest a single activity event.
// Failures are swallowed (204) so tracking never breaks the visitor experience.
import {
  clamp,
  DEVICES,
  EVENT_TYPES,
  parseUserAgent,
  type Env,
  type EventType,
} from "./_shared";

interface Body {
  event_type?: string;
  visitor_id?: string;
  session_id?: string;
  user_email?: string | null;
  project_id?: string;
  artifact_id?: string;
  label?: string;
  device?: string;
  referrer?: string;
  path?: string;
  duration_ms?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    const eventType = clamp(body.event_type, 32) as EventType | null;
    if (!eventType || !EVENT_TYPES.includes(eventType)) {
      return new Response(null, { status: 204 });
    }

    const ua = request.headers.get("User-Agent") ?? "";
    const parsed = parseUserAgent(ua);
    // Prefer the client-reported device when it's a known value; fall back to UA.
    const clientDevice = clamp(body.device, 16);
    const device =
      clientDevice && (DEVICES as readonly string[]).includes(clientDevice)
        ? clientDevice
        : parsed.device;

    const cf = (request as unknown as { cf?: IncomingRequestCfProperties }).cf;
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For") ??
      null;

    let durationMs: number | null = null;
    if (typeof body.duration_ms === "number" && isFinite(body.duration_ms)) {
      // Clamp to [0, 6h] to reject garbage.
      durationMs = Math.max(0, Math.min(Math.round(body.duration_ms), 6 * 60 * 60 * 1000));
    }

    await env.DB.prepare(
      `INSERT INTO events
        (ts, visitor_id, session_id, user_email, event_type, project_id, artifact_id,
         label, device, browser, os, ip, country, city, referrer, path, duration_ms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        Date.now(),
        clamp(body.visitor_id, 64),
        clamp(body.session_id, 64),
        clamp(body.user_email, 254),
        eventType,
        clamp(body.project_id, 64),
        clamp(body.artifact_id, 64),
        clamp(body.label, 256),
        device,
        parsed.browser,
        parsed.os,
        ip,
        clamp(cf?.country, 8),
        clamp(cf?.city, 128),
        clamp(body.referrer, 512),
        clamp(body.path, 512),
        durationMs
      )
      .run();

    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Never surface tracking errors to the client.
    return new Response(null, { status: 204 });
  }
};
