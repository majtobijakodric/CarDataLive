/* Shared frontend helpers: PID metadata, value formatting, Chart.js dark theme. */

// Logical display order for grouped cards.
const GROUP_ORDER = [
  'Engine', 'Fuel', 'Intake/Exhaust', 'Throttle/Pedal',
  'O2 Sensors', 'Temperatures', 'Electrical', 'Diagnostics', 'Other',
];

// PID metadata: column name -> { label, unit, group }.
const PID_META = {
  // Engine
  rpm: { label: 'Engine RPM', unit: 'rpm', group: 'Engine' },
  speed_kmh: { label: 'Speed', unit: 'km/h', group: 'Engine' },
  engine_load_pct: { label: 'Engine Load', unit: '%', group: 'Engine' },
  absolute_load_pct: { label: 'Absolute Load', unit: '%', group: 'Engine' },
  timing_advance_deg: { label: 'Timing Advance', unit: '°', group: 'Engine' },
  maf_g_per_s: { label: 'MAF', unit: 'g/s', group: 'Engine' },
  mass_air_flow_sensor_g_per_s: { label: 'MAF Sensor', unit: 'g/s', group: 'Engine' },
  run_time_s: { label: 'Run Time', unit: 's', group: 'Engine' },
  demanded_torque_pct: { label: 'Demanded Torque', unit: '%', group: 'Engine' },
  actual_torque_pct: { label: 'Actual Torque', unit: '%', group: 'Engine' },
  reference_torque_nm: { label: 'Reference Torque', unit: 'Nm', group: 'Engine' },
  engine_torque_data_pct: { label: 'Torque Data', unit: '', group: 'Engine' },

  // Fuel
  fuel_rate_lph: { label: 'Fuel Rate', unit: 'L/h', group: 'Fuel' },
  fuel_tank_level_pct: { label: 'Fuel Level', unit: '%', group: 'Fuel' },
  fuel_pressure_kpa: { label: 'Fuel Pressure', unit: 'kPa', group: 'Fuel' },
  fuel_trim_short_b1_pct: { label: 'STFT B1', unit: '%', group: 'Fuel' },
  fuel_trim_long_b1_pct: { label: 'LTFT B1', unit: '%', group: 'Fuel' },
  fuel_trim_short_b2_pct: { label: 'STFT B2', unit: '%', group: 'Fuel' },
  fuel_trim_long_b2_pct: { label: 'LTFT B2', unit: '%', group: 'Fuel' },
  fuel_type: { label: 'Fuel Type', unit: '', group: 'Fuel' },
  ethanol_pct: { label: 'Ethanol', unit: '%', group: 'Fuel' },
  fuel_system_status: { label: 'Fuel System Status', unit: '', group: 'Fuel' },
  fuel_rail_pressure_kpa: { label: 'Fuel Rail Pressure', unit: 'kPa', group: 'Fuel' },
  fuel_rail_pressure_diesel_kpa: { label: 'Rail Pressure (diesel)', unit: 'kPa', group: 'Fuel' },
  fuel_rail_abs_pressure_kpa: { label: 'Rail Abs Pressure', unit: 'kPa', group: 'Fuel' },
  fuel_inject_timing_deg: { label: 'Injection Timing', unit: '°', group: 'Fuel' },
  commanded_lambda: { label: 'Commanded Lambda', unit: 'λ', group: 'Fuel' },

  // Intake / Exhaust
  intake_map_kpa: { label: 'Intake MAP', unit: 'kPa', group: 'Intake/Exhaust' },
  barometric_pressure_kpa: { label: 'Barometric Pressure', unit: 'kPa', group: 'Intake/Exhaust' },
  boost_pressure_kpa: { label: 'Boost Pressure', unit: 'kPa', group: 'Intake/Exhaust' },
  turbo_a_pressure_kpa: { label: 'Turbo A Pressure', unit: 'kPa', group: 'Intake/Exhaust' },
  commanded_egr_pct: { label: 'Commanded EGR', unit: '%', group: 'Intake/Exhaust' },
  egr_error_pct: { label: 'EGR Error', unit: '%', group: 'Intake/Exhaust' },
  commanded_evap_purge_pct: { label: 'EVAP Purge', unit: '%', group: 'Intake/Exhaust' },
  evap_system_vapor_pressure_pa: { label: 'EVAP Vapor Pressure', unit: 'Pa', group: 'Intake/Exhaust' },
  abs_evap_vapor_pressure_kpa: { label: 'Abs EVAP Pressure', unit: 'kPa', group: 'Intake/Exhaust' },
  evap_vapor_pressure_alt_pa: { label: 'EVAP Pressure (alt)', unit: 'Pa', group: 'Intake/Exhaust' },
  secondary_air_status: { label: 'Secondary Air', unit: '', group: 'Intake/Exhaust' },

  // Throttle / Pedal
  throttle_pct: { label: 'Throttle', unit: '%', group: 'Throttle/Pedal' },
  rel_throttle_pct: { label: 'Relative Throttle', unit: '%', group: 'Throttle/Pedal' },
  abs_throttle_b_pct: { label: 'Abs Throttle B', unit: '%', group: 'Throttle/Pedal' },
  abs_throttle_c_pct: { label: 'Abs Throttle C', unit: '%', group: 'Throttle/Pedal' },
  commanded_throttle_pct: { label: 'Commanded Throttle', unit: '%', group: 'Throttle/Pedal' },
  accel_pedal_d_pct: { label: 'Accel Pedal D', unit: '%', group: 'Throttle/Pedal' },
  accel_pedal_e_pct: { label: 'Accel Pedal E', unit: '%', group: 'Throttle/Pedal' },
  accel_pedal_f_pct: { label: 'Accel Pedal F', unit: '%', group: 'Throttle/Pedal' },
  rel_accel_pedal_pct: { label: 'Relative Accel Pedal', unit: '%', group: 'Throttle/Pedal' },

  // Temperatures
  coolant_temp_c: { label: 'Coolant Temp', unit: '°C', group: 'Temperatures' },
  engine_coolant_temp_2_c: { label: 'Coolant Temp 2', unit: '°C', group: 'Temperatures' },
  intake_air_temp_c: { label: 'Intake Air Temp', unit: '°C', group: 'Temperatures' },
  intake_air_temp_2_c: { label: 'Intake Air Temp 2', unit: '°C', group: 'Temperatures' },
  ambient_air_temp_c: { label: 'Ambient Temp', unit: '°C', group: 'Temperatures' },
  engine_oil_temp_c: { label: 'Oil Temp', unit: '°C', group: 'Temperatures' },
  cat_temp_b1s1_c: { label: 'Cat Temp B1S1', unit: '°C', group: 'Temperatures' },
  cat_temp_b2s1_c: { label: 'Cat Temp B2S1', unit: '°C', group: 'Temperatures' },
  cat_temp_b1s2_c: { label: 'Cat Temp B1S2', unit: '°C', group: 'Temperatures' },
  cat_temp_b2s2_c: { label: 'Cat Temp B2S2', unit: '°C', group: 'Temperatures' },

  // Electrical
  control_module_voltage_v: { label: 'Module Voltage', unit: 'V', group: 'Electrical' },
  hybrid_battery_life_pct: { label: 'Hybrid Battery', unit: '%', group: 'Electrical' },
  aux_input_status: { label: 'Aux Input', unit: '', group: 'Electrical' },

  // Diagnostics
  dtc_count: { label: 'DTC Count', unit: '', group: 'Diagnostics' },
  freeze_dtc: { label: 'Freeze DTC', unit: '', group: 'Diagnostics' },
  obd_standard: { label: 'OBD Standard', unit: '', group: 'Diagnostics' },
  monitor_status_drive_cycle: { label: 'Monitor Status', unit: '', group: 'Diagnostics' },
  distance_with_mil_km: { label: 'Distance w/ MIL', unit: 'km', group: 'Diagnostics' },
  distance_since_clear_km: { label: 'Distance Since Clear', unit: 'km', group: 'Diagnostics' },
  warmups_since_clear: { label: 'Warmups Since Clear', unit: '', group: 'Diagnostics' },
  time_with_mil_min: { label: 'Time w/ MIL', unit: 'min', group: 'Diagnostics' },
  time_since_clear_min: { label: 'Time Since Clear', unit: 'min', group: 'Diagnostics' },
  emission_requirements: { label: 'Emission Req', unit: '', group: 'Diagnostics' },
  pids_supported_01_20: { label: 'PIDs 01-20', unit: '', group: 'Diagnostics' },
  pids_supported_21_40: { label: 'PIDs 21-40', unit: '', group: 'Diagnostics' },
  pids_supported_41_60: { label: 'PIDs 41-60', unit: '', group: 'Diagnostics' },
  pids_supported_61_80: { label: 'PIDs 61-80', unit: '', group: 'Diagnostics' },
  o2_sensors_present_2bank: { label: 'O2 Present (2-bank)', unit: '', group: 'Diagnostics' },
  o2_sensors_present_4bank: { label: 'O2 Present (4-bank)', unit: '', group: 'Diagnostics' },
};

