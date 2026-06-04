// Lightweight client-side activity tracker. Sends events to /api/track.
// Designed to fail silently — analytics must never break the portal.

export type AnalyticsEvent =
  | "page_view"
  | "project_view"
  | "artifact_view"
  | "tab_change"
  | "click"
  | "login"
  | "login_failed"
  | "heartbeat";

type Payload = {
  user_email?: string | null;
  project_id?: string;
  artifact_id?: string;
  label?: string;
  duration_ms?: number;
};

const VISITOR_KEY = "bg-visitor-id";
const SESSION_KEY = "bg-session-id";

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getVisitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uid();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

function getSessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uid();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

function detectDevice(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent || "";
  const touch = (navigator.maxTouchPoints ?? 0) > 1;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return "tablet";
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) {
    return "mobile";
  }
  // Large touch screens with no desktop UA hint → treat as tablet.
  if (touch && Math.min(window.screen.width, window.screen.height) < 820) {
    return "mobile";
  }
  return "desktop";
}

// Current logged-in user, set by the app on login / sign-out.
let currentUserEmail: string | null = null;
export function setAnalyticsUser(email: string | null): void {
  currentUserEmail = email;
}

const device = typeof navigator !== "undefined" ? detectDevice() : "desktop";

function send(event: AnalyticsEvent, payload: Payload, beacon = false): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event_type: event,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      user_email: payload.user_email !== undefined ? payload.user_email : currentUserEmail,
      device,
      referrer: document.referrer || undefined,
      path: window.location.pathname + window.location.search,
      ...payload,
    });

    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  send(event, payload);
}

// ── Engaged-time tracking ──────────────────────────────────────────────
// Accumulate visible time and flush as `heartbeat` events with duration_ms.
let segmentStart = Date.now();
let tracking = false;

function flush(beacon = false): void {
  if (!tracking) return;
  const elapsed = Date.now() - segmentStart;
  segmentStart = Date.now();
  if (elapsed > 1000) {
    send("heartbeat", { duration_ms: elapsed }, beacon);
  }
}

export function startEngagementTracking(): () => void {
  if (typeof window === "undefined" || tracking) return () => {};
  tracking = true;
  segmentStart = Date.now();

  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush(true);
    else segmentStart = Date.now();
  };
  const onHide = () => flush(true);
  // Periodic flush so long single-page sessions still record time.
  const interval = window.setInterval(() => flush(false), 30_000);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);

  return () => {
    flush(true);
    tracking = false;
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("beforeunload", onHide);
  };
}
