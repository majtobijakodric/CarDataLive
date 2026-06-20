/* Live tab: polls /api/live every 2s, renders hero (with sparklines),
   secondary metrics, grouped + filterable metric grid. */

const LiveView = (() => {
  const { GROUP_ORDER, metaFor, fmtValue, parseTs } = window.OBD;

  const dot = document.getElementById('live-dot');
  const labelEl = document.getElementById('live-label');
  const speedEl = document.getElementById('live-speed');
  const rpmEl = document.getElementById('live-rpm');
  const statusEl = document.getElementById('live-status');
  const secondaryEl = document.getElementById('live-secondary');
  const cardsEl = document.getElementById('live-cards');
  const noMatchEl = document.getElementById('live-nomatch');
  const countEl = document.getElementById('param-count');
  const filterEl = document.getElementById('param-filter');
  const sparkSpeed = document.getElementById('spark-speed');
  const sparkRpm = document.getElementById('spark-rpm');

  const SPARK_W = 260, SPARK_H = 38, SPARK_MAX = 60;

  let timer = null;
  let lastReading = null;
  let histSpeed = [];
  let histRpm = [];

  filterEl.addEventListener('input', () => {
    if (lastReading) renderCards(lastReading);
  });

  function setLive(isLive) {
    dot.classList.toggle('live', isLive);
    document.body.classList.toggle('offline', !isLive);
    labelEl.textContent = isLive ? 'Live telemetry' : 'Offline';
  }

  // Build a polyline `points` string from a numeric history array.
  function spark(arr) {
    if (!arr || arr.length < 2) return '';
    const max = Math.max(...arr, 1), min = Math.min(...arr);
    const rng = (max - min) || 1;
    return arr.map((v, i) => {
      const x = (i / (arr.length - 1)) * SPARK_W;
      const y = SPARK_H - 2 - ((v - min) / rng) * (SPARK_H - 4);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    }).join(' ');
  }

  function pushHistory(reading) {
    if (typeof reading.speed_kmh === 'number') {
      histSpeed = histSpeed.concat(reading.speed_kmh).slice(-SPARK_MAX);
      sparkSpeed.setAttribute('points', spark(histSpeed));
    }
    if (typeof reading.rpm === 'number') {
      histRpm = histRpm.concat(reading.rpm).slice(-SPARK_MAX);
      sparkRpm.setAttribute('points', spark(histRpm));
    }
  }

  function numCell(label, value, unit) {
    return `<div class="hero-srow">` +
      `<span class="label">${label}</span>` +
      `<span class="num"><span class="v">${value}</span>` +
      (unit ? `<span class="u">${unit}</span>` : '') +
      `</span></div>`;
  }

  function renderSecondary(reading) {
    const rows = [
      ['Engine load', reading.engine_load_pct, '%'],
      ['Coolant', reading.coolant_temp_c, '°C'],
      ['Fuel level', reading.fuel_tank_level_pct, '%'],
    ];
    secondaryEl.innerHTML = rows
      .map(([l, v, u]) => numCell(l, v != null ? fmtValue(v) : '–', u))
      .join('');
  }

  // Grouped, filterable metric grid for every non-null field except hero/identity.
  function renderCards(reading) {
    const q = (filterEl.value || '').trim().toLowerCase();
    const skip = new Set(['timestamp', 'trip_id', 'speed_kmh', 'rpm']);
    const groups = {};
    let total = 0;

    for (const [col, val] of Object.entries(reading)) {
      if (skip.has(col)) continue;
      if (val === null || val === undefined) continue;
      const m = metaFor(col);
      if (q && !m.label.toLowerCase().includes(q) && !col.includes(q)) continue;
      (groups[m.group] = groups[m.group] || []).push({ val, m });
      total++;
    }

    let html = '';
    for (const group of GROUP_ORDER) {
      const items = groups[group];
      if (!items || !items.length) continue;
      html += `<div class="group-heading">` +
        `<span class="name">${group}</span>` +
        `<span class="rule"></span>` +
        `<span class="count">${items.length}</span></div>`;
      for (const { val, m } of items) {
        html += `<div class="param">` +
          `<div class="label">${m.label}</div>` +
          `<div class="num"><span class="v">${fmtValue(val)}</span>` +
          (m.unit ? `<span class="u">${m.unit}</span>` : '') +
          `</div></div>`;
      }
    }

    cardsEl.innerHTML = html;
    countEl.textContent = total;
    noMatchEl.hidden = total > 0;
  }

  function renderAgeText(reading, isLive) {
    const ts = parseTs(reading.timestamp);
    if (!ts) { statusEl.textContent = ''; return; }
    const ageSec = Math.max(0, Math.round((Date.now() - ts.getTime()) / 1000));
    statusEl.textContent = isLive
      ? `Last update ${ageSec}s ago · 1 Hz`
      : `Vehicle offline — last seen ${ageSec}s ago`;
  }

  async function refresh() {
    try {
      const res = await fetch('/api/live');
      if (res.status === 401) { window.location.href = '/login.html'; return; }
      const data = await res.json();

      if (!data.reading) {
        setLive(false);
        speedEl.textContent = '--';
        rpmEl.textContent = '--';
        statusEl.textContent = 'No data yet.';
        secondaryEl.innerHTML = '';
        cardsEl.innerHTML = '';
        countEl.textContent = '0';
        noMatchEl.hidden = true;
        return;
      }

      lastReading = data.reading;
      setLive(data.is_live);
      speedEl.textContent = data.reading.speed_kmh != null ? fmtValue(data.reading.speed_kmh) : '--';
      rpmEl.textContent = data.reading.rpm != null ? fmtValue(data.reading.rpm) : '--';
      pushHistory(data.reading);
      renderSecondary(data.reading);
      renderCards(data.reading);
      renderAgeText(data.reading, data.is_live);
    } catch (err) {
      setLive(false);
      statusEl.textContent = 'Connection error';
    }
  }

  function start() {
    refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, 2000);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, refresh };
})();
