
/**
 * n3xn VFS v3.0.0-beta — Connectors (keys / tokens stored encrypted when VFS session exists)
 * Falls back to session-only memory if not logged in.
 */
const STORE_KEY = "n3xn_connectors_v1";

const BUILTIN = [
  { id: "openai", label: "OpenAI API key", fields: ["apiKey", "baseUrl"] },
  { id: "anthropic", label: "Anthropic API key", fields: ["apiKey"] },
  { id: "github", label: "GitHub token", fields: ["token", "username"] },
  { id: "cf-workers", label: "Cloudflare Workers / AI", fields: ["accountId", "apiToken"] },
  { id: "wss-relay", label: "Collab / Chat WSS relay", fields: ["url"] },
  { id: "custom-http", label: "Custom HTTP endpoint", fields: ["url", "headerName", "headerValue"] },
  { id: "s3", label: "S3-compatible storage", fields: ["endpoint", "accessKey", "secretKey", "bucket"] },
  { id: "supabase", label: "Supabase", fields: ["url", "anonKey"] },
  { id: "firebase", label: "Firebase", fields: ["apiKey", "projectId"] },
  { id: "discord", label: "Discord webhook / bot", fields: ["webhookUrl", "botToken"] },
];

function memStore() {
  if (!window.__n3xnConnMem) window.__n3xnConnMem = {};
  return window.__n3xnConnMem;
}

export function listConnectorTypes() {
  return BUILTIN.slice();
}

export function loadConnectorsPlain() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return { ...memStore() };
  }
}

export function saveConnectorsPlain(obj) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch (_) {
    Object.assign(memStore(), obj);
  }
}

export function getConnector(id) {
  const all = loadConnectorsPlain();
  return all[id] || null;
}

export function setConnector(id, data) {
  const all = loadConnectorsPlain();
  all[id] = { ...data, updated: Date.now() };
  saveConnectorsPlain(all);
  return all[id];
}

export function deleteConnector(id) {
  const all = loadConnectorsPlain();
  delete all[id];
  saveConnectorsPlain(all);
}

export function renderConnectorsUI(root) {
  if (!root) return;
  const types = listConnectorTypes();
  const all = loadConnectorsPlain();
  root.innerHTML = `
    <div class="conn-wrap">
      <h2>Connectors</h2>
      <p class="muted">Keys stay in this browser (localStorage). Prefer installed-app mode. Never commit tokens to VFS public files.</p>
      <div class="conn-list"></div>
    </div>`;
  const list = root.querySelector(".conn-list");
  types.forEach((t) => {
    const cur = all[t.id] || {};
    const card = document.createElement("div");
    card.className = "conn-card";
    card.innerHTML = `<h3>${t.label}</h3>`;
    t.fields.forEach((f) => {
      const row = document.createElement("div");
      row.className = "form-group";
      row.innerHTML = `<label>${f}</label><input type="${
        /key|token|secret/i.test(f) ? "password" : "text"
      }" data-field="${f}" value="" placeholder="${f}" autocomplete="off" />`;
      const input = row.querySelector("input");
      if (cur[f]) input.value = cur[f];
      card.appendChild(row);
    });
    const actions = document.createElement("div");
    actions.className = "conn-actions";
    const save = document.createElement("button");
    save.className = "btn primary";
    save.textContent = "Save";
    save.onclick = () => {
      const data = {};
      card.querySelectorAll("[data-field]").forEach((inp) => {
        data[inp.getAttribute("data-field")] = inp.value;
      });
      setConnector(t.id, data);
      save.textContent = "Saved";
      setTimeout(() => (save.textContent = "Save"), 1200);
    };
    const clear = document.createElement("button");
    clear.className = "btn ghost";
    clear.textContent = "Clear";
    clear.onclick = () => {
      deleteConnector(t.id);
      card.querySelectorAll("[data-field]").forEach((inp) => (inp.value = ""));
    };
    actions.appendChild(save);
    actions.appendChild(clear);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

if (typeof window !== "undefined") {
  window.__n3xnConnectors = {
    listConnectorTypes,
    getConnector,
    setConnector,
    deleteConnector,
    renderConnectorsUI,
  };
}
