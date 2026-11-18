import { css, type Component } from "dreamland/core";

const NOTES = [
  { label: "C4", freq: 261.63, color: "#38bdf8" },
  { label: "D4", freq: 293.66, color: "#34d399" },
  { label: "E4", freq: 329.63, color: "#fbbf24" },
  { label: "G4", freq: 392.00, color: "#f472b6" },
  { label: "A4", freq: 440.00, color: "#a78bfa" },
  { label: "C5", freq: 523.25, color: "#60a5fa" },
  { label: "D5", freq: 587.33, color: "#2dd4bf" },
  { label: "E5", freq: 659.25, color: "#fb7185" },
];

export const App: Component<{}, {}, { lastNote: string; wave: OscillatorType }> = function () {
  this.lastNote = "Tap a pad or press keys 1–8";
  this.wave = "triangle";

  let audioCtx: AudioContext | null = null;

  const playNote = (label: string, freq: number) => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = this.wave;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);

    this.lastNote = `Playing ${label} (${freq} Hz)`;
  };

  this.mount = () => {
    window.addEventListener("keydown", (e) => {
      const idx = Number(e.key) - 1;
      if (NOTES[idx]) playNote(NOTES[idx].label, NOTES[idx].freq);
    });
  };

  return (
    <div class="synth">
      <header>
        <h3>🎹 Dreamland Synth</h3>
        <div class="waves">
          {(["sine", "triangle", "sawtooth", "square"] as OscillatorType[]).map((w) => (
            <button
              class={use(this.wave).map((cur) => (cur === w ? "active" : ""))}
              on:click={() => { this.wave = w; }}
            >
              {w}
            </button>
          ))}
        </div>
      </header>
      <div class="grid">
        {NOTES.map((n, i) => (
          <button
            class="pad"
            style={`border-color: ${n.color};`}
            on:mousedown={() => playNote(n.label, n.freq)}
          >
            <span class="note">{n.label}</span>
            <small>Key {i + 1}</small>
          </button>
        ))}
      </div>
      <p class="readout">{use(this.lastNote)}</p>
    </div>
  );
};

App.style = css`
  :scope { max-width: 480px; margin: 2rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 1.25rem; user-select: none; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .waves { display: flex; gap: 4px; }
  .waves button { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 0.25rem 0.55rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
  .waves button.active { background: #38bdf8; color: #090d16; font-weight: 700; border-color: #38bdf8; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; margin: 1.1rem 0; }
  .pad { aspect-ratio: 1; background: #020617; border: 2px solid #38bdf8; border-radius: 12px; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: transform 0.06s; }
  .pad:active { transform: scale(0.93); background: #1e293b; }
  .note { font-size: 1.15rem; font-weight: 800; }
  small { color: #64748b; font-size: 0.7rem; }
  .readout { text-align: center; color: #38bdf8; font-size: 0.85rem; }
`;

export default App;
