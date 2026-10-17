// Data State
let weedZones = [];
let weedZoneCounter = 0;
let tankReadings = {};
const SPRAY_ESTIMATE_MINUTES = 4.5;
const CONVENTIONAL_FIELD_AREA_M2 = 240;

// DOM Elements for SPA
const viewDashboard = document.getElementById("view-dashboard");
const viewZonaGulma = document.getElementById("view-zona-gulma");
const viewStatusNode = document.getElementById("view-status-node");
const viewPosisiNode = document.getElementById("view-posisi-node");
const viewVolumeTangki = document.getElementById("view-volume-tangki");
const viewLogHistori = document.getElementById("view-log-histori");
const btnMenuDashboard = document.getElementById("menu-dashboard");
const btnMenuZona = document.getElementById("menu-zona-gulma");
const btnMenuStatusNode = document.getElementById("menu-status-node");
const btnMenuPosisiNode = document.getElementById("menu-posisi-node");
const btnMenuVolumeTangki = document.getElementById("menu-volume-tangki");
const btnMenuLogHistori = document.getElementById("menu-log-histori");

// ========================
// SPA View Switcher
// ========================
function hideAllViews() {
  viewDashboard.style.display = "none";
  viewZonaGulma.style.display = "none";
  viewStatusNode.style.display = "none";
  viewPosisiNode.style.display = "none";
  viewVolumeTangki.style.display = "none";
  viewLogHistori.style.display = "none";
}

function showView(viewEl) {
  hideAllViews();
  viewEl.style.display = "block";
}

// Navigasi menu sederhana & SPA
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", event => {
    if (item.target === "_blank") return;

    event.preventDefault();
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    item.classList.add("active");

    if (item.id === "menu-dashboard") {
      showView(viewDashboard);
    } else if (item.id === "menu-zona-gulma") {
      showView(viewZonaGulma);
      renderZonaGulma();
    } else if (item.id === "menu-status-node") {
      showView(viewStatusNode);
    } else if (item.id === "menu-posisi-node") {
      showView(viewPosisiNode);
    } else if (item.id === "menu-volume-tangki") {
      showView(viewVolumeTangki);
    } else if (item.id === "menu-log-histori") {
      showView(viewLogHistori);
      renderLogHistori();
    }
  });
});

// ========================
// Zona Gulma Logic
// ========================

// Pilih file import
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

fileInput.addEventListener("change", () => {
  fileName.textContent = fileInput.files.length ? fileInput.files[0].name : "No file chosen";

  if (fileInput.files.length) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(e.target.result);
          if (Array.isArray(data)) {
            const newIds = [];
            data.forEach(item => {
              const id = processZone(item.x, item.y, item.area, item.density, true);
              if (id) newIds.push(id);
            });
            runAllocation(newIds); // alokasi sekali setelah semua zona masuk
            alert(`Berhasil import ${newIds.length} zona dari JSON.`);
            goToZonaGulmaView();
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = e.target.result.split('\n');
          const newIds = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            if (cols.length >= 4) {
              const id = processZone(cols[0], cols[1], cols[2], cols[3], true);
              if (id) newIds.push(id);
            }
          }
          runAllocation(newIds);
          alert(`Berhasil import ${newIds.length} zona dari CSV.`);
          goToZonaGulmaView();
        }
      } catch (err) {
        alert("Gagal membaca file: " + err.message);
      }
    };
    reader.readAsText(file);
  }
});

// Tambah zona gulma manual
document.getElementById("addZoneBtn").addEventListener("click", () => {
  const x = document.getElementById("xInput").value;
  const y = document.getElementById("yInput").value;
  const area = document.getElementById("areaInput").value;
  const density = document.getElementById("densityInput").value;

  if (!x || !y || !area || !density) {
    alert("Lengkapi X, Y, Area, dan Density terlebih dahulu.");
    return;
  }

  const id = processZone(x, y, area, density);
  if (!id) {
    alert("Nilai X, Y, Area, dan Density harus berupa angka.");
    return;
  }

  document.getElementById("xInput").value = '';
  document.getElementById("yInput").value = '';
  document.getElementById("areaInput").value = '';
  document.getElementById("densityInput").value = '';

  goToZonaGulmaView();
});

// Process Zone Calculation
// skipAllocate = true dipakai saat import banyak zona (alokasi dijalankan sekali di akhir)
function processZone(x, y, area, density, skipAllocate = false) {
  const px = parseFloat(x);
  const py = parseFloat(y);
  const pa = parseFloat(area);
  const pd = parseFloat(density);
  if ([px, py, pa, pd].some(isNaN)) return null;

  const severityScore = pa * pd;
  const id = ++weedZoneCounter;
  weedZones.push({
    id,
    x: px,
    y: py,
    area: pa,
    density: pd,
    score: severityScore
  });
  renderDashboardSummary();
  renderDashboardCharts();

  logActivity('zona-gulma', `Zona baru dicatat di (${px}, ${py}) — area ${pa}m², density ${pd}t, skor prioritas ${severityScore.toFixed(2)}.`);

  if (!skipAllocate) runAllocation([id]);
  return id;
}

// Menavigasi ke Zona Gulma & Render
function goToZonaGulmaView() {
  document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
  if (btnMenuZona) btnMenuZona.classList.add("active");
  showView(viewZonaGulma);
  renderZonaGulma();
}

// Merender tabel zona gulma
function renderZonaGulma() {
  const tbody = document.getElementById("zonesTableBody");
  if (!tbody) return;

  if (weedZones.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada area zona gulma yang tercatat. Import CSV/JSON atau tambahkan manual.</td></tr>`;
    refreshExportButtons();
    return;
  }

  weedZones.sort((a, b) => b.score - a.score);

  tbody.innerHTML = weedZones.map((zone, index) => {
    let priorityBadge = "";
    if (index === 0) {
      priorityBadge = `<span class="badge urgent">#1 TINGGI</span>`;
    } else if (zone.score > 50) {
      priorityBadge = `<span class="badge urgent">URGENT</span>`;
    } else {
      priorityBadge = `<span class="badge normal">NORMAL</span>`;
    }

    return `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td>(${zone.x}, ${zone.y})</td>
        <td>${zone.area} m²</td>
        <td>${zone.density} t</td>
        <td><b>${zone.score.toFixed(2)}</b></td>
        <td>${priorityBadge}</td>
      </tr>
    `;
  }).join('');
  refreshExportButtons();
}

