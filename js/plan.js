// ─────────────────────────────────────────────
// 行程規劃頁
// ─────────────────────────────────────────────
let planOrder = [];
let planPool  = [];
let planLegs  = {};  // key: "fromId__toId", value: transportItemId
let planMap   = null;
let planMarkers  = [];
let planPolyline = null;
let _poolSortable          = null;
let _listSortable          = null;
let _legSortables          = [];
let _transportPoolSortable = null;

function renderPlanPage() {
  planPool  = state.places.map(p => p.id);
  planOrder = [];
  planLegs  = {};
  renderPoolCards();
  renderPlanCards();
  renderPlanTransport();
  _rebuildTransportPool();
  initPlanMap();
  updatePlanSummary();
}

// ── Card HTML helpers ──
function _poolCardInner(p) {
  return `
    <div class="plan-card-info">
      <div class="plan-card-name">${esc(p.name)}</div>
      ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
      ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
    </div>
    <button class="plan-tap-add" title="加入行程">＋</button>
    <div class="plan-drag-handle">⠿</div>`;
}

function _listCardInner(p, num) {
  return `
    <div style="display:flex;align-items:center;gap:6px;">
      <div class="plan-card-num">${num}</div>
      <div class="plan-drag-handle" style="margin-left:auto;">⠿</div>
    </div>
    <div class="plan-card-info">
      <div class="plan-card-name">${esc(p.name)}</div>
      ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
      ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
    </div>
    <button class="plan-tap-remove" title="移除">✕</button>`;
}

function _attachPoolEvents(card, id) {
  card.querySelector(".plan-tap-add").addEventListener("click", () => {
    planPool  = planPool.filter(x => x !== id);
    planOrder.push(id);
    renderPoolCards(); renderPlanCards(); renderPlanMarkers(); updatePlanSummary();
  });
}

function _attachListEvents(card, id) {
  card.querySelector(".plan-tap-remove").addEventListener("click", () => {
    planOrder = planOrder.filter(x => x !== id);
    planPool.push(id);
    renderPoolCards(); renderPlanCards(); renderPlanMarkers(); updatePlanSummary();
  });
}

// ── Pool cards ──
function renderPoolCards() {
  if (_poolSortable) { _poolSortable.destroy(); _poolSortable = null; }
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
      card.innerHTML = _poolCardInner(p);
      _attachPoolEvents(card, id);
      poolEl.appendChild(card);
    });
  }
  _initPoolSortable();
}

// ── Active cards ──
function renderPlanCards() {
  if (_listSortable) { _listSortable.destroy(); _listSortable = null; }
  _legSortables.forEach(s => { try { s.destroy(); } catch(e) {} });
  _legSortables = [];

  const listEl = document.getElementById("planList");
  listEl.innerHTML = "";

  if (!planOrder.length) {
    listEl.innerHTML = `<div class="plan-empty-hint">← 從左側拖入地點</div>`;
  } else {
    planOrder.forEach((id, i) => {
      const p = getPlace(id);
      if (!p) return;
      const card = document.createElement("div");
      card.className = "plan-card";
      card.dataset.id = id;
      card.innerHTML = _listCardInner(p, i + 1);
      _attachListEvents(card, id);
      listEl.appendChild(card);
    });
  }
  _initListSortable();
  _rebuildLegs();
}

// ── SortableJS helpers ──
function _renumberList() {
  document.querySelectorAll("#planList .plan-card-num").forEach((el, i) => { el.textContent = i + 1; });
}

function _readState() {
  planPool  = Array.from(document.querySelectorAll("#planPool [data-id]")).map(el => el.dataset.id);
  planOrder = Array.from(document.querySelectorAll("#planList .plan-card[data-id]")).map(el => el.dataset.id);
}

function _initPoolSortable() {
  if (!window.Sortable) return;
  const poolEl = document.getElementById("planPool");
  if (!poolEl) return;
  _poolSortable = Sortable.create(poolEl, {
    group:     { name: "places", pull: true, put: ["places"] },
    animation: 150,
    handle:    ".plan-drag-handle",
    draggable: "[data-id]",
    onAdd: (evt) => {
      const card = evt.item;
      const id   = card.dataset.id;
      const p    = getPlace(id);
      if (!p) return;
      card.className = "plan-card pool-card";
      card.innerHTML  = _poolCardInner(p);
      _attachPoolEvents(card, id);
      _readState();
      _renumberList();
      _rebuildLegs();
      renderPlanMarkers(); updatePlanSummary();
    },
    onUpdate: () => { _readState(); },
  });
}

