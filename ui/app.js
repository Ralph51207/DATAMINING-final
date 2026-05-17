const stepData = [
  { title: "Dataset Acquisition", detail: "Load UCI heart records and target classes." },
  { title: "Cleaning + Imputation", detail: "Fix data types and handle missing values." },
  { title: "Exploratory Analysis", detail: "Generate summary statistics and visuals." },
  { title: "Association Rules", detail: "Mine frequent clinical attribute patterns." },
  { title: "Patient Archetypes", detail: "Cluster patient profiles for segmentation." },
  { title: "Model Comparison", detail: "Compare classifier performance metrics." },
];

const COLUMN_TYPES = {
  continuous: ["age", "trestbps", "chol", "thalach", "oldpeak"],
  categorical: ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal", "HeartDisease"],
};

const statusBar = document.getElementById("statusBar");
const runBtn = document.getElementById("runBtn");
const progressFill = document.getElementById("progressFill");
const stepsEl = document.getElementById("steps");
const datasetMeta = document.getElementById("datasetMeta");
const datasetHead = document.querySelector("#datasetTable thead");
const datasetBody = document.querySelector("#datasetTable tbody");
const artifactGrid = document.getElementById("artifactGrid");
const previewTitle = document.getElementById("previewTitle");
const previewContent = document.getElementById("previewContent");
const logOutput = document.getElementById("logOutput");
const vizMenu = document.getElementById("vizMenu");
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");
const colorSelect = document.getElementById("colorSelect");
const aggSelect = document.getElementById("aggSelect");
const chartContainer = document.getElementById("chartContainer");
const chartDescription = document.getElementById("chartDescription");
const validationMessage = document.getElementById("validationMessage");
const plotFallback = document.getElementById("plotFallback");
const plotLegend = document.getElementById("plotLegend");

let datasetRows = [];
let datasetColumns = [];
let latestArtifacts = [];
let latestStatus = null;

function labelForCategory(col, raw) {
  const value = String(raw);
  const key = normalizeName(col);
  if (key === "heartdisease") return value === "1" ? "Heart Disease (1)" : "No Heart Disease (0)";
  if (key === "sex") {
    if (value === "1" || value.toUpperCase() === "M" || value.toLowerCase() === "male") return "Male";
    if (value === "0" || value.toUpperCase() === "F" || value.toLowerCase() === "female") return "Female";
  }
  if (key === "exang") return value === "1" ? "Exercise Angina: Yes (1)" : "Exercise Angina: No (0)";
  if (key === "fbs") return value === "1" ? "Fasting Blood Sugar > 120: Yes (1)" : "Fasting Blood Sugar > 120: No (0)";
  return value;
}

function colValue(row, col) {
  if (col in row) return row[col];
  const lower = col.toLowerCase();
  const key = Object.keys(row).find((k) => k.toLowerCase() === lower);
  return key ? row[key] : "";
}

function normalizeName(name) {
  return name.toLowerCase();
}

function isContinuous(col) {
  const n = normalizeName(col);
  return COLUMN_TYPES.continuous.includes(n);
}

function isCategorical(col) {
  const n = normalizeName(col);
  return COLUMN_TYPES.categorical.map((x) => x.toLowerCase()).includes(n);
}