// ========================
// Status Node Toggle Logic
// ========================
function renderDashboardNodeStatus(nodeId, isActive) {
  const dashStatus = document.getElementById(`node-${nodeId}-status`);
  const dashCard = document.getElementById(`node-${nodeId}-card`);
  const dashIcon = dashCard ? dashCard.querySelector('.node-header h3 i') : null;
  if (!dashStatus) return;

  dashStatus.textContent = isActive ? '● AKTIF' : '● MATI';
  dashStatus.className = `status node-status-badge ${isActive ? 'online' : 'offline'}`;
  if (dashIcon) dashIcon.className = `node-status-dot ${isActive ? 'online' : 'offline'}`;
}

document.querySelectorAll('input[data-sn-node]').forEach(checkbox => {
  renderDashboardNodeStatus(checkbox.getAttribute('data-sn-node'), checkbox.checked);
  checkbox.addEventListener('change', () => {
    const nodeId = checkbox.getAttribute('data-sn-node');
    const card = document.getElementById(`sn-node-${nodeId}`);
    const indicator = document.getElementById(`sn-indicator-${nodeId}`);
    const label = document.getElementById(`sn-label-${nodeId}`);
    const badge = document.getElementById(`sn-badge-${nodeId}`);
    const power = document.getElementById(`sn-power-${nodeId}`);
    const servo = document.getElementById(`sn-servo-${nodeId}`);
    const conn = document.getElementById(`sn-conn-${nodeId}`);

    // Also update dashboard node cards
    if (checkbox.checked) {
      // ON
      card.classList.remove('off');
      indicator.className = 'sn-indicator online';
      label.textContent = 'Hardware Aktif';
      badge.textContent = '● SIAP BEROPERASI';
      badge.style.background = '';
      badge.style.color = '';
      power.textContent = 'ON';
      servo.textContent = 'Ready';
      conn.textContent = 'Terhubung';

      renderDashboardNodeStatus(nodeId, true);

      logActivity('status-node', `Node ${nodeId} dinyalakan — hardware aktif & siap beroperasi.`);
    } else {
      // OFF
      card.classList.add('off');
      indicator.className = 'sn-indicator offline';
      label.textContent = 'Hardware Mati';
      badge.textContent = '○ HARDWARE MATI';
      badge.style.background = '#f0f0f0';
      badge.style.color = '#777';
      power.textContent = 'OFF';
      servo.textContent = 'Standby';
      conn.textContent = 'Terputus';

      renderDashboardNodeStatus(nodeId, false);

      logActivity('status-node', `Node ${nodeId} dimatikan — hardware nonaktif.`);
    }
  });
});

// ========================
// Posisi Node A & B — Validasi Kestabilan Posisi
// ========================
// Workflow:
// 1. Terima input posisi (X, Y) yang berbeda untuk Node A dan Node B
// 2. Cek & olah data jarak dari posisi sebelumnya untuk menentukan apakah sudah stabil
// 3. Tampilkan status posisi valid/tidak ke UI

// Ambang batas kestabilan jarak (toleransi selisih/jarak antar posisi berturut-turut)
// Kalau pergeseran posisi node <= nilai ini, node dianggap "stabil"
const STABILITY_THRESHOLD = 0.5; // satuan sama dengan satuan koordinat node (misal meter)

// Penyimpanan posisi tiap node — dipisah per node (A & B) supaya independen,
// masing-masing menyimpan posisi sekarang (current) & posisi sebelumnya (previous)
let nodePositions = {
  A: { current: null, previous: null },
  B: { current: null, previous: null }
};

function renderDashboardCharts() {
  renderDashboardWeedChart();
  renderDashboardPositionChart();
  renderDashboardTankChart();
  refreshExportButtons();
}

function renderDashboardSummary() {
  const priorityValue = document.getElementById('dashboard-priority-value');
  const priorityCaption = document.getElementById('dashboard-priority-caption');
  const sprayTime = document.getElementById('dashboard-spray-time');
  const sprayCaption = document.getElementById('dashboard-spray-caption');
  const herbicideSavings = document.getElementById('dashboard-herbicide-savings');
  const herbicideCaption = document.getElementById('dashboard-herbicide-caption');
  const herbicideDetail = document.getElementById('dashboard-herbicide-detail');
  if (!priorityValue || !priorityCaption || !sprayTime || !sprayCaption
    || !herbicideSavings || !herbicideCaption || !herbicideDetail) return;

  if (weedZones.length === 0) {
    priorityValue.textContent = '—';
    priorityCaption.textContent = 'Belum ada zona terdeteksi';
    sprayTime.textContent = '—';
    sprayCaption.textContent = 'Belum ada zona terdeteksi';
    herbicideSavings.textContent = '—';
    herbicideCaption.textContent = 'Menunggu hasil pemindaian';
    herbicideDetail.textContent = `Baseline lahan: ${CONVENTIONAL_FIELD_AREA_M2} m²`;
    return;
  }

  const topZone = weedZones.reduce((highest, zone) => zone.score > highest.score ? zone : highest);
  const detectedArea = weedZones.reduce((total, zone) => total + Math.max(0, zone.area), 0);
  const targetedArea = Math.min(detectedArea, CONVENTIONAL_FIELD_AREA_M2);
  const savingsPercent = Math.round(
    ((CONVENTIONAL_FIELD_AREA_M2 - targetedArea) / CONVENTIONAL_FIELD_AREA_M2) * 100
  );

  priorityValue.textContent = `Skor ${topZone.score.toFixed(1)}`;
  priorityCaption.textContent = `Zona ${topZone.id}`;
  sprayTime.textContent = `${SPRAY_ESTIMATE_MINUTES.toFixed(1)} Menit`;
  sprayCaption.textContent = `Untuk ${weedZones.length} zona terdeteksi`;
  herbicideSavings.textContent = `${savingsPercent}%`;
  herbicideCaption.textContent = 'Dibandingkan spraying konvensional';
  herbicideDetail.textContent =
    `Zona terdeteksi: ${targetedArea.toFixed(1)} m² dari ${CONVENTIONAL_FIELD_AREA_M2} m²`;
}