function _initListSortable() {
  if (!window.Sortable) return;
  const listEl = document.getElementById("planList");
  if (!listEl) return;
  _listSortable = Sortable.create(listEl, {
    group:     { name: "places", pull: true, put: ["places"] },
    animation: 150,
    handle:    ".plan-drag-handle",
    draggable: ".plan-card[data-id]",
    onAdd: (evt) => {
      const card = evt.item;
      const id   = card.dataset.id;
      const p    = getPlace(id);
      if (!p) return;
      card.className = "plan-card";
      card.innerHTML  = _listCardInner(p, 0);
      _attachListEvents(card, id);
      document.querySelectorAll("#planList .plan-empty-hint").forEach(el => el.remove());
      _readState();
      _renumberList();
      _rebuildLegs();
      renderPlanMarkers(); updatePlanSummary();
    },
    onUpdate: () => {
      _readState(); _renumberList(); _rebuildLegs(); renderPlanMarkers(); updatePlanSummary();
    },
  });
}

// ── Transport pool (left column) ──
function _rebuildTransportPool() {
  if (_transportPoolSortable) { _transportPoolSortable.destroy(); _transportPoolSortable = null; }
  const poolEl = document.getElementById("planTransportPool");
  if (!poolEl) return;

  const items = typeof transportItems !== "undefined" ? transportItems : [];
  if (!items.length) {
    poolEl.innerHTML = `<div class="plan-transport-pool-empty">尚無票券</div>`;
    return;
  }

  poolEl.innerHTML = "";
  items.forEach(t => {
    const card = document.createElement("div");
    card.className = "plan-card plan-transport-pool-card";
    card.dataset.transportId = t.id;
    card.innerHTML = `
      <div class="plan-card-info">
        <div class="plan-card-name">${transportIcon(t.method)} ${esc(t.method)}</div>
        ${t.route ? `<span class="transport-tag" style="margin-top:2px;display:inline-block;">${esc(t.route)}</span>` : ""}
      </div>
      <div class="plan-drag-handle">⠿</div>`;
    poolEl.appendChild(card);
  });

  if (window.Sortable) {
    _transportPoolSortable = Sortable.create(poolEl, {
      group:     { name: "transport", pull: "clone", put: false },
      animation: 150,
      handle:    ".plan-drag-handle",
      draggable: "[data-transport-id]",
    });
  }
}

// ── Leg connectors between place cards ──
function _createLegEl(key, fromId, toId) {
  const legEl = document.createElement("div");
  legEl.className = "plan-leg";
  legEl.dataset.from = fromId;
  legEl.dataset.to   = toId;

  const assignedId  = planLegs[key];
  const allTransport = typeof transportItems !== "undefined" ? transportItems : [];
  const transport    = assignedId ? allTransport.find(t => t.id === assignedId) : null;

  if (transport) {
    legEl.innerHTML = `
      <div class="plan-leg-assigned">
        <span class="plan-leg-transport">${transportIcon(transport.method)} ${esc(transport.method)}</span>
        <button class="plan-leg-clear" title="清除（步行）">✕</button>
      </div>`;
    legEl.querySelector(".plan-leg-clear").addEventListener("click", () => {
      delete planLegs[key];
      _rebuildLegs();
    });
  } else {
    const dropEl = document.createElement("div");
    dropEl.className = "plan-leg-drop";
    dropEl.innerHTML = `<span class="plan-leg-walk">🚶</span>`;
    legEl.appendChild(dropEl);

    if (window.Sortable) {
      const s = Sortable.create(dropEl, {
        group:     { name: "transport", pull: false, put: true },
        animation: 150,
        draggable: "[data-transport-id]",
        onAdd: (evt) => {
          const tId = evt.item.dataset.transportId;
          evt.item.remove();
          planLegs[key] = tId;
          _rebuildLegs();
        },
      });
      _legSortables.push(s);
    }
  }

  return legEl;
}

function _rebuildLegs() {
  _legSortables.forEach(s => { try { s.destroy(); } catch(e) {} });
  _legSortables = [];

  document.querySelectorAll("#planList .plan-leg").forEach(el => el.remove());

  const cards = Array.from(document.querySelectorAll("#planList .plan-card[data-id]"));
  if (cards.length < 2) return;

  cards.forEach((card, i) => {
    if (i >= cards.length - 1) return;
    const fromId = card.dataset.id;
    const toId   = cards[i + 1].dataset.id;
    const key    = `${fromId}__${toId}`;
    card.after(_createLegEl(key, fromId, toId));
  });
}

// ── Plan transport section ──
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

// ── Plan map ──
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

function renderPlanMarkers() {
  planMarkers.forEach(m => m.setMap(null));
  planMarkers = [];
  if (planPolyline) { planPolyline.setMap(null); planPolyline = null; }
  if (!planMap) return;

  const places = planOrder.map(id => getPlace(id)).filter(Boolean);
  places.forEach((p, i) => {
    planMarkers.push(new google.maps.Marker({
      map: planMap,
      position: { lat: p.lat, lng: p.lng },
      title: p.name,
      icon: markerSvg(i + 1),
    }));
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
