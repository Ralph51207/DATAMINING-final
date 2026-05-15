const stepData = [
  { title: "Dataset Acquisition", detail: "Load UCI heart records and target classes." },
  { title: "Cleaning + Imputation", detail: "Fix data types and handle missing values." },
  { title: "Exploratory Analysis", detail: "Generate summary statistics and visuals." },
  { title: "Association Rules", detail: "Mine frequent clinical attribute patterns." },
  { title: "Patient Archetypes", detail: "Cluster patient profiles for segmentation." },
  { title: "Model Comparison", detail: "Compare classifier performance metrics." },
];
const numericDefaults = ["Age", "RestingBP", "Cholesterol", "MaxHR", "Oldpeak"];

const statusBar = document.getElementById("statusBar");
const runBtn = document.getElementById("runBtn");
const progressFill = document.getElementById("progressFill");
const stepsEl = document.getElementById("steps");
const artifactGrid = document.getElementById("artifactGrid");
const logOutput = document.getElementById("logOutput");
const previewTitle = document.getElementById("previewTitle");
const previewContent = document.getElementById("previewContent");
const datasetMeta = document.getElementById("datasetMeta");
const datasetHead = document.querySelector("#datasetTable thead");
const datasetBody = document.querySelector("#datasetTable tbody");
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");
const colorSelect = document.getElementById("colorSelect");
const metricSelect = document.getElementById("metricSelect");
const imageSelect = document.getElementById("imageSelect");
const scatterPlot = document.getElementById("scatterPlot");
const plotImage = document.getElementById("plotImage");
const plotSummary = document.getElementById("plotSummary");
const plotFallback = document.getElementById("plotFallback");
const plotLegend = document.getElementById("plotLegend");
const vizMenu = document.getElementById("vizMenu");
const metricLabel = document.getElementById("metricLabel");
const imageLabel = document.getElementById("imageLabel");

let latestArtifacts = [];
let latestMetrics = [];
let datasetRows = [];
let datasetColumns = [];
let numericColumns = [];
let currentViz = "scatter";

function renderSteps(activeIndex = 0) {
  stepsEl.innerHTML = "";
  stepData.forEach((step, idx) => {
    const card = document.createElement("article");
    card.className = `step${idx === activeIndex ? " active" : ""}`;
    card.innerHTML = `<div class="step-num">${String(idx + 1).padStart(2, "0")}</div><h3>${step.title}</h3><p>${step.detail}</p>`;
    stepsEl.appendChild(card);
  });
}

function updateStatus(status) {
  const pill = statusBar.querySelector(".status-pill");
  const text = statusBar.querySelector(".status-text");
  pill.dataset.status = status.state;
  pill.textContent = status.state.toUpperCase();
  text.textContent = status.message || "";
  progressFill.style.width = `${status.progress || 0}%`;
  runBtn.disabled = status.state === "running";
  renderSteps(status.current_step_index || 0);
}

function setLog(logs) {
  logOutput.textContent = logs && logs.length ? logs.join("\n") : "Waiting for a run...";
}

function getActiveFilter() {
  const active = document.querySelector("#artifactFilters .chip.active");
  return active ? active.dataset.filter : "all";
}

function renderArtifacts(filter = "all") {
  artifactGrid.innerHTML = "";
  const filtered = latestArtifacts.filter((item) => filter === "all" || item.type === filter);
  if (!filtered.length) {
    artifactGrid.innerHTML = "<div class=\"muted\">No outputs in this category.</div>";
    return;
  }
  filtered.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "artifact-item";
    btn.innerHTML = `<span class="artifact-name">${item.name}</span><span class="artifact-type">${item.type.toUpperCase()}</span>`;
    btn.addEventListener("click", () => previewArtifact(item));
    artifactGrid.appendChild(btn);
  });
}

