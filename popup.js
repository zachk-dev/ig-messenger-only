const statusEl = document.getElementById("status");
const lockBtn = document.getElementById("lockBtn");
const unlockBtn = document.getElementById("unlockBtn");
const minsInput = document.getElementById("mins");
const customUnlockBtn = document.getElementById("customUnlock");

function fmtETA(ts) {
  if (!ts) return "";
  const left = Math.max(0, ts - Date.now());
  const min = Math.ceil(left / 60000);
  return `${min} min`;
}

async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: "IGMO:getState" });
  if (state.locked) {
    statusEl.textContent = "Status: 🔒 Locked (only DMs).";
  } else {
    const eta = state.relockAt ? ` — auto-relock in ${fmtETA(state.relockAt)}` : "";
    statusEl.textContent = "Status: 🔓 Unlocked" + eta;
  }
}

lockBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "IGMO:lock" });
  await refresh();
});

unlockBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "IGMO:unlockFor", minutes: 5 });
  await refresh();
});

customUnlockBtn.addEventListener("click", async () => {
  const m = Number(minsInput.value || 5);
  await chrome.runtime.sendMessage({ type: "IGMO:unlockFor", minutes: m });
  await refresh();
});

// live countdown refresh while unlocked
setInterval(refresh, 15_000);
refresh();