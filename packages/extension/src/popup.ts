/**
 * Popup script — config + start button.
 */
const DEFAULTS = {
  apiBase: "http://localhost:8092",
  project: "local",
  token: "local",
  alsoLog: true,
};

const $apiBase = document.getElementById("apiBase") as HTMLInputElement;
const $project = document.getElementById("project") as HTMLInputElement;
const $token   = document.getElementById("token")   as HTMLInputElement;
const $save    = document.getElementById("save")    as HTMLButtonElement;
const $start   = document.getElementById("start")   as HTMLButtonElement;
const $status  = document.getElementById("status")  as HTMLDivElement;

async function load() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  $apiBase.value = cfg.apiBase ?? DEFAULTS.apiBase;
  $project.value = cfg.project ?? DEFAULTS.project;
  $token.value   = cfg.token   ?? DEFAULTS.token;
}

async function save() {
  await chrome.storage.local.set({
    apiBase: $apiBase.value.trim() || DEFAULTS.apiBase,
    project: $project.value.trim() || DEFAULTS.project,
    token:   $token.value.trim()   || DEFAULTS.token,
  });
  setStatus("Saved.", "ok");
}

function setStatus(msg: string, kind: "ok" | "err" | "" = "") {
  $status.textContent = msg;
  $status.className = kind;
  if (msg) setTimeout(() => { $status.textContent = ""; $status.className = ""; }, 2400);
}

$save.addEventListener("click", save);

$start.addEventListener("click", async () => {
  await save();
  $start.disabled = true;
  $start.textContent = "Capturing…";
  try {
    const res = await chrome.runtime.sendMessage({ type: "START" });
    if (!res?.ok) throw new Error(res?.error ?? "start failed");
    window.close();
  } catch (e: any) {
    setStatus(e.message, "err");
    $start.disabled = false;
    $start.textContent = "Annotate this page";
  }
});

load();
