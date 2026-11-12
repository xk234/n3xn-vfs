/**
 * n3xn system metrics (v3.0.8-beta) — FPS, storage, battery, bandwidth (best-effort)
 * Samples offline into OPFS (or memory fallback), encrypted later by account layer.
 * Keeps ~10 days of coarse samples.
 */
const MAX_DAYS = 10;
const SAMPLE_MS = 5000;
const STORE = "n3xn_metrics_v1";

function now() {
  return Date.now();
}

function dayKey(t = Date.now()) {
  return new Date(t).toISOString().slice(0, 10);
}

async function loadStore() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { days: {}, spikes: [] };
}

async function saveStore(data) {
  // prune > 10 days
  const keys = Object.keys(data.days || {}).sort();
  while (keys.length > MAX_DAYS) {
    delete data.days[keys.shift()];
  }
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch (_) {}
  // OPFS mirror (best-effort)
  try {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("n3xn-metrics", { create: true });
      const fh = await dir.getFileHandle("metrics.json", { create: true });
      const w = await fh.createWritable();
      await w.write(JSON.stringify(data));
      await w.close();
    }
  } catch (_) {}
}

let fps = 0;
let frames = 0;
let lastFpsT = performance.now();
let rafId = 0;
let netBytes = 0;
let lastSpikeReason = "";

function tickFps(t) {
  frames++;
  if (t - lastFpsT >= 1000) {
    fps = Math.round((frames * 1000) / (t - lastFpsT));
    frames = 0;
    lastFpsT = t;
  }
  rafId = requestAnimationFrame(tickFps);
}

async function sample() {
  const data = await loadStore();
  const d = dayKey();
  if (!data.days[d]) data.days[d] = [];
  const entry = {
    t: now(),
    fps,
    vsync: true,
    mem: null,
    storage: null,
    battery: null,
    net: netBytes,
    reason: lastSpikeReason || null,
  };
  try {
    if (performance.memory) {
      entry.mem = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
      };
    }
  } catch (_) {}
  try {
    if (navigator.storage?.estimate) {
      entry.storage = await navigator.storage.estimate();
    }
  } catch (_) {}
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      entry.battery = { level: b.level, charging: b.charging };
    }
  } catch (_) {}
  data.days[d].push(entry);
  // keep ~200 samples/day max
  if (data.days[d].length > 200) data.days[d].splice(0, data.days[d].length - 200);
  // spike detect: fps drop or storage jump
  const prev = data.days[d][data.days[d].length - 2];
  if (prev) {
    if (prev.fps > 40 && entry.fps < 15) {
      data.spikes.push({ t: entry.t, type: "fps-drop", from: prev.fps, to: entry.fps });
    }
  }
  if (data.spikes.length > 100) data.spikes.splice(0, data.spikes.length - 100);
  lastSpikeReason = "";
  await saveStore(data);
  return entry;
}

export function startMetrics() {
  if (typeof window === "undefined") return;
  if (window.__n3xnMetricsStarted) return;
  window.__n3xnMetricsStarted = true;
  rafId = requestAnimationFrame(tickFps);
  // Bandwidth: observe resource timing delta
  try {
    setInterval(() => {
      try {
        const entries = performance.getEntriesByType("resource");
        let sum = 0;
        for (const e of entries) sum += e.transferSize || 0;
        netBytes = sum;
      } catch (_) {}
    }, 10000);
  } catch (_) {}
  sample();
  setInterval(sample, SAMPLE_MS);
}

export function noteSpike(reason) {
  lastSpikeReason = String(reason || "").slice(0, 120);
}

export async function getMetricsSummary() {
  const data = await loadStore();
  return {
    fps,
    days: Object.keys(data.days || {}).length,
    spikes: (data.spikes || []).slice(-20),
    latest: (() => {
      const keys = Object.keys(data.days || {}).sort();
      const last = keys[keys.length - 1];
      const arr = (last && data.days[last]) || [];
      return arr[arr.length - 1] || null;
    })(),
  };
}

if (typeof window !== "undefined") {
  window.__n3xnMetrics = { startMetrics, getMetricsSummary, noteSpike };
  // auto-start light
  try {
    startMetrics();
  } catch (_) {}
}