// O2 sensor columns share a label pattern; generate their metadata.
(function addO2() {
  const banks = ['b1s1', 'b1s2', 'b1s3', 'b1s4', 'b2s1', 'b2s2', 'b2s3', 'b2s4', 'b2s5', 'b2s6'];
  for (const b of banks) {
    const tag = b.toUpperCase();
    PID_META[`o2_${b}_voltage`] = { label: `O2 ${tag} Voltage`, unit: 'V', group: 'O2 Sensors' };
    PID_META[`o2_${b}_lambda`] = { label: `O2 ${tag} Lambda`, unit: 'λ', group: 'O2 Sensors' };
    PID_META[`o2_${b}_current_ma`] = { label: `O2 ${tag} Current`, unit: 'mA', group: 'O2 Sensors' };
  }
  PID_META.short_o2_trim_b1_pct = { label: 'O2 STFT B1', unit: '%', group: 'O2 Sensors' };
  PID_META.long_o2_trim_b1_pct = { label: 'O2 LTFT B1', unit: '%', group: 'O2 Sensors' };
  PID_META.short_o2_trim_b2_pct = { label: 'O2 STFT B2', unit: '%', group: 'O2 Sensors' };
  PID_META.long_o2_trim_b2_pct = { label: 'O2 LTFT B2', unit: '%', group: 'O2 Sensors' };
})();

