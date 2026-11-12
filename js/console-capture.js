/**
 * n3xn VFS v3.0.3-beta — silence DevTools console; route everything to n3xn console UI
 */
(function n3xnConsoleCapture() {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.__n3xnConsoleCaptured) return;
  window.__n3xnConsoleCaptured = true;

  var levels = ["log", "info", "warn", "error", "debug", "trace", "dir", "table", "group", "groupEnd", "groupCollapsed"];
  var buffer = [];
  var MAX = 2000;

  function fmtArg(a) {
    try {
      if (a instanceof Error) return a.stack || a.message || String(a);
      if (typeof a === "string") return a;
      if (typeof a === "undefined") return "undefined";
      if (a === null) return "null";
      return JSON.stringify(a, function (_k, v) {
        if (typeof v === "bigint") return String(v);
        if (v instanceof Error) return v.message;
        return v;
      }, 0);
    } catch (e) {
      try { return String(a); } catch (e2) { return "[unprintable]"; }
    }
  }

  function lineText(level, args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) parts.push(fmtArg(args[i]));
    return "[" + level + "] " + parts.join(" ");
  }

  function appendToN3xn(level, text) {
    buffer.push({ t: Date.now(), level: level, text: text });
    if (buffer.length > MAX) buffer.shift();
    try {
      if (typeof window.__n3xnAppendConsole === "function") {
        window.__n3xnAppendConsole(level, text);
        return;
      }
    } catch (e) {}
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
        var row = document.createElement("div");
        row.className = "n3xn-console-line n3xn-console-" + level;
        row.textContent = text;
        el.appendChild(row);
        el.scrollTop = el.scrollHeight;
        return;
      } catch (e) {}
    }
    try {
      if (window.__n3xnTerm && typeof window.__n3xnTerm.writeln === "function") {
        window.__n3xnTerm.writeln(text);
      }
    } catch (e) {}
  }

  var noop = function () {};
  var api = {
    buffer: buffer,
    getLines: function () { return buffer.slice(); },
    clear: function () { buffer.length = 0; },
    log: function () { appendToN3xn("log", lineText("log", arguments)); },
    info: function () { appendToN3xn("info", lineText("info", arguments)); },
    warn: function () { appendToN3xn("warn", lineText("warn", arguments)); },
    error: function () { appendToN3xn("error", lineText("error", arguments)); },
    debug: function () { appendToN3xn("debug", lineText("debug", arguments)); },
  };

  var _orig = window.console;
  window.__n3xnConsoleOrig = _orig;
  window.__n3xnConsole = api;

  var silent = {};
  levels.forEach(function (k) { silent[k] = api[k] || noop; });
  silent.clear = function () { api.clear(); };
  silent.assert = function (cond) {
    if (!cond) {
      var args = Array.prototype.slice.call(arguments, 1);
      appendToN3xn("error", lineText("assert", args.length ? args : ["assertion failed"]));
    }
  };
  silent.count = noop;
  silent.countReset = noop;
  silent.time = noop;
  silent.timeEnd = noop;
  silent.timeLog = noop;

  try {
    window.console = silent;
  } catch (e) {
    levels.forEach(function (k) {
      try { _orig[k] = silent[k]; } catch (e2) {}
    });
  }

  window.addEventListener("error", function (ev) {
    appendToN3xn("error", "[uncaught] " + (ev.message || "") + " @" + (ev.filename || "") + ":" + (ev.lineno || ""));
    try { ev.preventDefault(); } catch (e) {}
  });
  window.addEventListener("unhandledrejection", function (ev) {
    appendToN3xn("error", "[unhandledrejection] " + fmtArg(ev.reason));
    try { ev.preventDefault(); } catch (e) {}
  });
})();
