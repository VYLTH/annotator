/**
 * Background service worker (Chrome MV3).
 *
 * Responsibilities:
 *   - On toolbar action click: capture the visible tab → inject overlay
 *     content script → forward the captured PNG into it.
 *   - On overlay submit: POST envelope to the configured API base.
 *   - Persist config via chrome.storage.local (popup writes it).
 *
 * The content script lives entirely on the host page; the SW never touches
 * page DOM. captureVisibleTab() works on any tab the user is actively looking
 * at thanks to the activeTab permission — no broad host_permissions needed.
 */

interface Config {
  apiBase: string;
  project: string;
  token: string;
  alsoLog: boolean;
}

const DEFAULTS: Config = {
  apiBase: "http://localhost:8092",
  project: "local",
  token: "local",
  alsoLog: true,
};

async function getConfig(): Promise<Config> {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...stored } as Config;
}

async function captureActiveTab(tab: chrome.tabs.Tab): Promise<string> {
  if (typeof tab.windowId !== "number") throw new Error("no windowId");
  return await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}

// The popup handles config UI. Toolbar-icon click ALSO opens the popup by
// default (because we declared default_popup), so the way the user "starts
// annotating" is through the popup's "Start annotating" button, which sends
// us a START message. We do the capture, then inject the overlay.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "START") {
        const tab = sender.tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        if (!tab?.id) throw new Error("no active tab");

        const png = await captureActiveTab(tab);

        // Inject the content script (idempotent — guard inside script).
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-script.js"],
        });

        // Hand the captured PNG + URL + tab metadata to the content script.
        await chrome.tabs.sendMessage(tab.id, {
          type: "OVERLAY_OPEN",
          payload: {
            png,
            url: tab.url ?? "",
            title: tab.title ?? "",
          },
        });
        sendResponse({ ok: true });
        return;
      }

      if (msg?.type === "SUBMIT") {
        const config = await getConfig();
        const envelope = msg.envelope;
        if (config.alsoLog) console.log("[annotator-ext] envelope", envelope);

        const res = await fetch(`${config.apiBase}/v1/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Annot-Token": config.token,
          },
          body: JSON.stringify({ ...envelope, project: config.project }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`POST ${config.apiBase}/v1/feedback → ${res.status} ${text}`);
        }
        sendResponse({ ok: true, id: (await res.json())?.id });
        return;
      }

      if (msg?.type === "GET_CONFIG") {
        sendResponse(await getConfig());
        return;
      }

      sendResponse({ ok: false, error: "unknown message" });
    } catch (e: any) {
      console.error("[annotator-ext]", e);
      sendResponse({ ok: false, error: String(e?.message ?? e) });
    }
  })();
  return true; // keep channel open for async sendResponse
});

// Default config on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.local.set(DEFAULTS);
  }
});