async function previewArtifact(item) {
  previewTitle.textContent = item.name;
  if (item.type === "chart" && item.preview) {
    previewContent.innerHTML = `<img class="preview-img" src="${item.preview}" alt="${item.name}" />`;
    return;
  }
  try {
    const res = await fetch(`/api/output/${encodeURIComponent(item.name)}`);
    if (!res.ok) throw new Error("preview fetch failed");
    const text = await res.text();
    previewContent.innerHTML = `<pre>${escapeHtml(text.slice(0, 60000))}</pre>`;
  } catch (_err) {
    previewContent.textContent = "Preview not available for this file.";
  }
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function fetchDataset() {
  try {
    const res = await fetch("/api/dataset?limit=5000");
    if (!res.ok) throw new Error("dataset fetch failed");
    const data = await res.json();
    datasetColumns = data.columns || [];
    datasetRows = data.sample_rows || [];
    datasetMeta.textContent = `${data.name} | rows ${data.row_count} | cols ${datasetColumns.length} | loaded ${data.sample_size}`;
    renderDatasetTable(datasetColumns, datasetRows.slice(0, 40));
    setupPlotControls();
    renderCurrentViz();
  } catch (_err) {
    datasetMeta.textContent = "Could not load dataset.";
    plotFallback.style.display = "block";
  }
}

function renderDatasetTable(columns, rows) {
  datasetHead.innerHTML = "";
  datasetBody.innerHTML = "";
  const trHead = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    trHead.appendChild(th);
  });
  datasetHead.appendChild(trHead);
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = row[col] ?? "";
      tr.appendChild(td);
    });
    datasetBody.appendChild(tr);
  });
}

function setupPlotControls() {
  numericColumns = datasetColumns.filter((col) => {
    let valid = 0;
    for (let i = 0; i < Math.min(80, datasetRows.length); i += 1) {
      const v = Number(datasetRows[i][col]);
      if (Number.isFinite(v)) valid += 1;
    }
    return valid >= 10;
  });
  xSelect.innerHTML = "";
  ySelect.innerHTML = "";
  numericColumns.forEach((col) => {
    const ox = document.createElement("option");
    ox.value = col;
    ox.textContent = col;
    const oy = ox.cloneNode(true);
    xSelect.appendChild(ox);
    ySelect.appendChild(oy);
  });
  const xDefault = numericDefaults.find((c) => numericColumns.includes(c)) || numericColumns[0];
  const yDefault = numericDefaults.find((c) => c !== xDefault && numericColumns.includes(c)) || numericColumns[1];
  if (xDefault) xSelect.value = xDefault;
  if (yDefault) ySelect.value = yDefault;
}

function clearPlotCanvas() {
  const ctx = scatterPlot.getContext("2d");
  ctx.clearRect(0, 0, scatterPlot.width, scatterPlot.height);
  ctx.fillStyle = "#f5fbff";
  ctx.fillRect(0, 0, scatterPlot.width, scatterPlot.height);
}

function drawAxes(ctx, left, top, right, bottom, grid = 5) {
  ctx.strokeStyle = "#d8e7f2";
  for (let i = 0; i <= grid; i += 1) {
    const y = top + ((bottom - top) * i) / grid;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
  }
  for (let i = 0; i <= grid; i += 1) {
    const x = left + ((right - left) * i) / grid;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
  }
}

