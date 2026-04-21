// ─────────────────────────────────────────────
// 側邊欄 Tabs
// ─────────────────────────────────────────────
const SIDEBAR_PANELS = ["locationsPanel", "transportPanel", "packingPanel"];
const SIDEBAR_TABS   = ["tabLocations",   "tabTransport",   "tabPacking"];

function switchTab(activeTab) {
  SIDEBAR_TABS.forEach((id, i) => {
    document.getElementById(id).classList.toggle("active", id === activeTab);
    document.getElementById(SIDEBAR_PANELS[i]).classList.toggle("hidden", id !== activeTab);
  });
  if (activeTab === "tabTransport") renderTransportList();
  if (activeTab === "tabPacking")   renderPackingList();
}

document.getElementById("tabLocations").addEventListener("click", () => switchTab("tabLocations"));
document.getElementById("tabTransport").addEventListener("click", () => switchTab("tabTransport"));
document.getElementById("tabPacking").addEventListener("click",   () => switchTab("tabPacking"));

// ─────────────────────────────────────────────
// 啟動
// ─────────────────────────────────────────────
(async () => {
  // 1. 初始化 Firebase + 旅程代碼
  initDb();
  initTripId();

  // 2. 先從 localStorage 快速載入（讓 UI 立即可用）
  loadState();
  loadTransport();
  loadPacking();

  // 3. 嘗試從雲端取得最新資料（覆蓋本地）
  const fromCloud = await loadFromCloud();
  if (!fromCloud) {
    ensureSeed();     // 新旅程：建立範例資料
    cloudSave();      // 把初始資料推上雲端
  }

  // 4. 渲染
  renderLocationsList();
  renderTransportList();
  renderPackingList();
  loadGoogleMap();
  route();

  // 5. 開始即時同步
  subscribeTrip();
})();
