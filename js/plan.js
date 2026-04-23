// ─────────────────────────────────────────────
// 行程規劃頁
// ─────────────────────────────────────────────
let planOrder = [];
let planPool  = [];
let planMap   = null;
let planMarkers  = [];
let planPolyline = null;

let _poolSortable = null;
let _listSortable = null;

function renderPlanPage() {
  planPool  = state.places.map(p => p.id);
  planOrder = [];
  renderPoolCards();
  renderPlanCards();
  renderPlanTransport();
  initPlanMap();
  updatePlanSummary();
}

function renderPlanTransport() {
  const finals  = (typeof transportItems !== "undefined" ? transportItems : []).filter(t => t.isFinal);
  const section = document.getElementById("planTransportSection");
  const listEl  = document.getElementById("planTransportList");
  if (!section) return;
  if (!finals.length) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  listEl.innerHTML = finals.map(t => `
    <div class="plan-transport-card">
      <span class="plan-transport-method">${esc(t.method)}</span>
      ${t.route ? `<span class="transport-tag">${esc(t.route)}</span>` : ""}
      ${t.where ? `<span class="transport-tag">${esc(t.where)}</span>` : ""}
      ${t.price > 0 ? `<span class="loc-budget">NT$${t.price.toLocaleString()}</span>` : ""}
      <span class="${t.purchased ? "dic-purchased" : "dic-unpurchased"}">${t.purchased ? "✅ 已購買" : "🛒 未購買"}</span>
    </div>`).join("");
}

