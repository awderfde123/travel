// ─────────────────────────────────────────────
// 討論頁
// ─────────────────────────────────────────────
let discussContext = null;

function renderDiscussView() {
  const { item } = discussContext;
  const isTransport = item.method !== undefined;

  // ── 資訊卡（地點 / 交通統一呈現）──
  const infoEl = document.getElementById("discussInfo");

  // 保留收合狀態
  const wasCollapsed = infoEl.dataset.collapsed === "1";

  if (isTransport) {
    const title  = [item.method, item.route].filter(Boolean).join("　");
    const fields = [];
    if (item.where)     fields.push(`<span class="dic-inline-field"><span class="dic-label">購買處</span> ${esc(item.where)}</span>`);
    if (item.price > 0) fields.push(`<span class="dic-inline-field dic-price">NT$${item.price.toLocaleString()}</span>`);
    fields.push(`<span class="dic-inline-field ${item.purchased ? "dic-purchased" : "dic-unpurchased"}">${item.purchased ? "✅ 已購買" : "🛒 未購買"}</span>`);
    infoEl.innerHTML = `
      <span class="dic-sep"></span>
      <span class="dic-icon">${transportIcon(item.method)}</span>
      <span class="dic-name">${esc(title)}</span>
      ${fields.length ? `<span class="dic-fields-inline" id="dicFields">${fields.join("")}</span>` : ""}
      ${fields.length ? `<button class="dic-toggle-btn" id="dicToggle">${wasCollapsed ? "▸" : "▾"}</button>` : ""}
      <span class="dic-spacer"></span>
      <button class="edit-info-btn" id="editDiscussItemBtn">✏ 編輯</button>`;
  } else {
    const fields = [];
    if (item.note)       fields.push(`<span class="dic-inline-field"><span class="dic-label">備註</span> ${esc(item.note)}</span>`);
    if (item.budget > 0) fields.push(`<span class="dic-inline-field dic-price">預算 NT$${item.budget.toLocaleString()}</span>`);
    infoEl.innerHTML = `
      <span class="dic-sep"></span>
      <span class="dic-icon">📍</span>
      <span class="dic-name">${esc(item.name)}</span>
      ${fields.length ? `<span class="dic-fields-inline" id="dicFields">${fields.join("")}</span>` : ""}
      ${fields.length ? `<button class="dic-toggle-btn" id="dicToggle">${wasCollapsed ? "▸" : "▾"}</button>` : ""}
      <span class="dic-spacer"></span>
      <button class="edit-info-btn" id="editDiscussItemBtn">✏ 編輯</button>`;
  }

  // 套用收合狀態
  const fieldsEl = document.getElementById("dicFields");
  if (fieldsEl && wasCollapsed) fieldsEl.classList.add("collapsed");

  // 收合切換
  const toggleBtn = document.getElementById("dicToggle");
  if (toggleBtn && fieldsEl) {
    toggleBtn.addEventListener("click", () => {
      const collapsed = fieldsEl.classList.toggle("collapsed");
      toggleBtn.textContent = collapsed ? "▸" : "▾";
      infoEl.dataset.collapsed = collapsed ? "1" : "0";
    });
  }

  document.getElementById("editDiscussItemBtn").onclick = () => {
    if (isTransport) openEditTransportDialog(item.id);
    else             openEditDialog(item.id);
  };

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

  const authorInput = document.getElementById("dAuthor");
  if (authorInput && !authorInput.value) {
    authorInput.value = localStorage.getItem(AUTHOR_KEY) || "";
  }
}

// ─ 事件綁定 ─
document.getElementById("discussForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!discussContext) return;
  const author = document.getElementById("dAuthor").value.trim();
  const text   = document.getElementById("dText").value.trim();
  if (!author || !text) return;
  localStorage.setItem(AUTHOR_KEY, author);
  if (!discussContext.item.discussions) discussContext.item.discussions = [];
  discussContext.item.discussions.push({
    id: crypto.randomUUID(), author, text, createdAt: new Date().toISOString(),
  });
  discussContext.saveFunc();
  document.getElementById("dText").value = "";
  renderDiscussView();
});

document.getElementById("backBtn").addEventListener("click", () => {
  discussContext?.backFn?.() ?? (location.hash = "#/");
});
