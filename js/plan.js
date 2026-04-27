// ─────────────────────────────────────────────
// 行程規劃頁
// ─────────────────────────────────────────────
let planOrder    = [];
let planPool     = [];
let planLegs     = {};     // key: "fromId__toId", value: tripLeg ID
let planLegTimes = {};     // key: "fromId__toId", value: time string
let planTickets  = {};     // key: locationId, value: transportItem ID

let planMap   = null;
let planMarkers  = [];
let planPolyline = null;
let _poolSortable          = null;
let _listSortable          = null;
let _legSortables          = [];
let _transportPoolSortable = null;
let _ticketPoolSortable    = null;
let _ticketZoneSortables   = [];

function renderPlanPage() {
  planPool     = state.places.map(p => p.id);
  planOrder    = [];
  planLegs     = {};
  planLegTimes = {};
  planTickets  = {};
  renderPoolCards();
  renderPlanCards();
  _rebuildTransportPool();
  _rebuildTicketPool();
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
    <button class="plan-tap-add" title="加入行程">＋</button>`;
}

function _listCardInner(p, num) {
  return `
    <div class="plan-card-row">
      <div class="plan-card-num">${num}</div>
      <div class="plan-card-info">
        <div class="plan-card-name">${esc(p.name)}</div>
        ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
        ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
      </div>
      <button class="plan-tap-remove" title="移除">✕</button>
    </div>
    <div class="plan-ticket-zone plan-ticket-empty" data-loc-id="${p.id}">
      <span class="plan-ticket-hint">🎫</span>
    </div>`;
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
  _rebuildTicketZones();
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
    filter:    "button",
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
      _rebuildTicketZones();
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
    filter:    "button",
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
      _rebuildTicketZones();
      renderPlanMarkers(); updatePlanSummary();
    },
    onUpdate: () => {
      _readState(); _renumberList(); _rebuildLegs(); _rebuildTicketZones(); renderPlanMarkers(); updatePlanSummary();
    },
  });
}

// ── Transport pool (left column) — uses tripLegs ──
function _rebuildTransportPool() {
  if (_transportPoolSortable) { _transportPoolSortable.destroy(); _transportPoolSortable = null; }
  const poolEl = document.getElementById("planTransportPool");
  if (!poolEl) return;

  const legs = typeof tripLegs !== "undefined" ? tripLegs : [];
  // Filter out 步行 — no card needed, just leave leg empty
  const draggable = legs.filter(t => !t.mode.includes("步行"));

  if (!draggable.length) {
    poolEl.innerHTML = `<div class="plan-transport-pool-empty">在旅程 → 交通新增後會顯示於此</div>`;
    return;
  }

  poolEl.innerHTML = "";
  draggable.forEach(leg => {
    const card = document.createElement("div");
    card.className = "plan-card plan-transport-pool-card";
    card.dataset.tripLegId = leg.id;
    card.innerHTML = `
      <div class="plan-card-info">
        <div class="plan-card-name">${esc(leg.mode)}</div>
      </div>`;
    poolEl.appendChild(card);
  });

  if (window.Sortable) {
    _transportPoolSortable = Sortable.create(poolEl, {
      group:     { name: "transport", pull: "clone", put: false },
      animation: 150,
      filter:    "button",
      draggable: "[data-trip-leg-id]",
    });
  }
}

// ── Ticket pool (left column) ──
function _rebuildTicketPool() {
  if (_ticketPoolSortable) { _ticketPoolSortable.destroy(); _ticketPoolSortable = null; }
  const poolEl = document.getElementById("planTicketPool");
  if (!poolEl) return;

  const tickets = typeof transportItems !== "undefined" ? transportItems : [];
  if (!tickets.length) {
    poolEl.innerHTML = `<div class="plan-transport-pool-empty">在票券 tab 新增後會顯示於此</div>`;
    return;
  }

  poolEl.innerHTML = "";
  tickets.forEach(t => {
    const card = document.createElement("div");
    card.className = "plan-card plan-transport-pool-card";
    card.dataset.ticketId = t.id;
    card.innerHTML = `
      <div class="plan-card-info">
        <div class="plan-card-name">🎫 ${esc(t.method)}</div>
        ${t.route ? `<span class="transport-tag" style="margin-top:2px;display:inline-block;">${esc(t.route)}</span>` : ""}
      </div>`;
    poolEl.appendChild(card);
  });

  if (window.Sortable) {
    _ticketPoolSortable = Sortable.create(poolEl, {
      group:     { name: "tickets", pull: "clone", put: false },
      animation: 150,
      filter:    "button",
      draggable: "[data-ticket-id]",
    });
  }
}

// ── Ticket zones inside location cards ──
function _rebuildTicketZones() {
  _ticketZoneSortables.forEach(s => { try { s.destroy(); } catch(e) {} });
  _ticketZoneSortables = [];

  document.querySelectorAll("#planList .plan-ticket-zone").forEach(zoneEl => {
    const locId    = zoneEl.dataset.locId;
    const ticketId = planTickets[locId];
    const all      = typeof transportItems !== "undefined" ? transportItems : [];
    const ticket   = ticketId ? all.find(t => t.id === ticketId) : null;

    if (ticket) {
      zoneEl.classList.remove("plan-ticket-empty");
      zoneEl.innerHTML = `
        <div class="plan-ticket-assigned">
          <span>🎫 ${esc(ticket.method)}</span>
          <button class="plan-ticket-clear">✕</button>
        </div>`;
      zoneEl.querySelector(".plan-ticket-clear").addEventListener("click", e => {
        e.stopPropagation();
        delete planTickets[locId];
        _rebuildTicketZones();
      });
    } else {
      zoneEl.classList.add("plan-ticket-empty");
      zoneEl.innerHTML = `<span class="plan-ticket-hint">🎫</span>`;

      if (window.Sortable) {
        const s = Sortable.create(zoneEl, {
          group:     { name: "tickets", pull: false, put: true },
          animation: 150,
          draggable: "[data-ticket-id]",
          onAdd: (evt) => {
            evt.item.remove();
            planTickets[locId] = evt.item.dataset.ticketId;
            _rebuildTicketZones();
          },
        });
        _ticketZoneSortables.push(s);
      }
    }
  });
}

// ── Leg connectors between place cards ──
function _createLegEl(key, fromId, toId) {
  const legEl = document.createElement("div");
  legEl.className = "plan-leg";
  legEl.dataset.from = fromId;
  legEl.dataset.to   = toId;

  const legId = planLegs[key];
  const allLegs = typeof tripLegs !== "undefined" ? tripLegs : [];
  const leg = legId ? allLegs.find(t => t.id === legId) : null;

  if (leg) {
    legEl.innerHTML = `
      <div class="plan-leg-assigned">
        <div class="plan-leg-top">
          <span class="plan-leg-transport">${esc(leg.mode)}</span>
          <button class="plan-leg-clear" title="清除">✕</button>
        </div>
        <input type="text" class="plan-leg-time-input" placeholder="時間（如 09:30）" value="${esc(planLegTimes[key] || '')}">
      </div>`;
    legEl.querySelector(".plan-leg-clear").addEventListener("click", () => {
      delete planLegs[key];
      delete planLegTimes[key];
      _rebuildLegs();
    });
    legEl.querySelector(".plan-leg-time-input").addEventListener("input", e => {
      planLegTimes[key] = e.target.value.trim();
    });
  } else {
    const dropEl = document.createElement("div");
    dropEl.className = "plan-leg-drop";
    dropEl.innerHTML = `
      <span class="plan-leg-walk">🚶</span>
      <input type="text" class="plan-leg-time-input plan-leg-time-walk" placeholder="時間（如 09:30）" value="${esc(planLegTimes[key] || '')}">`;
    legEl.appendChild(dropEl);

    dropEl.querySelector(".plan-leg-time-walk").addEventListener("input", e => {
      planLegTimes[key] = e.target.value.trim();
    });

    if (window.Sortable) {
      const s = Sortable.create(dropEl, {
        group:     { name: "transport", pull: false, put: true },
        animation: 150,
        draggable: "[data-transport-id]",
        onAdd: (evt) => {
          const tripLegId = evt.item.dataset.tripLegId;
          evt.item.remove();
          planLegs[key] = tripLegId;
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
