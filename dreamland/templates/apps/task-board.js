export const TASK_BOARD_TEMPLATE = {
  id: "app-tasks",
  category: "Apps",
  name: "📋 Offline Task Tracker",
  files: {
    "/src/main.tsx": `import { css, type Component } from "dreamland/core";

type Task = { id: number; text: string; done: boolean };

export const App: Component<{}, { draft: string; count: number; items: Task[] }> = function () {
  const saved = localStorage.getItem("dl_tasks_v1");
  this.items = saved
    ? JSON.parse(saved)
    : [
        { id: 1, text: "Build a Dreamland game offline", done: true },
        { id: 2, text: "Export standalone .HTML bundle", done: false },
      ];
  this.draft = "";
  this.count = this.items.length;

  const sync = () => {
    this.items = [...this.items];
    this.count = this.items.length;
    localStorage.setItem("dl_tasks_v1", JSON.stringify(this.items));
  };

  const add = (e: Event) => {
    e.preventDefault();
    const clean = this.draft.trim();
    if (!clean) return;
    this.items.unshift({ id: Date.now(), text: clean, done: false });
    this.draft = "";
    sync();
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
      <ul>
        {use(this.items).map((list) =>
          list.map((t) => (
            <li class={t.done ? "done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={t.done}
                  on:change={() => { t.done = !t.done; sync(); }}
                />
                <span>{t.text}</span>
              </label>
              <button
                class="del"
                on:click={() => { this.items = this.items.filter((x) => x.id !== t.id); sync(); }}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

App.style = css\`
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
\`;

export default App;
`,
  },
};