function asNumber(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

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
  latestStatus = status;
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

function clearValidation() {
  validationMessage.textContent = "";
}

function setValidation(msg) {
  validationMessage.textContent = msg;
}

function plotlyLayout(title, xTitle, yTitle) {
  return {
    title,
    paper_bgcolor: "#f5fbff",
    plot_bgcolor: "#f5fbff",
    margin: { l: 70, r: 20, t: 50, b: 60 },
    xaxis: { title: xTitle, gridcolor: "#d8e7f2", zerolinecolor: "#d8e7f2" },
    yaxis: { title: yTitle, gridcolor: "#d8e7f2", zerolinecolor: "#d8e7f2" },
    legend: { orientation: "h", y: -0.2 },
    hovermode: "closest",
  };
}

function getAutoViz(x, y) {
  if (isContinuous(x) && isContinuous(y)) return "scatter";
  if (isContinuous(x) && isCategorical(y)) return "box";
  if (isCategorical(x) && isContinuous(y)) return "box";
  if (isCategorical(x) && isCategorical(y)) return "bar";
  if (isContinuous(x) && !y) return "histogram";
  return "bar";
}

function drawScatter(xCol, yCol, colorCol) {
  if (!isContinuous(xCol) || !isContinuous(yCol)) {
    setValidation("Scatter plots work best with continuous numeric variables.");
    return false;
  }
  clearValidation();
  const rows = datasetRows.map((r) => ({
    x: asNumber(colValue(r, xCol)),
    y: asNumber(colValue(r, yCol)),
    c: String(colValue(r, colorCol)),
    label: `Age: ${colValue(r, "age")}<br>Sex: ${colValue(r, "sex")}<br>Disease: ${colValue(r, "HeartDisease")}`,
  })).filter((r) => r.x !== null && r.y !== null);

  const traces = {};
  rows.forEach((r) => {
    const k = r.c || "Unknown";
    if (!traces[k]) traces[k] = { x: [], y: [], text: [] };
    traces[k].x.push(r.x);
    const jitter = isCategorical(yCol) ? (Math.random() - 0.5) * 0.15 : 0;
    traces[k].y.push(r.y + jitter);
    traces[k].text.push(r.label);
  });
  const data = Object.keys(traces).map((k) => ({
    x: traces[k].x,
    y: traces[k].y,
    text: traces[k].text,
    mode: "markers",
    name: labelForCategory(colorCol, k),
    marker: { size: 8, opacity: 0.55 },
    hovertemplate: "%{text}<br>X=%{x}<br>Y=%{y}<extra></extra>",
    type: "scattergl",
  }));
  Plotly.react(chartContainer, data, plotlyLayout(`Scatter: ${xCol} vs ${yCol}`, xCol, yCol), { responsive: true });
  chartDescription.textContent = "Scatter plot of two continuous variables with transparency and hover tooltips.";
  return true;
}

function drawHistogram(xCol, colorCol) {
  if (!isContinuous(xCol)) {
    setValidation("Histogram works best with a continuous numeric variable.");
    return false;
  }
  clearValidation();
  const groups = {};
  datasetRows.forEach((r) => {
    const v = asNumber(colValue(r, xCol));
    if (v === null) return;
    const k = String(colValue(r, colorCol) || "All");
    if (!groups[k]) groups[k] = [];
    groups[k].push(v);
  });
  const data = Object.keys(groups).map((k) => ({
    x: groups[k],
    type: "histogram",
    opacity: 0.65,
    name: labelForCategory(colorCol, k),
  }));
  Plotly.react(chartContainer, data, { ...plotlyLayout(`Histogram: ${xCol}`, xCol, "Count"), barmode: "overlay" }, { responsive: true });
  chartDescription.textContent = "Distribution view for one numeric variable.";
  return true;
}

function drawBar(xCol, yCol, aggMode) {
  if (!isCategorical(xCol)) {
    setValidation("Bar chart expects a categorical X-axis.");
    return false;
  }
  clearValidation();
  const map = {};
  datasetRows.forEach((r) => {
    const x = String(colValue(r, xCol));
    const disease = String(colValue(r, "HeartDisease"));
    if (!map[x]) map[x] = { total: 0, disease: 0 };
    map[x].total += 1;
    if (disease === "1") map[x].disease += 1;
  });
  const xs = Object.keys(map);
  const ys = xs.map((k) => (aggMode === "rate" ? map[k].disease / map[k].total : map[k].total));
  const yLabel = aggMode === "rate" ? "Disease Rate" : "Count";
  Plotly.react(chartContainer, [{
    x: xs, y: ys, type: "bar", marker: { color: "#1a8bc8" }, hovertemplate: `${xCol}: %{x}<br>${yLabel}: %{y}<extra></extra>`,
  }], plotlyLayout(`Bar: ${xCol} vs HeartDisease`, xCol, yLabel), { responsive: true });
  chartDescription.textContent = "Categorical comparison against HeartDisease.";
  return true;
}

function drawBox(xCol, yCol) {
  const xIsCat = isCategorical(xCol);
  const yIsCat = isCategorical(yCol);
  if (xIsCat === yIsCat) {
    setValidation("Box plot needs one categorical variable and one continuous numeric variable.");
    return false;
  }
  clearValidation();
  const catCol = xIsCat ? xCol : yCol;
  const numCol = xIsCat ? yCol : xCol;
  if (!isContinuous(numCol)) {
    setValidation("Box plot numeric axis must be continuous.");
    return false;
  }
  const groups = {};
  datasetRows.forEach((r) => {
    const c = String(colValue(r, catCol));
    const n = asNumber(colValue(r, numCol));
    if (n === null) return;
    if (!groups[c]) groups[c] = [];
    groups[c].push(n);
  });
  const data = Object.keys(groups).map((k) => ({
    y: groups[k], x: Array(groups[k].length).fill(labelForCategory(catCol, k)), type: "box", name: labelForCategory(catCol, k), boxpoints: "outliers",
  }));
  Plotly.react(chartContainer, data, plotlyLayout(`Box: ${numCol} by ${catCol}`, catCol, numCol), { responsive: true });
  chartDescription.textContent = "Box plot showing spread and median by category.";
  return true;
}

function corr(a, b) {
  const n = a.length;
  const am = a.reduce((s, v) => s + v, 0) / n;
  const bm = b.reduce((s, v) => s + v, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - am;
    const y = b[i] - bm;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / Math.sqrt((da || 1) * (db || 1));
}

function drawHeatmap() {
  clearValidation();
  const numericCols = datasetColumns.filter((c) => isContinuous(c));
  if (numericCols.length < 2) {
    setValidation("Heatmap needs at least two continuous numeric columns.");
    return false;
  }
  const z = numericCols.map((rCol) => numericCols.map((cCol) => {
    const a = []; const b = [];
    datasetRows.forEach((r) => {
      const rv = asNumber(colValue(r, rCol));
      const cv = asNumber(colValue(r, cCol));
      if (rv !== null && cv !== null) {
        a.push(rv); b.push(cv);
      }
    });
    return a.length > 2 ? corr(a, b) : 0;
  }));
  Plotly.react(chartContainer, [{
    z,
    x: numericCols,
    y: numericCols,
    type: "heatmap",
    colorscale: "RdBu",
    reversescale: true,
    zmin: -1,
    zmax: 1,
  }], {
    ...plotlyLayout("Correlation Heatmap (Numeric Features)", "", ""),
    annotations: [],
  }, { responsive: true });

  const heartCol = datasetColumns.find((c) => c.toLowerCase() === "heartdisease");
  if (heartCol && isContinuous(heartCol)) {
    chartDescription.textContent = "Correlation heatmap. Inspect strongest absolute correlations with HeartDisease for potential predictive features.";
  } else {
    chartDescription.textContent = "Correlation heatmap across continuous numeric features.";
  }
  return true;
}

function renderChart() {
  plotLegend.innerHTML = "";
  plotFallback.style.display = "none";
  chartContainer.style.display = "block";

  const xCol = xSelect.value;
  const yCol = ySelect.value;
  const colorCol = colorSelect.value;
  let mode = vizMenu.value;

  if (mode === "auto") mode = getAutoViz(xCol, yCol);

  let ok = false;
  if (mode === "scatter") ok = drawScatter(xCol, yCol, colorCol);
  if (mode === "histogram") ok = drawHistogram(xCol, colorCol);
  if (mode === "bar") ok = drawBar(xCol, yCol, aggSelect.value);
  if (mode === "box") ok = drawBox(xCol, yCol);
  if (mode === "heatmap") ok = drawHeatmap();
  if (!ok) chartDescription.textContent = "Select a different visualization or variable combination.";
}

function setupSelectors() {
  xSelect.innerHTML = "";
  ySelect.innerHTML = "";
  colorSelect.innerHTML = "";
  datasetColumns.forEach((c) => {
    const ox = document.createElement("option"); ox.value = c; ox.textContent = c; xSelect.appendChild(ox);
    const oy = document.createElement("option"); oy.value = c; oy.textContent = c; ySelect.appendChild(oy);
    const oc = document.createElement("option"); oc.value = c; oc.textContent = c; colorSelect.appendChild(oc);
  });
  if (datasetColumns.includes("age")) xSelect.value = "age";
  if (datasetColumns.includes("thalach")) ySelect.value = "thalach";
  if (datasetColumns.includes("HeartDisease")) colorSelect.value = "HeartDisease";
}

function renderDatasetTable(columns, rows) {
  datasetHead.innerHTML = "";
  datasetBody.innerHTML = "";
  const head = document.createElement("tr");
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c;
    head.appendChild(th);
  });
  datasetHead.appendChild(head);
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = colValue(row, c);
      tr.appendChild(td);
    });
    datasetBody.appendChild(tr);
  });
}

