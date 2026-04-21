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
    // 重複初始化（熱重載）時忽略
    if (e.code !== "app/duplicate-app") throw e;
  }
  _db = firebase.firestore();
  _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

// ── 旅程代碼 ──
function initTripId() {
  // 支援 ?trip=ABCDEF 加入分享連結
  const urlParams = new URLSearchParams(location.search);
  const fromUrl   = (urlParams.get("trip") || "").toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(fromUrl)) {
    tripId = fromUrl;
    localStorage.setItem(TRIP_ID_KEY, tripId);
    history.replaceState(null, "", location.pathname + location.hash);
  } else {
    tripId = localStorage.getItem(TRIP_ID_KEY) || "";
    if (!tripId) {
      tripId = Math.random().toString(36).slice(2, 8).toUpperCase();
      localStorage.setItem(TRIP_ID_KEY, tripId);
    }
  }
  const el = document.getElementById("tripCodeDisplay");
  if (el) el.textContent = tripId;
}

function tripRef() {
  return _db.collection("trips").doc(tripId);
}

// ── 儲存到雲端（防抖 600ms）──
function cloudSave() {
  if (!_db) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await tripRef().set({
        places:    JSON.parse(JSON.stringify(state.places)),
        transport: JSON.parse(JSON.stringify(transportItems)),
        packing:   JSON.parse(JSON.stringify(packingItems)),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn("雲端儲存失敗:", e);
    }
  }, 600);
}

// ── 從雲端載入 ──
async function loadFromCloud() {
  if (!_db) return false;
  try {
    const doc = await tripRef().get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (Array.isArray(data.places))    state.places   = data.places;
    if (Array.isArray(data.transport)) transportItems = data.transport;
    if (Array.isArray(data.packing))   packingItems   = data.packing;
    saveState(false);
    saveTransport(false);
    savePacking(false);
    return true;
  } catch (e) {
    console.warn("雲端載入失敗，回退本地資料:", e);
    return false;
  }
}

// ── 即時同步訂閱 ──
function subscribeTrip() {
  if (!_db) return;
  if (_unsubscribe) _unsubscribe();
  _unsubscribe = tripRef().onSnapshot(
    { includeMetadataChanges: true },
    doc => {
      if (doc.metadata.hasPendingWrites) return; // 自己的寫入，略過
      if (!doc.exists) return;
      const data = doc.data();
      if (Array.isArray(data.places))    state.places   = data.places;
      if (Array.isArray(data.transport)) transportItems = data.transport;
      if (Array.isArray(data.packing))   packingItems   = data.packing;
      saveState(false);
      saveTransport(false);
      savePacking(false);
      // 重新渲染
      renderLocationsList();
      renderMarkers();
      renderTransportList();
      renderPackingList();
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

  const loaded = await loadFromCloud();
  if (!loaded) {
    state.places   = [];
    transportItems = [];
    packingItems   = [];
    ensureSeed();
    cloudSave();
  }
  renderLocationsList();
  renderMarkers();
  renderTransportList();
  renderPackingList();
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

document.getElementById("joinTripBtn").addEventListener("click", () => {
  document.getElementById("joinTripInput").value = "";
  document.getElementById("joinTripDialog").showModal();
  setTimeout(() => document.getElementById("joinTripInput").focus(), 50);
});

document.getElementById("cancelJoinBtn").addEventListener("click", () => {
  document.getElementById("joinTripDialog").close();
});

document.getElementById("confirmJoinBtn").addEventListener("click", () => {
  const code = document.getElementById("joinTripInput").value.trim();
  if (!code) return;
  document.getElementById("joinTripDialog").close();
  joinTrip(code);
});
