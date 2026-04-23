// ─────────────────────────────────────────────
// 討論頁
// ─────────────────────────────────────────────
let discussContext = null;

function renderDiscussView() {
  if (state.finalized) {
    _renderFinalizedView();
  } else {
    _renderEditableView();
  }
  _renderMessages();

  const authorDisplay = document.getElementById("dAuthorDisplay");
  if (authorDisplay) authorDisplay.textContent = localStorage.getItem(AUTHOR_KEY) || "";
}

// ── 定案模式：完整資訊卡 ──────────────────────
function _renderFinalizedView() {
  const { item } = discussContext;
  const isTransport = item.method !== undefined;

  // 隱藏舊版 header 資訊列
  document.getElementById("discussInfo").innerHTML = "";
  document.getElementById("discussInfoDetail").classList.add("hidden");

  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  let heroIcon, heroTitle, heroSub, rows = [];

  if (isTransport) {
    heroIcon  = transportIcon(item.method);
    heroTitle = esc(item.method);
    heroSub   = item.route ? esc(item.route) : "";
    if (item.where)     rows.push(_row("購買處", esc(item.where)));
    if (item.price > 0) rows.push(_row("金額",   `<span class="detail-price">NT$${item.price.toLocaleString()}</span>`));
    rows.push(_row("狀態", item.purchased
      ? `<span class="dic-purchased">✅ 已購買</span>`
      : `<span class="dic-unpurchased">🛒 未購買</span>`));
  } else {
    heroIcon  = "📍";
    heroTitle = esc(item.name);
    heroSub   = item.address ? esc(item.address) : "";
    if (item.budget > 0) rows.push(_row("預算", `<span class="detail-price">NT$${item.budget.toLocaleString()}</span>`));
    if (item.openHours?.length) {
      const hoursHtml = item.openHours.map((h, i) =>
        `<div class="detail-hour-row${i === todayIdx ? " today" : ""}">${esc(h)}</div>`
      ).join("");
      rows.push(_row("營業時間", `<div class="detail-hours">${hoursHtml}</div>`, true));
    }
    if (item.note) rows.push(_row("備註", esc(item.note)));
  }

  const cardEl = document.getElementById("detailCard");
  cardEl.innerHTML = `
    <div class="detail-card-hero">
      <div class="detail-card-icon">${heroIcon}</div>
      <div class="detail-card-title">${heroTitle}</div>
      ${heroSub ? `<div class="detail-card-sub">${heroSub}</div>` : ""}
    </div>
    ${rows.length ? `<div class="detail-card-body">${rows.join("")}</div>` : ""}`;
  cardEl.classList.remove("hidden");

  // 討論 section head（件數在 _renderMessages 中更新）
  document.getElementById("discussSectionHead").classList.remove("hidden");
}

function _row(label, value, full = false) {
  return `<div class="detail-row${full ? " detail-row--full" : ""}">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${value}</span>
  </div>`;
}

