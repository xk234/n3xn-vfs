import { css, type Component } from "dreamland/core";

type Task = { id: number; text: string; done: boolean };

export const App: Component<{}, { draft: string; count: number }> = function () {
  const defaults: Task[] = [
    { id: 1, text: "Build a Dreamland game offline", done: true },
    { id: 2, text: "Export standalone .HTML bundle", done: false },
  ];
  let items: Task[] = defaults;
  try {
    const saved = localStorage.getItem("dl_tasks_v1");
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        items = parsed.filter((item): item is Task =>
          item && typeof item.id === "number" &&
          typeof item.text === "string" && typeof item.done === "boolean"
        );
      }
    }
  } catch (error) {
    console.warn("Could not restore saved tasks; using defaults.", error);
  }
  this.draft = "";
  this.count = items.length;

  let listEl: HTMLUListElement | null = null;

  const renderList = () => {
    this.count = items.length;
    try {
      localStorage.setItem("dl_tasks_v1", JSON.stringify(items));
    } catch (error) {
      console.warn("Could not persist tasks; changes remain available in this preview.", error);
    }
    if (!listEl) return;
    listEl.innerHTML = "";
    for (const t of items) {
      const li = document.createElement("li");
      if (t.done) li.className = "done";

      const label = document.createElement("label");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = t.done;
      chk.onchange = () => {
        t.done = !t.done;
        renderList();
      };

      const span = document.createElement("span");
      span.textContent = t.text;

      label.append(chk, span);

      const del = document.createElement("button");
      del.className = "del";
      del.textContent = "×";
      del.onclick = () => {
        items = items.filter((x) => x.id !== t.id);
        renderList();
      };

      li.append(label, del);
      listEl.appendChild(li);
    }
  };

  const add = (e: Event) => {
    e.preventDefault();
    const clean = this.draft.trim();
    if (!clean) return;
    items.unshift({ id: Date.now(), text: clean, done: false });
    this.draft = "";
    const input = this.root.querySelector("input");
    if (input) input.value = "";
    renderList();
  };

  this.cx.mount = () => {
    listEl = this.root.querySelector("ul");
    renderList();
  };

  return (
    <div class="app">
      <header>
        <h3>📋 Offline Tasks</h3>
        <span>{use(this.count)} total</span>
      </header>
      <form on:submit={add}>
        <input
          placeholder="Add a task..."
          value={use(this.draft)}
          on:input={(e: any) => { this.draft = e.target.value; }}
        />
        <button type="submit">Add</button>
      </form>
      <ul />
    </div>
  );
};

App.style = css`
  :scope { max-width: 460px; margin: 2rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 1.25rem; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  header span { color: #38bdf8; font-size: 0.85rem; font-weight: 700; }
  form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  input[type="text"], input:not([type]) { flex: 1; background: #020617; border: 1px solid #334155; color: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; }
  form button { background: #38bdf8; color: #090d16; border: none; padding: 0 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
  ul { list-style: none; display: flex; flex-direction: column; gap: 0.45rem; }
  li { display: flex; justify-content: space-between; align-items: center; background: #020617; border: 1px solid #1e293b; padding: 0.55rem 0.75rem; border-radius: 8px; }
  li.done span { text-decoration: line-through; color: #64748b; }
  label { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; }
  .del { background: transparent; border: none; color: #f87171; font-size: 1.1rem; cursor: pointer; }
`;

export default App;
