// Data State
let weedZones = [];

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
            data.forEach(item => processZone(item.x, item.y, item.area, item.density));
            alert(`Berhasil import ${data.length} zona dari JSON.`);
            goToZonaGulmaView();
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = e.target.result.split('\n');
          let count = 0;
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            if (cols.length >= 4) {
              processZone(cols[0], cols[1], cols[2], cols[3]);
              count++;
            }
          }
          alert(`Berhasil import ${count} zona dari CSV.`);
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

  processZone(x, y, area, density);

  document.getElementById("xInput").value = '';
  document.getElementById("yInput").value = '';
  document.getElementById("areaInput").value = '';
  document.getElementById("densityInput").value = '';

  goToZonaGulmaView();
});

// Process Zone Calculation
function processZone(x, y, area, density) {
  const severityScore = parseFloat(area) * parseFloat(density);
  weedZones.push({
    x: parseFloat(x),
    y: parseFloat(y),
    area: parseFloat(area),
    density: parseFloat(density),
    score: severityScore
  });

  logActivity('zona-gulma', `Zona baru dicatat di (${x}, ${y}) — area ${area}m², density ${density}t, skor prioritas ${severityScore.toFixed(2)}.`);
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
}

// ========================
// Status Node Toggle Logic
// ========================
document.querySelectorAll('input[data-sn-node]').forEach(checkbox => {
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
    const dashStatus = document.getElementById(`node-${nodeId}-status`);
    const dashCard = document.getElementById(`node-${nodeId}-card`);
    const dashIcon = dashCard ? dashCard.querySelector('.node-header h3 i') : null;

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

      if (dashStatus) {
        dashStatus.textContent = '● SIAP BEROPERASI';
        dashStatus.style.background = '';
        dashStatus.style.color = '';
      }
      if (dashCard) dashCard.style.opacity = '1';
      if (dashIcon) dashIcon.style.background = '#10bb54';

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

      if (dashStatus) {
        dashStatus.textContent = '○ HARDWARE MATI';
        dashStatus.style.background = '#f0f0f0';
        dashStatus.style.color = '#777';
      }
      if (dashCard) dashCard.style.opacity = '0.6';
      if (dashIcon) dashIcon.style.background = '#777';

      logActivity('status-node', `Node ${nodeId} dimatikan — hardware nonaktif.`);
    }
  });
});

// ========================
// Dashboard Node Toggle Buttons (existing)
// ========================
document.querySelectorAll('.node-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const nodeId = btn.getAttribute('data-node');
    const statusEl = document.getElementById(`node-${nodeId}-status`);
    const cardEl = document.getElementById(`node-${nodeId}-card`);
    const iconEl = cardEl ? cardEl.querySelector('.node-header h3 i') : null;

    // Sync with Status Node page toggle
    const snCheckbox = document.querySelector(`input[data-sn-node="${nodeId}"]`);

    if (btn.textContent.trim() === 'Matikan Hardware') {
      btn.textContent = 'Nyalakan Hardware';
      btn.style.background = '#eaf9f0';
      btn.style.color = '#0c9d43';
      if (statusEl) { statusEl.textContent = '○ HARDWARE MATI'; statusEl.style.background = '#f0f0f0'; statusEl.style.color = '#777'; }
      if (iconEl) iconEl.style.background = '#777';
      if (cardEl) cardEl.style.opacity = '0.6';
      if (snCheckbox) { snCheckbox.checked = false; snCheckbox.dispatchEvent(new Event('change')); }
    } else {
      btn.textContent = 'Matikan Hardware';
      btn.style.background = '#fee';
      btn.style.color = '#d12e2e';
      if (statusEl) { statusEl.textContent = '● SIAP BEROPERASI'; statusEl.style.background = ''; statusEl.style.color = ''; }
      if (iconEl) iconEl.style.background = '#10bb54';
      if (cardEl) cardEl.style.opacity = '1';
      if (snCheckbox) { snCheckbox.checked = true; snCheckbox.dispatchEvent(new Event('change')); }
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
}

// Tombol submit — Node A dan Node B punya alur/listener masing-masing (independen)
document.getElementById('pnA-submit').addEventListener('click', () => {
  setNodePosition('A', document.getElementById('pnA-x').value, document.getElementById('pnA-y').value);
});
document.getElementById('pnB-submit').addEventListener('click', () => {
  setNodePosition('B', document.getElementById('pnB-x').value, document.getElementById('pnB-y').value);
});

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
  renderTankStatus(nodeId, { distance, height, percent, volumeLiter });

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

  // Sinkronkan juga ke tank di halaman Dashboard (opsional, biar konsisten)
  const dashBar = document.querySelector(`#node-${nodeId}-card .progress span`);
  const dashLabel = document.querySelector(`#node-${nodeId}-card .tank-title strong`);
  if (dashBar) dashBar.style.width = `${data.percent.toFixed(0)}%`;
  if (dashLabel) dashLabel.textContent = `${data.percent.toFixed(0)}% (${data.volumeLiter.toFixed(0)}L)`;
}

// Tombol kalkulasi — tiap node independen
document.getElementById('vt-submit-1').addEventListener('click', () => calculateTankVolume('1'));
document.getElementById('vt-submit-2').addEventListener('click', () => calculateTankVolume('2'));

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