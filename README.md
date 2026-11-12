# n3xn VFS

<div align="center">

# **n3xn VFS**
### Your browser. Your files. Your development environment.

**An encrypted, local-first virtual filesystem and browser-based developer workspace — with a terminal, code editor, multi-language runners, GitHub tools, offline-oriented caching, and optional real-time collaboration.**

[![Version](https://img.shields.io/badge/version-3.0.9--beta-7c3aed?style=for-the-badge)](https://github.com/xk234/n3xn-vfs)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-browser-0ea5e9?style=for-the-badge)](https://github.com/xk234/n3xn-vfs)
[![Deploy](https://img.shields.io/badge/deploy-static%20hosting-f59e0b?style=for-the-badge)](#-deployment)

[**Repository**](https://github.com/xk234/n3xn-vfs) · [**Report a bug**](https://github.com/xk234/n3xn-vfs/issues) · [**Browse source**](https://github.com/xk234/n3xn-vfs/tree/main)

</div>

---

## ✨ What is n3xn VFS?

**n3xn VFS** is a browser-based virtual filesystem wrapped in a full development workspace. It gives you a persistent, account-based place to manage files, edit code, run projects, inspect errors, work with GitHub, and optionally collaborate with other people — without requiring a conventional application server for its core filesystem.

The project brings together tools that are usually separate:

- A virtual filesystem with encrypted file storage.
- Multiple local accounts.
- A Monaco-powered code editor and browser terminal.
- File previews and execution runners.
- Python, React/JSX, Lua, and additional language tooling.
- A custom multi-file web format: **.n3-site**.
- A permission-aware command package format: **.nexc**.
- GitHub repository and Git workflows.
- Optional WSS collaboration, messaging, file transfers, and voice/video features.
- A service worker that can cache the application shell and selected runtime dependencies.
- Visual HTML editing, media tools, game runners, settings, and diagnostics.

It is designed to be **local-first, extensible, and deployable as static web content**. Network-dependent tools are optional; they are not the same thing as the core local filesystem.

> **Project status:** The version module currently identifies the application as **v3.0.9-beta**. This is beta software. Interfaces, commands, and features can change; check the current source and in-app help output when something differs from this guide.

### Main-branch implementation snapshot

This README is written against the repository's current `main` tree, not against an older package description or an earlier v3 experiment. A source-tree inspection on 2026-11-12 found the full-size application core alongside the newer v3 modules and pages.

| Area | What is present in the repository | Important qualification |
|---|---|---|
| Core application | Full `js/app.js` (~43 KB), plus the VFS, editor, terminal, runner, GitHub, collaboration, and media modules | File presence is not a guarantee that every UI path has been browser-tested |
| Encrypted VFS | `js/db.js`, `js/crypto.js`, and `js/fs.js` | The existing v2-compatible storage format is the compatibility baseline |
| Compression | Separate `js/compress.js` N3C1 helper and settings controls | The current `db.js` does not import or call this helper; do not assume VFS records are compressed |
| Themes and editor settings | `js/themes-catalog.js`, `js/settings-app.js`, `js/monaco-settings.js`, and `/settings/` | The theme catalog declares roughly 50 application/Monaco theme entries; verify a theme in the running app before relying on every editor color |
| CodeMirror | `js/codemirror-loader.js` | The loader dynamically imports CodeMirror modules; offline use depends on the service worker having cached the needed ESM dependencies |
| Connectors | `/connectors/` and `js/connectors-app.js` | Connector values are currently stored in browser `localStorage` without encryption |
| Anti-Blocksi | `js/anti-blocksi.js`, included by the main page and the Settings/Connectors pages | Experimental page-level behavior only; it is not a reliable way to defeat managed-device, browser, or network controls |
| Minecraft | `mc/index.html` (~25.1 MB in the repository tree) and `js/minecraft.js` | The file is present; its runtime, offline behavior, and relay connectivity still need to be tested in the target browser |
| Service worker | Root `sw.js`, with separate app/runtime/CDN cache logic and local dependency proxy paths | Offline availability depends on successful first-time downloads, cache quota, and browser retention |

**Version-label caveat:** `js/version.js` currently exports `3.0.9-beta`, but several other files still contain older labels (including the root page, Settings page, Connectors page, manifest, package notes, and service-worker cache/comment identifiers). The badge above follows `js/version.js`; the repository still needs a coordinated version-label/cache-name cleanup. Do not use an old page title or cache key as the authoritative release version.

**Repository shape:** the root is a static-site deployment; there is no root `functions/` directory in the current tree. The repository also contains dedicated `explorer/`, `cloaker/`, `settings/`, `connectors/`, and `mc/` pages, plus a substantial `jspaint/` subtree.


## 🧭 Contents

- [Highlights](#-highlights)
- [Main-branch implementation snapshot](#-main-branch-implementation-snapshot)
- [Quick start](#-quick-start)
- [Accounts and encrypted storage](#-accounts-and-encrypted-storage)
- [Filesystem](#-filesystem)
- [Editor and terminal](#-editor-and-terminal)
- [Running files and projects](#-running-files-and-projects)
- [Python and other languages](#-python-and-other-languages)
- [The .n3-site format](#-the-n3-site-format)
- [The .nexc package format](#-the-nexc-package-format)
- [GitHub integration](#-github-integration)
- [Collaboration and chat](#-collaboration-and-chat)
- [Storage backends](#-storage-backends)
- [Offline support and PWA](#-offline-support-and-pwa)
- [Settings and customization](#-settings-and-customization)
- [Connectors and credential safety](#-connectors-and-credential-safety)
- [Installed-app behavior and anti-Blocksi](#-installed-app-behavior-and-anti-blocksi)
- [Minecraft client](#-minecraft-client)
- [Debugging and diagnostics](#-debugging-and-diagnostics)
- [Project layout](#-project-layout)
- [Deployment](#-deployment)
- [Privacy and security](#-privacy-and-security)
- [Browser compatibility](#-browser-compatibility)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Highlights

| Area | What it brings |
|---|---|
| 🔐 Accounts | Multiple local accounts, password verification, encrypted file data |
| 📁 Virtual filesystem | Nested directories, file operations, import/export, ZIP support |
| 📝 Editor | Monaco integration, syntax highlighting, themes, configurable preferences |
| 💻 Terminal | Bash-like commands, history, aliases, custom commands, file editing |
| ▶️ Runners | HTML, JavaScript, CSS, Markdown, JSON, images, React, Python, and more |
| 🐍 Python | Browser-hosted Python through Pyodide |
| ⚛️ React | React 18 / JSX projects with VFS-relative imports and CSS |
| 🧩 Project formats | Multi-file .n3-site websites and modular .nexc packages |
| 🐙 GitHub | Browse repositories, branches, files, commits, pull requests, issues, and gists |
| 🤝 Collaboration | Optional WSS rooms, encrypted application messages, file transfer, live text collaboration |
| 🗄️ Storage | IndexedDB, OPFS, Cache API, and session-memory backends |
| 🌐 Offline-oriented | Service-worker shell caching and optional runtime/CDN cache warming |
| 🛠️ Developer tools | Static checks, runtime probing, visual HTML editing, performance diagnostics |

---

## ⚡ Quick start

### 1. Open n3xn VFS

Visit your deployed n3xn VFS URL. To host your own copy, see [Deployment](#-deployment).

### 2. Create an account

1. Choose **Create New Account**.
2. Enter a username.
3. Choose a strong password and confirm it.
4. Create the account and sign in.

Accounts are local to the browser origin. Creating an account in one browser profile or deployment does not automatically create it in another.

### 3. Start building

Open the file explorer, create a project, and use the editor or terminal. Try:

    help
    pwd
    ls
    mkdir -p /projects/hello
    touch /projects/hello/index.html

Create or edit an HTML file, then preview it:

    run /projects/hello/index.html

For the authoritative command list in your running build, enter **help**.

---

## 🔐 Accounts and encrypted storage

n3xn VFS supports multiple accounts in the same browser installation.

### Account behavior

- Create separate local accounts.
- Sign in and out without a remote account service.
- Keep each account's filesystem in its own IndexedDB database.
- Export and import account/filesystem data.
- Import a full encrypted export, including into an already signed-in account where supported by the import flow.

### Encryption design

The current crypto module uses the browser Web Crypto API:

| Component | Implementation |
|---|---|
| File encryption | AES-GCM |
| Encryption key size | 256 bits |
| Password key derivation | PBKDF2-SHA-256 |
| PBKDF2 iterations | 310,000 |
| Salt | 16 bytes |
| AES-GCM IV | 12 bytes |

File contents are encrypted before being written through the normal IndexedDB storage path. Account verification uses password-derived data.

### Full export and import

Use **Import Accounts / Full Export** on the authentication screen to import a supported full export. The application asks for the export password.

Keep encrypted exports somewhere safe. An encrypted backup is useful only if you retain the password needed to decrypt it.

**Important:** n3xn does not provide a remote password-reset or account-recovery service. Losing the password can mean losing access to encrypted data. Export backups regularly and test that you can restore them.

---

## 📁 Filesystem

The virtual filesystem presents a hierarchical directory tree, with file contents stored separately.

### Core filesystem commands

    pwd
    cd <path>
    ls [-l]
    dir
    cat [-n] <file>
    type <file>
    mkdir [-p] <directory>
    touch <file>
    rm [-r] <path>
    mv <src> <dest>
    rename <src> <dest>
    cp <src> <dest>
    find <pattern>
    tree [path]
    stat <path>

### Search and file information

    grep [-ri] <pattern> [path]
    head [-n N] <file>
    tail [-n N] <file>
    wc <file>
    du
    file <path>
    basename <path>
    dirname <path>
    which <command>
    sort
    uniq

The terminal's grep implementation supports options such as recursive search, case-insensitive matching, inverted matches, filename-only output, line numbers, and context.

### Editing files from the terminal

    append <file> <text>
    prepend <file> <text>
    replace <file> <search> <replacement>
    insert <file> <line> <text>
    delete <file> <line>
    delline <file> <line>
    undo [file]
    redo [file]
    diff <fileA> <fileB>
    patch <pattern> <search> <replace> [--dry]

Supported terminal editing operations maintain per-file undo/redo history.

### Import and export

The VFS supports:

- Importing individual files.
- Importing directories where the browser supports directory selection.
- Importing ZIP archives.
- Exporting files and directories as ZIP archives.
- Exporting the complete encrypted filesystem.
- Browser file pickers and supported File System Access API workflows.

On Chromium-based browsers, directory access and Downloads integration are generally the most complete.

---

## 📝 Editor and terminal

### Code editor

n3xn integrates **Monaco Editor**, the editor engine behind Visual Studio Code.

Editor capabilities include:

- Syntax highlighting.
- Multiple editor themes, including a custom n3xn dark theme.
- Configurable font, cursor, indentation, line numbers, minimap, wrapping, and other preferences.
- Active-file integration with terminal and runner workflows.
- Custom language definitions through the language-highlights integration.

### Terminal

The terminal is a browser-side, bash-like command interface — not a full Linux shell.

It includes filesystem commands, file editing and inspection, aliases, persistent custom commands, project inspection, runners, previews, and optional Python, GitHub, storage, and collaboration tools.

Useful keyboard shortcuts:

| Shortcut | Action |
|---|---|
| ↑ / ↓ | Navigate command history |
| Ctrl+R | Reverse-search command history |
| Ctrl+Shift+F | Toggle terminal fullscreen |

### Aliases and custom commands

Manage aliases:

    alias
    unalias <name>

Manage custom JavaScript terminal commands:

    cmd list
    cmd add <name> [description]
    cmd rm <name>

Custom commands are stored in the current account's metadata. Their execution is powerful: only install or run command code you trust.

---

## ▶️ Running files and projects

The runner can preview or execute supported VFS files.

### Basic commands

    run <file>
    run <mode> <file>
    open <file>
    preview <file>

If no path is supplied, the active editor file can be used.

### Runner modes

    auto
    html
    html-window
    js
    image
    markdown
    md
    json
    css
    text
    dataurl
    blob-open

The exact behavior depends on file type and the selected mode.

### Blob tools

    blob list
    blob make <file>
    blob create <file>
    blob gen <file>
    blob open <index>
    blob watch <file>
    blob clear

**blobs** is an alias for **blob**. Blob URLs are used for browser previews and related workflows.

### Web-file transfer

The webfile command provides URL-based fetching and upload requests:

    webfile get <url> [vfs-path]
    webfile sync <vfs-path> <url>
    webfile headers <url>
    webfile put <vfs-path> <url>

Aliases: **wf**, **curl**, and **fetch**.

Examples:

    webfile get https://example.com/file.txt
    webfile sync /data/file.txt https://example.com/file.txt
    webfile headers https://example.com

These are browser network requests. They are subject to CORS, mixed-content rules, browser permissions, and destination-server behavior. A browser cannot bypass a server's CORS policy simply because a request originates in n3xn.

### Web project preview

    web run [path]
    web preview [path]
    web open [path]
    web stop

When no path is supplied, n3xn attempts to find common entry files, including:

    index.html
    index.n3-site
    main.jsx
    App.jsx
    src/main.jsx

---

## 🐍 Python and other languages

n3xn includes browser-hosted language tooling. Availability and performance depend on the browser, cached runtime assets, and the project being run.

### Python

Python is provided through **Pyodide**, which runs Python in the browser using WebAssembly.

    python <file.py>
    python -c <code>
    python canvas
    python hide

Alias: **py**.

The Python runtime is not a Python process on a remote server. It runs in the browser. First-time runtime loading may require a network connection unless the required runtime files have already been cached.

### React and JSX

Run a React entry file:

    react run <entry.jsx>

Alias: **jsx**.

The React runner supports JSX/TSX transformation, React 18, VFS-relative imports, VFS CSS imports, multi-file React projects, and browser module resolution for dependencies.

**This is not a full Vite or Node.js environment.** It does not provide a Node-based Vite development server or Vite's HMR system.

### Lua, C/C++, Rust, Go, and additional languages

The language runner includes project discovery and tooling for languages such as:

- Lua, through Wasmoon/WebAssembly.
- C and C++.
- Rust.
- Go.
- Python.
- JavaScript and JSX.
- SQL.
- Scheme.
- Brainfuck.

The compiled-language workflow can collect multi-file projects, provide diagnostics, and run a compatible WebAssembly artifact when one is available. This does not mean every compiler or native toolchain is bundled locally.

### In-file project configuration

The language runner supports n3xn configuration directives embedded in source files.

JavaScript example:

    //!n3xn run=main.c display=terminal timeout=8000

Python example:

    # n3xn: run=main.py display=canvas

Common configuration keys:

| Key | Purpose |
|---|---|
| run | Entry file or run target |
| display | terminal, preview, iframe, canvas, or none |
| title | Display title |
| args | Arguments |
| cwd | Working directory |
| files | Additional project files |
| lang | Language override |
| timeout | Execution timeout in milliseconds |

Example:

    //!n3xn run=main.c display=terminal files=main.c,math.c,math.h timeout=8000
    #include <stdio.h>
    int main(void) {
        puts("Hello from n3xn!");
        return 0;
    }

---

## 🌐 The .n3-site format

**.n3-site** is n3xn's multi-file HTML format. It allows a VFS HTML document to reference other VFS files as scripts, stylesheets, module scripts, and links.

### Directive syntax

    _;:(content-type)[kind]{vfs-path}method

Supported kinds include **script**, **script-module**, **css**, **stylesheet**, **style**, **link**, and **any**.

The method can be **blob** or **data**; blob is the default.

### Example project

    /projects/site/
    ├── index.n3-site
    ├── css/
    │   └── app.css
    └── js/
        └── main.js

Example index.n3-site:

    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>My n3xn Site</title>
      _;:(text/css)[stylesheet]{./css/app.css}blob
      _;:(text/javascript)[script-module]{./js/main.js}blob
    </head>
    <body>
      <h1>Hello from a multi-file n3xn site</h1>
    </body>
    </html>

### Commands

    n3site help
    n3site list [prefix]
    n3site expand <file.n3-site>
    n3site run <file.n3-site>

Aliases: **n3-site**, **n3site**, and **n3link**.

Create a link to a VFS file:

    n3link <path> [blob|data] [mime]

The runtime also exposes helper functionality for linking, listing, and reading VFS assets from a generated site context.

---

## 📦 The .nexc package format

**NEXC** is a small INI-like format for bundling named command modules with metadata and declared permissions.

### Example

    [nexc]
    name = demo
    version = 1.0
    default = build

    [permissions]
    terminal
    vfs.write

    [module build]
    echo Building project
    mkdir -p /out
    parallel
      echo First task
      echo Second task
    wait 200ms
    echo Done

### Commands

    nexc help
    nexc list <file.nexc>
    nexc modules <file.nexc>
    nexc run <file.nexc> [module]
    nexc remote <url> [module]

Shorthand:

    nexc --r <file.nexc> [module]

Packages can declare permissions such as terminal access, VFS read/write, and network access. The application presents requested permissions for confirmation before execution.

**Permission prompts are not a security sandbox.** Only run packages from sources you trust, and inspect their contents before granting access.

---

## 🐙 GitHub integration

n3xn includes an optional GitHub integration using a user-supplied **classic personal access token (PAT)**.

It provides a separate GitHub VFS namespace, allowing remote repository files to be browsed and cached locally.

### Capabilities

- Authenticate and inspect the connected GitHub user.
- List repositories and branches.
- Create repositories and branches.
- Select a repository and branch.
- Pull individual files or repository trees.
- Cache remote content in the local VFS.
- Commit one file or multiple local files.
- Push local changes.
- Create and list pull requests.
- List and create issues.
- Create gists.
- Search repositories and code.
- Star repositories.
- Delete remote files.
- Inspect API rate limits.

### Command reference

    gh help
    gh auth <token>
    gh whoami
    gh logout
    gh rate
    gh repos
    gh create-repo <name> [--private]
    gh use <owner/repo> [branch]
    gh branches
    gh pull [path]
    gh pull-tree
    gh clone
    gh commit <path> [message]
    gh push-paths <file1> <file2> -m <message>
    gh branch <name>
    gh prs
    gh pr <title> <head-branch> [base]
    gh issues
    gh issue <title>
    gh gist <local-path>
    gh search <query>
    gh star <owner/repo>
    gh rm <path>

Alias: **github**.

GitHub files cached in the VFS use paths such as:

    gh:/owner/repo/path/to/file

### Authentication safety

- A GitHub token is a sensitive credential.
- Use the minimum permissions required for your work.
- Never paste a token into a shared room, public issue, source file, or screenshot.
- Log out or remove the saved connection when you no longer need it.
- Treat any browser session or device that stores a token as sensitive.

GitHub API access is optional and requires network connectivity.

---

## 🤝 Collaboration and chat

n3xn has two related but distinct real-time systems: room-based VFS collaboration and public chat/voice rooms.

### WSS collaboration

The collaboration module connects to a configurable WebSocket or secure WebSocket relay.

Example:

    wss connect wss://your-relay.example/room

Commands:

    wss connect <wss-url> [roomPassword]
    wss disconnect
    wss status
    wss chat <message>
    wss share <vfs-path>
    wss pull <vfs-path>
    wss collab <text-file-path>
    wss leave
    wss ping

Aliases include **collab** and **room**. Shortcuts include **share <path>** and **chat <message>**.

Collaboration features include shared rooms and peer presence, room-password-based encryption of application messages, encrypted chat messages, file sharing and chunked transfers, live text collaboration and cursor/presence updates, filesystem push/pull, shared-file browsing, and additional real-time communication features.

The relay is designed to forward messages rather than act as the VFS itself. Application payload encryption does not mean every protocol/control frame is encrypted; relay control messages such as join/leave and presence signaling may remain visible to the relay.

### Public chat and voice rooms

The chat module includes public rooms such as:

- Global Text.
- Global Voice.
- Hangout.

It supports room presence, chat, voice participation, and video-related participant features. The signaling URL is configurable through the relevant connection settings.

<blockquote>
<strong>Public-room privacy warning:</strong> the public chat implementation contains a built-in shared room key so anyone can join. That key is public by design; it does not provide private, member-exclusive confidentiality. Do not use public rooms for secrets, credentials, or private conversations.
</blockquote>

Voice/video features depend on browser media permissions, device support, connectivity, and relay/signaling setup. Camera and microphone access normally require a secure context (HTTPS or localhost).

---

## 🗄️ Storage backends

The storage abstraction currently includes:

| Backend | Description | Persistence |
|---|---|---|
| idb | IndexedDB; default encrypted VFS path | Persistent browser storage |
| opfs | Origin Private File System | Persistent browser storage |
| cache | Cache API | Browser-managed cache; not a durable database |
| memory | In-memory session backend | Lost when the session ends |

### Storage commands

    storage list
    storage use <backend>
    storage info
    storage ls
    storage meta
    storage cat <path>
    storage put <path> <text>
    storage rm <path>
    storage experimental-patch on
    storage experimental-patch off

Aliases include **idb** and **opfs**.

Backend availability depends on browser support and current application configuration. The storage abstraction does not imply that every backend has identical encryption, durability, or metadata behavior. In particular, the OPFS and Cache API adapters have different storage characteristics from the normal encrypted IndexedDB file path.

**Compatibility rule:** the existing IndexedDB encryption/encoding path is the v2 data-compatibility baseline. The standalone N3C1 compression helper is not currently wired into `js/db.js`; changing a compression preference does not mean existing records were migrated or that new records are compressed. Do not insert compression into the AES/base64 path without a versioned envelope, legacy read tests, round-trip tests, and import/export compatibility tests.

---

## 🌙 Offline support and PWA

n3xn is designed to be deployable as a static web application and includes a service worker.

### What the service worker can cache

- The application shell and local application modules.
- Monaco editor assets.
- Pyodide runtime assets.
- Selected CDN resources.
- React and other browser module dependencies.
- Additional application pages and assets.

It uses separate caches for the app shell, Monaco, Pyodide, and CDN resources. The worker also provides local URL namespaces for cached dependency resources, allowing supported features to use cached assets when the service worker controls the page.

### Important offline expectations

Offline support is **progressive**, not a guarantee that every feature works offline immediately.

- The first visit generally needs a network connection to load the app and uncached dependencies.
- Runtime packs can be large and may take time and storage to cache.
- A feature works offline only if its required assets have already been cached and the browser retains them.
- GitHub, remote URL fetching, and WSS collaboration require network access.
- Browser storage can be cleared or evicted.
- External fonts, modules, and third-party resources may still be requested depending on the feature.

For the best experience, open the application online first, allow the service worker to install, and give selected runtime caches time to warm before testing offline.

### Install as an app

The repository includes a web app manifest and service-worker registration. On supported browsers, use the browser's **Install app** or **Add to Home Screen** option.

The app uses standalone display settings and includes application icons.

---

## 🎨 Settings and customization

The settings system includes editor and application customization.

### Themes

The theme catalog includes a broad collection of application and Monaco themes, including the n3xn dark theme, OLED-style themes, and other color schemes.

The current catalog source describes approximately 50 themes and pairs application CSS variables with Monaco theme identifiers. The dedicated `/settings/` page also exposes Monaco editor preferences and a CodeMirror-related editor choice/configuration path. The CodeMirror loader uses ESM imports (with a service-worker proxy path when controlled); a loader being present does not by itself prove every editor workflow is fully offline or interchangeable with Monaco.

### Editor preferences

Depending on the editor integration, settings include font family and size, line height and letter spacing, ligatures, minimap visibility and placement, word wrap and tab size, cursor style and blinking, line numbers and whitespace rendering, bracket pair colorization and guides, folding, sticky scroll, and suggestions.

### Compression

The optional N3C1 compression module provides configurable levels:

    off
    fast
    balanced
    max
    ultra

Compression is opt-in and defaults to **off**. The module is designed to leave legacy/unwrapped data readable and fall back safely for ordinary uncompressed payloads. Changing the setting does not automatically mean every storage path is compressed; the module must be wired into the relevant path.

---

## 🔌 Connectors and credential safety

The repository includes a dedicated `/connectors/` page and a connector registry in `js/connectors-app.js`. The current built-in list contains 16 connector types:

- OpenAI, Anthropic, Google AI / Gemini, and Groq.
- GitHub and GitLab.
- Cloudflare Workers.
- WSS collaboration/chat relay.
- Custom HTTP.
- S3-compatible storage.
- Supabase and Firebase.
- Discord and Telegram.
- Notion and Spotify.

The connector page provides fields for the configured service's endpoint, model, account identifier, or credential, depending on the connector. This is a configuration UI, not a universal integration guarantee: a saved connector does not automatically mean every feature in n3xn knows how to call that service.

### Critical credential-storage detail

**Current connector values are stored as plain JSON in browser `localStorage` under `n3xn_connectors_v1`.** Password-type inputs only mask the value on screen; they do not encrypt it. This is separate from the encrypted IndexedDB VFS file path.

Until connector storage is redesigned and audited, do not save high-privilege, long-lived, or production credentials here. Prefer short-lived or narrowly scoped tokens, never commit secrets into VFS files or GitHub, and revoke any credential that may have been exposed. A browser extension, injected script, or successful XSS in the same origin may be able to read localStorage.

For a production-grade connector design, credentials should be protected by a separately reviewed secret-storage strategy or kept behind a trusted server-side integration. A static browser app cannot safely conceal a service secret from the browser user or from code executing in that origin.

---

## 🛡️ Installed-app behavior and anti-Blocksi

The repository includes `js/anti-blocksi.js`, and the current main page, Settings page, and Connectors page load it. The script contains page-level detection and overlay-handling logic, with a configurable mode stored as `n3xn_cloak_mode`.

This feature is experimental. It is **not** a security boundary, privacy guarantee, or dependable way to bypass school/device management, browser extensions, network filtering, or administrator policy. Installed/PWA mode does not make a page invisible to browser extensions or to the operating system. Behavior can vary across ChromeOS versions, browser policies, extension versions, and hosting origins.

If the script causes a blank page, redirect loop, broken iframe, or startup failure, disable its mode or remove the script include while debugging the core app. Keep the ordinary VFS usable independently of this optional behavior.

---

## 🎮 Minecraft client

A large single-file client is present at `/mc/index.html` (approximately 25.1 MB in the current Git tree). The accompanying project discussion describes this as the preferred fast Eaglercraft 1.8 WASM-GC client, styled for n3xn.

- Open it at `/mc/index.html` on the deployed site.
- Keep the client file separate from the VFS application modules; it is a large standalone payload.
- Offline startup depends on the browser having cached the file and any additional runtime resources the client requests.
- Multiplayer depends on the client's supported relay/network configuration and a reachable compatible relay; a cached HTML file alone does not provide multiplayer service.

The repository also contains `js/minecraft.js` for application-side Minecraft integration. The actual game client and its relay behavior should be tested in the browser and on the target deployment before being described as fully working or fully offline.

---

## 🐛 Debugging and diagnostics

### Static debugger

Run:

    debug <file>

The lightweight debugger can inspect supported file types, including JSON parsing, JavaScript/TypeScript brace mismatches, JSX/TSX transformation, Python indentation issues, and HTML closing-tag issues.

### Advanced debugger

Commands include:

    xdebug <path>
    xdebug <path> --live
    xdebug live <file>
    xdebug last
    xdebug open
    xdebug copy
    xdebug fix
    xdebug tryfix <file>

The advanced debugger provides static checks and optional runtime iframe probing. Its rules include checks for equality operators, suspicious eval-like patterns, empty catches, unused variables, React keys, floating promises, Python exception patterns, mutable defaults, image decoding, and .n3-site asset issues.

Selected safe fixes can be applied through **xdebug tryfix** after confirmation. Static analysis is heuristic; it is not proof that code is correct or safe.

### Project inspection

    project stats
    project info
    project files
    project tree

Reports can include file and directory counts, total size, extension breakdown, and a project tree.

### Performance diagnostics

    perf
    performance

The performance module can report browser/device details, memory metrics where exposed, storage usage and quota, connection information, navigation timing, and active n3xn storage backend information.

Some browser metrics are unavailable in some browsers. JavaScript heap metrics, for example, are not standardized across all browsers.

### Console capture

Browser console messages can be mirrored into the terminal:

    logs on
    logs off
    logs copy
    logs clear

Alias: **console**. The terminal starts with console bridging enabled in the current implementation.

---

## 🧱 Project layout

The repository is a static browser application organized around an HTML entry point, CSS, JavaScript modules, and supporting app directories.

A simplified view of important source files:

    n3xn-vfs/
    ├── index.html
    ├── sw.js
    ├── manifest.webmanifest
    ├── css/
    │   ├── theme.css
    │   ├── app.css
    │   └── ...
    ├── icons/
    ├── js/
    │   ├── app.js
    │   ├── db.js
    │   ├── crypto.js
    │   ├── fs.js
    │   ├── editor.js
    │   ├── terminal.js
    │   ├── runner.js
    │   ├── python.js
    │   ├── react-runner.js
    │   ├── lang-runner.js
    │   ├── game-runner.js
    │   ├── github.js
    │   ├── collab.js
    │   ├── chat.js
    │   ├── n3-site.js
    │   ├── nexc.js
    │   ├── xdebug.js
    │   ├── storage-backends.js
    │   ├── performance.js
    │   ├── settings-app.js
    │   ├── connectors-app.js
    │   ├── themes-catalog.js
    │   ├── compress.js
    │   ├── html-visual.js
    │   ├── media-editor.js
    │   ├── minecraft.js
    │   └── ...
    ├── settings/
    ├── connectors/
    ├── mc/
    └── ...

### Core module responsibilities

| Module | Responsibility |
|---|---|
| app.js | Main application flow and UI bootstrapping |
| db.js | Accounts, IndexedDB records, metadata, import/export |
| crypto.js | Web Crypto encryption and password derivation |
| fs.js | Virtual directory tree and file operations |
| editor.js | Monaco editor integration |
| terminal.js | Terminal, command parsing, aliases, custom commands |
| runner.js | File execution and preview workflows |
| python.js | Pyodide runtime integration |
| react-runner.js | React/JSX execution |
| lang-runner.js | Multi-language and multi-file project runner |
| github.js | GitHub API integration |
| collab.js | WSS filesystem collaboration |
| chat.js | Public chat and voice-room features |
| n3-site.js | .n3-site processing |
| nexc.js | .nexc parsing and execution |
| storage-backends.js | Storage backend adapters |
| xdebug.js | Advanced static/runtime debugging |
| performance.js | Device, memory, and storage diagnostics |
| sw.js | Offline shell and dependency caching |

This is an orientation map, not an exhaustive file inventory. The repository may contain additional tools and pages.

---

## ☁️ Deployment

n3xn VFS is designed to run as a static website. The core local filesystem does not require a Node.js/Express backend.

### Cloudflare Pages

1. Push or fork the repository to GitHub.
2. In Cloudflare, create a Pages project connected to the repository.
3. Choose:

    Framework preset: None
    Build command: (leave empty)
    Build output directory: /

4. Deploy.

The published site must serve the repository's root files and preserve the relative directory structure.

### Wrangler

From the repository root:

    npx wrangler pages deploy . --project-name n3xn-vfs

### Other static hosts

The same static-site principle applies to compatible hosts such as GitHub Pages and other static hosting providers:

- Publish the repository's application files.
- Preserve paths and directories.
- Serve the site over HTTPS.
- Ensure the host serves JavaScript modules with appropriate MIME types.
- Avoid rewriting missing JavaScript files to an HTML fallback page; that can cause module parse errors such as **Unexpected token '<'**.

### HTTPS and secure contexts

Service workers and many browser APIs require a secure context. Use HTTPS for deployed sites; localhost is generally treated as a secure development context by modern browsers.

### No build step

The current deployment flow is static and does not require a package-manager build command. The project loads browser dependencies at runtime and/or through its service worker. External dependency availability and caching behavior therefore matter.

---

## 🔒 Privacy and security

n3xn is **local-first**, not strictly offline-only and not a guarantee of complete anonymity.

### What normally stays local

- VFS files are stored in browser storage.
- The normal IndexedDB file path encrypts file contents before storage.
- Local account records are associated with the browser origin.
- Core filesystem operations do not need a remote application server.

### When the application uses the network

| Feature | Network behavior |
|---|---|
| Core VFS | Local browser storage |
| GitHub integration | GitHub API and raw-content endpoints |
| WSS collaboration | Configured WebSocket/WSS relay |
| Public chat/voice | Configured signaling/relay services |
| Web-file commands | User-specified remote URLs |
| Runtime dependencies | External CDNs/module hosts when not cached |
| Fonts and optional assets | May load from external providers |

### Security considerations

1. **Protect your password.** There is no server-side password recovery.
2. **Keep backups.** Browser data can be cleared, evicted, or lost with the device.
3. **Protect GitHub tokens.** Treat a saved PAT as a credential with the permissions you granted it.
4. **Be careful with collaboration.** A room password protects application payloads, but relay control and signaling metadata may still be visible.
5. **Public rooms are public.** The built-in public room key is shared by design; do not treat public chat as private.
6. **Review executable content.** Custom commands, JavaScript, HTML, React projects, language projects, and .nexc packages can execute code.
7. **Previewing is not sandboxing.** Browser previews and generated Blob documents can execute active code. Do not open untrusted projects in a session containing sensitive data.
8. **Third-party resources are third parties.** CDN, font, API, relay, and remote website requests are subject to those providers' policies and security.
9. **Encryption has boundaries.** Encryption at rest does not protect a compromised browser session, operating system, malicious extension, or device.

The .nexc permission prompt is a user-consent feature, not an operating-system-grade sandbox. Likewise, application-layer encryption does not make the relay, endpoint, or browser inherently trustworthy.

---

## 🌍 Browser compatibility

The most complete experience is expected in a recent Chromium-based browser such as Google Chrome or Microsoft Edge.

| Capability | Notes |
|---|---|
| Core filesystem | Requires modern browser storage and Web Crypto APIs |
| Monaco editor | Requires JavaScript and editor assets |
| Directory import/export | Best support in Chromium browsers |
| File System Access API | Browser-dependent |
| OPFS | Requires browser support |
| Service worker | Requires HTTPS or localhost |
| Pyodide / WebAssembly | Requires compatible browser and sufficient resources |
| Camera / microphone | Requires permissions and a secure context |
| WSS collaboration | Requires network access and a compatible relay |
| Offline runtime use | Requires dependencies to have been cached already |

Firefox and Safari may support core functionality while differing in directory picking, storage APIs, media behavior, or other browser-specific capabilities.

Low-memory devices may struggle with large projects, language runtimes, editor workers, or multiple simultaneous previews. Close unused previews and load large runtimes only when needed.

---

## 🧰 Troubleshooting

### The app loads, but files or modules fail

- Confirm that the deployment includes the complete repository structure.
- Check that JavaScript files return JavaScript, not an HTML 404 page.
- Inspect the browser console for failed requests and MIME-type errors.
- Confirm that the host preserves relative paths.

### The service worker does not activate

- Use HTTPS or localhost.
- Check browser site settings and service-worker registration errors.
- Reload after the first successful registration.
- When testing a new deployment, stale caches may need to be cleared through the browser's site-data controls.

### A feature does not work offline

- Open the application online first.
- Allow the service worker and required runtime assets to finish caching.
- Remember that remote APIs, GitHub, WSS, and uncached modules still need a connection.

### Python or another runtime does not start

- Check the browser console and terminal output.
- Confirm the runtime assets can be fetched.
- Try again after the runtime has finished loading.
- Check available device memory and storage quota.

### GitHub requests fail

- Check that the token is valid and has the required repository permissions.
- Check GitHub API rate limits.
- Confirm the browser can reach the GitHub API.
- Do not share the token when asking for help.

### Collaboration does not connect

- Verify the WSS URL and room settings.
- Confirm that the relay supports the expected message protocol.
- Check network restrictions, browser console output, and relay availability.
- Ensure that the room password matches for participants.

---

## 🤝 Contributing

Contributions, bug reports, and ideas are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Keep changes focused and test the affected feature in a browser.
4. Check the browser console for errors.
5. Open a pull request describing what changed and how it was tested.

For bug reports, include the browser and version, deployment type, steps to reproduce, expected behavior, actual behavior, and relevant console or terminal errors. Remove tokens and other secrets first.

Please do not include passwords, GitHub tokens, private room passwords, or other credentials in issues or pull requests.

---

## 📜 License

n3xn VFS is distributed under the **MIT License**. See [LICENSE](LICENSE) for the full license text.

---

<div align="center">

### **n3xn VFS · v3.0.9-beta**

**A local-first workspace for building, running, and managing projects in your browser.**

[Repository](https://github.com/xk234/n3xn-vfs) · [Issues](https://github.com/xk234/n3xn-vfs/issues) · [MIT License](LICENSE)

</div>
