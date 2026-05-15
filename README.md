# CCS-230 Final Project (Single Notebook)

This folder contains a full, self-contained notebook implementation of the heart disease data mining case study.

## Main File
- `Lastnames_CCS230_Finals.ipynb`: Complete end-to-end pipeline in one notebook.

## Outputs
- `outputs/`: Generated charts and tables.
- `Case_Study_Report_Draft.md`: Generated report draft.
- `Lastnames_CCS230_Finals.pdf`: Generated PDF report.

## Quick Start
1. Install dependencies:
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m pip install -r requirements.txt
   ```
2. Open `Lastnames_CCS230_Finals.ipynb`.
3. Run all cells from top to bottom.

## Interactive UI
The UI provides an interactive control panel to run the notebook, view progress, and explore outputs.

Dependencies for the UI server (`fastapi`, `uvicorn`, `nbclient`) are included in `requirements.txt`.

1. Install dependencies (includes FastAPI and Uvicorn):
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m pip install -r requirements.txt
   ```
2. Start the UI server from the project root:
   ```powershell
   C:/Users/Ralph/AppData/Local/Programs/Python/Python310/python.exe -m uvicorn server:app --reload
   ```
3. Open the UI in your browser:
   - http://127.0.0.1:8000
4. Click **Run Pipeline** to execute the notebook and refresh outputs.

### Troubleshooting (Windows PowerShell)
If your path includes spaces, wrap the Python path in quotes:
```powershell
& "C:/Users/Ralph/Desktop/DATA MINING final/.venv-1/Scripts/python.exe" -m uvicorn server:app --reload
```

## Notes
- The notebook fetches the dataset, performs full analysis, and exports report files.
- Model selection prioritizes Recall due to the clinical cost of false negatives.