function renderDashboardWeedChart() {
  const chart = document.getElementById('dashboard-weed-chart');
  if (!chart) return;
  if (weedZones.length === 0) {
    chart.innerHTML = '<p class="chart-empty">Belum ada zona gulma yang diproses.</p>';
    return;
  }

  const zones = [...weedZones].sort((a, b) => b.score - a.score).slice(0, 6);
  const scales = {
    area: Math.max(...zones.map(zone => zone.area), 1),
    density: Math.max(...zones.map(zone => zone.density), 1),
    score: Math.max(...zones.map(zone => zone.score), 1)
  };
  const metrics = [
    { key: 'area', label: 'Luas (m²)' },
    { key: 'density', label: 'Kepadatan (t)' },
    { key: 'score', label: 'Skor Prioritas' }
  ];
  const plot = { left: 43, right: 484, top: 13, bottom: 184 };
  const groupWidth = (plot.right - plot.left) / zones.length;
  const barWidth = Math.min(14, groupWidth * 0.19);
  const barGap = Math.min(4, groupWidth * 0.055);
  const clusterWidth = metrics.length * barWidth + (metrics.length - 1) * barGap;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = 100 - index * 25;
    const y = plot.top + (index / 4) * (plot.bottom - plot.top);
    return `<line class="weed-chart-grid" x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" />
      <text class="weed-chart-axis-label" x="${plot.left - 7}" y="${y + 3}" text-anchor="end">${value}</text>`;
  }).join('');
  const bars = zones.map((zone, index) => {
    const center = plot.left + groupWidth * (index + 0.5);
    const groupStart = center - clusterWidth / 2;
    const metricBars = metrics.map((metric, metricIndex) => {
      const value = zone[metric.key];
      const normalizedValue = Math.max(0, Math.min(100, (value / scales[metric.key]) * 100));
      const height = (normalizedValue / 100) * (plot.bottom - plot.top);
      const x = groupStart + metricIndex * (barWidth + barGap);
      const y = plot.bottom - height;
      const actualValue = metric.key === 'area'
        ? `${value} m²`
        : metric.key === 'density'
          ? `${value} t`
          : value.toFixed(2);
      return `<rect class="weed-chart-bar weed-series-${metric.key}" x="${x}" y="${y}" width="${barWidth}" height="${height}">
        <title>Zona ${zone.id} (${zone.x}, ${zone.y}) · ${metric.label}: ${actualValue}</title>
      </rect>`;
    }).join('');
    return `${metricBars}
      <text class="weed-chart-category" x="${center}" y="${plot.bottom + 17}" text-anchor="middle">Zona ${zone.id}</text>`;
  }).join('');

  chart.innerHTML = `
    <div class="weed-chart-legend" aria-label="Legenda grafik">
      ${metrics.map(metric => `<span><i class="weed-series-${metric.key}"></i>${metric.label}</span>`).join('')}
    </div>
    <svg class="weed-column-chart" viewBox="0 0 500 218" role="img" aria-label="Grafik batang vertikal hasil pemindaian zona gulma">
      ${grid}
      <line class="weed-chart-axis" x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" />
      ${bars}
    </svg>
    <p class="weed-chart-note">Skala relatif per indikator (0–100%); arahkan kursor ke batang untuk melihat nilai aktual.</p>`;
}

function renderDashboardPositionChart() {
  const chart = document.getElementById('dashboard-position-chart');
  if (!chart) return;

  const nodes = ['A', 'B']
    .map(id => ({ id, ...nodePositions[id] }))
    .filter(node => node.current);
  if (nodes.length === 0) {
    chart.innerHTML = '<p class="chart-empty">Belum ada data posisi node.</p>';
    return;
  }

  const allPositions = nodes.flatMap(node =>
    node.previous ? [node.previous, node.current] : [node.current]
  );
  const minX = Math.min(...allPositions.map(point => point.x));
  const maxX = Math.max(...allPositions.map(point => point.x));
  const minY = Math.min(...allPositions.map(point => point.y));
  const maxY = Math.max(...allPositions.map(point => point.y));
  const xPadding = Math.max((maxX - minX) * 0.15, 1);
  const yPadding = Math.max((maxY - minY) * 0.15, 1);
  const xStart = minX - xPadding;
  const xRange = maxX - minX + xPadding * 2;
  const yStart = minY - yPadding;
  const yRange = maxY - minY + yPadding * 2;
  const plot = { left: 48, right: 476, top: 20, bottom: 188 };
  const xScale = value => plot.left + ((value - xStart) / xRange) * (plot.right - plot.left);
  const yScale = value => plot.bottom - ((value - yStart) / yRange) * (plot.bottom - plot.top);
  const grid = Array.from({ length: 5 }, (_, index) => {
    const fraction = index / 4;
    const y = plot.top + fraction * (plot.bottom - plot.top);
    const value = maxY + yPadding - fraction * yRange;
    return `<line class="position-grid-line" x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" />
      <text class="position-axis-label" x="${plot.left - 8}" y="${y + 4}" text-anchor="end">${value.toFixed(1)}</text>`;
  }).join('');
  const guides = Array.from({ length: 5 }, (_, index) => {
    const fraction = index / 4;
    const x = plot.left + fraction * (plot.right - plot.left);
    const value = xStart + fraction * xRange;
    return `<line class="position-grid-line vertical" x1="${x}" y1="${plot.top}" x2="${x}" y2="${plot.bottom}" />
      <text class="position-axis-label" x="${x}" y="${plot.bottom + 18}" text-anchor="middle">${value.toFixed(1)}</text>`;
  }).join('');
  const marks = nodes.map(node => {
    const currentX = xScale(node.current.x);
    const currentY = yScale(node.current.y);
    const previousMark = node.previous
      ? `<line class="position-trail node-${node.id.toLowerCase()}" x1="${xScale(node.previous.x)}" y1="${yScale(node.previous.y)}" x2="${currentX}" y2="${currentY}" />
         <circle class="position-previous node-${node.id.toLowerCase()}" cx="${xScale(node.previous.x)}" cy="${yScale(node.previous.y)}" r="4" />`
      : '';
    return `${previousMark}
      <circle class="position-point node-${node.id.toLowerCase()}" cx="${currentX}" cy="${currentY}" r="7" />
      <text class="position-point-label" x="${currentX + 10}" y="${currentY - 10}">Node ${node.id}</text>`;
  }).join('');

  chart.innerHTML = `
    <svg class="position-chart" viewBox="0 0 500 228" role="img" aria-label="Grafik koordinat posisi node">
      ${grid}${guides}
      <text class="position-axis-title" x="262" y="224" text-anchor="middle">Koordinat X</text>
      <text class="position-axis-title" x="12" y="105" text-anchor="middle" transform="rotate(-90 12 105)">Koordinat Y</text>
      ${marks}
    </svg>
    <div class="position-legend">
      ${nodes.map(node => `<span><i class="node-${node.id.toLowerCase()}"></i>Node ${node.id}: (${node.current.x}, ${node.current.y})</span>`).join('')}
    </div>`;
}

