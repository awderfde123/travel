// ─────────────────────────────────────────────
// 討論頁
// ─────────────────────────────────────────────
let discussContext = null;

function renderDiscussView() {
  const { item } = discussContext;
  const isTransport = item.method !== undefined;

  // ── 資訊卡（地點 / 交通統一呈現）──
  const infoEl = document.getElementById("discussInfo");

  // 保留收合狀態（預設收合）
  const detailEl   = document.getElementById("discussInfoDetail");
  const wasExpanded = infoEl.dataset.expanded === "1";

  // 產生欄位 HTML（放到下方區塊）
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
      const rows = item.openHours.map(h => `<div class="dic-hours-row">${esc(h)}</div>`).join("");
      fields.push(`<div class="dic-detail-field dic-detail-full"><span class="dic-label">營業時間</span><div class="dic-val dic-hours-list">${rows}</div></div>`);
    }
  }

  const hasFields = fields.length > 0;

  // Header 行：只顯示 icon + 名稱 + 收合按鈕 + 編輯
  infoEl.innerHTML = `
    <span class="dic-sep"></span>
    <span class="dic-icon">${icon}</span>
    <span class="dic-name">${esc(title)}</span>
    ${hasFields ? `<button class="dic-toggle-btn" id="dicToggle">${wasExpanded ? "▸" : "▾"}</button>` : ""}
    <span class="dic-spacer"></span>
    ${isTransport && !state.finalized ? `<button class="final-toggle-btn${item.isFinal ? " is-final" : ""}" id="finalToggleBtn">${item.isFinal ? "✓ 定案" : "標記定案"}</button>` : ""}
    ${!state.finalized ? `<button class="edit-info-btn" id="editDiscussItemBtn">✏ 編輯</button>` : ""}`;

  // 下方詳細區塊
  if (hasFields) {
    detailEl.innerHTML = fields.join("");
    detailEl.classList.toggle("hidden", !wasExpanded);
  } else {
    detailEl.innerHTML = "";
    detailEl.classList.add("hidden");
  }

  // 收合切換
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

  // ── 留言列表 ──
  const msgsEl = document.getElementById("discussMsgs");
  msgsEl.innerHTML = "";

  const discussions = [...(item.discussions || [])]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // 清除舊的 delegation listener 再綁新的
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
          <button class="d-del" data-id="${d.id}" title="刪除">✕</button>
        </div>
        <p class="d-text">${esc(d.text || "")}</p>`;
      newMsgs.appendChild(el);
    });
    newMsgs.scrollTop = newMsgs.scrollHeight;
  }

  // event delegation：一個 listener 處理所有刪除
  newMsgs.addEventListener("click", e => {
    const btn = e.target.closest(".d-del");
    if (!btn) return;
    const did = btn.dataset.id;
    const ctx = discussContext;
    if (!ctx) return;
    ctx.item.discussions = (ctx.item.discussions || []).filter(x => x.id !== did);
    ctx.saveFunc();
    renderDiscussView();
  });

  const authorDisplay = document.getElementById("dAuthorDisplay");
  if (authorDisplay) authorDisplay.textContent = localStorage.getItem(AUTHOR_KEY) || "";
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