function initPlanMap() {
  if (!window.google?.maps) {
    document.getElementById("planMapHint").classList.remove("hidden");
    return;
  }
  document.getElementById("planMapHint").classList.add("hidden");
  if (planMap) { renderPlanMarkers(); return; }
  planMap = new google.maps.Map(document.getElementById("planMap"), {
    center: { lat: 25.0478, lng: 121.517 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    gestureHandling: "greedy",
  });
  renderPlanMarkers();
}

// ── Pool cards (left column) ──
function renderPoolCards() {
  const poolEl = document.getElementById("planPool");
  poolEl.innerHTML = "";

  if (!planPool.length) {
    poolEl.innerHTML = `<div class="empty-state" style="flex:1;"><div class="empty-icon">✅</div><p>所有地點已加入行程</p></div>`;
  } else {
    planPool.forEach(id => {
      const p = getPlace(id);
      if (!p) return;
      const card = document.createElement("div");
      card.className = "plan-card pool-card";
      card.dataset.id = id;
      card.innerHTML = `
        <div class="plan-card-info">
          <div class="plan-card-name">${esc(p.name)}</div>
          ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
          ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
        </div>
        <button class="plan-tap-add" title="加入行程">＋</button>
        <div class="plan-drag-handle">⠿</div>`;
      card.querySelector(".plan-tap-add").addEventListener("click", () => {
        planPool  = planPool.filter(x => x !== id);
        planOrder.push(id);
        _rebuildSortables();
        renderPoolCards();
        renderPlanCards();
        renderPlanMarkers();
        updatePlanSummary();
      });
      poolEl.appendChild(card);
    });
  }

  _initPoolSortable();
}

// ── Active cards (right column) ──
function renderPlanCards() {
  const listEl = document.getElementById("planList");
  listEl.innerHTML = "";

  if (!planOrder.length) {
    listEl.innerHTML = `<div style="display:flex;align-items:center;color:var(--muted);font-size:.8rem;padding:0 4px;white-space:nowrap;">← 從左側拖入地點</div>`;
  } else {
    planOrder.forEach((id, i) => {
      const p = getPlace(id);
      if (!p) return;
      const card = document.createElement("div");
      card.className = "plan-card";
      card.dataset.id = id;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="plan-card-num">${i + 1}</div>
          <div class="plan-drag-handle" style="margin-left:auto;">⠿</div>
        </div>
        <div class="plan-card-info">
          <div class="plan-card-name">${esc(p.name)}</div>
          ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
          ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
        </div>
        <button class="plan-tap-remove" title="移除">✕</button>`;
      card.querySelector(".plan-tap-remove").addEventListener("click", () => {
        planOrder = planOrder.filter(x => x !== id);
        planPool.push(id);
        _rebuildSortables();
        renderPoolCards();
        renderPlanCards();
        renderPlanMarkers();
        updatePlanSummary();
      });
      listEl.appendChild(card);
    });
  }

  _initListSortable();
}

// ── SortableJS init ──
function _rebuildSortables() {
  if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
  if (_listSortable) { _listSortable.destroy(); _listSortable = null; }
}

function _syncFromDOM() {
  planPool  = Array.from(document.querySelectorAll("#planPool [data-id]")).map(el => el.dataset.id);
  planOrder = Array.from(document.querySelectorAll("#planList [data-id]")).map(el => el.dataset.id);
  // Remove placeholder text once items arrive in list
  if (planOrder.length) {
    document.querySelectorAll("#planList :not([data-id])").forEach(el => el.remove());
  }
  renderPlanMarkers();
  updatePlanSummary();
  document.querySelectorAll("#planList .plan-card-num").forEach((el, i) => { el.textContent = i + 1; });
}

function _initPoolSortable() {
  if (!window.Sortable) return;
  if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
  const poolEl = document.getElementById("planPool");
  if (!poolEl) return;
  _poolSortable = Sortable.create(poolEl, {
    group:     { name: "places", pull: true, put: true },
    animation: 150,
    handle:    ".plan-drag-handle",
    draggable: "[data-id]",
    onSort:    _syncFromDOM,
  });
}

function _initListSortable() {
  if (!window.Sortable) return;
  if (_listSortable) { _listSortable.destroy(); _listSortable = null; }
  const listEl = document.getElementById("planList");
  if (!listEl) return;
  _listSortable = Sortable.create(listEl, {
    group:     { name: "places", pull: true, put: true },
    animation: 150,
    handle:    ".plan-drag-handle",
    draggable: "[data-id]",
    onSort:    _syncFromDOM,
  });
}

// ── Plan map markers ──
function renderPlanMarkers() {
  planMarkers.forEach(m => m.setMap(null));
  planMarkers = [];
  if (planPolyline) { planPolyline.setMap(null); planPolyline = null; }
  if (!planMap) return;

  const places = planOrder.map(id => getPlace(id)).filter(Boolean);
  places.forEach((p, i) => {
    const marker = new google.maps.Marker({
      map: planMap,
      position: { lat: p.lat, lng: p.lng },
      title: p.name,
      icon: markerSvg(i + 1),
    });
    planMarkers.push(marker);
  });

  if (places.length >= 2) {
    planPolyline = new google.maps.Polyline({
      path: places.map(p => ({ lat: p.lat, lng: p.lng })),
      map: planMap,
      strokeColor: "#2563eb",
      strokeWeight: 3,
      strokeOpacity: 0.6,
      geodesic: true,
    });
  }

  if (places.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    places.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    planMap.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }
}

function updatePlanSummary() {
  const places = planOrder.map(id => getPlace(id)).filter(Boolean);
  document.getElementById("planCount").textContent  = `${places.length} 個地點`;
  const total = places.reduce((s, p) => s + (p.budget || 0), 0);
  document.getElementById("planBudget").textContent = `NT$${total.toLocaleString()}`;
}

// ─ 事件綁定 ─
document.getElementById("openPlanBtn").addEventListener("click", () => { location.hash = "#/plan"; });
document.getElementById("backPlanBtn").addEventListener("click", () => { location.hash = "#/trip"; });
document.getElementById("confirmPlanBtn").addEventListener("click", () => {
  if (!confirm("確定定案並儲存行程順序？\n定案後進入唯讀模式，可切換為攜帶清單打勾模式。")) return;
  const ordered  = planOrder.map(id => getPlace(id)).filter(Boolean);
  const poolRest = planPool.map(id => getPlace(id)).filter(Boolean);
  state.places    = [...ordered, ...poolRest];
  state.finalized = true;
  saveState();
  updateTripHistory({ finalized: true });
  if (typeof applyFinalizedUI === "function") applyFinalizedUI();
  location.hash = "#/trip";
});
