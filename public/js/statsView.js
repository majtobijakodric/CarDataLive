/* Stats tab: overview cells + avg-speed-per-trip bar + fuel-rate trend line. */

const StatsView = (() => {
  const { fmtValue, parseTs, ACCENT, chartBase } = window.OBD;

  const cardsEl = document.getElementById('stats-cards');
  const subEl = document.getElementById('stats-sub');
  const speedCanvas = document.getElementById('stats-speed-chart');
  const fuelCanvas = document.getElementById('stats-fuel-chart');
  const fuelCard = document.getElementById('stats-fuel-card');

  let speedChart = null;
  let fuelChart = null;
  let loaded = false;

  function cell(label, val, unit) {
    return `<div class="stat-cell"><div class="label">${label}</div>` +
      `<div class="num"><span class="v">${val}</span>` +
      (unit ? `<span class="u">${unit}</span>` : '') +
      `</div></div>`;
  }

  async function load() {
    try {
      const [statsRes, tripsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/trips'),
      ]);
      if (statsRes.status === 401 || tripsRes.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      const stats = await statsRes.json();
      const trips = await tripsRes.json();

      renderCards(stats, trips);
      renderSpeedChart(trips);
      renderFuelChart(trips);
      loaded = true;
    } catch (err) {
      cardsEl.innerHTML = '<div class="empty-msg">Failed to load stats.</div>';
    }
  }

  function renderCards(s, trips) {
    // /api/stats has no max-speed field; derive it from the per-trip maxima.
    const maxSpeed = (trips || []).reduce(
      (a, t) => (t.max_speed_kmh != null ? Math.max(a, t.max_speed_kmh) : a), 0);

    cardsEl.innerHTML = [
      cell('Total trips', s.total_trips ?? 0, ''),
      cell('Distance', fmtValue(s.total_distance_km ?? 0), 'km'),
      cell('Driving time', fmtValue(s.total_driving_time_hours ?? 0), 'h'),
      cell('Avg speed', s.avg_speed_kmh != null ? fmtValue(s.avg_speed_kmh) : '–', 'km/h'),
      cell('Avg fuel rate', s.avg_fuel_rate_lph != null ? fmtValue(s.avg_fuel_rate_lph) : '–', 'L/h'),
      cell('Max speed', maxSpeed ? fmtValue(maxSpeed) : '–', 'km/h'),
    ].join('');

    const tripCount = s.total_trips ?? 0;
    const readings = (s.total_readings ?? 0).toLocaleString();
    subEl.textContent = `Across ${tripCount} trips · ${readings} readings`;
  }

  function dShort(d) {
    return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  }

  // Bar chart: average speed for the last 18 trips (chronological).
  function renderSpeedChart(trips) {
    const recent = trips.slice(0, 18).reverse(); // trips come newest-first
    const labels = recent.map((t) => dShort(parseTs(t.start_time)));
    const data = recent.map((t) => t.avg_speed_kmh);

    if (speedChart) speedChart.destroy();
    speedChart = new Chart(speedCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: '#16150f',
          borderWidth: 0,
          barPercentage: 0.72,
          categoryPercentage: 0.82,
        }],
      },
      options: chartBase('km/h'),
    });
  }

  // Line chart: avg fuel rate per trip over time (hide card if no fuel data).
  function renderFuelChart(trips) {
    const withFuel = trips.slice().reverse().filter((t) => t.avg_fuel_rate_lph != null);
    if (!withFuel.length) {
      if (fuelChart) { fuelChart.destroy(); fuelChart = null; }
      fuelCard.style.display = 'none';
      return;
    }
    fuelCard.style.display = '';

    const labels = withFuel.map((t) => dShort(parseTs(t.start_time)));
    const data = withFuel.map((t) => t.avg_fuel_rate_lph);

    if (fuelChart) fuelChart.destroy();
    fuelChart = new Chart(fuelCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: ACCENT, backgroundColor: ACCENT,
          borderWidth: 1.8, pointRadius: 2, pointBackgroundColor: ACCENT,
          tension: 0.3, spanGaps: true,
        }],
      },
      options: chartBase('L/h'),
    });
  }

  function ensureLoaded() { if (!loaded) load(); }

  return { load, ensureLoaded };
})();
