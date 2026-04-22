// ─────────────────────────────────────────────
// 雲端資料庫（Firebase Firestore）
// ─────────────────────────────────────────────
const TRIP_ID_KEY = "trip-map-trip-id";

let _db          = null;
let tripId       = "";
let _unsubscribe = null;
let _saveTimer   = null;

// ── 初始化 Firebase ──
function initDb() {
  const configured =
    window.firebase &&
    FIREBASE_CONFIG?.projectId &&
    FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";

  if (!configured) {
    console.warn("Firebase 未設定，僅使用本地儲存");
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
  } catch (e) {
    if (e.code !== "app/duplicate-app") throw e;
  }
  _db = firebase.firestore();
  _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

// ── 旅程代碼：回傳是否從 URL 加入 ──
function initTripId() {
  const urlParams = new URLSearchParams(location.search);
  const fromUrl   = (urlParams.get("trip") || "").toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(fromUrl)) {
    tripId = fromUrl;
    localStorage.setItem(TRIP_ID_KEY, tripId);
    history.replaceState(null, "", location.pathname + location.hash);
    return true;
  } else {
    tripId = localStorage.getItem(TRIP_ID_KEY) || "";
    return false;
  }
}

function tripRef() {
  if (!_db || !tripId) return null;
  return _db.collection("trips").doc(tripId);
}

// ── Trip history（本地）──
function updateTripHistory(extra = {}) {
  if (!tripId) return;
  const history = JSON.parse(localStorage.getItem(TRIP_HISTORY_KEY) || "[]");
  const idx = history.findIndex(t => t.code === tripId);
  const entry = {
    code:        tripId,
    name:        state.tripName || "",
    finalized:   state.finalized || false,
    lastVisited: new Date().toISOString(),
    ...extra,
  };
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...entry };
  } else {
    history.unshift(entry);
  }
  localStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(history));
}

// ── 儲存到雲端（防抖 600ms）──
function cloudSave() {
  const ref = tripRef();
  if (!ref) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await ref.set({
        tripName:        state.tripName       || "",
        finalized:       state.finalized      || false,
        showRoute:       state.showRoute      || false,
        places:          JSON.parse(JSON.stringify(state.places)),
        transport:       JSON.parse(JSON.stringify(transportItems)),
        packingShared:   JSON.parse(JSON.stringify(packingShared)),
        packingPersonal: JSON.parse(JSON.stringify(packingPersonal)),
        updatedAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
      updateTripHistory();
    } catch (e) {
      console.warn("雲端儲存失敗:", e);
    }
  }, 600);
}

// ── 從雲端載入 ──
async function loadFromCloud() {
  const ref = tripRef();
  if (!ref) return false;
  try {
    const doc = await ref.get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (data.tripName  !== undefined) state.tripName  = data.tripName;
    if (data.finalized !== undefined) state.finalized = data.finalized;
    if (data.showRoute !== undefined) state.showRoute = data.showRoute;
    if (Array.isArray(data.places))    state.places   = data.places;
    if (Array.isArray(data.transport)) transportItems = data.transport;
    // 新版 packing（含舊版遷移）
    if (Array.isArray(data.packingShared)) {
      packingShared = data.packingShared;
    } else if (Array.isArray(data.packing)) {
      packingShared = data.packing.map(p => ({ id: p.id, name: p.name, checked: false }));
    }
    if (Array.isArray(data.packingPersonal)) packingPersonal = data.packingPersonal;
    saveState(false);
    saveTransport(false);
    savePacking(false);
    updateTripHistory();
    return true;
  } catch (e) {
    console.warn("雲端載入失敗，回退本地資料:", e);
    return false;
  }
}

// ── 即時同步訂閱 ──
function subscribeTrip() {
  const ref = tripRef();
  if (!ref) return;
  if (_unsubscribe) _unsubscribe();
  _unsubscribe = ref.onSnapshot(
    { includeMetadataChanges: true },
    doc => {
      if (doc.metadata.hasPendingWrites) return;
      if (!doc.exists) return;
      const data = doc.data();
      const wasFinalized = state.finalized;
      if (data.tripName  !== undefined) state.tripName  = data.tripName;
      if (data.finalized !== undefined) state.finalized = data.finalized;
      if (data.showRoute !== undefined) state.showRoute = data.showRoute;
      if (Array.isArray(data.places))    state.places   = data.places;
      if (Array.isArray(data.transport)) transportItems = data.transport;
      if (Array.isArray(data.packingShared))   packingShared   = data.packingShared;
      if (Array.isArray(data.packingPersonal)) packingPersonal = data.packingPersonal;
      saveState(false);
      saveTransport(false);
      savePacking(false);
      updateTripHistory();
      // 重新渲染
      renderLocationsList();
      renderMarkers();
      renderTransportList();
      renderPackingList();
      const nameEl = document.getElementById("tripNameDisplay");
      if (nameEl) nameEl.textContent = state.tripName || tripId;
      // finalized 狀態改變時更新 UI
      if (wasFinalized !== state.finalized && typeof applyFinalizedUI === "function") {
        applyFinalizedUI();
      }
      if (!discussViewEl.classList.contains("hidden")) renderDiscussView();
    },
    err => console.warn("即時同步錯誤:", err)
  );
}

// ── 切換旅程 ──
async function joinTrip(code) {
  const newId = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(newId)) {
    alert("旅程代碼格式錯誤（需為 6 位英數字）");
    return;
  }
  if (_unsubscribe) _unsubscribe();
  tripId = newId;
  localStorage.setItem(TRIP_ID_KEY, tripId);

  const el = document.getElementById("tripCodeDisplay");
  if (el) el.textContent = tripId;

  // 重置為空（等雲端載入）
  state.places    = [];
  state.tripName  = "";
  state.finalized = false;
  transportItems  = [];
  packingShared   = [];
  packingPersonal = [];

  const loaded = await loadFromCloud();
  if (!loaded) {
    saveState(false);
    saveTransport(false);
    savePacking(false);
    cloudSave();
  }
  updateTripHistory();
  subscribeTrip();
}

// ── UI 事件 ──
document.getElementById("copyTripBtn").addEventListener("click", () => {
  const url = `${location.origin}${location.pathname}?trip=${tripId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("copyTripBtn");
    const orig = btn.textContent;
    btn.textContent = "✅";
    setTimeout(() => (btn.textContent = orig), 1500);
  });
});

document.getElementById("cancelJoinBtn").addEventListener("click", () => {
  document.getElementById("joinTripDialog").close();
});

document.getElementById("confirmJoinBtn").addEventListener("click", async () => {
  const code = document.getElementById("joinTripInput").value.trim();
  if (!code) return;
  document.getElementById("joinTripDialog").close();
  await joinTrip(code);
  renderLocationsList();
  renderTransportList();
  renderPackingList();
  if (typeof applyFinalizedUI === "function") applyFinalizedUI();
  location.hash = "#/trip";
});
