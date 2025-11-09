import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
  
// Safe logger: only logs when not in production
export function log(...args) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

// Lightweight fetch wrapper that validates response.ok and attempts JSON parsing
export async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // keep text as fallback
    data = text;
  }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || (typeof data === 'string' ? data : null) || res.statusText || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}
