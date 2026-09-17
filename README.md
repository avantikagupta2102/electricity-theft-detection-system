# ⚡ VoltGuard: Electricity Consumption Analysis & Theft Detection System

An end-to-end Machine Learning and Time-Series Analytics system designed for power utility grids to detect Non-Technical Losses (NTL) and electricity theft using continuous smart-meter readings.

![VoltGuard Architecture](https://img.shields.io/badge/ML-XGBoost%20%7C%20RandomForest-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Recharts-61DAFB?style=for-the-badge&logo=react)
![AUC](https://img.shields.io/badge/ROC--AUC-0.9616-brightgreen?style=for-the-badge)

---

## 📌 Project Overview
Electricity theft (via illegal phase tapping, meter shunting, meter bypassing, and firmware alteration) causes billions of dollars in lost revenue annually for utility operators and destabilizes grid load forecasting.

This system leverages the **State Grid Corporation of China (SGCC)** dataset, evaluating continuous **1,034-day daily electricity consumption time series** (spanning January 1, 2014 to October 31, 2016) per consumer.

---

## 🏗️ System Architecture

```
electricity-project/
├── backend/
│   └── main.py                     # FastAPI REST API with time-series anomaly engine
├── data/
│   ├── sample_test_consumers.csv   # Curated 30-consumer test dataset (Normal & Theft)
│   ├── cleaned_dataset.csv         # Cleaned preprocessed time-series training matrix
│   └── data set.csv                # Raw SGCC 1034-day dataset
├── frontend/                       # Modern React + Vite + Recharts Executive Dashboard
│   ├── src/
│   │   ├── App.jsx                 # Dashboard with time-series charts & audit table
│   │   ├── App.css                 # Dark-mode electric styling & glassmorphism
│   │   └── index.css               # Core theme variables & design tokens
│   └── package.json
├── models/
│   ├── best_model.pkl              # Production XGBoost Classifier (ROC-AUC: 0.962)
│   └── random_forest.pkl           # Trained Random Forest baseline
├── notebooks/
│   ├── 01_data_understanding.ipynb # Phase 1: EDA & Time-Series Trajectory Analysis
│   ├── 02_data_cleaning.ipynb      # Phase 2: Missing imputation & data cleaning
│   ├── 03_model_training.ipynb     # Phase 3: Model training (RF, SMOTE, XGBoost)
│   └── 04_evaluation.ipynb         # Phase 4: ROC-AUC, PR Curves & Threshold Tuning
└── README.md
```

---

## 📊 Machine Learning Model & Time-Series Insights

### 1. Key Theft Signatures Detected
- **Abrupt Sustained Load Collapse**: Usage drops by >60% without recovery, signaling a physical bypass wire installation.
- **Abnormal Zero-Reading Runs**: Prolonged periods of zero readings while the meter remains active.
- **Seasonal Decoupling**: Disruption of typical weather-correlated winter/summer HVAC peaks observed in neighboring grid clusters.
- **High Consumption Volatility**: Erratic jumps caused by intermittent meter bridging.

### 2. Model Performance Benchmarks
| Metric | XGBoost (`best_model.pkl`) | Random Forest Baseline |
| :--- | :---: | :---: |
| **ROC-AUC** | **0.9616** | 0.9240 |
| **Overall Accuracy** | **98.2%** | 96.5% |
| **Theft Precision** | **97.0%** | 91.2% |
| **Theft Recall** | **83.0%** | 78.4% |
| **Theft F1-Score** | **0.89** | 0.84 |

---

## 🚀 Quickstart Guide

### 1. Start the Backend API
In your terminal, navigate to the `backend` folder and start the FastAPI server with Uvicorn:
```powershell
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Start the Frontend Dashboard
In a separate terminal, navigate to the `frontend` folder and launch the Vite dev server:
```powershell
cd frontend
npm run dev
```
- Dashboard URL: `http://127.0.0.1:5173/`

---

## 📡 Key API Endpoints

- `GET /health`: Model status, architecture, and feature input count.
- `GET /model-info`: Hyperparameters, validation metrics (ROC-AUC, Precision, Recall), and theft signatures.
- `GET /demo-data`: Returns instant predictions, time-series anomaly flags, and downsampled curves for the curated 30-consumer dataset.
- `POST /predict-csv`: Accepts any CSV of consumer readings, handles `CONS_NO` / `FLAG`, and returns complete risk scoring and anomaly indicators.
- `GET /consumer-raw/{cons_no}`: Returns full 1,034-day daily time-series readings with 30-day moving average for deep-dive inspection.
- `POST /predict`: Real-time prediction for single consumer reading arrays.

---

## 💻 Frontend Dashboard Features
1. **Grid Overview**: Dual-line aggregated trajectory comparing average daily kWh between legitimate consumers and theft cases across the 3-year timeline.
2. **Interactive Audit Table**: Sort and filter consumers by risk tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), view anomaly flags, and inspect individual records.
3. **Consumer Deep Dive**: View individual 1,034-day consumption curves with 30-day moving average trendlines and automated audit diagnoses.
4. **Instant 1-Click Demo**: Test the dashboard immediately with real SGCC data using the "Load Demo Dataset" button.
5. **CSV Export**: Export flagged high-risk theft cases directly to CSV for field crew inspections.
