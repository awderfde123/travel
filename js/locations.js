// ─────────────────────────────────────────────
// 地點列表
// ─────────────────────────────────────────────
let editingId = null;

function renderLocationsList() {
  locCountEl.textContent = `共 ${state.places.length} 個地點`;
  routeToggleBtn.classList.toggle("hidden", state.places.length < 2);
  locationsListEl.innerHTML = "";

  const query    = (document.getElementById("locSearch")?.value ?? "").trim().toLowerCase();
  const filtered = state.places.filter(p =>
    !query || p.name.toLowerCase().includes(query) || (p.note || "").toLowerCase().includes(query)
  );

  if (!state.places.length) {
    locationsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🗺</div>
        <p>點擊地圖上的任意位置<br>即可新增地點</p>
      </div>`;
    return;
  }
  if (!filtered.length) {
    locationsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>找不到「${esc(query)}」</p>
      </div>`;
    return;
  }

  filtered.forEach((place, i) => {
    const count  = place.discussions?.length ?? 0;
    const budget = place.budget || 0;
    const row    = document.createElement("div");
    row.className = "loc-item";
    row.innerHTML = `
      <div class="loc-num">${i + 1}</div>
      <div class="loc-info">
        <div class="loc-name">${esc(place.name)}</div>
        ${place.note ? `<div class="loc-note">${esc(place.note)}</div>` : ""}
        <div class="loc-meta-row">
          ${budget > 0 ? `<span class="loc-budget">NT$${budget.toLocaleString()}</span>` : ""}
          <span class="loc-discuss-count">💬 ${count > 0 ? `${count} 則討論` : "查看討論"}</span>
        </div>
      </div>
      <div class="loc-actions">
        <button class="icon-btn edit" title="編輯">✏</button>
        <button class="icon-btn del danger" title="刪除">✕</button>
      </div>`;

    row.querySelector(".loc-info").addEventListener("click", () => openDiscussPage(place.id));
    row.querySelector(".loc-num").addEventListener("click",  () => openDiscussPage(place.id));
    row.querySelector(".icon-btn.edit").addEventListener("click", e => { e.stopPropagation(); openEditDialog(place.id); });
    row.querySelector(".icon-btn.del").addEventListener("click",  e => { e.stopPropagation(); deletePlace(place.id); });
    locationsListEl.appendChild(row);
  });
}

function deletePlace(id) {
  const place = getPlace(id);
  if (!confirm(`確定刪除「${place?.name ?? ""}」？`)) return;
  state.places = state.places.filter(p => p.id !== id);
  saveState();
  renderLocationsList();
  renderMarkers();
}

function openAddDialog(placeName = "") {
  document.getElementById("newPlaceName").value   = placeName;
  document.getElementById("newPlaceBudget").value = "";
  document.getElementById("newPlaceNote").value   = "";
  document.getElementById("addPlaceDialog").showModal();
  setTimeout(() => {
    const nameEl = document.getElementById("newPlaceName");
    nameEl.focus();
    if (placeName) nameEl.select();
  }, 50);
}

function openEditDialog(id) {
  editingId = id;
  const place = getPlace(id);
  document.getElementById("editPlaceName").value   = place.name;
  document.getElementById("editPlaceBudget").value = place.budget || "";
  document.getElementById("editPlaceNote").value   = place.note || "";
  document.getElementById("editPlaceDialog").showModal();
  setTimeout(() => document.getElementById("editPlaceName").focus(), 50);
}

// ─ 事件綁定 ─
document.getElementById("locSearch").addEventListener("input", renderLocationsList);

document.getElementById("cancelAddPlaceBtn").addEventListener("click", () => {
  pendingLatLng = null;
  document.getElementById("addPlaceDialog").close();
});

document.getElementById("confirmAddPlaceBtn").addEventListener("click", () => {
  const name = document.getElementById("newPlaceName").value.trim();
  if (!name)          return alert("請輸入地點名稱");
  if (!pendingLatLng) return alert("座標取得失敗，請重新點擊地圖");
  const { lat, lng } = pendingLatLng;
  const budget = Math.max(0, parseFloat(document.getElementById("newPlaceBudget").value) || 0);
  const note   = document.getElementById("newPlaceNote").value.trim();
  state.places.push({ id: crypto.randomUUID(), name, lat, lng, note, budget, discussions: [] });
  pendingLatLng = null;
  saveState();
  document.getElementById("addPlaceDialog").close();
  renderLocationsList();
  renderMarkers();
});

document.getElementById("saveEditBtn").addEventListener("click", () => {
  const place = getPlace(editingId);
  if (!place) return;
  const name = document.getElementById("editPlaceName").value.trim();
  if (!name) return alert("地點名稱不能為空");
  place.name   = name;
  place.budget = Math.max(0, parseFloat(document.getElementById("editPlaceBudget").value) || 0);
  place.note   = document.getElementById("editPlaceNote").value.trim();
  saveState();
  renderLocationsList();
  document.getElementById("editPlaceDialog").close();
  if (!discussViewEl.classList.contains("hidden")) renderDiscussView();
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  document.getElementById("editPlaceDialog").close();
});