async function fetchDataset() {
  const res = await fetch("/api/dataset?limit=5000");
  const data = await res.json();
  datasetRows = data.sample_rows || [];
  datasetColumns = data.columns || [];
  datasetMeta.textContent = `${data.name} | rows ${data.row_count} | cols ${datasetColumns.length} | loaded ${data.sample_size}`;
  renderDatasetTable(datasetColumns, datasetRows.slice(0, 40));
  setupSelectors();
  renderChart();
}

async function fetchStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();
  updateStatus(data);
  latestArtifacts = data.artifacts || [];
  renderArtifacts(getActiveFilter());
  setLog(data.logs || []);
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
    btn.addEventListener("click", async () => {
      previewTitle.textContent = item.name;
      if (item.type === "chart" && item.preview) {
        previewContent.innerHTML = `<img class="preview-img" src="${item.preview}" alt="${item.name}" />`;
        return;
      }
      const rr = await fetch(`/api/output/${encodeURIComponent(item.name)}`);
      const text = await rr.text();
      previewContent.innerHTML = `<pre>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").slice(0, 60000)}</pre>`;
    });
    artifactGrid.appendChild(btn);
  });
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
  } catch (_err) {
    updateStatus({ state: "error", message: "Run failed. Check server logs.", progress: 0, current_step_index: 0 });
    runBtn.disabled = false;
  }
}

vizMenu.addEventListener("change", renderChart);
xSelect.addEventListener("change", renderChart);
ySelect.addEventListener("change", renderChart);
colorSelect.addEventListener("change", renderChart);
aggSelect.addEventListener("change", renderChart);
runBtn.addEventListener("click", runPipeline);

setupFilters();
setupMenu();
renderSteps(0);
Promise.all([fetchDataset(), fetchStatus()]).catch(() => {
  if (!latestStatus) updateStatus({ state: "error", message: "Backend not reachable. Start the server.", progress: 0, current_step_index: 0 });
});
setInterval(fetchStatus, 2500);
