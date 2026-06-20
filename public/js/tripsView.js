/* Trips tab: editorial trip table + detail view with summary row,
   field chips and a multi-PID Chart.js line chart on the light theme. */

const TripsView = (() => {
  const { metaFor, fmtValue, parseTs, SERIES_COLORS, chartBase } = window.OBD;

  const listView = document.getElementById('trips-list-view');
  const detailView = document.getElementById('trip-detail-view');
  const tbody = document.getElementById('trips-tbody');
  const emptyMsg = document.getElementById('trips-empty');
  const countEl = document.getElementById('trips-count');
  const backBtn = document.getElementById('trip-back');
  const detailTitle = document.getElementById('trip-detail-title');
  const detailSub = document.getElementById('trip-detail-sub');
  const summaryEl = document.getElementById('trip-summary');
  const pickerEl = document.getElementById('field-picker');
  const canvas = document.getElementById('trip-chart');

  let tripsById = {};
  let chart = null;
  let currentReadings = [];
  let selectedFields = [];
  let loaded = false;

  function fmtDuration(sec) {
    if (sec == null) return '–';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${s}s` : `${s}s`);
  }
  function dShort(d) { return d ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '–'; }
  function hm(d) { return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–'; }
  function hms(d) { return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''; }
  function dLong(d) { return d ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Trip'; }

  function showList() { detailView.hidden = true; listView.hidden = false; }
  function showDetail() { listView.hidden = true; detailView.hidden = false; }

  async function load() {
    try {
      const res = await fetch('/api/trips');
      if (res.status === 401) { window.location.href = '/login.html'; return; }
      const trips = await res.json();
      tripsById = {};
      tbody.innerHTML = '';
      countEl.textContent = trips.length ? `${trips.length} recorded` : '';

      if (!trips.length) { emptyMsg.hidden = false; loaded = true; return; }
      emptyMsg.hidden = true;

      for (const t of trips) {
        tripsById[t.trip_id] = t;
        const start = parseTs(t.start_time);
        const tr = document.createElement('tr');
        tr.innerHTML =
          `<td class="l">${dShort(start)}</td>` +
          `<td class="l mid">${hm(start)}</td>` +
          `<td>${fmtDuration(t.duration_seconds)}</td>` +
          `<td>${t.distance_km != null ? fmtValue(t.distance_km) : '–'}</td>` +
          `<td>${t.avg_speed_kmh != null ? fmtValue(t.avg_speed_kmh) : '–'}</td>` +
          `<td>${t.max_speed_kmh != null ? fmtValue(t.max_speed_kmh) : '–'}</td>` +
          `<td>${t.avg_rpm != null ? fmtValue(t.avg_rpm) : '–'}</td>` +
          `<td class="dim">${t.reading_count}</td>`;
        tr.addEventListener('click', () => openDetail(t.trip_id));
        tbody.appendChild(tr);
      }
      loaded = true;
    } catch (err) {
      emptyMsg.hidden = false;
      emptyMsg.textContent = 'Failed to load trips.';
    }
  }

  async function openDetail(tripId) {
    const trip = tripsById[tripId];
    const start = trip ? parseTs(trip.start_time) : null;
    detailTitle.textContent = dLong(start);
    if (trip && start) {
      const end = new Date(start.getTime() + trip.duration_seconds * 1000);
      detailSub.textContent =
        `${hm(start)} – ${hm(end)} · ${fmtDuration(trip.duration_seconds)} · Trip #${trip.trip_id}`;
    } else {
      detailSub.textContent = '';
    }
    renderSummary(trip);
    showDetail();

    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}`);
      if (res.status === 401) { window.location.href = '/login.html'; return; }
      const data = await res.json();
      currentReadings = data.readings || [];
      buildPicker(currentReadings);
      drawChart();
    } catch (err) {
      detailTitle.textContent = 'Failed to load trip';
    }
  }

  function numericFields(readings) {
    const set = new Set();
    for (const r of readings) {
      for (const [k, v] of Object.entries(r)) {
        if (k === 'timestamp' || k === 'trip_id') continue;
        if (typeof v === 'number') set.add(k);
      }
    }
    return [...set];
  }

  function buildPicker(readings) {
    const fields = numericFields(readings);
    selectedFields = [];
    if (fields.includes('speed_kmh')) selectedFields.push('speed_kmh');
    if (fields.includes('rpm')) selectedFields.push('rpm');
    if (!selectedFields.length && fields.length) selectedFields.push(fields[0]);
    renderPicker(fields);
  }

  function renderPicker(fields) {
    pickerEl.innerHTML = '';
    for (const f of fields) {
      const on = selectedFields.includes(f);
      const color = on ? SERIES_COLORS[selectedFields.indexOf(f) % SERIES_COLORS.length] : '#cfccc2';
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'field-chip' + (on ? ' on' : '');
      chip.innerHTML = `<span class="swatch" style="background:${color}"></span>${metaFor(f).label}`;
      chip.addEventListener('click', () => {
        const i = selectedFields.indexOf(f);
        if (i >= 0) selectedFields.splice(i, 1); else selectedFields.push(f);
        renderPicker(fields);
        drawChart();
      });
      pickerEl.appendChild(chip);
    }
  }

  function drawChart() {
    const labels = currentReadings.map((r) => hms(parseTs(r.timestamp)));
    const base = chartBase('');
    const scales = { x: base.scales.x };
    const unitAxis = {};
    let axisIdx = 0;

    for (const f of selectedFields) {
      const unit = metaFor(f).unit || '';
      if (!(unit in unitAxis)) {
        const id = `y${axisIdx}`;
        unitAxis[unit] = id;
        scales[id] = {
          position: axisIdx % 2 === 0 ? 'left' : 'right',
          grid: { drawOnChartArea: axisIdx === 0, color: '#ededea' },
          border: { display: false },
          ticks: { color: '#b9b6ab' },
          title: { display: !!unit, text: unit, color: '#908d82' },
        };
        axisIdx++;
      }
    }

    const datasets = selectedFields.map((f, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length];
      return {
        label: metaFor(f).label,
        data: currentReadings.map((r) => (typeof r[f] === 'number' ? r[f] : null)),
        borderColor: color,
        backgroundColor: color,
        yAxisID: unitAxis[metaFor(f).unit || ''],
        borderWidth: 1.6,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
      };
    });

    const options = Object.assign({}, base, { scales });
    if (chart) chart.destroy();
    chart = new Chart(canvas, { type: 'line', data: { labels, datasets }, options });
  }

  function renderSummary(trip) {
    if (!trip) { summaryEl.innerHTML = ''; return; }
    const cells = [
      ['Duration', fmtDuration(trip.duration_seconds), ''],
      ['Distance', trip.distance_km != null ? fmtValue(trip.distance_km) : '–', 'km'],
      ['Avg speed', fmtValue(trip.avg_speed_kmh), 'km/h'],
      ['Max speed', fmtValue(trip.max_speed_kmh), 'km/h'],
      ['Avg RPM', fmtValue(trip.avg_rpm), 'rpm'],
      ['Readings', String(trip.reading_count), ''],
    ];
    summaryEl.innerHTML = cells.map(([label, val, unit]) =>
      `<div class="summary-cell"><div class="label">${label}</div>` +
      `<div class="num"><span class="v">${val}</span>` +
      (unit ? `<span class="u">${unit}</span>` : '') +
      `</div></div>`
    ).join('');
  }

  function ensureLoaded() { if (!loaded) load(); }

  backBtn.addEventListener('click', showList);

  return { load, ensureLoaded };
})();