// ── 編輯模式：舊版折疊式 header ──────────────
function _renderEditableView() {
  const { item } = discussContext;
  const isTransport = item.method !== undefined;

  document.getElementById("detailCard").classList.add("hidden");
  document.getElementById("discussSectionHead").classList.add("hidden");

  const infoEl    = document.getElementById("discussInfo");
  const detailEl  = document.getElementById("discussInfoDetail");
  const wasExpanded = infoEl.dataset.expanded === "1";

  let fields = [];
  let icon   = "📍";
  let title  = item.name;

  if (isTransport) {
    icon  = transportIcon(item.method);
    title = [item.method, item.route].filter(Boolean).join("　");
    if (item.where)     fields.push(`<div class="dic-detail-field"><span class="dic-label">購買處</span><span class="dic-val">${esc(item.where)}</span></div>`);
    if (item.price > 0) fields.push(`<div class="dic-detail-field"><span class="dic-label">金額</span><span class="dic-val dic-price">NT$${item.price.toLocaleString()}</span></div>`);
    fields.push(`<div class="dic-detail-field"><span class="dic-label">狀態</span><span class="dic-val ${item.purchased ? "dic-purchased" : "dic-unpurchased"}">${item.purchased ? "✅ 已購買" : "🛒 未購買"}</span></div>`);
  } else {
    if (item.note)        fields.push(`<div class="dic-detail-field"><span class="dic-label">備註</span><span class="dic-val">${esc(item.note)}</span></div>`);
    if (item.budget > 0)  fields.push(`<div class="dic-detail-field"><span class="dic-label">預算</span><span class="dic-val dic-price">NT$${item.budget.toLocaleString()}</span></div>`);
    if (item.openHours?.length) {
      const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
      const rows = item.openHours.map((h, i) =>
        `<div class="dic-hours-row${i === todayIdx ? " today" : ""}">${esc(h)}</div>`
      ).join("");
      fields.push(`<div class="dic-detail-field dic-detail-full"><span class="dic-label">營業時間</span><div class="dic-val dic-hours-list">${rows}</div></div>`);
    }
  }

  const hasFields = fields.length > 0;

  infoEl.innerHTML = `
    <span class="dic-sep"></span>
    <span class="dic-icon">${icon}</span>
    <span class="dic-name">${esc(title)}</span>
    ${hasFields ? `<button class="dic-toggle-btn" id="dicToggle">${wasExpanded ? "▸" : "▾"}</button>` : ""}
    <span class="dic-spacer"></span>
    ${isTransport ? `<button class="final-toggle-btn${item.isFinal ? " is-final" : ""}" id="finalToggleBtn">${item.isFinal ? "✓ 定案" : "標記定案"}</button>` : ""}
    <button class="edit-info-btn" id="editDiscussItemBtn">✏ 編輯</button>`;

  if (hasFields) {
    detailEl.innerHTML = fields.join("");
    detailEl.classList.toggle("hidden", !wasExpanded);
  } else {
    detailEl.innerHTML = "";
    detailEl.classList.add("hidden");
  }

  const toggleBtn = document.getElementById("dicToggle");
  if (toggleBtn && hasFields) {
    toggleBtn.addEventListener("click", () => {
      const expanded = detailEl.classList.toggle("hidden") === false;
      toggleBtn.textContent = expanded ? "▸" : "▾";
      infoEl.dataset.expanded = expanded ? "1" : "0";
    });
  }

  const finalBtn = document.getElementById("finalToggleBtn");
  if (finalBtn) {
    finalBtn.onclick = () => {
      item.isFinal = !item.isFinal;
      discussContext.saveFunc();
      renderDiscussView();
    };
  }

  const editBtn = document.getElementById("editDiscussItemBtn");
  if (editBtn) {
    editBtn.onclick = () => {
      if (isTransport) openEditTransportDialog(item.id);
      else             openEditDialog(item.id);
    };
  }
}

// ── 留言列表 ──────────────────────────────────
function _renderMessages() {
  const { item } = discussContext;
  const finalized = state.finalized;
  const msgsEl = document.getElementById("discussMsgs");

  // 更新 section head 件數
  const discussions = [...(item.discussions || [])]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const headEl = document.getElementById("discussSectionHead");
  if (headEl && finalized) {
    headEl.textContent = `💬 ${discussions.length} 則討論`;
  }

  // Rebuild msgs container to reset event listeners
  const newMsgs = msgsEl.cloneNode(false);
  msgsEl.parentNode.replaceChild(newMsgs, msgsEl);

  if (!discussions.length) {
    newMsgs.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✍</div>
        <p>尚無討論<br>歡迎發表第一則留言</p>
      </div>`;
  } else {
    discussions.forEach(d => {
      const el = document.createElement("div");
      el.className = "d-item";
      el.innerHTML = `
        <div class="d-item-header">
          <span class="d-author">${esc(d.author)}</span>
          <span class="d-time">${fmtTime(d.createdAt)}</span>
          ${!finalized ? `<button class="d-del" data-id="${d.id}" title="刪除">✕</button>` : ""}
        </div>
        <p class="d-text">${esc(d.text || "")}</p>`;
      newMsgs.appendChild(el);
    });
    newMsgs.scrollTop = newMsgs.scrollHeight;
  }

  if (!finalized) {
    newMsgs.addEventListener("click", e => {
      const btn = e.target.closest(".d-del");
      if (!btn) return;
      const ctx = discussContext;
      if (!ctx) return;
      ctx.item.discussions = (ctx.item.discussions || []).filter(x => x.id !== btn.dataset.id);
      ctx.saveFunc();
      renderDiscussView();
    });
  }
}

// ─ 事件綁定 ─
document.getElementById("discussForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!discussContext) return;
  const author = localStorage.getItem(AUTHOR_KEY) || "";
  const text   = document.getElementById("dText").value.trim();
  if (!author || !text) return;
  if (!discussContext.item.discussions) discussContext.item.discussions = [];
  discussContext.item.discussions.push({
    id: crypto.randomUUID(), author, text, createdAt: new Date().toISOString(),
  });
  discussContext.saveFunc();
  document.getElementById("dText").value = "";
  renderDiscussView();
});

document.getElementById("backBtn").addEventListener("click", () => {
  discussContext?.backFn?.() ?? (location.hash = "#/trip");
});
