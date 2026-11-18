// The whole admin UI: one static page. Question text comes from visitors, so the script only ever uses textContent.
const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>portfolio questions</title>
<style>
  @font-face { font-family: "Inter"; src: url("/fonts/inter-400.woff2") format("woff2"); font-weight: 400; font-display: swap; }
  @font-face { font-family: "Inter"; src: url("/fonts/inter-500.woff2") format("woff2"); font-weight: 500; font-display: swap; }
  :root {
    --bg: #F1EAD3; --fg: #123D2B; --muted: #3E5E4D; --accent: #1A6E3E;
    --line: rgba(18, 61, 43, 0.22); --line-strong: rgba(18, 61, 43, 0.55);
    --title-bg: #E4DBBE; --edge: #123D2B; --drop: rgba(6, 23, 15, 0.5);
    --wall-lift: #3D6C6A; --wall-tint: #2E6346; --field: #F8F3E3; --danger: #8A2E1F;
  }
  @media (prefers-color-scheme: dark) { :root {
    --bg: #0F2A1E; --fg: #EAE3C9; --muted: #A9BCA6; --accent: #B5DB7A;
    --line: rgba(234, 227, 201, 0.16); --line-strong: rgba(234, 227, 201, 0.4);
    --title-bg: #163626; --edge: rgba(234, 227, 201, 0.55); --drop: rgba(0, 0, 0, 0.5);
    --wall-lift: #314F4B; --wall-tint: #1F4A33; --field: #0B2418; --danger: #F0A090;
  } }
  * { box-sizing: border-box; }
  html { background: var(--wall-tint); }
  body { margin: 0; min-height: 100vh; position: relative; color: var(--fg); font: 16px/1.5 "Inter", system-ui, -apple-system, sans-serif; text-transform: lowercase;
    background: linear-gradient(var(--wall-tint), var(--wall-tint)), var(--wall-lift); }
  /* wallpaper: engraving lines plus the site's static svg-noise grain tile, fixed behind the window */
  body::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: repeating-linear-gradient(0deg, rgba(241, 234, 211, 0.05) 0 1px, transparent 1px 3px); }
  body::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 5; opacity: 0.4;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch' result='t'/%3E%3CfeColorMatrix in='t' result='l' values='0 0 0 0 .95 0 0 0 0 .92 0 0 0 0 .83 3.2 0 0 0 -1.85'/%3E%3CfeColorMatrix in='t' result='d' values='0 0 0 0 .02 0 0 0 0 .09 0 0 0 0 .06 -3.2 0 0 0 1.35'/%3E%3CfeMerge%3E%3CfeMergeNode in='l'/%3E%3CfeMergeNode in='d'/%3E%3C/feMerge%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px; }
  main { position: relative; z-index: 1; max-width: 46rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .win { background: var(--bg); border: 2px solid var(--edge); border-radius: 4px; box-shadow: 6px 6px 0 var(--drop); overflow: hidden; }
  .title { display: flex; align-items: center; min-height: 36px; padding: 0 14px; border-bottom: 2px solid var(--edge); background: var(--title-bg); font-size: 14px; font-weight: 500; }
  .body { padding: 16px 18px 20px; }
  h1 { font-size: 1.2rem; font-weight: 500; margin: 0 0 .25rem; }
  .sub { color: var(--muted); margin: 0 0 1.25rem; font-size: .95rem; }
  nav { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
  button { font: inherit; font-size: .95rem; text-transform: lowercase; cursor: pointer; min-height: 44px; min-width: 44px; border: 2px solid var(--edge); background: var(--field); color: var(--fg); border-radius: 4px; padding: .35rem .9rem; box-shadow: 3px 3px 0 var(--drop); transition: transform 160ms ease-out, background-color 160ms ease; }
  button:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--drop); }
  @media (hover: hover) and (pointer: fine) { button:hover:not(:disabled) { background: var(--title-bg); } }
  button:disabled { opacity: .5; cursor: default; box-shadow: none; }
  button.primary { background: var(--fg); color: var(--bg); }
  @media (hover: hover) and (pointer: fine) { button.primary:hover:not(:disabled) { background: var(--accent); color: var(--bg); } }
  button[aria-pressed="true"] { background: var(--title-bg); box-shadow: inset 2px 2px 0 var(--line-strong); font-weight: 500; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  @media (prefers-color-scheme: dark) { button.primary:hover:not(:disabled) { color: #0F2A1E; } }
  article { border: 2px solid var(--edge); background: var(--field); border-radius: 4px; padding: 1rem; margin-bottom: 1rem; }
  .q { font-weight: 500; margin: 0 0 .25rem; overflow-wrap: anywhere; text-transform: none; }
  .meta { color: var(--muted); font-size: .85rem; margin: 0 0 .75rem; }
  .sug { color: var(--muted); font-size: .9rem; margin: 0 0 .5rem; border-left: 3px solid var(--line-strong); padding-left: .6rem; overflow-wrap: anywhere; }
  textarea { width: 100%; min-height: 6rem; font: inherit; text-transform: none; color: var(--fg); background: var(--bg); border: 2px solid var(--edge); border-radius: 4px; padding: .6rem; resize: vertical; }
  textarea:focus-visible, input:focus-visible { outline-offset: 0; }
  .row { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .75rem; align-items: center; }
  .msg { color: var(--muted); font-size: .85rem; }
  #login { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
  #login[hidden] { display: none; }
  input { font: inherit; min-height: 44px; background: var(--field); color: var(--fg); border: 2px solid var(--edge); border-radius: 4px; padding: .35rem .7rem; }
  .dbpick { margin: 0 0 .75rem; }
  .tscroll { overflow-x: auto; border: 2px solid var(--edge); border-radius: 4px; background: var(--field); }
  table { border-collapse: collapse; width: 100%; font-size: .85rem; text-transform: none; }
  th, td { text-align: left; vertical-align: top; padding: .45rem .6rem; border-bottom: 1px solid var(--line); min-width: 4rem; max-width: 22rem; overflow-wrap: anywhere; }
  th { background: var(--title-bg); border-bottom: 2px solid var(--edge); font-weight: 500; text-transform: lowercase; white-space: nowrap; }
  td.long { cursor: pointer; min-width: 14rem; }
  td.long:not(.open) { color: var(--muted); }
  td.nul { color: var(--muted); }
  td.long.open { white-space: pre-wrap; }
  .empty { color: var(--muted); }
  @media (max-width: 480px) { main { padding: 1rem .75rem 3rem; } .body { padding: 14px 12px 16px; } .win { box-shadow: 4px 4px 0 var(--drop); } }
</style>
</head>
<body>
<main>
<div class="win">
  <div class="title">admin — unanswered questions</div>
  <div class="body">
  <h1>questions the assistant couldn't answer</h1>
  <p class="sub">answers you save go live in the chat within about 5 minutes. suggestions are drafts for you only.</p>
  <form id="login" hidden>
    <label for="tok">password</label>
    <input id="tok" type="password" autocomplete="current-password">
    <button class="primary">enter</button>
    <span class="msg" id="loginmsg"></span>
  </form>
  <nav id="tabs"></nav>
  <section id="list"></section>
  </div>
</div>
</main>
<script>
var BASE = "__BASE__";
var TABS = [["open", "open"], ["answered", "answered"], ["dismissed", "dismissed"], ["db", "database"]];
var dbTable = "questions", dbPageNo = 1, lastCounts = {};
var tab = "open";
var tabsEl = document.getElementById("tabs");
var listEl = document.getElementById("list");

function el(tag, text, cls) {
  var e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function token() { try { return sessionStorage.getItem("admin-token") || ""; } catch (e) { return ""; } }
function api(method, path, body) {
  return fetch(BASE + path, { method: method, headers: { "Content-Type": "application/json", "X-Admin-Token": token() }, body: body ? JSON.stringify(body) : undefined })
    .then(function (r) { return r.json().then(function (j) {
      if (r.status === 401 || r.status === 429) { showLogin(r.status === 429 ? "too many tries, wait a few minutes." : (token() ? "wrong password." : "")); throw new Error("login"); }
      if (!r.ok) throw new Error(j.error || r.status); return j; }); });
}
var loginEl = document.getElementById("login");
function showLogin(m) { loginEl.hidden = false; tabsEl.textContent = ""; listEl.textContent = ""; document.getElementById("loginmsg").textContent = m || ""; document.getElementById("tok").focus(); }
loginEl.onsubmit = function (e) {
  e.preventDefault();
  try { sessionStorage.setItem("admin-token", document.getElementById("tok").value); } catch (x) {}
  loginEl.hidden = true; load();
};
function day(iso) { return iso ? iso.slice(0, 10) : ""; }

function drawTabs(counts) {
  lastCounts = counts;
  tabsEl.textContent = "";
  TABS.forEach(function (t) {
    var b = el("button", t[0] === "db" ? t[1] : t[1] + " (" + (counts[t[0]] || 0) + ")");
    b.setAttribute("aria-pressed", String(tab === t[0]));
    b.onclick = function () { tab = t[0]; load(); };
    tabsEl.appendChild(b);
  });
}

function card(q) {
  var a = el("article");
  a.appendChild(el("p", q.question, "q"));
  var meta = "asked " + q.asked_count + (q.asked_count === 1 ? " time" : " times") + ", first " + day(q.first_asked) + ", last " + day(q.last_asked);
  a.appendChild(el("p", meta, "meta"));
  var ta = el("textarea");
  ta.maxLength = 2000;
  ta.value = q.status === "open" ? (q.suggestion && q.suggestion !== NOTHING ? q.suggestion : "") : (q.answer || "");
  ta.setAttribute("aria-label", "answer");
  var msg = el("span", "", "msg");
  var sug = null;
  if (q.status === "open") {
    sug = el("p", q.suggestion ? "suggestion (" + day(q.suggested_at) + "): " + q.suggestion : "no suggestion yet.", "sug");
    a.appendChild(sug);
  }
  a.appendChild(ta);
  var row = el("div", null, "row");
  function act(label, fn, cls) {
    var b = el("button", label, cls);
    b.onclick = function () {
      b.disabled = true; msg.textContent = "...";
      fn().catch(function (e) { if (e.message === "login") return; if (e.message !== "empty" && e.message !== "cancelled") msg.textContent = "failed: " + e.message; else if (e.message === "cancelled") msg.textContent = ""; b.disabled = false; });
    };
    row.appendChild(b);
  }
  var save = function () {
    var v = ta.value.trim();
    if (!v) { msg.textContent = "write an answer first."; return Promise.reject(new Error("empty")); }
    return api("PUT", "/api/questions/" + q.id + "/answer", { answer: v }).then(load);
  };
  if (q.status === "open") {
    act("suggest", function () {
      return api("POST", "/api/questions/" + q.id + "/suggest").then(function (j) {
        q.suggestion = j.suggestion; q.suggested_at = j.suggested_at;
        sug.textContent = "suggestion (" + day(j.suggested_at) + "): " + j.suggestion;
        if (j.suggestion !== NOTHING && !ta.value.trim()) ta.value = j.suggestion;
        msg.textContent = ""; row.firstChild.disabled = false;
      });
    });
    act("save answer", save, "primary");
    act("dismiss", function () { return api("POST", "/api/questions/" + q.id + "/dismiss").then(load); });
  } else if (q.status === "answered") {
    act("save changes", save, "primary");
    act("re-open", function () { return api("POST", "/api/questions/" + q.id + "/reopen").then(load); });
    act("delete", function () { return confirm("delete this question and its answer?") ? api("DELETE", "/api/questions/" + q.id).then(load) : Promise.reject(new Error("cancelled")); });
  } else {
    act("re-open", function () { return api("POST", "/api/questions/" + q.id + "/reopen").then(load); });
    act("delete", function () { return confirm("delete this question?") ? api("DELETE", "/api/questions/" + q.id).then(load) : Promise.reject(new Error("cancelled")); });
  }
  row.appendChild(msg);
  a.appendChild(row);
  return a;
}

function loadDb() {
  api("GET", "/api/db").then(function (j) {
    drawTabs(lastCounts);
    listEl.textContent = "";
    var picks = el("div", null, "row dbpick");
    j.tables.forEach(function (t) {
      var b = el("button", t.name + " (" + t.count + ")");
      b.setAttribute("aria-pressed", String(dbTable === t.name));
      b.onclick = function () { dbTable = t.name; dbPageNo = 1; loadDb(); };
      picks.appendChild(b);
    });
    listEl.appendChild(picks);
    var holder = el("div", null, "dbwrap");
    listEl.appendChild(holder);
    return api("GET", "/api/db/" + dbTable + "?page=" + dbPageNo).then(function (d) { drawDb(holder, d); });
  }).catch(function (e) { if (e.message !== "login") listEl.textContent = "could not load: " + e.message; });
}
function drawDb(holder, d) {
  var pages = Math.max(1, Math.ceil(d.total / d.page_size));
  var info = el("p", d.total + " rows, newest first. page " + d.page + " of " + pages + ". read-only. click a long value to expand it.", "meta");
  holder.appendChild(info);
  if (!d.rows.length) { holder.appendChild(el("p", "nothing here.", "empty")); return; }
  var cols = Object.keys(d.rows[0]);
  var wrap = el("div", null, "tscroll");
  var tbl = el("table");
  var head = el("tr");
  cols.forEach(function (c) { head.appendChild(el("th", c)); });
  tbl.appendChild(head);
  d.rows.forEach(function (r) {
    var tr = el("tr");
    cols.forEach(function (c) {
      var v = r[c] == null ? "null" : String(r[c]);
      var td = el("td", v.length > 80 ? v.slice(0, 80) + "…" : v);
      if (r[c] == null) td.className = "nul";
      if (v.length > 80) {
        td.className = "long"; td.tabIndex = 0; td.setAttribute("role", "button"); td.setAttribute("aria-expanded", "false");
        var open = false;
        var flip = function () { open = !open; td.textContent = open ? v : v.slice(0, 80) + "…"; td.classList.toggle("open", open); td.setAttribute("aria-expanded", String(open)); };
        td.onclick = flip;
        td.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
      }
      tr.appendChild(td);
    });
    tbl.appendChild(tr);
  });
  wrap.appendChild(tbl);
  holder.appendChild(wrap);
  var nav = el("div", null, "row");
  var prev = el("button", "previous"); prev.disabled = d.page <= 1;
  prev.onclick = function () { dbPageNo = d.page - 1; loadDb(); };
  var next = el("button", "next"); next.disabled = d.page >= pages;
  next.onclick = function () { dbPageNo = d.page + 1; loadDb(); };
  nav.appendChild(prev); nav.appendChild(next);
  holder.appendChild(nav);
}

function load() {
  if (tab === "db") return loadDb();
  api("GET", "/api/questions?status=" + tab).then(function (j) {
    drawTabs(j.counts);
    listEl.textContent = "";
    if (!j.questions.length) listEl.appendChild(el("p", "nothing here.", "empty"));
    j.questions.forEach(function (q) { listEl.appendChild(card(q)); });
  }).catch(function (e) { if (e.message !== "login") listEl.textContent = "could not load: " + e.message; });
}
var NOTHING = "nothing in the wiki about this";
load();
</script>
</body>
</html>`;

/** The page with the mount prefix filled in; the script prefixes every API call with it. */
export const page = (base: string) => PAGE.replace("__BASE__", base);
