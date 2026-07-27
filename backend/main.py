from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import pandas as pd
import joblib
import io
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Electricity Theft Detection API",
    description="API for detecting electricity theft using XGBoost",
    version="1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model
model = joblib.load("../models/best_model.pkl")


# -------------------------
# Request Schema
# -------------------------
class PredictionInput(BaseModel):
    readings: list[float]


# -------------------------
# Home Route
# -------------------------
@app.get("/")
def home():
    return {
        "message": "Electricity Theft Detection API is running"
    }


# -------------------------
# Single Consumer Prediction
# -------------------------
@app.post("/predict")
def predict(data: PredictionInput):

    prediction = model.predict([data.readings])

    result = "Theft" if prediction[0] == 1 else "Normal"

    return {
        "prediction": int(prediction[0]),
        "label": result
    }


# -------------------------
# CSV Upload Prediction
# -------------------------
@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):

    contents = await file.read()

    df = pd.read_csv(io.BytesIO(contents))

    # Remove customer number if present
    if "CONS_NO" in df.columns:
        df = df.drop("CONS_NO", axis=1)

    # Remove FLAG if present
    if "FLAG" in df.columns:
        df = df.drop("FLAG", axis=1)

    predictions = model.predict(df)

    theft_cases = int(sum(predictions))
    normal_cases = int(len(predictions) - theft_cases)

    return {
        "total_consumers": len(predictions),
        "theft_cases": theft_cases,
        "normal_consumers": normal_cases,
        "predictions": predictions.tolist()
    }


# -------------------------
# Health Check
# -------------------------
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True
    }