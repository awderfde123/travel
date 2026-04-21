// ─────────────────────────────────────────────
// 攜帶清單
// ─────────────────────────────────────────────
let packingItems = [];

function loadPacking() {
  packingItems = JSON.parse(localStorage.getItem(PACKING_KEY) || "[]");
}

function savePacking(sync = true) {
  localStorage.setItem(PACKING_KEY, JSON.stringify(packingItems));
  if (sync) cloudSave();
}

function renderPackingList() {
  const listEl  = document.getElementById("packingList");
  listEl.innerHTML = "";

  const total   = packingItems.length;
  const checked = packingItems.filter(p => p.checked).length;
  document.getElementById("packingProgress").textContent = total ? `${checked} / ${total}` : "";

  if (!total) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎒</div>
        <p>尚無品項<br>輸入上方欄位新增</p>
      </div>`;
    return;
  }

  packingItems.forEach(item => {
    const el = document.createElement("div");
    el.className = `packing-item${item.checked ? " checked" : ""}`;
    el.innerHTML = `
      <input type="checkbox" class="packing-check" ${item.checked ? "checked" : ""} />
      <span class="packing-name">${esc(item.name)}</span>
      <button class="icon-btn del danger" title="刪除">✕</button>`;

    el.querySelector(".packing-check").addEventListener("change", ev => {
      item.checked = ev.target.checked;
      el.classList.toggle("checked", item.checked);
      savePacking();
      const c = packingItems.filter(p => p.checked).length;
      document.getElementById("packingProgress").textContent = `${c} / ${packingItems.length}`;
    });
    el.querySelector(".del").addEventListener("click", () => {
      packingItems = packingItems.filter(p => p.id !== item.id);
      savePacking();
      renderPackingList();
    });
    listEl.appendChild(el);
  });
}

function addPackingItem() {
  const input = document.getElementById("packingInput");
  const name  = input.value.trim();
  if (!name) return;
  packingItems.push({ id: crypto.randomUUID(), name, checked: false });
  savePacking();
  input.value = "";
  input.focus();
  renderPackingList();
}

// ─ 事件綁定 ─
document.getElementById("packingAddBtn").addEventListener("click", addPackingItem);
document.getElementById("packingInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); addPackingItem(); }
});
document.getElementById("clearCheckedBtn").addEventListener("click", () => {
  packingItems.forEach(p => { p.checked = false; });
  savePacking();
  renderPackingList();
});