function renderDashboardTankChart() {
  const chart = document.getElementById('dashboard-tank-chart');
  if (!chart) return;
  if (Object.keys(tankReadings).length === 0) {
    chart.innerHTML = '<p class="chart-empty">Belum ada kalkulasi volume tangki.</p>';
    return;
  }

  chart.innerHTML = `<div class="tank-gauges">${['1', '2'].map(nodeId => {
    const reading = tankReadings[nodeId];
    if (!reading) {
      return `<div class="tank-gauge-item">
        <div class="tank-gauge unavailable"><span>—</span></div>
        <strong>Node ${nodeId}</strong>
        <small>Belum ada data</small>
      </div>`;
    }
    return `<div class="tank-gauge-item">
      <div class="tank-gauge" style="--tank-value:${reading.percent}%">
        <span>${reading.percent.toFixed(0)}<small>%</small></span>
      </div>
      <strong>Node ${nodeId}</strong>
      <small>${reading.volumeLiter.toFixed(1)} L dari ${reading.capacity} L</small>
    </div>`;
  }).join('')}</div>`;
}

// 1. TERIMA INPUT — memasukkan posisi baru, beda alur untuk Node A dan Node B
function setNodePosition(nodeId, x, y) {
  const posX = parseFloat(x);
  const posY = parseFloat(y);

  if (isNaN(posX) || isNaN(posY)) {
    alert(`Masukkan koordinat X dan Y yang valid untuk Node ${nodeId}.`);
    return;
  }

  // Posisi lama (current) digeser jadi posisi pembanding (previous)
  nodePositions[nodeId].previous = nodePositions[nodeId].current;
  nodePositions[nodeId].current = { x: posX, y: posY };

  // 2. Cek & olah data jarak dari posisi sebelumnya
  const stability = checkStability(nodeId);

  // 3. Tampilkan hasil (posisi valid / belum) ke UI
  renderNodePositionStatus(nodeId, stability);

  if (stability.distance === null) {
    logActivity('posisi-node', `Node ${nodeId} mengirim posisi awal (${posX}, ${posY}) — menunggu data pembanding.`);
  } else {
    logActivity('posisi-node', `Node ${nodeId} pindah ke (${posX}, ${posY}) — pergeseran ${stability.distance.toFixed(2)}m, ${stability.isValid ? 'stabil' : 'belum stabil'}.`);
  }

  // Posisi node berubah → alokasi Greedy perlu dihitung ulang
  if (weedZones.length > 0) {
    lbLog(`Posisi Node ${nodeId} berubah → alokasi dihitung ulang`);
    runAllocation();
  }
}

// 2. CEK KESTABILAN — hitung jarak Euclidean antara posisi sekarang & posisi sebelumnya
function checkStability(nodeId) {
  const { current, previous } = nodePositions[nodeId];

  // Data pertama masuk → belum ada pembanding, belum bisa divalidasi
  if (!previous) {
    return { distance: null, isValid: false };
  }

  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Valid/stabil kalau jarak pergeseran masih di bawah ambang batas
  const isValid = distance <= STABILITY_THRESHOLD;

  return { distance, isValid };
}

// 3. TAMPILKAN STATUS — render posisi & status valid ke elemen UI masing-masing node
function renderNodePositionStatus(nodeId, stability) {
  const prefix = `pn${nodeId}`; // contoh: pnA-current, pnB-status
  const { current, previous } = nodePositions[nodeId];

  document.getElementById(`${prefix}-current`).textContent = `(${current.x}, ${current.y})`;
  document.getElementById(`${prefix}-prev`).textContent = previous ? `(${previous.x}, ${previous.y})` : '-';

  const statusEl = document.getElementById(`${prefix}-status`);
  const distanceEl = document.getElementById(`${prefix}-distance`);

  if (stability.distance === null) {
    distanceEl.textContent = '-';
    statusEl.textContent = 'Menunggu Data Pembanding';
    statusEl.className = 'pn-badge pending';
  } else if (stability.isValid) {
    distanceEl.textContent = `${stability.distance.toFixed(2)} m`;
    statusEl.textContent = '✓ Posisi Valid (Stabil)';
    statusEl.className = 'pn-badge valid';
  } else {
    distanceEl.textContent = `${stability.distance.toFixed(2)} m`;
    statusEl.textContent = '✗ Belum Stabil';
    statusEl.className = 'pn-badge invalid';
  }

  renderDashboardCharts();
  renderDashboardSummary();
}

// Tombol submit — Node A dan Node B punya alur/listener masing-masing (independen)
document.getElementById('pnA-submit').addEventListener('click', () => {
  setNodePosition('A', document.getElementById('pnA-x').value, document.getElementById('pnA-y').value);
});
document.getElementById('pnB-submit').addEventListener('click', () => {
  setNodePosition('B', document.getElementById('pnB-x').value, document.getElementById('pnB-y').value);
});

// ========================
// Load Balancing — Greedy per Node + μb, σb, CVb + Rebalancing
// ========================
// Alur:
// Zona gulma → Greedy (skor tertinggi dulu, ke node terdekat) → jumlah tugas per node
// → μb, σb, CVb → badge BALANCED/UNBALANCED → rebalancing jika CVb > threshold → System Log

const CV_THRESHOLD = 0.2;        // CVb di atas ini = UNBALANCED
const MAX_MOVE_DISTANCE = 100;   // jarak maksimum zona boleh dipindah saat rebalancing (satuan koordinat)

// Posisi bawaan node jika belum diinput di halaman Posisi Node
const DEFAULT_NODE_POS = {
  A: { x: 0, y: 0 },
  B: { x: 100, y: 0 }
};

const lbNodes = [
  { id: 'A', tasks: [] },
  { id: 'B', tasks: [] }
];

const lbDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Posisi node: pakai posisi dari halaman Posisi Node kalau sudah ada
function lbNodePos(node) {
  return nodePositions[node.id].current || DEFAULT_NODE_POS[node.id];
}

