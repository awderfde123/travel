// ─────────────────────────────────────────────
// App 狀態
// ─────────────────────────────────────────────
const state = {
  places: [],
  showRoute: false,
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
const routeToggleBtn  = document.getElementById("routeToggleBtn");

// ─────────────────────────────────────────────
// 地點資料 — 讀寫、查詢
// ─────────────────────────────────────────────
function saveState(sync = true) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state.places));
  if (sync) cloudSave();
}

function loadState() {
  state.places = JSON.parse(localStorage.getItem(DATA_KEY) || "[]");
  state.places.forEach(p => { if (!p.discussions) p.discussions = []; });
}

function getPlace(id) {
  return state.places.find(p => p.id === id);
}

function ensureSeed() {
  if (state.places.length) return;
  state.places = [{
    id: crypto.randomUUID(),
    name: "台北車站",
    lat: 25.0478,
    lng: 121.517,
    note: "可作為集合點",
    budget: 0,
    discussions: [{
      id: crypto.randomUUID(),
      author: "小美",
      text: "這裡當集合點如何？",
      createdAt: new Date().toISOString(),
    }],
  }];
  saveState();
}
