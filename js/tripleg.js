// ─────────────────────────────────────────────
// 旅程交通（獨立於票券）
// ─────────────────────────────────────────────
let tripLegs = [];
let editingTripLegId = null;

function loadTripLegs() {
  tripLegs = JSON.parse(localStorage.getItem(TRIP_LEGS_KEY) || "[]");
}

function saveTripLegs(sync = true) {
  localStorage.setItem(TRIP_LEGS_KEY, JSON.stringify(tripLegs));
  if (sync) cloudSave();
}

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
        <div class="loc-name">${transportIcon(item.mode)} ${esc(item.mode)}</div>
        <div class="transport-tags">
          ${item.route ? `<span class="transport-tag">${esc(item.route)}</span>` : ""}
          ${item.time  ? `<span class="transport-tag">⏰ ${esc(item.time)}</span>` : ""}
        </div>
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
      });
    }
    listEl.appendChild(el);
  });
}

function openAddTripLegDialog() {
  ["tlMode", "tlRoute", "tlTime", "tlNote"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("addTripLegDialog").showModal();
  setTimeout(() => document.getElementById("tlMode").focus(), 50);
}

function openEditTripLegDialog(id) {
  editingTripLegId = id;
  const item = tripLegs.find(t => t.id === id);
  if (!item) return;
  document.getElementById("etlMode").value  = item.mode  || "";
  document.getElementById("etlRoute").value = item.route || "";
  document.getElementById("etlTime").value  = item.time  || "";
  document.getElementById("etlNote").value  = item.note  || "";
  document.getElementById("editTripLegDialog").showModal();
  setTimeout(() => document.getElementById("etlMode").focus(), 50);
}

// ─ 事件綁定 ─
document.getElementById("addTripTransportBtn").addEventListener("click", openAddTripLegDialog);

document.getElementById("confirmAddTripLegBtn").addEventListener("click", () => {
  const mode = document.getElementById("tlMode").value.trim();
  if (!mode) return alert("請輸入交通方式");
  tripLegs.push({
    id:    crypto.randomUUID(),
    mode,
    route: document.getElementById("tlRoute").value.trim(),
    time:  document.getElementById("tlTime").value.trim(),
    note:  document.getElementById("tlNote").value.trim(),
  });
  saveTripLegs();
  document.getElementById("addTripLegDialog").close();
  renderTripLegList();
});

document.getElementById("cancelAddTripLegBtn").addEventListener("click", () => {
  document.getElementById("addTripLegDialog").close();
});

document.getElementById("saveEditTripLegBtn").addEventListener("click", () => {
  const item = tripLegs.find(t => t.id === editingTripLegId);
  if (!item) return;
  const mode = document.getElementById("etlMode").value.trim();
  if (!mode) return alert("請輸入交通方式");
  item.mode  = mode;
  item.route = document.getElementById("etlRoute").value.trim();
  item.time  = document.getElementById("etlTime").value.trim();
  item.note  = document.getElementById("etlNote").value.trim();
  saveTripLegs();
  document.getElementById("editTripLegDialog").close();
  renderTripLegList();
});

document.getElementById("cancelEditTripLegBtn").addEventListener("click", () => {
  document.getElementById("editTripLegDialog").close();
});
