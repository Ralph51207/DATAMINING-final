# Heart Disease Data Mining Project

This project analyzes **heart disease risk** using the UCI Heart Disease dataset.

It includes:
- one main notebook that runs the full data mining pipeline,
- an API server,
- and a web dashboard for running the pipeline and visualizing model results.

## What This Program Does

The pipeline performs end-to-end analysis:
1. Loads and prepares the dataset.
2. Cleans data and handles missing values.
3. Creates exploratory analysis outputs (plots/statistics).
4. Mines association rules for risk patterns.
5. Builds patient clusters (archetypes).
6. Trains and compares classification models.
7. Saves outputs (charts, tables, reports) into `outputs/`.

The evaluation prioritizes **recall**, because missing high-risk patients is costly.

## Important Files

- `Lastnames_CCS230_Finals.ipynb`: full pipeline notebook.
- `server.py`: FastAPI server that runs the notebook and exposes status/outputs.
- `ui/`: dashboard frontend.
- `outputs/`: generated artifacts such as model metrics, charts, and reports.
- `Case_Study_Report_Draft.md`: generated markdown report.
- `Lastnames_CCS230_Finals.pdf`: generated PDF report.

## Run the Notebook Only

1. Install dependencies:
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m pip install -r requirements.txt
   ```
2. Open `Lastnames_CCS230_Finals.ipynb`.
3. Run all cells from top to bottom.

## Run the Dashboard UI

1. Install dependencies:
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m pip install -r requirements.txt
   ```
2. Start the server from project root:
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m uvicorn server:app --reload
   ```
3. Open:
   - `http://127.0.0.1:8000`
4. Click **Run Pipeline**.

The dashboard will show:
- pipeline status and progress,
- a metric graph (Accuracy / Precision / Recall / F1) with top metric buttons,
- generated artifacts,
- live run logs.

## Windows PowerShell Tip

If your Python path contains spaces, quote it:
```powershell
& "C:/Users/Ralph/Desktop/DATA MINING final/.venv-1/Scripts/python.exe" -m uvicorn server:app --reload
```
