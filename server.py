from __future__ import annotations

import csv
import threading
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

import nbformat
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from nbclient import NotebookClient

PROJECT_DIR = Path(__file__).resolve().parent
NOTEBOOK_PATH = PROJECT_DIR / "Lastnames_CCS230_Finals.ipynb"
OUTPUT_DIR = PROJECT_DIR / "outputs"
EXECUTED_NOTEBOOK = OUTPUT_DIR / "Lastnames_CCS230_Finals.executed.ipynb"

REPORT_FILES = {
    "Case_Study_Report_Draft.md": PROJECT_DIR / "Case_Study_Report_Draft.md",
    "Lastnames_CCS230_Finals.pdf": PROJECT_DIR / "Lastnames_CCS230_Finals.pdf",
}

STEPS = [
    "Dataset Acquisition",
    "Cleaning + Imputation",
    "Exploratory Analysis",
    "Association Rules",
    "Patient Archetypes",
    "Model Comparison",
]

state: dict[str, Any] = {
    "state": "idle",
    "message": "Ready to run.",
    "progress": 0,
    "current_step": STEPS[0],
    "current_step_index": 0,
    "last_run": None,
    "logs": [],
}

state_lock = threading.Lock()

app = FastAPI(title="Heart Disease Data Mining UI")

app.mount("/ui", StaticFiles(directory=PROJECT_DIR / "ui"), name="ui")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")


@app.get("/")
def root() -> FileResponse:
    return FileResponse(PROJECT_DIR / "ui" / "index.html")


@app.get("/reports/{filename}")
def reports(filename: str) -> FileResponse:
    file_path = REPORT_FILES.get(filename)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(file_path)


@app.get("/api/status")
def api_status() -> dict[str, Any]:
    with state_lock:
        status = dict(state)
    status["metrics"] = read_metrics()
    status["artifacts"] = list_artifacts()
    return status


@app.post("/api/run")
def api_run() -> PlainTextResponse:
    with state_lock:
        if state["state"] == "running":
            raise HTTPException(status_code=409, detail="Pipeline already running")
        state.update(
            {
                "state": "running",
                "message": "Starting pipeline...",
                "progress": 0,
                "current_step": STEPS[0],
                "current_step_index": 0,
                "logs": ["Starting pipeline run."],
            }
        )
    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()
    return PlainTextResponse("Started", status_code=202)


def run_pipeline() -> None:
    try:
        if not NOTEBOOK_PATH.exists():
            raise FileNotFoundError(f"Notebook not found: {NOTEBOOK_PATH}")

        nb = nbformat.read(NOTEBOOK_PATH, as_version=4)
        code_cells = [cell for cell in nb.cells if cell.cell_type == "code"]
        total_cells = max(len(code_cells), 1)

        client = NotebookClient(
            nb,
            timeout=600,
            kernel_name="python3",
            resources={"metadata": {"path": str(PROJECT_DIR)}},
        )

        with client.setup_kernel():
            executed = 0
            for idx, cell in enumerate(nb.cells):
                if cell.cell_type != "code":
                    continue
                step_index = min(int(executed / total_cells * len(STEPS)), len(STEPS) - 1)
                update_progress(step_index, executed, total_cells)
                client.execute_cell(cell, idx)
                executed += 1
                update_progress(step_index, executed, total_cells)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        nbformat.write(nb, EXECUTED_NOTEBOOK)

        with state_lock:
            state.update(
                {
                    "state": "complete",
                    "message": "Pipeline completed successfully.",
                    "progress": 100,
                    "current_step": STEPS[-1],
                    "current_step_index": len(STEPS) - 1,
                    "last_run": datetime.utcnow().isoformat(),
                }
            )
            state["logs"].append("Pipeline completed successfully.")
    except Exception as exc:  # noqa: BLE001
        with state_lock:
            state.update(
                {
                    "state": "error",
                    "message": "Pipeline failed. Check logs for details.",
                    "progress": 0,
                }
            )
            state["logs"].append(f"Error: {exc}")
            state["logs"].append(traceback.format_exc())


def update_progress(step_index: int, executed: int, total: int) -> None:
    progress = int((executed / total) * 100)
    with state_lock:
        state.update(
            {
                "current_step_index": step_index,
                "current_step": STEPS[step_index],
                "progress": progress,
                "message": f"Running: {STEPS[step_index]}",
            }
        )
        if len(state["logs"]) < 200:
            state["logs"].append(f"{time.strftime('%H:%M:%S')} - {state['message']}")


def read_metrics() -> list[dict[str, str]]:
    metrics_path = OUTPUT_DIR / "model_metrics.csv"
    if not metrics_path.exists():
        return []
    rows: list[dict[str, str]] = []
    with metrics_path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(
                {
                    "model": row.get("model", ""),
                    "accuracy": row.get("accuracy", ""),
                    "precision": row.get("precision", ""),
                    "recall": row.get("recall", ""),
                    "f1": row.get("f1", ""),
                }
            )
    return rows


def list_artifacts() -> list[dict[str, str]]:
    artifacts: list[dict[str, str]] = []
    if OUTPUT_DIR.exists():
        for item in sorted(OUTPUT_DIR.iterdir()):
            if not item.is_file():
                continue
            ext = item.suffix.lower()
            if ext in {".png", ".jpg", ".jpeg"}:
                artifacts.append(
                    {
                        "name": item.name,
                        "label": item.stem.replace("_", " ").title(),
                        "type": "chart",
                        "url": f"/outputs/{item.name}",
                        "preview": f"/outputs/{item.name}",
                    }
                )
            elif ext in {".csv", ".txt"}:
                artifacts.append(
                    {
                        "name": item.name,
                        "label": item.stem.replace("_", " ").title(),
                        "type": "table",
                        "url": f"/outputs/{item.name}",
                        "preview": "",
                    }
                )

    for name, path in REPORT_FILES.items():
        if path.exists():
            artifacts.append(
                {
                    "name": name,
                    "label": name.replace("_", " ").replace(".md", "").replace(".pdf", ""),
                    "type": "report",
                    "url": f"/reports/{name}",
                    "preview": "",
                }
            )

    return artifacts
