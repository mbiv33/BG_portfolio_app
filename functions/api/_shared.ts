// Shared helpers for the analytics Pages Functions.

export interface Env {
  DB: D1Database;
  ADMIN_STATS_TOKEN?: string;
}

export const EVENT_TYPES = [
  "page_view",
  "project_view",
  "artifact_view",
  "tab_change",
  "click",
  "login",
  "login_failed",
  "heartbeat",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const DEVICES = ["desktop", "mobile", "tablet"] as const;

// Trim untrusted strings to a sane length before they hit the DB.
export function clamp(value: unknown, max = 512): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.length > max ? str.slice(0, max) : str;
}

// Minimal dependency-free User-Agent parsing — good enough for dashboard buckets.
export function parseUserAgent(ua: string): {
  device: string;
  browser: string;
  os: string;
} {
  const s = ua || "";
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s);
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(s);
  const device = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser = "Unknown";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = "Safari";

  let os = "Unknown";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Linux/i.test(s)) os = "Linux";

  return { device, browser, os };
}

// Length-independent comparison to avoid leaking the token via timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
