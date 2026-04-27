// ─────────────────────────────────────────────
// 旅程交通（獨立於票券）
// ─────────────────────────────────────────────
const TRANSPORT_MODES = [
  { icon: "🚗", label: "自駕" },
  { icon: "🚕", label: "計程車" },
  { icon: "🚌", label: "公車" },
  { icon: "🚇", label: "捷運" },
  { icon: "🚆", label: "高鐵" },
  { icon: "✈",  label: "飛機" },
  { icon: "⛴",  label: "船" },
];

let tripLegs = [];
let editingTripLegId  = null;
let _addSelectedMode  = "";
let _editSelectedMode = "";

function loadTripLegs() {
  tripLegs = JSON.parse(localStorage.getItem(TRIP_LEGS_KEY) || "[]");
}

function saveTripLegs(sync = true) {
  localStorage.setItem(TRIP_LEGS_KEY, JSON.stringify(tripLegs));
  if (sync) cloudSave();
}

// ── Mode picker (shared for add / edit dialogs) ──
function _initModePicker(pickerId, currentMode, onSelect) {
  const picker = document.getElementById(pickerId);
  if (!picker) return;
  picker.innerHTML = "";
  TRANSPORT_MODES.forEach(({ icon, label }) => {
    const modeStr = `${icon} ${label}`;
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "dialog-mode-tile";
    tile.dataset.mode = modeStr;
    tile.innerHTML = `<span class="dialog-mode-icon">${icon}</span><span class="dialog-mode-label">${label}</span>`;
    if (currentMode === modeStr) tile.classList.add("selected");
    tile.addEventListener("click", () => {
      picker.querySelectorAll(".dialog-mode-tile").forEach(t => t.classList.remove("selected"));
      tile.classList.add("selected");
      onSelect(modeStr);
    });
    picker.appendChild(tile);
  });
}

// ── List rendering ──
function renderTripLegList() {
  const listEl  = document.getElementById("tripTransportList");
  const badgeEl = document.getElementById("tripTransportBadge");
  if (!listEl) return;
  if (badgeEl) badgeEl.textContent = tripLegs.length ? `${tripLegs.length} 筆` : "";

  listEl.innerHTML = "";
  if (!tripLegs.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚌</div>
        <p>尚無交通資訊<br>點擊「＋ 新增」</p>
      </div>`;
    return;
  }

  const finalized = state.finalized;
  tripLegs.forEach(item => {
    const el = document.createElement("div");
    el.className = "loc-item";
    el.innerHTML = `
      <div class="loc-info">
        <div class="loc-name">${esc(item.mode)}</div>
        ${item.note ? `<div class="loc-meta-row"><span class="leg-note">${esc(item.note)}</span></div>` : ""}
      </div>
      ${!finalized ? `
      <div class="loc-actions">
        <button class="icon-btn edit" title="編輯">✏</button>
        <button class="icon-btn del danger" title="刪除">✕</button>
      </div>` : ""}`;

    if (!finalized) {
      el.querySelector(".icon-btn.edit").addEventListener("click", e => {
        e.stopPropagation();
        openEditTripLegDialog(item.id);
      });
      el.querySelector(".del").addEventListener("click", e => {
        e.stopPropagation();
        tripLegs = tripLegs.filter(t => t.id !== item.id);
        saveTripLegs();
        renderTripLegList();
        if (typeof _rebuildTransportPool === "function") _rebuildTransportPool();
      });
    }
    listEl.appendChild(el);
  });
}

// ── Dialogs ──
function openAddTripLegDialog() {
  _addSelectedMode = "";
  _initModePicker("tlModePicker", "", mode => { _addSelectedMode = mode; });
  document.getElementById("tlNote").value = "";
  document.getElementById("addTripLegDialog").showModal();
}

function openEditTripLegDialog(id) {
  editingTripLegId = id;
  const item = tripLegs.find(t => t.id === id);
  if (!item) return;
  _editSelectedMode = item.mode || "";
  _initModePicker("etlModePicker", item.mode || "", mode => { _editSelectedMode = mode; });
  document.getElementById("etlNote").value = item.note || "";
  document.getElementById("editTripLegDialog").showModal();
}

// ─ 事件綁定 ─
document.getElementById("addTripTransportBtn").addEventListener("click", openAddTripLegDialog);

document.getElementById("confirmAddTripLegBtn").addEventListener("click", () => {
  if (!_addSelectedMode) return alert("請選擇交通方式");
  tripLegs.push({
    id:   crypto.randomUUID(),
    mode: _addSelectedMode,
    note: document.getElementById("tlNote").value.trim(),
  });
  saveTripLegs();
  document.getElementById("addTripLegDialog").close();
  renderTripLegList();
  if (typeof _rebuildTransportPool === "function") _rebuildTransportPool();
});

document.getElementById("cancelAddTripLegBtn").addEventListener("click", () => {
  document.getElementById("addTripLegDialog").close();
});

document.getElementById("saveEditTripLegBtn").addEventListener("click", () => {
  const item = tripLegs.find(t => t.id === editingTripLegId);
  if (!item) return;
  if (!_editSelectedMode) return alert("請選擇交通方式");
  item.mode = _editSelectedMode;
  item.note = document.getElementById("etlNote").value.trim();
  saveTripLegs();
  document.getElementById("editTripLegDialog").close();
  renderTripLegList();
  if (typeof _rebuildTransportPool === "function") _rebuildTransportPool();
});

document.getElementById("cancelEditTripLegBtn").addEventListener("click", () => {
  document.getElementById("editTripLegDialog").close();
});
