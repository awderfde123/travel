// ─────────────────────────────────────────────
// 路由（hash-based SPA）
// ─────────────────────────────────────────────
const ALL_VIEWS = [tripsViewEl, mainViewEl, discussViewEl, planViewEl];

let _focusPlaceId = null;   // pan map to this place when returning to #/trip

function showOnly(el) {
  ALL_VIEWS.forEach(v => v.classList.add("hidden"));
  el.classList.remove("hidden");
}

function openDiscussPage(id)          { _focusPlaceId = id; location.hash = `#/discuss/${id}`; }
function openTransportDiscussPage(id) { location.hash = `#/t-discuss/${id}`; }

function _panToFocusPlace() {
  if (!_focusPlaceId || !map) return;
  const p = getPlace(_focusPlaceId);
  _focusPlaceId = null;
  if (!p) return;
  map.panTo({ lat: p.lat, lng: p.lng });
  map.setZoom(16);
}

function route() {
  const hash = location.hash;

  // 旅程列表（首頁）
  if (!hash || hash === "#/" || hash === "#/trips") {
    showOnly(tripsViewEl);
    renderTripsPage();
    return;
  }

  // 主旅程畫面
  if (hash === "#/trip") {
    showOnly(mainViewEl);
    if (typeof applyFinalizedUI === "function") applyFinalizedUI();
    _panToFocusPlace();
    return;
  }

  // 行程規劃
  if (hash === "#/plan") {
    showOnly(planViewEl);
    renderPlanPage();
    return;
  }

  // 地點討論
  const discussMatch = hash.match(/^#\/discuss\/(.+)$/);
  if (discussMatch) {
    const place = getPlace(discussMatch[1]);
    if (!place) { location.hash = "#/trip"; return; }
    showOnly(discussViewEl);
    discussContext = {
      item:     place,
      saveFunc: () => { saveState(); renderLocationsList(); },
      backFn:   () => { location.hash = "#/trip"; },
    };
    renderDiscussView();
    return;
  }

  // 交通討論
  const tDiscussMatch = hash.match(/^#\/t-discuss\/(.+)$/);
  if (tDiscussMatch) {
    const tItem = transportItems.find(t => t.id === tDiscussMatch[1]);
    if (!tItem) { location.hash = "#/trip"; return; }
    showOnly(discussViewEl);
    discussContext = {
      item:     tItem,
      saveFunc: () => { saveTransport(); renderTransportList(); },
      backFn:   () => { location.hash = "#/trip"; },
    };
    renderDiscussView();
    return;
  }

  // 預設
  location.hash = tripId ? "#/trip" : "#/";
}

window.addEventListener("hashchange", route);
