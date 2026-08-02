const state = {
  startedAt: Date.now(),
  reconnects: 0,
  lastError: null,
  lastCode: null,
  sessionHealth: 'unknown',
  connection: 'close'
};

export function updateDashboard(patch = {}) {
  Object.assign(state, patch);
  if (patch.connection === 'open') {
    state.sessionHealth = 'healthy';
  }
  if (patch.connection === 'close' && !state.lastCode) {
    state.sessionHealth = 'warning';
  }
  return getDashboard();
}

export function markReconnect() {
  state.reconnects += 1;
  state.sessionHealth = 'reconnecting';
  return getDashboard();
}

export function setError(error, code = null) {
  state.lastError = error ? String(error.message || error) : null;
  state.lastCode = code;
  state.sessionHealth = 'error';
  return getDashboard();
}

export function getDashboard() {
  return {
    uptime: formatUptime(Date.now() - state.startedAt),
    reconnects: state.reconnects,
    lastError: state.lastError,
    lastCode: state.lastCode,
    sessionHealth: state.sessionHealth,
    connection: state.connection
  };
}

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function dashboardText() {
  const d = getDashboard();
  return [
    '📊 Fiktatur Dashboard',
    '━━━━━━━━━━━━━━',
    `⏱ uptime: ${d.uptime}`,
    `❤️ session: ${d.sessionHealth}`,
    `🔁 reconnects: ${d.reconnects}`,
    `⚠️ last code: ${d.lastCode ?? '-'}`,
    `🧨 last error: ${d.lastError ?? '-'}`,
    `🔌 connection: ${d.connection}`
  ].join('\n');
}
