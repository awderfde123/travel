// ─────────────────────────────────────────────
// App 狀態
// ─────────────────────────────────────────────
const state = {
  places:        [],
  showRoute:     false,
  tripName:      "",
  finalized:     false,
  planLegs:      {},   // "fromId__toId" → tripLeg ID
  planCardTimes: {},   // locationId → time string
  planTickets:   {},   // locationId → transportItem ID
};

// ─────────────────────────────────────────────
// 共用 DOM refs（其他模組都會用到）
// ─────────────────────────────────────────────
const mapHintEl       = document.getElementById("mapHint");
const locationsListEl = document.getElementById("locationsList");
const locCountEl      = document.getElementById("locationsCount");
const mainViewEl      = document.getElementById("mainView");
const discussViewEl   = document.getElementById("discussView");
const planViewEl      = document.getElementById("planView");
const tripsViewEl     = document.getElementById("tripsView");
const routeToggleBtn  = document.getElementById("routeToggleBtn");

// ─────────────────────────────────────────────
// 地點資料 — 讀寫、查詢
// ─────────────────────────────────────────────
function saveState(sync = true) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state.places));
  localStorage.setItem(TRIP_META_KEY, JSON.stringify({
    tripName:      state.tripName,
    finalized:     state.finalized,
    showRoute:     state.showRoute,
    planLegs:      state.planLegs,
    planCardTimes: state.planCardTimes,
    planTickets:   state.planTickets,
  }));
  if (sync) cloudSave();
}

function loadState() {
  state.places = JSON.parse(localStorage.getItem(DATA_KEY) || "[]");
  state.places.forEach(p => { if (!p.discussions) p.discussions = []; });
  const meta = JSON.parse(localStorage.getItem(TRIP_META_KEY) || "{}");
  state.tripName      = meta.tripName      || "";
  state.finalized     = meta.finalized     || false;
  state.showRoute     = meta.showRoute     || false;
  state.planLegs      = meta.planLegs      || {};
  state.planCardTimes = meta.planCardTimes || {};
  state.planTickets   = meta.planTickets   || {};
}

function getPlace(id) {
  return state.places.find(p => p.id === id);
}