// ---- System Log (panel Load Balancing) ----
function lbLog(msg, type = '') {
  const box = document.getElementById('system-log');
  if (!box) return;
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = document.createElement('div');
  row.className = `log-row ${type}`.trim();
  row.textContent = `[${time}] ${msg}`;
  box.appendChild(row);
  while (box.children.length > 100) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

// ---- 1) Greedy: zona skor tertinggi dulu, ke node terdekat ----
function allocateGreedy() {
  lbNodes.forEach(n => (n.tasks = []));
  [...weedZones]
    .sort((a, b) => b.score - a.score)
    .forEach(z => {
      const nearest = lbNodes.reduce((best, n) =>
        lbDist(lbNodePos(n), z) < lbDist(lbNodePos(best), z) ? n : best
      );
      nearest.tasks.push(z);
    });
}

// ---- 2) Metrik μb, σb, CVb ----
function computeMetrics() {
  const counts = lbNodes.map(n => n.tasks.length);
  const mu = counts.reduce((s, c) => s + c, 0) / counts.length;
  const sigma = Math.sqrt(counts.reduce((s, c) => s + (c - mu) ** 2, 0) / counts.length);
  const cv = mu === 0 ? 0 : sigma / mu;
  return { counts, mu, sigma, cv };
}

// ---- 3) Rebalancing: pindahkan zona dari node berat ke node ringan ----
function rebalance() {
  let guard = 50;
  while (computeMetrics().cv > CV_THRESHOLD && guard--) {
    const sorted = [...lbNodes].sort((a, b) => b.tasks.length - a.tasks.length);
    const heavy = sorted[0];
    const light = sorted[sorted.length - 1];
    if (heavy.tasks.length - light.tasks.length < 2) break;

    // zona di node berat yang paling dekat ke node ringan
    const candidate = heavy.tasks
      .map(z => ({ z, d: lbDist(lbNodePos(light), z) }))
      .sort((a, b) => a.d - b.d)[0];

    if (!candidate || candidate.d > MAX_MOVE_DISTANCE) {
      lbLog(`Rebalancing dihentikan: Zona ${candidate?.z.id} terlalu jauh (${candidate?.d.toFixed(0)})`, 'warn');
      break;
    }

    heavy.tasks = heavy.tasks.filter(z => z !== candidate.z);
    light.tasks.push(candidate.z);
    lbLog(`Rebalancing: Zona ${candidate.z.id} dipindah Node ${heavy.id} → Node ${light.id}`, 'action');
    logActivity('zona-gulma', `Rebalancing: Zona (${candidate.z.x}, ${candidate.z.y}) dipindah dari Node ${heavy.id} ke Node ${light.id}.`);
  }
}

// ---- 4) Render panel μb, σb, CVb + badge ----
function renderLbMetrics(writeLog = true) {
  const { counts, mu, sigma, cv } = computeMetrics();

  const muEl = document.getElementById('mu-value');
  const sigmaEl = document.getElementById('sigma-value');
  const cvEl = document.getElementById('cv-value');
  const badge = document.getElementById('balance-badge');

  if (muEl) muEl.textContent = mu.toFixed(2);
  if (sigmaEl) sigmaEl.textContent = sigma.toFixed(2);
  if (cvEl) cvEl.textContent = cv.toFixed(2);

  const balanced = cv <= CV_THRESHOLD;
  if (badge) {
    badge.textContent = balanced ? 'BALANCED' : 'UNBALANCED';
    badge.className = balanced ? 'balanced' : 'unbalanced';
  }

  if (writeLog) {
    lbLog(
      `Beban: Node A = ${counts[0]}, Node B = ${counts[1]} | μb=${mu.toFixed(2)} σb=${sigma.toFixed(2)} CVb=${cv.toFixed(2)}`,
      balanced ? 'ok' : 'warn'
    );
  }
}

// ---- Alur utama: dipanggil tiap ada zona baru / posisi node berubah ----
function runAllocation(newIds = []) {
  allocateGreedy();

  newIds.forEach(id => {
    const owner = lbNodes.find(n => n.tasks.some(z => z.id === id));
    if (owner) lbLog(`Greedy: Zona ${id} → Node ${owner.id}`);
  });

  const m = computeMetrics();
  if (m.cv > CV_THRESHOLD) {
    lbLog(`CVb ${m.cv.toFixed(2)} > ${CV_THRESHOLD} → UNBALANCED, rebalancing dipicu`, 'warn');
    rebalance();
  }
  renderLbMetrics();
}

// Tombol tes opsional (kalau ada <button id="btn-add-zone"> di HTML)
const btnAddRandomZone = document.getElementById('btn-add-zone');
if (btnAddRandomZone) {
  btnAddRandomZone.addEventListener('click', () => {
    processZone(
      (Math.random() * 100).toFixed(1),
      (Math.random() * 100).toFixed(1),
      (1 + Math.random() * 9).toFixed(1),
      (Math.random() * 10).toFixed(1)
    );
    renderZonaGulma();
  });
}

// Tampilkan nilai awal panel (0.00 + BALANCED)
renderLbMetrics(false);

// ========================
// Volume Tangki — Kalibrasi Sensor Ultrasonik ke Volume/Persen
// ========================
// Workflow:
// 1. Terima input: tinggi tangki (cm), kapasitas (liter), jarak sensor ke permukaan air (cm)
// 2. Kalibrasi: ubah jarak sensor menjadi tinggi cairan, lalu ke volume liter & persen
// 3. Tampilkan hasil (volume, persen, progress bar, status) ke UI

// Ambang batas peringatan — di bawah ini dianggap "perlu isi ulang"
const REFILL_THRESHOLD_PERCENT = 20; // dalam persen (%)

// 1 & 2. TERIMA INPUT + KALIBRASI — ubah jarak sensor jadi tinggi cairan, lalu ke volume & persen
function calculateTankVolume(nodeId) {
  const height = parseFloat(document.getElementById(`vt-height-${nodeId}`).value);
  const capacity = parseFloat(document.getElementById(`vt-capacity-${nodeId}`).value);
  const distance = parseFloat(document.getElementById(`vt-distance-${nodeId}`).value);

  if (isNaN(height) || isNaN(capacity) || isNaN(distance)) {
    alert(`Lengkapi tinggi tangki, kapasitas, dan jarak sensor untuk Node ${nodeId}.`);
    return;
  }
  if (distance < 0 || distance > height) {
    alert(`Jarak sensor Node ${nodeId} tidak valid (harus antara 0 - ${height} cm).`);
    return;
  }

  // Kalibrasi: jarak sensor ke permukaan air → tinggi cairan → volume & persen
  const liquidHeight = height - distance;           // makin dekat sensor ke air, makin penuh
  const percent = (liquidHeight / height) * 100;     // persentase sisa cairan
  const volumeLiter = (percent / 100) * capacity;    // volume dalam liter

  // 3. Tampilkan hasil ke UI
  const reading = { distance, height, capacity, percent, volumeLiter };
  renderTankStatus(nodeId, reading);
  tankReadings[nodeId] = reading;
  renderDashboardCharts();

  logActivity('volume-tangki', `Tangki Node ${nodeId} dihitung — jarak sensor ${distance}cm → ${percent.toFixed(0)}% (${volumeLiter.toFixed(0)}L) sisa cairan.`);
}

// 3. TAMPILKAN STATUS — render volume, persen, progress bar, dan status ke elemen UI
function renderTankStatus(nodeId, data) {
  document.getElementById(`vt-percent-label-${nodeId}`).textContent =
    `${data.percent.toFixed(0)}% (${data.volumeLiter.toFixed(0)}L)`;
  document.getElementById(`vt-bar-${nodeId}`).style.width = `${data.percent.toFixed(0)}%`;
  document.getElementById(`vt-distance-label-${nodeId}`).textContent = data.distance;
  document.getElementById(`vt-height-label-${nodeId}`).textContent = data.height;

  const statusEl = document.getElementById(`vt-status-${nodeId}`);
  if (data.percent <= REFILL_THRESHOLD_PERCENT) {
    statusEl.textContent = '⚠ Perlu Isi Ulang';
    statusEl.className = 'pn-badge invalid';
  } else {
    statusEl.textContent = '✓ Cairan Cukup';
    statusEl.className = 'pn-badge valid';
  }
}

// Tombol kalkulasi — tiap node independen
document.getElementById('vt-submit-1').addEventListener('click', () => calculateTankVolume('1'));
document.getElementById('vt-submit-2').addEventListener('click', () => calculateTankVolume('2'));

// ========================
// Export Hasil Data
// ========================
function getWeedExportRows() {
  return [...weedZones]
    .sort((a, b) => b.score - a.score)
    .map((zone, index) => [
      index + 1,
      `(${zone.x}, ${zone.y})`,
      zone.area,
      zone.density,
      zone.score.toFixed(2),
      index === 0 ? 'Prioritas Tinggi' : zone.score > 50 ? 'Urgent' : 'Normal'
    ]);
}

function getPositionExportRows() {
  return ['A', 'B']
    .filter(nodeId => nodePositions[nodeId].current)
    .map(nodeId => {
      const { current, previous } = nodePositions[nodeId];
      const stability = checkStability(nodeId);
      const status = stability.distance === null
        ? 'Menunggu data pembanding'
        : stability.isValid
          ? 'Stabil'
          : 'Belum stabil';
      return [
        `Node ${nodeId}`,
        current.x,
        current.y,
        previous ? previous.x : 'Belum ada',
        previous ? previous.y : 'Belum ada',
        stability.distance === null ? 'Belum tersedia' : `${stability.distance.toFixed(2)} m`,
        status
      ];
    });
}

function getTankExportRows() {
  return ['1', '2']
    .filter(nodeId => tankReadings[nodeId])
    .map(nodeId => {
      const reading = tankReadings[nodeId];
      return [
        `Node ${nodeId}`,
        reading.height,
        reading.capacity,
        reading.distance,
        reading.percent.toFixed(1),
        reading.volumeLiter.toFixed(2),
        reading.percent <= REFILL_THRESHOLD_PERCENT ? 'Perlu isi ulang' : 'Cairan cukup'
      ];
    });
}

function getDashboardExportSections() {
  const dashboardText = id => document.getElementById(id)?.textContent.trim() || '—';
  const chartCards = [...document.querySelectorAll('#view-dashboard .chart-card')];
  const chartRows = chartCards.map(card => [
    card.querySelector('h3')?.textContent.trim() || 'Diagram',
    card.querySelector('.chart-eyebrow')?.textContent.trim() || '',
    card.querySelector('.chart-description')?.textContent.trim() || '',
    card.querySelector('.chart-content')?.textContent.replace(/\s+/g, ' ').trim() || 'Belum ada data'
  ]);
  const positionRows = getPositionExportRows();
  const tankRows = getTankExportRows();

  return [
    {
      title: 'Ringkasan Dashboard',
      columns: ['Indikator', 'Nilai', 'Keterangan', 'Detail'],
      rows: [
        [
          'Indeks Prioritas Utama',
          dashboardText('dashboard-priority-value'),
          dashboardText('dashboard-priority-caption'),
          dashboardText('dashboard-priority-value') === '—'
            ? 'Berdasarkan Luas × Kepadatan'
            : 'Skor prioritas tertinggi berdasarkan Luas × Kepadatan'
        ],
        [
          'Perkiraan Waktu Semprot',
          dashboardText('dashboard-spray-time'),
          dashboardText('dashboard-spray-caption'),
          'Estimasi untuk seluruh zona'
        ],
        [
          'Estimasi Hemat Herbisida',
          dashboardText('dashboard-herbicide-savings'),
          dashboardText('dashboard-herbicide-caption'),
          dashboardText('dashboard-herbicide-detail')
        ]
      ]
    },
    {
      title: 'Status Node',
      columns: ['Node', 'Status'],
      rows: ['1', '2'].map(nodeId => [
        `Node ${nodeId}`,
        dashboardText(`node-${nodeId}-status`)
      ])
    },
    {
      title: 'Diagram Dashboard',
      columns: ['Diagram', 'Kategori', 'Keterangan', 'Data/Status pada diagram'],
      rows: chartRows
    },
    {
      title: 'Data Zona Gulma',
      columns: ['Prioritas', 'Koordinat', 'Luas Area (m2)', 'Kepadatan (t)', 'Skor Prioritas', 'Status'],
      rows: getWeedExportRows().length
        ? getWeedExportRows()
        : [['—', '—', '—', '—', '—', 'Belum ada zona gulma yang diproses']]
    },
    {
      title: 'Data Posisi Node',
      columns: ['Node', 'Posisi X', 'Posisi Y', 'Sebelumnya X', 'Sebelumnya Y', 'Pergeseran', 'Status'],
      rows: positionRows.length
        ? positionRows
        : ['A', 'B'].map(nodeId => [
          `Node ${nodeId}`, '—', '—', '—', '—', '—', 'Belum ada data posisi node'
        ])
    },
    {
      title: 'Data Volume Tangki',
      columns: ['Node', 'Tinggi Tangki (cm)', 'Kapasitas (L)', 'Jarak Sensor (cm)', 'Sisa (%)', 'Volume (L)', 'Status'],
      rows: tankRows.length
        ? tankRows
        : ['1', '2'].map(nodeId => [
          `Node ${nodeId}`, '—', '—', '—', '—', '—', 'Belum ada kalkulasi volume tangki'
        ])
    }
  ];
}

function getExportSections(scope) {
  if (scope === 'dashboard') return getDashboardExportSections();

  const weedRows = getWeedExportRows();
  const positionRows = getPositionExportRows();
  const tankRows = getTankExportRows();
  const sections = {
    'zona-gulma': [{
      title: 'Data Zona Gulma',
      columns: ['Prioritas', 'Koordinat', 'Luas Area (m2)', 'Kepadatan (t)', 'Skor Prioritas', 'Status'],
      rows: weedRows
    }],
    'posisi-node': [{
      title: 'Data Posisi Node',
      columns: ['Node', 'Posisi X', 'Posisi Y', 'Sebelumnya X', 'Sebelumnya Y', 'Pergeseran', 'Status'],
      rows: positionRows
    }],
    'volume-tangki': [{
      title: 'Data Volume Tangki',
      columns: ['Node', 'Tinggi Tangki (cm)', 'Kapasitas (L)', 'Jarak Sensor (cm)', 'Sisa (%)', 'Volume (L)', 'Status'],
      rows: tankRows
    }]
  };
  return sections[scope] || [];
}

function refreshExportButtons() {
  document.querySelectorAll('[data-export-container]').forEach(container => {
    const hasResults = container.dataset.exportContainer === 'dashboard'
      || getExportSections(container.dataset.exportContainer)
      .some(section => section.rows.length > 0);
    container.hidden = !hasResults;
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildReportFileName(scope, format) {
  const scopeName = {
    dashboard: 'dashboard',
    'zona-gulma': 'zona-gulma',
    'posisi-node': 'posisi-node',
    'volume-tangki': 'volume-tangki'
  }[scope];
  return `hasil-${scopeName}-${new Date().toISOString().slice(0, 10)}.${format}`;
}

function exportCsv(sections) {
  const rows = [];
  sections.forEach((section, index) => {
    if (index) rows.push([]);
    rows.push([section.title], section.columns, ...section.rows);
  });
  const csv = rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  return new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
}

async function captureDashboardCharts() {
  const { default: html2canvas } = await import('html2canvas');
  const cards = [...document.querySelectorAll('#view-dashboard .chart-card')];
  const images = [];

  for (const card of cards) {
    const tankChart = card.querySelector('#dashboard-tank-chart');
    const canvas = tankChart
      ? captureTankChartCanvas(card, tankChart)
      : await html2canvas(card, {
        backgroundColor: '#ffffff',
        logging: false,
        scale: 2
      });
    images.push({
      title: card.querySelector('h3')?.textContent.trim() || 'Diagram Dashboard',
      data: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    });
  }

  return images;
}

function captureTankChartCanvas(card, chart) {
  const cardBounds = card.getBoundingClientRect();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(cardBounds.width * scale);
  canvas.height = Math.ceil(cardBounds.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tidak dapat menyiapkan gambar diagram volume tangki.');

  context.scale(scale, scale);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, cardBounds.width, cardBounds.height);

  const eyebrow = card.querySelector('.chart-eyebrow');
  const title = card.querySelector('.chart-heading h3');
  const description = card.querySelector('.chart-description');
  const drawElementText = (element, color, fontSize, fontWeight = 400) => {
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    context.fillStyle = color;
    context.font = `${fontWeight} ${fontSize}px Inter, Arial, sans-serif`;
    context.textBaseline = 'top';
    context.fillText(
      element.textContent.trim(),
      bounds.left - cardBounds.left,
      bounds.top - cardBounds.top
    );
  };

  drawElementText(eyebrow, '#139446', 9, 800);
  drawElementText(title, '#173b2a', 16, 700);
  if (description) {
    const bounds = description.getBoundingClientRect();
    context.fillStyle = '#718b82';
    context.font = '400 11px Inter, Arial, sans-serif';
    context.textBaseline = 'top';
    context.fillText(
      description.textContent.trim(),
      bounds.left - cardBounds.left,
      bounds.top - cardBounds.top,
      bounds.width
    );
  }

  chart.querySelectorAll('.tank-gauge-item').forEach(item => {
    const gauge = item.querySelector('.tank-gauge');
    const value = item.querySelector('.tank-gauge>span');
    const nodeLabel = item.querySelector('strong');
    const readingLabel = item.querySelector('small');
    if (!gauge || !value) return;

    const bounds = gauge.getBoundingClientRect();
    const centerX = bounds.left - cardBounds.left + bounds.width / 2;
    const centerY = bounds.top - cardBounds.top + bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) / 2 - 1;
    const percent = Number.parseFloat(value.textContent) || 0;
    const isUnavailable = gauge.classList.contains('unavailable');

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = isUnavailable ? '#dfe8e3' : '#e6efea';
    context.lineWidth = 9;
    context.stroke();

    if (!isUnavailable && percent > 0) {
      context.beginPath();
      context.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent) / 100);
      context.strokeStyle = '#18a653';
      context.lineWidth = 9;
      context.stroke();
    }

    context.fillStyle = '#123b27';
    context.font = '800 25px Inter, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(value.textContent.trim(), centerX, centerY);
    context.textAlign = 'start';

    drawElementText(nodeLabel, '#244b38', 11, 700);
    drawElementText(readingLabel, '#718b82', 9);
  });

  return canvas;
}

async function exportExcel(sections, chartImages = []) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  sections.forEach(section => {
    const sheetName = section.title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Data';
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.addRow([section.title]);
    worksheet.addRow(section.columns);
    section.rows.forEach(row => worksheet.addRow(row));
  });
  if (chartImages.length) {
    const worksheet = workbook.addWorksheet('Dashboard Charts');
    let row = 0;
    chartImages.forEach(image => {
      const imageId = workbook.addImage({ base64: image.data, extension: 'png' });
      const width = 900;
      const height = Math.round(width * image.height / image.width);
      worksheet.getCell(row + 1, 1).value = image.title;
      worksheet.addImage(imageId, {
        tl: { col: 0, row: row + 1 },
        ext: { width, height }
      });
      row += Math.ceil(height / 20) + 3;
    });
  }
  return workbook.xlsx.writeBuffer();
}

