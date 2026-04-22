// ─────────────────────────────────────────────
// 行程規劃頁
// ─────────────────────────────────────────────
let planOrder    = [];
let planPool     = [];
let planMap      = null;
let planMarkers  = [];
let planPolyline = null;
let dragSrcIdx   = null;
let dragSrcZone  = null; // 'active' | 'pool'

function renderPlanPage() {
  planPool  = state.places.map(p => p.id);
  planOrder = [];
  updatePlanSummary();
  renderPoolCards();
  renderPlanCards();
  renderPlanTransport();
  initPlanMap();
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

function renderPlanCards() {
  const listEl = document.getElementById("planList");
  listEl.innerHTML = "";

  if (!planOrder.length) {
    listEl.innerHTML = `<div style="display:flex;align-items:center;color:var(--muted);font-size:.8rem;padding:0 4px;white-space:nowrap;">← 從左側拖入地點</div>`;
    makeZoneDroppable(listEl, "active");
    return;
  }

  planOrder.forEach((id, i) => {
    const p = getPlace(id);
    if (!p) return;
    const card = document.createElement("div");
    card.className = "plan-card";
    card.draggable = true;
    card.dataset.idx = i;
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
      planOrder.splice(i, 1);
      planPool.push(id);
      renderPoolCards(); renderPlanCards(); renderPlanMarkers(); updatePlanSummary();
    });
    makeDraggable(card, i, "active");
    listEl.appendChild(card);
  });

  makeZoneDroppable(listEl, "active");
}

function renderPoolCards() {
  const poolEl = document.getElementById("planPool");
  poolEl.innerHTML = "";

  if (!planPool.length) {
    poolEl.innerHTML = `<div class="empty-state" style="flex:1;"><div class="empty-icon">✅</div><p>所有地點已加入行程</p></div>`;
    makeZoneDroppable(poolEl, "pool");
    return;
  }

  planPool.forEach((id, i) => {
    const p = getPlace(id);
    if (!p) return;
    const card = document.createElement("div");
    card.className = "plan-card pool-card";
    card.draggable = true;
    card.dataset.idx = i;
    card.innerHTML = `
      <div class="plan-card-info">
        <div class="plan-card-name">${esc(p.name)}</div>
        ${p.note   ? `<div class="plan-card-note">${esc(p.note)}</div>` : ""}
        ${p.budget > 0 ? `<div class="plan-card-budget">NT$${p.budget.toLocaleString()}</div>` : ""}
      </div>
      <button class="plan-tap-add" title="加入行程">＋</button>
      <div class="plan-drag-handle">⠿</div>`;
    card.querySelector(".plan-tap-add").addEventListener("click", () => {
      planPool.splice(i, 1);
      planOrder.push(id);
      renderPoolCards(); renderPlanCards(); renderPlanMarkers(); updatePlanSummary();
    });
    makeDraggable(card, i, "pool");
    poolEl.appendChild(card);
  });

  makeZoneDroppable(poolEl, "pool");
}

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

function makeDraggable(card, idx, zone) {
  card.addEventListener("dragstart", e => {
    dragSrcIdx  = idx;
    dragSrcZone = zone;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => card.classList.add("dragging"), 0);
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("drag-over"));
    document.getElementById("planList").classList.remove("zone-drag-over");
    document.getElementById("planPool").classList.remove("zone-drag-over");
  });
  card.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("drag-over"));
    card.classList.add("drag-over");
  });
  card.addEventListener("dragleave", e => {
    if (!card.contains(e.relatedTarget)) card.classList.remove("drag-over");
  });
  card.addEventListener("drop", e => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove("drag-over");
    if (dragSrcZone === null) return;
    handleDrop(zone, idx);
  });
}

function makeZoneDroppable(el, zone) {
  el.addEventListener("dragover", e => {
    e.preventDefault();
    el.classList.add("zone-drag-over");
  });
  el.addEventListener("dragleave", e => {
    if (!el.contains(e.relatedTarget)) el.classList.remove("zone-drag-over");
  });
  el.addEventListener("drop", e => {
    e.preventDefault();
    el.classList.remove("zone-drag-over");
    if (dragSrcZone === null) return;
    handleDrop(zone, (zone === "active" ? planOrder : planPool).length);
  });
}

function handleDrop(targetZone, targetIdx) {
  const srcArr  = dragSrcZone === "active" ? planOrder : planPool;
  const destArr = targetZone  === "active" ? planOrder : planPool;

  if (dragSrcZone === targetZone && dragSrcIdx === targetIdx) {
    dragSrcIdx = dragSrcZone = null;
    return;
  }

  const [moved] = srcArr.splice(dragSrcIdx, 1);
  const insertAt = (dragSrcZone === targetZone && dragSrcIdx < targetIdx)
    ? Math.min(targetIdx - 1, destArr.length)
    : Math.min(targetIdx, destArr.length);
  destArr.splice(insertAt, 0, moved);

  dragSrcIdx  = null;
  dragSrcZone = null;

  renderPoolCards();
  renderPlanCards();
  renderPlanMarkers();
  updatePlanSummary();
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
  const ordered  = planOrder.map(id => getPlace(id)).filter(Boolean);
  const poolRest = planPool.map(id => getPlace(id)).filter(Boolean);
  state.places   = [...ordered, ...poolRest];
  saveState();
  if (confirm("✅ 順序已儲存。是否返回主頁？")) location.hash = "#/trip";
});
