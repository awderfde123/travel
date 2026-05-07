// ─────────────────────────────────────────────
// 旅程列表頁
// ─────────────────────────────────────────────
function getTripHistory() {
  return JSON.parse(localStorage.getItem(TRIP_HISTORY_KEY) || "[]");
}

function renderTripsPage() {
  const history = getTripHistory();
  const listEl  = document.getElementById("tripsList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!history.length) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding-top:60px;">
        <div class="empty-icon">✈</div>
        <p>還沒有旅程<br>點上方按鈕建立或加入旅程</p>
      </div>`;
    return;
  }

  history.forEach(trip => {
    const el = document.createElement("div");
    el.className = "trip-list-card";
    el.innerHTML = `
      <div class="trip-list-code handwrite">${trip.code}</div>
      <div class="trip-list-name">${esc(trip.name || trip.code)}</div>
      <div class="trip-list-meta">
        <span class="trip-list-date">${trip.lastVisited ? fmtTime(trip.lastVisited) : "&nbsp;"}</span>
        <span class="trip-status-badge ${trip.finalized ? "is-finalized" : "is-editing"}">
          ${trip.finalized ? "已 定 案" : "規劃中"}
        </span>
      </div>`;
    el.addEventListener("click", async () => {
      await joinTrip(trip.code);
      renderLocationsList();
      renderTransportList();
      renderPackingList();
      if (typeof applyFinalizedUI === "function") applyFinalizedUI();
      location.hash = "#/trip";
    });
    listEl.appendChild(el);
  });
}

async function createNewTrip() {
  const newCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  await joinTrip(newCode);
  renderLocationsList();
  renderTransportList();
  renderPackingList();
  if (typeof applyFinalizedUI === "function") applyFinalizedUI();
  location.hash = "#/trip";
}

// ─ 事件綁定 ─
document.getElementById("createTripBtn").addEventListener("click", createNewTrip);
document.getElementById("createTripStickerBtn").addEventListener("click", createNewTrip);

document.getElementById("joinTripFromListBtn").addEventListener("click", () => {
  document.getElementById("joinTripInput").value = "";
  document.getElementById("joinTripDialog").showModal();
  setTimeout(() => document.getElementById("joinTripInput").focus(), 50);
});
