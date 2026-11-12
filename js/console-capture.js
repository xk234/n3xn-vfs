/**
 * n3xn console capture v3.0.9-beta
 * Rich color terminal logs · stack ^^^ under error site · multi-line safe
 */
(function n3xnConsoleCapture() {
  "use strict";
  if (typeof window === "undefined" || window.__n3xnConsoleCaptureInstalled) return;
  window.__n3xnConsoleCaptureInstalled = true;

  var METHODS = ["log", "info", "warn", "error", "debug", "trace", "dir", "table", "group", "groupEnd", "groupCollapsed"];
  var buffer = [];
  var MAX = 4000;
  var silentDevtools = true;
  try {
    if (localStorage.getItem("n3xn_console_silent") === "0") silentDevtools = false;
  } catch (_) {}

  var COLORS = {
    log: "#c8c8d8",
    info: "#7ec8ff",
    warn: "#ffd36b",
    error: "#ff6b8a",
    debug: "#9a9ab0",
    trace: "#b08cff",
    ok: "#6bffb8",
    system: "#8888a0",
  };

  var orig = {};
  METHODS.forEach(function (m) {
    try {
      orig[m] = console[m] && console[m].bind(console);
    } catch (_) {}
  });

  function fmtArg(a) {
    try {
      if (a instanceof Error) return a.stack || a.message || String(a);
      if (typeof a === "string") return a;
      if (typeof a === "undefined") return "undefined";
      if (a === null) return "null";
      if (typeof a === "function") return "[function " + (a.name || "anonymous") + "]";
      return JSON.stringify(
        a,
        function (_k, v) {
          if (typeof v === "bigint") return String(v);
          if (v instanceof Error) return v.message;
          if (typeof v === "function") return "[Function]";
          return v;
        },
        2
      );
    } catch (e) {
      try {
        return String(a);
      } catch (e2) {
        return "[unprintable]";
      }
    }
  }

  function extractStackFrames(text) {
    var lines = String(text).split(/\r?\n/);
    var frames = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(/^\s*at\s+(?:(.+?)\s+\()?((?:https?:|blob:\|\/)[^):\s]+):(\d+):(\d+)\)?/);
      if (m) {
        frames.push({ fn: m[1] || "(anonymous)", url: m[2], line: +m[3], col: +m[4], raw: line });
      }
    }
    return frames;
  }

  function caretLine(col) {
    var n = Math.max(0, (col || 1) - 1);
    if (n > 120) n = 120;
    return new Array(n + 1).join(" ") + "^^^";
  }

  function appendRow(level, text, extra) {
    buffer.push({ t: Date.now(), level: level, text: text, extra: extra || null });
    if (buffer.length > MAX) buffer.shift();

    try {
      if (typeof window.__n3xnAppendConsole === "function") {
        window.__n3xnAppendConsole(level, text, extra);
      }
    } catch (_) {}

    var hosts = [
      document.getElementById("terminal-output"),
      document.getElementById("term-output"),
      document.querySelector(".terminal-output"),
      document.querySelector(".term-lines"),
      document.getElementById("n3xn-console"),
    ];

    for (var h = 0; h < hosts.length; h++) {
      var el = hosts[h];
      if (!el) continue;
      try {
        var block = document.createElement("div");
        block.className = "n3xn-console-block n3xn-console-" + level;
        block.style.cssText =
          "margin:2px 0;padding:2px 0;border-left:3px solid " +
          (COLORS[level] || COLORS.log) +
          ";padding-left:8px;color:" +
          (COLORS[level] || COLORS.log) +
          ";white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,JetBrains Mono,monospace;font-size:12px;line-height:1.35";

        var head = document.createElement("div");
        head.className = "n3xn-console-line";
        var ts = new Date().toLocaleTimeString();
        head.textContent = ts + " [" + level + "] " + text;
        block.appendChild(head);

        if (extra && extra.frames && extra.frames.length) {
          var top = extra.frames[0];
          var loc = document.createElement("div");
          loc.style.cssText = "opacity:.85;color:" + COLORS.trace;
          loc.textContent = "  at " + top.fn + " · " + top.url + ":" + top.line + ":" + top.col;
          block.appendChild(loc);
          var carets = document.createElement("div");
          carets.style.cssText = "color:#ff6b8a;font-weight:700;letter-spacing:0";
          carets.textContent = "  " + caretLine(top.col) + "  ← here";
          block.appendChild(carets);
          if (extra.frames.length > 1) {
            var more = document.createElement("div");
            more.style.opacity = ".55";
            more.textContent = extra.frames
              .slice(1, 6)
              .map(function (f) {
                return "  · " + f.fn + " @ :" + f.line + ":" + f.col;
              })
              .join("\n");
            block.appendChild(more);
          }
        }

        el.appendChild(block);
        el.scrollTop = el.scrollHeight;
        return;
      } catch (e) {}
    }
  }

  function handle(level, args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) parts.push(fmtArg(args[i]));
    var text = parts.join(" ");
    var frames = [];
    for (var j = 0; j < args.length; j++) {
      if (args[j] instanceof Error && args[j].stack) {
        frames = extractStackFrames(args[j].stack);
        break;
      }
    }
    if (!frames.length && level === "error") {
      try {
        throw new Error("trace");
      } catch (e) {
        frames = extractStackFrames(e.stack || "").slice(2);
      }
    }
    appendRow(level, text, frames.length ? { frames: frames } : null);

    if (!silentDevtools && orig[level]) {
      try {
        orig[level].apply(console, args);
      } catch (_) {}
    }
  }

  METHODS.forEach(function (m) {
    console[m] = function () {
      handle(m === "group" || m === "groupCollapsed" || m === "groupEnd" ? "log" : m, arguments);
    };
  });

  window.addEventListener("error", function (ev) {
    var err = ev.error || new Error(ev.message || "error");
    if (!err.stack && ev.filename) {
      err = new Error(ev.message + " at " + ev.filename + ":" + ev.lineno + ":" + ev.colno);
    }
    handle("error", [err]);
  });

  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    if (!(r instanceof Error)) r = new Error(fmtArg(r));
    handle("error", ["Unhandled rejection", r]);
  });

  window.__n3xnConsole = {
    buffer: buffer,
    getLines: function () {
      return buffer.slice();
    },
    clear: function () {
      buffer.length = 0;
      var el = document.getElementById("terminal-output");
      if (el) el.innerHTML = "";
    },
    setSilent: function (v) {
      silentDevtools = !!v;
      try {
        localStorage.setItem("n3xn_console_silent", v ? "1" : "0");
      } catch (_) {}
    },
    raw: orig,
  };
})();
