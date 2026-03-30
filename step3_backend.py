"""
MEMBER 2 — STEP 3: FastAPI Backend
=====================================
PURPOSE: Serve ML model predictions via a REST API.
         The React frontend sends requests here.
RUN:     uvicorn step3_backend:app --reload --port 8000
DOCS:    http://localhost:8000/docs
"""

from fastapi              import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic             import BaseModel
import pandas  as pd
import numpy   as np
import joblib
import os

# ─────────────────────────────────────────────
# SECTION 1 — Create the FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(
    title       = "GST Fraud Detection API",
    description = "AI-powered GST fraud detection — Team JustFly | ITERYX'26",
    version     = "1.0.0"
)

# ─────────────────────────────────────────────
# SECTION 2 — CORS (Cross-Origin Resource Sharing)
# WHY: The React app runs on port 3000, the API on port 8000.
#      Without CORS, browsers block cross-port requests.
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# ─────────────────────────────────────────────
# SECTION 3 — Load ML model + data at startup
# ─────────────────────────────────────────────
fraud_model   = None
anomaly_model = None
risk_df       = None

@app.on_event("startup")
def load_assets():
    """Called once when the server starts. Loads all files into memory."""
    global fraud_model, anomaly_model, risk_df

    required = ['fraud_model.pkl', 'anomaly_model.pkl',
                'risk_results.csv', 'scaler.pkl']
    for f in required:
        if not os.path.exists(f):
            print(f"⚠️  WARNING: {f} not found! Run step1 + step2 first.")

    try:
        fraud_model   = joblib.load('fraud_model.pkl')
        anomaly_model = joblib.load('anomaly_model.pkl')
        risk_df       = pd.read_csv('risk_results.csv')
        print("✅ All assets loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load assets: {e}")

# ─────────────────────────────────────────────
# SECTION 4 — Data model for prediction input
# WHY: Pydantic validates that the frontend sends the right data types.
#      If a field is missing or wrong type → automatic 422 error with message.
# ─────────────────────────────────────────────
class TransactionInput(BaseModel):
    """
    Fields the frontend sends when asking for a fraud prediction.
    These match the features used during training.
    """
    taxable_value  : float   # e.g. 500000.0
    itc_claimed    : float   # e.g. 750000.0
    tax_paid       : float   # e.g. 50000.0
    invoice_count  : int     # e.g. 120
    mismatch_ratio : float   # e.g. 0.65  (0 to 1)
    num_buyers     : int     # e.g. 45
    sector_enc     : int     # 0–4  (encoded sector)
    state_enc      : int     # 0–9  (encoded state)
    status_enc     : int     # 0–2  (0=Late, 1=Missing, 2=Regular)

