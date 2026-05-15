const stepData = [
  {
    title: "Dataset Acquisition",
    detail: "Fetch UCI Heart data and normalize the HeartDisease target.",
  },
  {
    title: "Cleaning + Imputation",
    detail: "Coerce numeric fields, replace missing values, apply medians.",
  },
  {
    title: "Exploratory Analysis",
    detail: "Generate distributions, correlations, and descriptive stats.",
  },
  {
    title: "Association Rules",
    detail: "Apriori rules on discretized features for risk patterns.",
  },
  {
    title: "Patient Archetypes",
    detail: "K-Means clustering with silhouette scoring.",
  },
  {
    title: "Model Comparison",
    detail: "Decision Tree vs Random Forest with recall-first selection.",
  },
];

const statusBar = document.getElementById("statusBar");
const runBtn = document.getElementById("runBtn");
const progressFill = document.getElementById("progressFill");
const stepsEl = document.getElementById("steps");
const metricsBody = document.querySelector("#metricsTable tbody");
const artifactGrid = document.getElementById("artifactGrid");
const logOutput = document.getElementById("logOutput");

function renderSteps(activeIndex = 0) {
  stepsEl.innerHTML = "";
  stepData.forEach((step, idx) => {
    const card = document.createElement("article");
    card.className = `step${idx === activeIndex ? " active" : ""}`;
    card.innerHTML = `
      <div class="step-num">${String(idx + 1).padStart(2, "0")}</div>
      <h3>${step.title}</h3>
      <p>${step.detail}</p>
    `;
    card.addEventListener("click", () => setActiveStep(idx));
    stepsEl.appendChild(card);
  });
}

function setActiveStep(index) {
  renderSteps(index);
}

function updateStatus(status) {
  const pill = statusBar.querySelector(".status-pill");
  const text = statusBar.querySelector(".status-text");
  pill.dataset.status = status.state;
  pill.textContent = status.state.toUpperCase();
  text.textContent = status.message || "";
  progressFill.style.width = `${status.progress || 0}%`;
  runBtn.disabled = status.state === "running";
  setActiveStep(status.current_step_index || 0);
}

function updateMetrics(metrics) {
  metricsBody.innerHTML = "";
  if (!metrics || metrics.length === 0) {
    metricsBody.innerHTML = "<tr><td colspan=\"5\">No metrics yet.</td></tr>";
    return;
  }
  metrics.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.model}</td>
      <td>${row.accuracy}</td>
      <td>${row.precision}</td>
      <td>${row.recall}</td>
      <td>${row.f1}</td>
    `;
    metricsBody.appendChild(tr);
  });
}

function renderArtifacts(artifacts, filter = "all") {
  artifactGrid.innerHTML = "";
  const filtered = artifacts.filter((item) => filter === "all" || item.type === filter);
  if (filtered.length === 0) {
    artifactGrid.innerHTML = "<p class=\"muted\">No artifacts found.</p>";
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "artifact-card";
    if (item.preview) {
      card.innerHTML = `
        <img src="${item.preview}" alt="${item.name}" />
        <div class="artifact-body">
          <div><strong>${item.label}</strong></div>
          <div class="artifact-meta">${item.type.toUpperCase()}</div>
          <a class="artifact-link" href="${item.url}" target="_blank">Open</a>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="artifact-body">
          <div><strong>${item.label}</strong></div>
          <div class="artifact-meta">${item.type.toUpperCase()}</div>
          <a class="artifact-link" href="${item.url}" target="_blank">Open</a>
        </div>
      `;
    }
    artifactGrid.appendChild(card);
  });
}

function setLog(logs) {
  if (!logs || logs.length === 0) {
    logOutput.textContent = "Waiting for a run...";
    return;
  }
  logOutput.textContent = logs.join("\n");
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) {
      throw new Error("status fetch failed");
    }
    const data = await res.json();
    updateStatus(data);
    updateMetrics(data.metrics || []);
    renderArtifacts(data.artifacts || [], getActiveFilter());
    setLog(data.logs || []);
  } catch (err) {
    updateStatus({
      state: "error",
      message: "Backend not reachable. Start the server to enable live UI.",
      progress: 0,
      current_step_index: 0,
    });
  }
}

function getActiveFilter() {
  const active = document.querySelector("#artifactFilters .chip.active");
  return active ? active.dataset.filter : "all";
}

function setupFilters() {
  document.querySelectorAll("#artifactFilters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#artifactFilters .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      fetchStatus();
    });
  });
}

async function runPipeline() {
  runBtn.disabled = true;
  try {
    const res = await fetch("/api/run", { method: "POST" });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || "run failed");
    }
    await fetchStatus();
  } catch (err) {
    updateStatus({
      state: "error",
      message: "Run failed. Check server logs.",
      progress: 0,
      current_step_index: 0,
    });
    runBtn.disabled = false;
  }
}

runBtn.addEventListener("click", runPipeline);

renderSteps(0);
setupFilters();
fetchStatus();
setInterval(fetchStatus, 2500);
