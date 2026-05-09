const { action, core } = require("photoshop");

const DEBOUNCE_MS = 200;
// userIdle can fire in bursts (a few times within the same animation frame).
// A short coalescing window keeps the refresh from running back-to-back when
// PS has briefly settled, then immediately settled again from a follow-up op.
const IDLE_DEBOUNCE_MS = 80;

let refreshCallback = null;
let debounceTimer = null;
let idleTimer = null;
let idleListenerActive = false;

const TRACKED_EVENTS = [
  "set", "select", "make", "delete",
  "open", "close", "save",
  "move", "transform", "crop",
  "fill", "stroke", "paint",
  "adjustments",
];

function debouncedRefresh() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (refreshCallback) refreshCallback();
  }, DEBOUNCE_MS);
}

function handleEvent(_eventName, _descriptor) {
  debouncedRefresh();
}

// userIdle fires when Photoshop has been idle for a brief moment — a perfect
// hook for a final-quality refresh after a slider drag or brush stroke ends.
// Per the UXP skill: "Prefer userIdle for heavy re-renders". We pair it with
// the action listener: actions catch every change, idle catches the moment
// the user pauses long enough that we can spend cycles on a refresh without
// fighting the user's interaction. Debouncing collapses idle bursts into one
// refresh — burst is harmless but wastes a render pass if the action listener
// has already scheduled one.
function handleIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (refreshCallback) refreshCallback();
  }, IDLE_DEBOUNCE_MS);
}

async function startListening(onRefresh) {
  refreshCallback = onRefresh;
  await action.addNotificationListener(TRACKED_EVENTS, handleEvent);
  // core.addNotificationListener exists since PS 22.5+; guard against
  // older hosts that may not expose the UI event class.
  if (core && typeof core.addNotificationListener === "function") {
    try {
      await core.addNotificationListener("UI", ["userIdle"], handleIdle);
      idleListenerActive = true;
    } catch (_e) {
      // userIdle may not be supported on all PS versions — non-fatal,
      // action listener still covers the refresh path.
      idleListenerActive = false;
    }
  }
}

async function stopListening() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  refreshCallback = null;

  try {
    await action.removeNotificationListener(TRACKED_EVENTS, handleEvent);
  } catch (_e) {
    // Ignore errors during cleanup
  }

  if (idleListenerActive && core && typeof core.removeNotificationListener === "function") {
    try {
      await core.removeNotificationListener("UI", ["userIdle"], handleIdle);
    } catch (_e) {
      // Ignore errors during cleanup
    }
    idleListenerActive = false;
  }
}

module.exports = { startListening, stopListening };
