// ─────────────────────────────────────────────
// 地點列表
// ─────────────────────────────────────────────
let editingId     = null;
let pendingOpenHours = null;

// 取得今日營業時間（簡短格式：去掉前綴「星期X: 」）
function todayOpenHours(openHours) {
  if (!Array.isArray(openHours) || !openHours.length) return null;
  const day = new Date().getDay(); // 0=Sun, 1=Mon
  const idx = day === 0 ? 6 : day - 1; // Places API: 0=Mon … 6=Sun
  const entry = openHours[idx];
  if (!entry) return null;
  const m = entry.match(/[：:]\s*(.+)$/);
  return m ? m[1].trim() : entry;
}

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

  const finalized = state.finalized;

  // ── 定案模式：整趟旅程導航按鈕 ──
  if (finalized) {
    const withCoords = state.places.filter(p => p.lat != null && p.lng != null);
    if (withCoords.length >= 2) {
      const origin      = withCoords[0];
      const destination = withCoords[withCoords.length - 1];
      const waypoints   = withCoords.slice(1, -1).map(p => `${p.lat},${p.lng}`).join("|");
      const url = `https://www.google.com/maps/dir/?api=1` +
        `&origin=${origin.lat},${origin.lng}` +
        `&destination=${destination.lat},${destination.lng}` +
        (waypoints ? `&waypoints=${waypoints}` : "") +
        `&travelmode=driving`;
      const navBar = document.createElement("div");
      navBar.className = "trip-nav-bar";
      navBar.innerHTML = `<button class="trip-nav-btn">🧭 開啟導航</button>`;
      navBar.querySelector(".trip-nav-btn").addEventListener("click", () => window.open(url, "_blank"));
      locationsListEl.appendChild(navBar);
    }
  }

  filtered.forEach((place, i) => {
    const count    = place.discussions?.length ?? 0;
    const budget   = place.budget || 0;
    const todayHrs = todayOpenHours(place.openHours);
    const time     = finalized ? (state.planCardTimes?.[place.id] || "") : "";
    const ticketId = finalized ? (state.planTickets?.[place.id] || "") : "";
    const ticket   = ticketId ? (typeof transportItems !== "undefined" ? transportItems.find(t => t.id === ticketId) : null) : null;

    const row = document.createElement("div");
    row.className = "loc-item";
    row.innerHTML = `
      <div class="loc-num">${state.places.indexOf(place) + 1}</div>
      <div class="loc-info">
        ${time ? `<div class="loc-plan-time">🕐 ${esc(time)}</div>` : ""}
        <div class="loc-name">${esc(place.name)}</div>
        ${place.note ? `<div class="loc-note">${esc(place.note)}</div>` : ""}
        ${todayHrs   ? `<div class="loc-hours">🕐 ${esc(todayHrs)}</div>` : ""}
        <div class="loc-meta-row">
          ${budget > 0 ? `<span class="loc-budget">NT$${budget.toLocaleString()}</span>` : ""}
          ${ticket ? `<span class="loc-ticket-badge">🎫 ${esc(ticket.method)}</span>` : ""}
          <button class="loc-discuss-btn">💬 ${count > 0 ? `${count} 則討論` : "查看討論"}</button>
        </div>
      </div>
      ${!finalized ? `
      <div class="loc-actions">
        <button class="icon-btn edit" title="編輯">✏</button>
        <button class="icon-btn del danger" title="刪除">✕</button>
      </div>` : ""}`;

    row.addEventListener("click", () => {
      if (map && place.lat != null && place.lng != null) {
        map.panTo({ lat: place.lat, lng: place.lng });
        map.setZoom(Math.max(map.getZoom(), 16));
      }
    });
    row.querySelector(".loc-num").addEventListener("click", e => {
      e.stopPropagation();
      openDiscussPage(place.id);
    });
    row.querySelector(".loc-discuss-btn").addEventListener("click", e => {
      e.stopPropagation();
      openDiscussPage(place.id);
    });
    if (!finalized) {
      row.querySelector(".icon-btn.edit").addEventListener("click", e => { e.stopPropagation(); openEditDialog(place.id); });
      row.querySelector(".icon-btn.del").addEventListener("click",  e => { e.stopPropagation(); deletePlace(place.id); });
    }
    locationsListEl.appendChild(row);

    // ── Between-location transport connector (finalized only) ──
    if (finalized && i < filtered.length - 1) {
      const nextPlace = filtered[i + 1];
      const key = `${place.id}__${nextPlace.id}`;
      const legId = state.planLegs?.[key];
      const leg = legId && typeof tripLegs !== "undefined" ? tripLegs.find(t => t.id === legId) : null;
      const connector = document.createElement("div");
      connector.className = "loc-leg-connector";
      connector.innerHTML = leg
        ? `<span class="loc-leg-mode">${esc(leg.mode)}</span>${leg.note ? `<span class="loc-leg-note">${esc(leg.note)}</span>` : ""}`
        : `<span class="loc-leg-mode loc-leg-walk">🚶</span>`;
      locationsListEl.appendChild(connector);
    }
  });
}

function deletePlace(id) {
  const place = getPlace(id);
  state.places = state.places.filter(p => p.id !== id);
  saveState();
  renderLocationsList();
  renderMarkers();
}

function openAddDialog(placeName = "", openHours = null) {
  pendingOpenHours = openHours;
  document.getElementById("newPlaceName").value   = placeName;
  document.getElementById("newPlaceBudget").value = "";
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
  document.getElementById("editPlaceDialog").showModal();
  setTimeout(() => document.getElementById("editPlaceName").focus(), 50);
}

// ─ 事件綁定 ─
document.getElementById("locSearch").addEventListener("input", renderLocationsList);

document.getElementById("cancelAddPlaceBtn").addEventListener("click", () => {
  pendingLatLng    = null;
  pendingOpenHours = null;
  document.getElementById("addPlaceDialog").close();
});

document.getElementById("confirmAddPlaceBtn").addEventListener("click", () => {
  const name = document.getElementById("newPlaceName").value.trim();
  if (!name)          return alert("請輸入地點名稱");
  if (!pendingLatLng) return alert("座標取得失敗，請重新點擊地圖");
  const { lat, lng } = pendingLatLng;
  const budget = Math.max(0, parseFloat(document.getElementById("newPlaceBudget").value) || 0);
  state.places.push({
    id: crypto.randomUUID(), name, lat, lng, note: "", budget, discussions: [],
    openHours: pendingOpenHours || null,
  });
  pendingLatLng    = null;
  pendingOpenHours = null;
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
  saveState();
  renderLocationsList();
  document.getElementById("editPlaceDialog").close();
  if (!discussViewEl.classList.contains("hidden")) renderDiscussView();
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  document.getElementById("editPlaceDialog").close();
});
