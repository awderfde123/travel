// ─────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────
const DATA_KEY             = "trip-map-collab-v1";
const AUTHOR_KEY           = "trip-map-author";
const TRANSPORT_KEY        = "trip-transport-v1";
const PACKING_SHARED_KEY   = "trip-packing-shared-v1";
const PACKING_PERSONAL_KEY = "trip-packing-personal-v1";
const TRIP_LEGS_KEY        = "trip-legs-v1";
const TRIP_HISTORY_KEY     = "trip-history-v1";
const TRIP_META_KEY        = "trip-meta-v1";

// ─────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────
function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      hour12: false, month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function currentUser() {
  return localStorage.getItem(AUTHOR_KEY) || "";
}
