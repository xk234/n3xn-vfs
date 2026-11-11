# n3xn VFS **v3.0.0-beta** — first increment (from pure v2)

Copy these files into your n3xn VFS tree (same paths), then **GitHub push** from n3xn.

## Install order
1. `js/version.js`
2. `js/compress.js` (safe; default off — does not patch db by itself)
3. `js/anti-blocksi.js`
4. `js/themes-catalog.js` (51 themes)
5. `js/settings-app.js`
6. `js/connectors-app.js`
7. `js/codemirror-loader.js`
8. `settings/index.html`
9. `connectors/index.html`
10. `mc/index.html` (replace later with your Eagler 1.8 client; **keep** anti-blocksi script tag)
11. `index.html`
12. `sw.js`

After push: unregister old SW once / hard refresh.

## Safety
- Compression module never forces itself into storage; default **off**.
- Anti-Blocksi only cloaks in **installed app / standalone** mode.
- BLOCKSI-class injectors trigger blob: cloak (non-http(s) top URL).
