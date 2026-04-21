// ─────────────────────────────────────────────
// 路由（hash-based SPA）
// ─────────────────────────────────────────────
const ALL_VIEWS = [mainViewEl, discussViewEl, planViewEl];

function showOnly(el) {
  ALL_VIEWS.forEach(v => v.classList.add("hidden"));
  el.classList.remove("hidden");
}

function openDiscussPage(id)          { location.hash = `#/discuss/${id}`; }
function openTransportDiscussPage(id) { location.hash = `#/t-discuss/${id}`; }

function route() {
  const hash = location.hash;

  // 行程規劃
  if (hash === "#/plan") {
    showOnly(planViewEl);
    renderPlanPage();
    return;
  }

  // 地點討論
  const discussMatch = hash.match(/^#\/discuss\/(.+)$/);
  if (discussMatch) {
    const place = getPlace(discussMatch[1]);
    if (!place) { location.hash = "#/"; return; }
    showOnly(discussViewEl);
    discussContext = {
      item:     place,
      saveFunc: () => { saveState(); renderLocationsList(); },
      backFn:   () => { location.hash = "#/"; },
    };
    renderDiscussView();
    return;
  }

  // 交通討論
  const tDiscussMatch = hash.match(/^#\/t-discuss\/(.+)$/);
  if (tDiscussMatch) {
    const tItem = transportItems.find(t => t.id === tDiscussMatch[1]);
    if (!tItem) { location.hash = "#/"; return; }
    showOnly(discussViewEl);
    discussContext = {
      item:     tItem,
      saveFunc: () => { saveTransport(); renderTransportList(); },
      backFn:   () => { location.hash = "#/"; },
    };
    renderDiscussView();
    return;
  }

  // 主頁
  showOnly(mainViewEl);
}

window.addEventListener("hashchange", route);
