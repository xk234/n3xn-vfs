/**
 * n3xn VFS v3.0.4-beta — expanded Connectors
 */
const STORE_KEY = "n3xn_connectors_v1";

const BUILTIN = [
  { id: "openai", label: "OpenAI", fields: ["apiKey", "baseUrl", "model"], hint: "Chat / completions" },
  { id: "anthropic", label: "Anthropic", fields: ["apiKey", "model"], hint: "Claude" },
  { id: "google-ai", label: "Google AI / Gemini", fields: ["apiKey", "model"] },
  { id: "groq", label: "Groq", fields: ["apiKey", "model"] },
  { id: "github", label: "GitHub", fields: ["token", "username", "defaultRepo"], hint: "VFS sync / API" },
  { id: "gitlab", label: "GitLab", fields: ["token", "baseUrl"] },
  { id: "cf-workers", label: "Cloudflare", fields: ["accountId", "apiToken", "workersAi"] },
  { id: "wss-relay", label: "Collab / Chat WSS", fields: ["url", "password"] },
  { id: "custom-http", label: "Custom HTTP", fields: ["url", "headerName", "headerValue", "method"] },
  { id: "s3", label: "S3-compatible", fields: ["endpoint", "accessKey", "secretKey", "bucket", "region"] },
  { id: "supabase", label: "Supabase", fields: ["url", "anonKey", "serviceRole"] },
  { id: "firebase", label: "Firebase", fields: ["apiKey", "projectId", "appId"] },
  { id: "discord", label: "Discord", fields: ["webhookUrl", "botToken"] },
  { id: "telegram", label: "Telegram bot", fields: ["botToken", "chatId"] },
  { id: "notion", label: "Notion", fields: ["apiKey", "databaseId"] },
  { id: "spotify", label: "Spotify", fields: ["clientId", "clientSecret", "refreshToken"] },
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
  return loadConnectorsPlain()[id] || null;
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
    <p class="muted">Keys stay in this browser (localStorage). Prefer installed-app mode. Never commit tokens into public VFS files.</p>
    <p class="muted">${types.length} connector types · scroll for all</p>
    <div class="conn-list"></div>
  `;
  const list = root.querySelector(".conn-list");
  types.forEach((t) => {
    const cur = all[t.id] || {};
    const card = document.createElement("div");
    card.className = "conn-card";
    card.innerHTML = `<h3>${t.label}</h3>${t.hint ? `<p class="muted">${t.hint}</p>` : ""}`;
    t.fields.forEach((f) => {
      const row = document.createElement("div");
      row.className = "form-group";
      const secret = /key|token|secret|password|role/i.test(f);
      row.innerHTML = `<label>${f}</label><input type="${secret ? "password" : "text"}" data-field="${f}" value="" placeholder="${f}" autocomplete="off" />`;
      const input = row.querySelector("input");
      if (cur[f]) input.value = cur[f];
      card.appendChild(row);
    });
    const actions = document.createElement("div");
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
    clear.className = "btn";
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
