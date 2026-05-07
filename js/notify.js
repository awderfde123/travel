// ─────────────────────────────────────────────
// 本地通知 (@capacitor/local-notifications)
// ─────────────────────────────────────────────

const _lc = () => window.Capacitor?.Plugins?.LocalNotifications;

// trip code → 穩定 notification ID
function _notifId(code) {
  let h = 0;
  for (const c of (code || "")) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

async function _granted() {
  const lc = _lc();
  if (!lc) return false;
  try {
    const r = await lc.requestPermissions();
    return r.display === "granted";
  } catch { return false; }
}

// 取消目前旅程的排程通知
async function cancelTripReminder() {
  const lc = _lc();
  if (!lc || typeof tripId === "undefined" || !tripId) return;
  try { await lc.cancel({ notifications: [{ id: _notifId(tripId) }] }); } catch {}
}

// 排程提醒（出發前一天 09:00）
// 若票券全已購買且清單全勾選，不排通知
let _scheduleTimer = null;
function scheduleTripReminderDebounced() {
  clearTimeout(_scheduleTimer);
  _scheduleTimer = setTimeout(scheduleTripReminder, 400);
}

async function scheduleTripReminder() {
  const lc = _lc();
  if (!lc) return;                          // 不在 Capacitor 環境（瀏覽器）直接跳過
  if (typeof tripId === "undefined" || !tripId)    return;
  if (!state?.departDate) return;

  await cancelTripReminder();

  // 通知時間：出發前一天 09:00
  const at = new Date(state.departDate + "T09:00:00");
  at.setDate(at.getDate() - 1);
  if (at <= new Date()) return;             // 時間已過

  // 蒐集未完成項目
  const unpurchased = (typeof transportItems !== "undefined" ? transportItems : [])
    .filter(t => !t.purchased)
    .map(t => t.method);

  const unchecked = (typeof packingShared !== "undefined" ? packingShared : [])
    .filter(p => !p.checked)
    .map(p => p.name);

  if (!unpurchased.length && !unchecked.length) return; // 全部完成，不打擾

  // 組合通知文字
  const lines = [];
  if (unpurchased.length)
    lines.push(unpurchased.slice(0, 4).join("、") + " 未購買");
  if (unchecked.length)
    lines.push(unchecked.slice(0, 4).join("、") + " 未確認");

  const ok = await _granted();
  if (!ok) return;

  try {
    await lc.schedule({
      notifications: [{
        id:    _notifId(tripId),
        title: `${state.tripName || tripId} 出發提醒`,
        body:  lines.join("｜"),
        schedule: { at },
        extra: { tripCode: tripId },
      }],
    });
  } catch (e) { console.warn("[notify] 排程失敗", e); }
}