async function exportWord(sections, scope, chartImages = []) {
  const { Document, HeadingLevel, ImageRun, Packer, Paragraph } = await import('docx');
  const paragraphs = [
    new Paragraph({ text: `Laporan ${scope.replace(/-/g, ' ')}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Diekspor: ${new Date().toLocaleString('id-ID')}` })
  ];
  sections.forEach(section => {
    paragraphs.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
    paragraphs.push(new Paragraph({ text: section.columns.join(' | ') }));
    section.rows.forEach(row => paragraphs.push(new Paragraph({ text: row.join(' | ') })));
  });
  chartImages.forEach(image => {
    const base64 = image.data.slice(image.data.indexOf(',') + 1);
    const binary = atob(base64);
    const imageData = Uint8Array.from(binary, character => character.charCodeAt(0));
    const width = 600;
    const height = Math.round(width * image.height / image.width);
    paragraphs.push(new Paragraph({ text: image.title, heading: HeadingLevel.HEADING_1 }));
    paragraphs.push(new Paragraph({
      children: [new ImageRun({
        data: imageData,
        type: 'png',
        transformation: { width, height }
      })]
    }));
  });
  const document = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBlob(document);
}

async function exportPdf(sections, scope, chartImages = []) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = 18;
  const writeLines = (text, size, gapAfter) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text), pageWidth - margin * 2);
    lines.forEach(line => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(line, margin, y);
      y += size * 0.48;
    });
    y += gapAfter;
  };

  writeLines(`Laporan ${scope.replace(/-/g, ' ')}`, 16, 2);
  writeLines(`Diekspor: ${new Date().toLocaleString('id-ID')}`, 9, 5);
  sections.forEach(section => {
    writeLines(section.title, 13, 1);
    section.rows.forEach((row, index) => {
      const detail = section.columns.map((column, columnIndex) =>
        `${column}: ${row[columnIndex]}`
      ).join(' | ');
      writeLines(detail, 9, 1);
      if (index < section.rows.length - 1) y += 1;
    });
    y += 4;
  });
  chartImages.forEach(image => {
    pdf.addPage('a4', 'landscape');
    pdf.setFontSize(14);
    pdf.text(image.title, margin, 17);
    const imagePageWidth = pdf.internal.pageSize.getWidth();
    const imagePageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = imagePageWidth - margin * 2;
    const availableHeight = imagePageHeight - 30;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    pdf.addImage(image.data, 'PNG', (imagePageWidth - width) / 2, 23, width, height);
  });
  return pdf.output('blob');
}