# ─────────────────────────────────────────────
# SECTION 5 — API Endpoints
# ─────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """
    Simple check: is the server alive and the model loaded?
    Frontend polls this to show the 'API Online/Offline' banner.
    """
    return {
        "status"       : "ok",
        "model_loaded" : fraud_model is not None,
        "data_loaded"  : risk_df is not None,
        "total_records": len(risk_df) if risk_df is not None else 0
    }


@app.get("/stats", tags=["Dashboard"])
def get_stats():
    """
    Returns summary numbers shown on the React dashboard cards:
    - Total transactions
    - High / Medium / Low risk counts
    - Average risk score
    """
    if risk_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    counts = risk_df['risk_label'].value_counts().to_dict()

    return {
        "total_transactions" : len(risk_df),
        "high_risk"          : int(counts.get('High',   0)),
        "medium_risk"        : int(counts.get('Medium', 0)),
        "low_risk"           : int(counts.get('Low',    0)),
        "avg_risk_score"     : round(float(risk_df['risk_score'].mean()), 4),
        "fraud_rate_pct"     : round(risk_df['is_fraud'].mean() * 100, 2),
    }


@app.get("/flagged", tags=["Dashboard"])
def get_flagged(limit: int = 50):
    """
    Returns the top N high-risk transactions for the Flagged tab.
    Frontend displays these in a sortable table.
    """
    if risk_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    flagged = (
        risk_df[risk_df['risk_label'] == 'High']
        .sort_values('risk_score', ascending=False)
        .head(limit)
    )

    # Return as list of dicts (JSON array)
    return flagged[['gstin', 'taxpayer_name', 'sector', 'state',
                    'taxable_value', 'risk_score', 'risk_label']].to_dict(orient='records')


@app.post("/predict", tags=["Prediction"])
def predict(transaction: TransactionInput):
    """
    The MAIN endpoint: given feature values, return fraud prediction.

    HOW IT WORKS:
    1. Build a feature vector from the input
    2. Run through the ML model → fraud probability
    3. Run through Isolation Forest → anomaly probability
    4. Combine: risk_score = 0.7 * ml_prob + 0.3 * anomaly_prob
    5. Threshold: ≥0.7 = High, ≥0.4 = Medium, else Low
    """
    if fraud_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Build feature array (ORDER MUST MATCH TRAINING)
    itc_ratio       = transaction.itc_claimed / (transaction.tax_paid + 1)
    tax_efficiency  = transaction.tax_paid    / (transaction.taxable_value + 1)

    scaler = joblib.load('scaler.pkl')

    raw_features = np.array([[
        transaction.taxable_value,
        transaction.itc_claimed,
        transaction.tax_paid,
        itc_ratio,
        transaction.invoice_count,
        transaction.mismatch_ratio,
        transaction.num_buyers,
        tax_efficiency,
    ]])

    numeric_cols = ['taxable_value', 'itc_claimed', 'tax_paid',
                    'itc_ratio', 'invoice_count', 'mismatch_ratio',
                    'num_buyers', 'tax_efficiency']
    scaled = scaler.transform(raw_features)

    # Add encoded categorical columns
    features = np.hstack([
        scaled,
        [[transaction.sector_enc, transaction.state_enc, transaction.status_enc]]
    ])

    # ML probability
    ml_prob = float(fraud_model.predict_proba(features)[0][1])

    # Anomaly probability
    anomaly_raw  = float(anomaly_model.decision_function(features)[0])
    # We can't normalise properly without the full dataset range,
    # so we clip and invert: more negative = more anomalous
    anomaly_prob = max(0, min(1, 0.5 - anomaly_raw))

    # Combined score
    risk_score = round(0.7 * ml_prob + 0.3 * anomaly_prob, 4)

    if   risk_score >= 0.7: risk_label = 'High'
    elif risk_score >= 0.4: risk_label = 'Medium'
    else:                   risk_label = 'Low'

    return {
        "ml_probability"    : round(ml_prob,     4),
        "anomaly_probability": round(anomaly_prob, 4),
        "risk_score"        : risk_score,
        "risk_label"        : risk_label,
        "verdict"           : "🚨 FRAUD ALERT" if risk_label == 'High' else
                              "⚠️ REVIEW NEEDED" if risk_label == 'Medium' else
                              "✅ LIKELY LEGITIMATE",
    }


@app.get("/distribution", tags=["Analytics"])
def get_distribution():
    """
    Returns data for the Risk Score distribution chart in the frontend.
    """
    if risk_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    bins  = np.arange(0, 1.1, 0.1)
    hist, edges = np.histogram(risk_df['risk_score'], bins=bins)

    return {
        "bins"   : [f"{e:.1f}" for e in edges[:-1]],
        "counts" : hist.tolist()
    }


@app.get("/sector_breakdown", tags=["Analytics"])
def sector_breakdown():
    """Returns fraud counts by business sector."""
    if risk_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")

    high = risk_df[risk_df['risk_label'] == 'High']
    breakdown = high.groupby('sector').size().reset_index(name='count')
    return breakdown.to_dict(orient='records')