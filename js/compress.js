
/**
 * n3xn VFS v3 — optional powerful compression (N3C1)
 *
 * SAFETY CONTRACT (must never break v2 data):
 * - Default level is "off" (byte-identical to pure AES path when integrated opt-in only).
 * - decompressFromStorage: if payload is not N3C1, return bytes unchanged.
 * - decompress never throws to caller for plain blobs; failures fall back to raw.
 * - compress only wraps when level != off AND size >= threshold AND CompressionStream exists.
 * - This module does NOT patch db.js by itself. Wire only via opt-in hooks.
 */

const MAGIC = new Uint8Array([0x4e, 0x33, 0x43, 0x31]); // N3C1

export const LEVELS = {
  off: { label: "Off (v2 identical)", format: null },
  fast: { label: "Fast (deflate)", format: "deflate" },
  balanced: { label: "Balanced (deflate)", format: "deflate" },
  max: { label: "Max (deflate)", format: "deflate" },
  ultra: { label: "Ultra (gzip)", format: "gzip" },
};

const MIN_BYTES = 96;

let current = "off";
try {
  const s = localStorage.getItem("n3xn_compress_level");
  if (s && LEVELS[s]) current = s;
} catch (_) {}

export function getCompressionLevel() {
  return current;
}

export function setCompressionLevel(level) {
  if (!LEVELS[level]) level = "off";
  current = level;
  try {
    localStorage.setItem("n3xn_compress_level", level);
  } catch (_) {}
  return current;
}

export function isCompressedBlob(u8) {
  if (!u8 || u8.length < 8) return false;
  const a = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  return a[0] === 0x4e && a[1] === 0x33 && a[2] === 0x43 && a[3] === 0x31;
}

async function transform(u8, StreamCtor, format) {
  const stream = new StreamCtor(format);
  const w = stream.writable.getWriter();
  w.write(u8);
  w.close();
  const chunks = [];
  const r = stream.readable.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/**
 * @returns {{ data: Uint8Array, compressed: boolean, algorithm: string|null, ratio: number }}
 */
export async function compressForStorage(u8, level) {
  const lv = level != null ? level : current;
  const cfg = LEVELS[lv] || LEVELS.off;
  const input = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);

  if (!cfg.format || input.length < MIN_BYTES || typeof CompressionStream === "undefined") {
    return { data: input, compressed: false, algorithm: null, ratio: 1 };
  }

  try {
    const body = await transform(input, CompressionStream, cfg.format);
    // Never expand
    if (body.length >= input.length) {
      return { data: input, compressed: false, algorithm: null, ratio: 1 };
    }
    const header = new Uint8Array(8);
    header.set(MAGIC, 0);
    header[4] = cfg.format === "gzip" ? 2 : 1; // format id
    header[5] = 1; // header version
    const out = new Uint8Array(8 + body.length);
    out.set(header, 0);
    out.set(body, 8);
    return {
      data: out,
      compressed: true,
      algorithm: cfg.format,
      ratio: body.length / input.length,
    };
  } catch (e) {
    console.warn("[n3xn compress] skipped:", e);
    return { data: input, compressed: false, algorithm: null, ratio: 1 };
  }
}

/** Safe: non-N3C1 bytes returned as-is. Never throws. */
export async function decompressFromStorage(u8) {
  try {
    const input = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    if (!isCompressedBlob(input)) return input;
    if (typeof DecompressionStream === "undefined") return input;
    const fmt = input[4] === 2 ? "gzip" : "deflate";
    return await transform(input.subarray(8), DecompressionStream, fmt);
  } catch (e) {
    console.warn("[n3xn decompress] pass-through raw:", e);
    try {
      return u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    } catch {
      return new Uint8Array(0);
    }
  }
}