function renderScatterPlot() {
  if (!numericColumns.length) return;
  const xCol = xSelect.value;
  const yCol = ySelect.value;
  const colorCol = colorSelect.value;
  const points = datasetRows.map((row) => ({ x: Number(row[xCol]), y: Number(row[yCol]), c: row[colorCol] })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  clearPlotCanvas();
  const ctx = scatterPlot.getContext("2d");
  const width = scatterPlot.width; const height = scatterPlot.height;
  const left = 68, right = width - 30, top = 24, bottom = height - 56;
  drawAxes(ctx, left, top, right, bottom);
  const xMin = Math.min(...points.map((p) => p.x)); const xMax = Math.max(...points.map((p) => p.x));
  const yMin = Math.min(...points.map((p) => p.y)); const yMax = Math.max(...points.map((p) => p.y));
  const palette = {
    "1": "#c73951",
    "0": "#1f8c6b",
    M: "#2f6fd1",
    F: "#be4a9e",
    Male: "#2f6fd1",
    Female: "#be4a9e",
  };
  const labelMap = { "1": "Disease", "0": "No Disease", M: "Male", F: "Female", Male: "Male", Female: "Female" };

  ctx.fillStyle = "#163347";
  ctx.font = "13px 'IBM Plex Sans', sans-serif";
  for (let i = 0; i <= 5; i += 1) {
    const xv = xMin + ((xMax - xMin) * i) / 5;
    const xp = left + ((right - left) * i) / 5;
    ctx.fillText(xv.toFixed(1), xp - 12, bottom + 18);
    const yv = yMax - ((yMax - yMin) * i) / 5;
    const yp = top + ((bottom - top) * i) / 5;
    ctx.fillText(yv.toFixed(1), left - 56, yp + 4);
  }

  points.forEach((p) => {
    const px = left + ((p.x - xMin) / (xMax - xMin || 1)) * (right - left);
    const py = bottom - ((p.y - yMin) / (yMax - yMin || 1)) * (bottom - top);
    ctx.fillStyle = palette[p.c] || "#4f7ca3";
    ctx.globalAlpha = 0.82;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  const groups = {};
  points.forEach((p) => { groups[p.c] = (groups[p.c] || 0) + 1; });
  const legendParts = Object.keys(groups).map((key) => {
    const color = palette[key] || "#4f7ca3";
    const label = labelMap[key] || key;
    return `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label}: ${groups[key]}</span>`;
  });
  plotLegend.innerHTML = legendParts.join("");
  plotSummary.textContent = `Scatter: ${xCol} vs ${yCol} (${points.length} patients), colored by ${colorCol}.`;
}

function correlation(a, b) {
  const n = a.length;
  const am = a.reduce((s, v) => s + v, 0) / n;
  const bm = b.reduce((s, v) => s + v, 0) / n;
  let num = 0; let ad = 0; let bd = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - am; const db = b[i] - bm;
    num += da * db; ad += da * da; bd += db * db;
  }
  return num / Math.sqrt((ad || 1) * (bd || 1));
}

function renderHeatmap() {
  const cols = numericColumns.slice(0, 8);
  if (cols.length < 2) return;
  clearPlotCanvas();
  const ctx = scatterPlot.getContext("2d");
  const left = 130, top = 30, cell = 36;
  cols.forEach((c, i) => {
    ctx.fillStyle = "#163347"; ctx.font = "12px 'IBM Plex Sans'";
    ctx.fillText(c, left - 120, top + i * cell + 22);
    ctx.fillText(c, left + i * cell + 3, top - 8);
  });
  for (let i = 0; i < cols.length; i += 1) {
    for (let j = 0; j < cols.length; j += 1) {
      const arr1 = []; const arr2 = [];
      datasetRows.forEach((row) => {
        const a = Number(row[cols[i]]); const b = Number(row[cols[j]]);
        if (Number.isFinite(a) && Number.isFinite(b)) { arr1.push(a); arr2.push(b); }
      });
      const r = arr1.length > 2 ? correlation(arr1, arr2) : 0;
      const red = r > 0 ? Math.floor(80 + r * 140) : 70;
      const blue = r < 0 ? Math.floor(80 + Math.abs(r) * 140) : 70;
      ctx.fillStyle = `rgb(${red},${190 - Math.floor(Math.abs(r) * 90)},${blue})`;
      ctx.fillRect(left + j * cell, top + i * cell, cell - 2, cell - 2);
    }
  }
  plotSummary.textContent = "Heatmap: Pearson correlation matrix (first 8 numeric features).";
}

function renderDistribution() {
  clearPlotCanvas();
  const ctx = scatterPlot.getContext("2d");
  const width = scatterPlot.width; const height = scatterPlot.height;
  const left = 100, right = width - 80, top = 40, bottom = height - 60;
  drawAxes(ctx, left, top, right, bottom, 4);
  const counts = { "0": 0, "1": 0 };
  datasetRows.forEach((row) => { if (row.HeartDisease === "1") counts["1"] += 1; else counts["0"] += 1; });
  const max = Math.max(1, counts["0"], counts["1"]);
  const bw = 180;
  [["0", "#2a9d71", "No Disease"], ["1", "#d64662", "Disease"]].forEach((item, idx) => {
    const x = left + 120 + idx * 300;
    const h = ((counts[item[0]] || 0) / max) * (bottom - top);
    ctx.fillStyle = item[1];
    ctx.fillRect(x, bottom - h, bw, h);
    ctx.fillStyle = "#163347";
    ctx.fillText(item[2], x + 40, bottom + 20);
    ctx.fillText(String(counts[item[0]] || 0), x + 70, bottom - h - 8);
  });
  plotSummary.textContent = `Distribution: HeartDisease=1 (${counts["1"]}) vs HeartDisease=0 (${counts["0"]}).`;
}

function renderMetricsChart() {
  clearPlotCanvas();
  const ctx = scatterPlot.getContext("2d");
  if (!latestMetrics.length) {
    plotSummary.textContent = "Model metrics unavailable. Run pipeline first.";
    return;
  }
  const metric = metricSelect.value;
  const width = scatterPlot.width; const height = scatterPlot.height;
  const left = 90, right = width - 50, top = 30, bottom = height - 60;
  drawAxes(ctx, left, top, right, bottom, 5);
  const vals = latestMetrics.map((m) => ({ model: m.model, v: Number(m[metric]) || 0 }));
  const max = Math.max(...vals.map((v) => v.v), 1);
  const barW = Math.max(80, (right - left - 30) / vals.length - 20);
  vals.forEach((it, i) => {
    const x = left + 20 + i * (barW + 30);
    const h = (it.v / max) * (bottom - top);
    ctx.fillStyle = "#1a8bc8"; ctx.fillRect(x, bottom - h, barW, h);
    ctx.fillStyle = "#163347"; ctx.fillText(it.model, x, bottom + 18); ctx.fillText(it.v.toFixed(3), x, bottom - h - 8);
  });
  plotSummary.textContent = `Model Metrics: ${metric.toUpperCase()} comparison across models.`;
}

function setupImageSelect() {
  const charts = latestArtifacts.filter((a) => a.type === "chart");
  imageSelect.innerHTML = "";
  charts.forEach((c) => {
    const op = document.createElement("option");
    op.value = c.preview || c.url;
    op.textContent = c.name;
    imageSelect.appendChild(op);
  });
}

function renderNotebookVisual() {
  clearPlotCanvas();
  const url = imageSelect.value;
  if (!url) {
    plotSummary.textContent = "Notebook visuals unavailable. Run pipeline first.";
    return;
  }
  plotImage.src = url;
  plotSummary.textContent = `Notebook Visual: ${imageSelect.options[imageSelect.selectedIndex].text}.`;
}

function renderCurrentViz() {
  plotImage.style.display = "none";
  scatterPlot.style.display = "block";
  plotFallback.style.display = "none";
  metricLabel.style.display = currentViz === "metrics" ? "grid" : "none";
  imageLabel.style.display = currentViz === "notebook" ? "grid" : "none";
  if (currentViz === "scatter") renderScatterPlot();
  else if (currentViz === "heatmap") { plotLegend.innerHTML = ""; renderHeatmap(); }
  else if (currentViz === "distribution") { plotLegend.innerHTML = ""; renderDistribution(); }
  else if (currentViz === "metrics") { plotLegend.innerHTML = ""; renderMetricsChart(); }
  else if (currentViz === "notebook") {
    plotLegend.innerHTML = "";
    scatterPlot.style.display = "none";
    plotImage.style.display = "block";
    renderNotebookVisual();
  }
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("status fetch failed");
    const data = await res.json();
    updateStatus(data);
    latestArtifacts = data.artifacts || [];
    latestMetrics = data.metrics || [];
    setupImageSelect();
    renderArtifacts(getActiveFilter());
    setLog(data.logs || []);
    renderCurrentViz();
  } catch (_err) {
    updateStatus({ state: "error", message: "Backend not reachable. Start the server.", progress: 0, current_step_index: 0 });
  }
}

function setupFilters() {
  document.querySelectorAll("#artifactFilters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#artifactFilters .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderArtifacts(getActiveFilter());
    });
  });
}