function metaFor(col) {
  return PID_META[col] || { label: col, unit: '', group: 'Other' };
}

// Format a value for display: keep ints clean, round floats to 2dp.
function fmtValue(v) {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : (Math.round(v * 100) / 100).toString();
  }
  return String(v);
}

// Parse a server timestamp ("YYYY-MM-DD HH:MM:SS.mmm", UTC) to a Date.
function parseTs(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  return new Date(String(ts).replace(' ', 'T') + 'Z');
}

// Distinct chart colours for overlaid series (editorial palette).
const SERIES_COLORS = [
  '#16150f', '#d8412b', '#2f5fd0', '#c08a1e', '#1f9d57',
  '#7a4fd8', '#0f8a8a', '#b03060',
];

const ACCENT = '#d8412b';
const MONO_FONT = "'IBM Plex Mono', ui-monospace, monospace";

// Chart.js light theme defaults (applied once Chart is available).
if (window.Chart) {
  Chart.defaults.color = '#908d82';
  Chart.defaults.borderColor = '#ededea';
  Chart.defaults.font.family = MONO_FONT;
  Chart.defaults.font.size = 10;
}

// Base options for a line/bar chart on the light "paper" theme.
// Pass a y-axis title string for the single-axis charts.
function chartBase(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16150f', padding: 10, cornerRadius: 0, displayColors: false,
        titleFont: { family: MONO_FONT }, bodyFont: { family: MONO_FONT },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#d2cfc4' },
        ticks: { color: '#b9b6ab', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#ededea' },
        border: { display: false },
        ticks: { color: '#b9b6ab' },
        title: { display: !!yTitle, text: yTitle || '', color: '#908d82' },
      },
    },
  };
}

window.OBD = {
  GROUP_ORDER, PID_META, metaFor, fmtValue, parseTs, SERIES_COLORS, ACCENT, chartBase,
};