async function handleExport(scope, format) {
  try {
    const sections = getExportSections(scope).filter(section => section.rows.length > 0);
    if (!sections.length) {
      alert('Belum ada hasil data untuk diunduh.');
      return;
    }

    const fileName = buildReportFileName(scope, format);
    const chartImages = scope === 'dashboard' && format !== 'csv'
      ? await captureDashboardCharts()
      : [];
    if (format === 'csv') {
      downloadBlob(exportCsv(sections), fileName);
    } else if (format === 'xlsx') {
      downloadBlob(new Blob([await exportExcel(sections, chartImages)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }), fileName);
    } else if (format === 'docx') {
      downloadBlob(await exportWord(sections, scope, chartImages), fileName);
    } else if (format === 'pdf') {
      downloadBlob(await exportPdf(sections, scope, chartImages), fileName);
    } else {
      throw new Error(`Format unduhan tidak dikenal: ${format}`);
    }
  } catch (error) {
    console.error('Gagal mengekspor hasil data:', error);
    alert(`Gagal membuat file unduhan: ${error.message}`);
  }
}

document.querySelectorAll('.export-btn').forEach(button => {
  button.addEventListener('click', () => {
    handleExport(button.dataset.exportScope, button.dataset.exportFormat);
  });
});

// ========================
// Log Histori — Rekaman Realtime Semua Aktivitas
// ========================
// Workflow:
// 1. Setiap modul (Zona Gulma, Status Node, Posisi Node A&B, Volume Tangki) memanggil
//    logActivity(kategori, pesan) tiap kali ada aksi/hasil baru.
// 2. Semua entry disimpan di array `activityLog` (in-memory, terbaru di paling atas).
// 3. Halaman Log Histori menampilkan daftar ini, bisa difilter lewat tab bar
//    (Semua / Zona Gulma / Status Node / Posisi Node A&B / Volume Tangki).

