// The whole admin UI: one static page. Question text comes from visitors, so the script only ever uses textContent.
const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>portfolio questions</title>
<style>
  :root { --bg: #fbfaf7; --fg: #26231f; --muted: #7a746a; --line: #e4dfd5; --accent: #3d6b5a; --card: #fff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #17160f; --fg: #ebe7dd; --muted: #9a9486; --line: #2d2b22; --accent: #7fb9a2; --card: #1e1d15; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, sans-serif; text-transform: lowercase; }
  main { max-width: 44rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 .25rem; }
  .sub { color: var(--muted); margin: 0 0 1.5rem; }
  nav { display: flex; gap: .5rem; margin-bottom: 1.25rem; }
  button { font: inherit; text-transform: lowercase; cursor: pointer; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 6px; padding: .35rem .8rem; transition: border-color .15s ease-out; }
  button:hover { border-color: var(--accent); }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  nav button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  article { border: 1px solid var(--line); background: var(--card); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  .q { font-weight: 600; margin: 0 0 .25rem; overflow-wrap: anywhere; text-transform: none; }
  .meta { color: var(--muted); font-size: .85rem; margin: 0 0 .75rem; }
  .sug { color: var(--muted); font-size: .9rem; margin: 0 0 .5rem; }
  textarea { width: 100%; min-height: 5rem; font: inherit; text-transform: none; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: .5rem; resize: vertical; }
  .row { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem; align-items: center; }
  .msg { color: var(--muted); font-size: .85rem; }
  #login { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
  input { font: inherit; background: var(--card); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: .35rem .6rem; }
  .empty { color: var(--muted); }
</style>
</head>
<body>
<main>
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
</main>
<script>
var BASE = "__BASE__";
var TABS = [["open", "open"], ["answered", "answered"], ["dismissed", "dismissed"]];
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
  tabsEl.textContent = "";
  TABS.forEach(function (t) {
    var b = el("button", t[1] + " (" + (counts[t[0]] || 0) + ")");
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

function load() {
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
