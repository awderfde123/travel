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

// ── 旅程內的子 tab ──
function switchSubTab(active) {
  ["subTabPlaces", "subTabTransport"].forEach(id => {
    document.getElementById(id).classList.toggle("active", id === active);
  });
  document.getElementById("subPanelPlaces").classList.toggle("hidden",    active !== "subTabPlaces");
  document.getElementById("subPanelTransport").classList.toggle("hidden", active !== "subTabTransport");
  if (active === "subTabTransport") renderTripTransportList();
}
document.getElementById("subTabPlaces").addEventListener("click",    () => switchSubTab("subTabPlaces"));
document.getElementById("subTabTransport").addEventListener("click", () => switchSubTab("subTabTransport"));

// ─────────────────────────────────────────────
// 定案 UI
// ─────────────────────────────────────────────
function applyFinalizedUI() {
  const f = state.finalized;

  document.getElementById("unfinalizeBtn")?.classList.toggle("hidden", !f);
  document.getElementById("finalizedBadge")?.classList.toggle("hidden", !f);
  document.getElementById("openPlanBtn")?.classList.toggle("hidden", f);
  document.getElementById("addTransportBtn")?.classList.toggle("hidden", f);

  const nameEl = document.getElementById("tripNameDisplay");
  if (nameEl) nameEl.textContent = state.tripName || tripId || "旅程";

  renderLocationsList();
  renderTransportList();
  renderPackingList();
}

// 旅程名稱（使用 dialog 而非 prompt，相容 iOS WebView）
document.getElementById("editTripNameBtn")?.addEventListener("click", () => {
  document.getElementById("editTripNameInput").value = state.tripName || "";
  document.getElementById("editTripNameDialog").showModal();
  setTimeout(() => document.getElementById("editTripNameInput").select(), 50);
});
document.getElementById("confirmEditTripNameBtn")?.addEventListener("click", () => {
  state.tripName = document.getElementById("editTripNameInput").value.trim();
  saveState();
  updateTripHistory();
  document.getElementById("tripNameDisplay").textContent = state.tripName || tripId || "旅程";
  document.getElementById("editTripNameDialog").close();
});
document.getElementById("cancelEditTripNameBtn")?.addEventListener("click", () => {
  document.getElementById("editTripNameDialog").close();
});

// 解除定案
document.getElementById("unfinalizeBtn")?.addEventListener("click", () => {
  if (!confirm("確定解除定案，回到編輯模式？")) return;
  state.finalized = false;
  saveState();
  updateTripHistory({ finalized: false });
  applyFinalizedUI();
});

// 返回旅程列表
document.getElementById("backToTripsBtn")?.addEventListener("click", () => {
  location.hash = "#/";
});

// 確認名稱（初次設定 & 修改皆用此 listener）
document.getElementById("confirmNameBtn")?.addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;
  localStorage.setItem(AUTHOR_KEY, name);
  document.getElementById("cancelNameBtn").classList.add("hidden");
  document.getElementById("nameDialog").close();
  const userEl = document.getElementById("packingUserName");
  if (userEl) userEl.textContent = name;
  renderPackingList();
});


// ─────────────────────────────────────────────
// 啟動
// ─────────────────────────────────────────────
(async () => {
  // 1. 確認使用者名稱
  if (!localStorage.getItem(AUTHOR_KEY)) {
    const dlg = document.getElementById("nameDialog");
    dlg.showModal();
    // Wait for dialog to close (confirmNameBtn closes it)
    await new Promise(resolve => dlg.addEventListener("close", resolve, { once: true }));
  }

  // 2. 初始化 Firebase + 旅程代碼
  initDb();
  const fromUrl = initTripId();
  const codeEl = document.getElementById("tripCodeDisplay");
  if (codeEl && tripId) codeEl.textContent = tripId;

  // 3. 若有旅程代碼，載入資料
  if (tripId) {
    loadState();
    loadTransport();
    loadPacking();
    const fromCloud = await loadFromCloud();
    if (!fromCloud) cloudSave();
    updateTripHistory();
  }

  // 4. 渲染（即便資料為空也先渲染）
  renderLocationsList();
  renderTripTransportList();
  renderTransportList();
  renderPackingList();
  loadGoogleMap();

  // 5. 路由：URL 帶 trip 代碼 → 直接進旅程；否則顯示列表
  if (fromUrl) {
    location.hash = "#/trip";
  } else {
    route();
  }

  // 6. 即時同步
  if (tripId) subscribeTrip();
})();