let activityLog = [];
let activeLogFilter = 'all';

// Label & ikon per kategori — dipakai buat render tab & item log
const LOG_CATEGORY_META = {
  'zona-gulma': { label: 'Zona Gulma', icon: '🌿' },
  'status-node': { label: 'Status Node', icon: '📡' },
  'posisi-node': { label: 'Posisi Node A&B', icon: '📍' },
  'volume-tangki': { label: 'Volume Tangki', icon: '💧' },
};

// 1. CATAT — dipanggil dari modul lain tiap ada aksi/hasil baru
function logActivity(category, message) {
  activityLog.unshift({
    time: new Date(),
    category,
    message
  });
  renderLogHistori();
}

// Format waktu singkat: HH:MM:SS
function formatLogTime(date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// 2 & 3. FILTER + TAMPILKAN — render daftar log sesuai tab yang aktif
function renderLogHistori() {
  const listEl = document.getElementById('lh-list');
  if (!listEl) return; // view belum ada di HTML

  const filtered = activeLogFilter === 'all'
    ? activityLog
    : activityLog.filter(entry => entry.category === activeLogFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="lh-empty">Belum ada aktivitas tercatat untuk kategori ini.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(entry => {
    const meta = LOG_CATEGORY_META[entry.category] || { label: entry.category, icon: '•' };
    return `
      <div class="lh-item">
        <div class="lh-item-icon">${meta.icon}</div>
        <div class="lh-item-body">
          <div class="lh-item-top">
            <span class="lh-item-cat">${meta.label}</span>
            <span class="lh-item-time">${formatLogTime(entry.time)}</span>
          </div>
          <div class="lh-item-text">${entry.message}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Klik tab — ganti filter aktif tanpa reload
document.querySelectorAll('.lh-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lh-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeLogFilter = tab.getAttribute('data-lh-filter');
    renderLogHistori();
  });
});

// ========================
// Logout
// ========================
document.getElementById("logoutBtn").addEventListener("click", () => {
  const confirmed = confirm("Apakah Anda yakin ingin logout?");
  if (confirmed) {
    alert("Logout berhasil.");
  }
});

renderDashboardCharts();