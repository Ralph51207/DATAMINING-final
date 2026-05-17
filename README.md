# Heart Disease Analytics Workbench

This project is a heart disease data mining app built from:
- a full analysis notebook (`Lastnames_CCS230_Finals.ipynb`)
- a FastAPI backend (`server.py`)
- an interactive analytics UI (`ui/`)

The app uses the UCI heart dataset and lets you:
- run the notebook pipeline from the UI
- explore patient data visually (scatter, heatmap, distribution, model metrics, notebook visuals)
- inspect dataset rows, outputs, reports, and logs

## Project Structure

- `heart.csv` - local dataset file
- `Lastnames_CCS230_Finals.ipynb` - end-to-end pipeline notebook
- `server.py` - API + notebook runner
- `ui/` - frontend files
- `outputs/` - generated charts/tables/reports after pipeline run
- `Case_Study_Report_Draft.md` - report draft
- `Lastnames_CCS230_Finals.pdf` - report PDF

## Quick Start (Recommended)

Run these commands from the project folder:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn server:app --reload
```

Then open:

`http://127.0.0.1:8000`

## How To Use

1. Open the app in your browser.
2. Click `Run Pipeline`.
3. Wait until status shows complete.
4. Explore:
- `Patient Data Graph` (different visualization modes from the top-right menu)
- `Dataset Table`
- `Notebook Outputs`
- `Run Log`

## If You See an Old UI

1. Make sure only one server is running.
2. Open exactly `http://127.0.0.1:8000`
3. Hard refresh with `Ctrl + F5`
4. Do not open `ui/index.html` with `file://`

## Optional: Run Notebook Manually

If you only want notebook execution:

1. Activate `.venv`
2. Open `Lastnames_CCS230_Finals.ipynb`
3. Run all cells from top to bottom
