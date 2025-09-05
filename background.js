// background.js — no storage permission needed
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
  chrome.alarms.create(UNLOCK_ALARM, { delayInMinutes: minutes });
}

chrome.runtime.onInstalled.addListener(async () => {
  await lockNow();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === UNLOCK_ALARM) {
    await lockNow();
  }
});

// RPC for popup.js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "IGMO:getState") {
      const locked = await isLocked();
      const alarm = await chrome.alarms.get(UNLOCK_ALARM);
      const relockAt = alarm ? alarm.scheduledTime : null; // epoch ms
      sendResponse({ locked, relockAt });
    } else if (msg?.type === "IGMO:lock") {
      await lockNow();
      sendResponse({ ok: true });
    } else if (msg?.type === "IGMO:unlockFor") {
      const minutes = Number(msg.minutes) || 5;
      await unlockFor(minutes);
      sendResponse({ ok: true });
    }
  })();
  return true;
});