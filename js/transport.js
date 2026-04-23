// ─────────────────────────────────────────────
// 交通備忘
// ─────────────────────────────────────────────
let transportItems     = [];
let editingTransportId = null;

function loadTransport() {
  transportItems = JSON.parse(localStorage.getItem(TRANSPORT_KEY) || "[]");
  transportItems.forEach(t => {
    if (!t.discussions) t.discussions = [];
    if (t.price === undefined) t.price = 0;
    if (t.isFinal === undefined) t.isFinal = false;
  });
}

function saveTransport(sync = true) {
  localStorage.setItem(TRANSPORT_KEY, JSON.stringify(transportItems));
  if (sync) cloudSave();
}

function transportIcon(method) {
  const m = (method || "").toLowerCase();
  if (m.includes("高鐵") || m.includes("火車") || m.includes("台鐵")) return "🚆";
  if (m.includes("飛機") || m.includes("航班"))                        return "✈";
  if (m.includes("捷運") || m.includes("地鐵") || m.includes("mrt"))   return "🚇";
  if (m.includes("船")   || m.includes("渡輪") || m.includes("ferry")) return "⛴";
  if (m.includes("自駕") || m.includes("開車") || m.includes("租車"))  return "🚗";
  if (m.includes("計程") || m.includes("taxi") || m.includes("uber"))  return "🚕";
  if (m.includes("機車") || m.includes("摩托"))                        return "🛵";
  if (m.includes("腳踏") || m.includes("單車") || m.includes("bike"))  return "🚲";
  return "🚌";
}

function renderTransportList() {
  const listEl = document.getElementById("transportList");
  listEl.innerHTML = "";

  // 更新 header 已購買 / 未購買數量
  const bought   = transportItems.filter(t => t.purchased).length;
  const unbought = transportItems.filter(t => !t.purchased).length;
  const badge    = document.getElementById("transportBadge");
  if (badge) {
    badge.textContent = transportItems.length
      ? `✅ ${bought} / 🛒 ${unbought}`
      : "";
  }

  if (!transportItems.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚌</div>
        <p>尚無交通資訊<br>點擊「＋ 新增」</p>
      </div>`;
    return;
  }

  const finalized = state.finalized;
  transportItems.forEach(item => {
    const el = document.createElement("div");
    el.className = "loc-item";
    const count = item.discussions?.length ?? 0;
    el.innerHTML = `
      <div class="loc-info">
        <div class="loc-name">
          ${esc(item.method)}
          ${item.isFinal ? '<span class="transport-final-badge">定案</span>' : ""}
        </div>
        <div class="transport-tags">
          ${item.route ? `<span class="transport-tag">${esc(item.route)}</span>` : ""}
          ${item.where ? `<span class="transport-tag">${esc(item.where)}</span>` : ""}
        </div>
        <div class="loc-meta-row">
          <button class="transport-status-btn ${item.purchased ? "purchased" : "unpurchased"}">
            ${item.purchased ? "✅ 已購買" : "🛒 未購買"}
            ${item.price > 0 ? `<span class="transport-status-price">NT$${item.price.toLocaleString()}</span>` : ""}
          </button>
          <span class="loc-discuss-count">💬 ${count > 0 ? `${count} 則討論` : "查看討論"}</span>
        </div>
      </div>
      ${!finalized ? `
      <div class="loc-actions">
        <button class="icon-btn edit" title="編輯">✏</button>
        <button class="icon-btn del danger" title="刪除">✕</button>
      </div>` : ""}`;

    el.querySelector(".loc-info").addEventListener("click", () => openTransportDiscussPage(item.id));
    el.querySelector(".transport-status-btn").addEventListener("click", e => {
      e.stopPropagation();
      item.purchased = !item.purchased;
      saveTransport();
      renderTransportList();
    });
    if (!finalized) {
      el.querySelector(".icon-btn.edit").addEventListener("click", e => {
        e.stopPropagation();
        openEditTransportDialog(item.id);
      });
      el.querySelector(".del").addEventListener("click", e => {
        e.stopPropagation();
        transportItems = transportItems.filter(t => t.id !== item.id);
        saveTransport();
        renderTransportList();
      });
    }
    listEl.appendChild(el);
  });
}

function openAddTransportDialog() {
  ["tMethod","tRoute","tWhere","tPrice"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("tPurchased").checked = false;
  document.getElementById("addTransportDialog").showModal();
  setTimeout(() => document.getElementById("tMethod").focus(), 50);
}

function openEditTransportDialog(id) {
  editingTransportId = id;
  const item = transportItems.find(t => t.id === id);
  if (!item) return;
  document.getElementById("etMethod").value      = item.method || "";
  document.getElementById("etRoute").value       = item.route  || "";
  document.getElementById("etWhere").value       = item.where  || "";
  document.getElementById("etPrice").value       = item.price > 0 ? item.price : "";
  document.getElementById("etPurchased").checked = item.purchased || false;
  document.getElementById("editTransportDialog").showModal();
  setTimeout(() => document.getElementById("etMethod").focus(), 50);
}

// ─ 事件綁定 ─
document.getElementById("addTransportBtn").addEventListener("click", openAddTransportDialog);

document.getElementById("confirmAddTransportBtn").addEventListener("click", () => {
  const method = document.getElementById("tMethod").value.trim();
  if (!method) return alert("請輸入交通方式");
  transportItems.push({
    id:          crypto.randomUUID(),
    method,
    route:       document.getElementById("tRoute").value.trim(),
    where:       document.getElementById("tWhere").value.trim(),
    price:       Math.max(0, parseFloat(document.getElementById("tPrice").value) || 0),
    purchased:   document.getElementById("tPurchased").checked,
    discussions: [],
  });
  saveTransport();
  document.getElementById("addTransportDialog").close();
  renderTransportList();
});

document.getElementById("cancelAddTransportBtn").addEventListener("click", () => {
  document.getElementById("addTransportDialog").close();
});

document.getElementById("saveEditTransportBtn").addEventListener("click", () => {
  const item = transportItems.find(t => t.id === editingTransportId);
  if (!item) return;
  const method = document.getElementById("etMethod").value.trim();
  if (!method) return alert("請輸入交通方式");
  item.method    = method;
  item.route     = document.getElementById("etRoute").value.trim();
  item.where     = document.getElementById("etWhere").value.trim();
  item.price     = Math.max(0, parseFloat(document.getElementById("etPrice").value) || 0);
  item.purchased = document.getElementById("etPurchased").checked;
  saveTransport();
  document.getElementById("editTransportDialog").close();
  renderTransportList();
  if (!discussViewEl.classList.contains("hidden")) renderDiscussView();
});

document.getElementById("cancelEditTransportBtn").addEventListener("click", () => {
  document.getElementById("editTransportDialog").close();
});
