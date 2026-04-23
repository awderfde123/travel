// ─────────────────────────────────────────────
// 攜帶清單
// ─────────────────────────────────────────────
let packingShared   = [];   // { id, name, checked }
let packingPersonal = [];   // { id, name, checkedBy: { username: bool } }

function _personalKey() {
  return `${PACKING_PERSONAL_KEY}-${tripId || "default"}`;
}

function loadPacking() {
  packingShared   = JSON.parse(localStorage.getItem(PACKING_SHARED_KEY) || "[]");
  packingPersonal = JSON.parse(localStorage.getItem(_personalKey())     || "[]");
  // 舊版資料遷移（trip-packing-v1 → packingShared）
  const old = JSON.parse(localStorage.getItem("trip-packing-v1") || "[]");
  if (old.length && !packingShared.length) {
    packingShared = old.map(p => ({ id: p.id, name: p.name, checked: false }));
    savePacking(false);
  }
}

function savePacking(sync = true) {
  localStorage.setItem(PACKING_SHARED_KEY, JSON.stringify(packingShared));
  localStorage.setItem(_personalKey(),     JSON.stringify(packingPersonal));
  if (sync) cloudSave();
}

function renderPackingList() {
  const user      = currentUser();
  const finalized = state.finalized;

  // 顯示使用者名稱
  const userEl = document.getElementById("packingUserName");
  if (userEl) userEl.textContent = user || "（未設定名稱）";

  // 進度標籤
  const cS = packingShared.filter(p => p.checked).length;
  const cP = packingPersonal.filter(p => p.checkedBy?.[user]).length;
  const total = packingShared.length + packingPersonal.length;
  document.getElementById("packingProgress").textContent =
    total ? `${cS + cP} / ${total}` : "";

  // 新增欄 & 清除按鈕：編輯模式顯示，定案模式隱藏
  ["packingSharedAddBar", "packingPersonalAddBar"].forEach(id => {
    document.getElementById(id)?.classList.toggle("hidden", finalized);
  });
  document.getElementById("clearCheckedBtn")?.classList.toggle("hidden", !finalized);

  _renderSection("packingSharedList",   packingShared,   "shared",   finalized, user);
  _renderSection("packingPersonalList", packingPersonal, "personal", finalized, user);
}

function _renderSection(elId, items, type, finalized, user) {
  const listEl = document.getElementById(elId);
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!items.length) {
    listEl.innerHTML = `<div class="packing-empty">尚無品項</div>`;
    return;
  }

  items.forEach(item => {
    const isChecked = type === "shared"
      ? !!item.checked
      : !!(item.checkedBy?.[user]);
    const el = document.createElement("div");
    el.className = `packing-item${finalized && isChecked ? " checked" : ""}`;

    if (finalized) {
      el.innerHTML = `
        <input type="checkbox" class="packing-check" ${isChecked ? "checked" : ""} />
        <span class="packing-name">${esc(item.name)}</span>`;
      el.querySelector(".packing-check").addEventListener("change", ev => {
        if (type === "shared") {
          item.checked = ev.target.checked;
        } else {
          if (!item.checkedBy) item.checkedBy = {};
          item.checkedBy[user] = ev.target.checked;
        }
        el.classList.toggle("checked", ev.target.checked);
        savePacking();
        const cS2 = packingShared.filter(p => p.checked).length;
        const cP2 = packingPersonal.filter(p => p.checkedBy?.[user]).length;
        document.getElementById("packingProgress").textContent =
          `${cS2 + cP2} / ${packingShared.length + packingPersonal.length}`;
      });
    } else {
      el.innerHTML = `
        <span class="packing-name">${esc(item.name)}</span>
        <button class="icon-btn del danger" title="刪除">✕</button>`;
      el.querySelector(".del").addEventListener("click", () => {
        if (type === "shared") {
          packingShared = packingShared.filter(p => p.id !== item.id);
        } else {
          packingPersonal = packingPersonal.filter(p => p.id !== item.id);
        }
        savePacking();
        renderPackingList();
      });
    }
    listEl.appendChild(el);
  });
}

function _addPackingItem(type) {
  const inputId = type === "shared" ? "packingSharedInput" : "packingPersonalInput";
  const input = document.getElementById(inputId);
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (type === "shared") {
    packingShared.push({ id: crypto.randomUUID(), name, checked: false });
  } else {
    packingPersonal.push({ id: crypto.randomUUID(), name, checkedBy: {} });
  }
  savePacking();
  input.value = "";
  input.focus();
  renderPackingList();
}

// ─ 事件綁定 ─
document.getElementById("packingSharedAddBtn").addEventListener("click", () => _addPackingItem("shared"));
document.getElementById("packingSharedInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); _addPackingItem("shared"); }
});
document.getElementById("packingPersonalAddBtn").addEventListener("click", () => _addPackingItem("personal"));
document.getElementById("packingPersonalInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); _addPackingItem("personal"); }
});
document.getElementById("clearCheckedBtn").addEventListener("click", () => {
  const user = currentUser();
  packingShared.forEach(p => { p.checked = false; });
  packingPersonal.forEach(p => { if (p.checkedBy) p.checkedBy[user] = false; });
  savePacking();
  renderPackingList();
});
