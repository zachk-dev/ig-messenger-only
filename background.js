// background.js
const RULESET_ID = "lockRules";
const UNLOCK_ALARM = "igmo:autoRelock";

async function isLocked() {
  const { enabledRulesets } = await chrome.declarativeNetRequest.getEnabledRulesets();
  return enabledRulesets.includes(RULESET_ID);
}

async function lockNow() {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [RULESET_ID],
    disableRulesetIds: []
  });
  await chrome.alarms.clear(UNLOCK_ALARM);
}

async function unlockFor(minutes = 5) {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [],
    disableRulesetIds: [RULESET_ID]
  });
  // schedule relock
  chrome.alarms.create(UNLOCK_ALARM, { delayInMinutes: minutes });
  // store ETA for UI
  const relockAt = Date.now() + minutes * 60 * 1000;
  await chrome.storage.local.set({ igmo_relockAt: relockAt });
}

chrome.runtime.onInstalled.addListener(async () => {
  // Default to locked on install/update
  await lockNow();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === UNLOCK_ALARM) {
    await lockNow();
    await chrome.storage.local.remove("igmo_relockAt");
  }
});

// Expose tiny RPC for popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "IGMO:getState") {
      const locked = await isLocked();
      const { igmo_relockAt } = await chrome.storage.local.get("igmo_relockAt");
      sendResponse({ locked, relockAt: igmo_relockAt ?? null });
    } else if (msg?.type === "IGMO:lock") {
      await lockNow();
      sendResponse({ ok: true });
    } else if (msg?.type === "IGMO:unlockFor") {
      const minutes = Number(msg.minutes) || 5;
      await unlockFor(minutes);
      sendResponse({ ok: true });
    }
  })();
  return true; // keep message channel open for async
});