function setupVizMenu() {
  vizMenu.addEventListener("change", () => {
    currentViz = vizMenu.value;
    renderCurrentViz();
  });
}

function setupMenu() {
  document.querySelectorAll(".menu-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".menu-btn").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.section);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function runPipeline() {
  runBtn.disabled = true;
  try {
    const res = await fetch("/api/run", { method: "POST" });
    if (!res.ok) throw new Error("run failed");
    await fetchStatus();
  } catch (_err) {
    updateStatus({ state: "error", message: "Run failed. Check server logs.", progress: 0, current_step_index: 0 });
    runBtn.disabled = false;
  }
}

xSelect.addEventListener("change", () => currentViz === "scatter" && renderScatterPlot());
ySelect.addEventListener("change", () => currentViz === "scatter" && renderScatterPlot());
colorSelect.addEventListener("change", () => currentViz === "scatter" && renderScatterPlot());
metricSelect.addEventListener("change", () => currentViz === "metrics" && renderMetricsChart());
imageSelect.addEventListener("change", () => currentViz === "notebook" && renderNotebookVisual());
runBtn.addEventListener("click", runPipeline);

setupFilters();
setupVizMenu();
setupMenu();
renderSteps(0);
fetchDataset();
fetchStatus();
setInterval(fetchStatus, 2500);
