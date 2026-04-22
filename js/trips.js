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
      <div class="trip-list-info">
        <div class="trip-list-name">${esc(trip.name || trip.code)}</div>
        <div class="trip-list-meta">
          <code class="trip-list-code">${trip.code}</code>
          <span class="trip-status-badge ${trip.finalized ? "is-finalized" : "is-editing"}">
            ${trip.finalized ? "已定案" : "規劃中"}
          </span>
        </div>
        ${trip.lastVisited ? `<div class="trip-list-date">上次：${fmtTime(trip.lastVisited)}</div>` : ""}
      </div>
      <div class="trip-list-arrow">›</div>`;
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

// ─ 事件綁定 ─
document.getElementById("createTripBtn").addEventListener("click", async () => {
  const newCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  await joinTrip(newCode);
  renderLocationsList();
  renderTransportList();
  renderPackingList();
  if (typeof applyFinalizedUI === "function") applyFinalizedUI();
  location.hash = "#/trip";
});

document.getElementById("joinTripFromListBtn").addEventListener("click", () => {
  document.getElementById("joinTripInput").value = "";
  document.getElementById("joinTripDialog").showModal();
  setTimeout(() => document.getElementById("joinTripInput").focus(), 50);
});
