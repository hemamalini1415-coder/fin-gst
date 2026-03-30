"""
MEMBER 1 — STEP 1: Data Generation
====================================
PURPOSE: Generate 10,000 fake GST transactions with realistic fraud patterns.
OUTPUT:  gst_raw.csv, gst_processed.csv, scaler.pkl, le_*.pkl
"""

import pandas as pd
import numpy as np
from faker import Faker
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import random

fake = Faker('en_IN')   # Indian locale for realistic names/addresses
np.random.seed(42)
random.seed(42)

# ─────────────────────────────────────────────
# SECTION 1 — Define constants
# ─────────────────────────────────────────────
N_TRANSACTIONS  = 10_000   # total rows we generate
FRAUD_RATE      = 0.12     # 12% of rows will be fraudulent

SECTORS         = ['Manufacturing', 'Trading', 'Services', 'Construction', 'Retail']
STATES          = ['MH', 'GJ', 'DL', 'TN', 'KA', 'RJ', 'UP', 'WB', 'MP', 'TG']
FILING_STATUSES = ['Regular', 'Late', 'Missing']

# ─────────────────────────────────────────────
# SECTION 2 — Helper: generate one transaction
# ─────────────────────────────────────────────
def generate_transaction(is_fraud: bool) -> dict:
    """
    Returns a dict with all columns for one GST transaction.
    Fraud rows are given exaggerated / suspicious feature values.
    """
    sector          = random.choice(SECTORS)
    state           = random.choice(STATES)
    filing_status   = random.choice(FILING_STATUSES)

    if is_fraud:
        # ── FRAUD SIGNALS ──────────────────────────────────────
        taxable_value   = np.random.uniform(500_000, 5_000_000)   # unusually high
        itc_claimed     = taxable_value * np.random.uniform(1.5, 3.0)  # ITC > tax paid (impossible in legit)
        tax_paid        = taxable_value * np.random.uniform(0.01, 0.05) # very low tax
        invoice_count   = np.random.randint(50, 300)               # huge invoice volume
        mismatch_ratio  = np.random.uniform(0.4, 0.9)             # high mismatch
        num_buyers      = np.random.randint(20, 100)
        filing_status   = random.choice(['Late', 'Missing'])       # fraudsters often file late
        # ────────────────────────────────────────────────────────
    else:
        # ── LEGITIMATE SIGNALS ──────────────────────────────────
        taxable_value   = np.random.uniform(10_000, 1_000_000)
        itc_claimed     = taxable_value * np.random.uniform(0.05, 0.18)  # ITC ≈ 5–18%
        tax_paid        = taxable_value * np.random.uniform(0.05, 0.18)
        invoice_count   = np.random.randint(1, 50)
        mismatch_ratio  = np.random.uniform(0.0, 0.15)
        num_buyers      = np.random.randint(1, 20)
        # ────────────────────────────────────────────────────────

    itc_ratio = itc_claimed / (tax_paid + 1)   # +1 prevents divide-by-zero

    return {
        'gstin'          : fake.bothify(text='##?????????????#?#', letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        'taxpayer_name'  : fake.company(),
        'sector'         : sector,
        'state'          : state,
        'taxable_value'  : round(taxable_value,    2),
        'itc_claimed'    : round(itc_claimed,      2),
        'tax_paid'       : round(tax_paid,         2),
        'itc_ratio'      : round(itc_ratio,        4),
        'invoice_count'  : invoice_count,
        'mismatch_ratio' : round(mismatch_ratio,   4),
        'num_buyers'     : num_buyers,
        'filing_status'  : filing_status,
        'is_fraud'       : int(is_fraud),           # 1 = fraud, 0 = legit
    }

# ─────────────────────────────────────────────
# SECTION 3 — Generate all rows
# ─────────────────────────────────────────────
n_fraud  = int(N_TRANSACTIONS * FRAUD_RATE)         # 1,200 fraud rows
n_legit  = N_TRANSACTIONS - n_fraud                 # 8,800 legit rows

rows = (
    [generate_transaction(is_fraud=True)  for _ in range(n_fraud)] +
    [generate_transaction(is_fraud=False) for _ in range(n_legit)]
)

# Shuffle so fraud is not all at the top
random.shuffle(rows)

df_raw = pd.DataFrame(rows)
df_raw.to_csv('gst_raw.csv', index=False)
print(f"✅ gst_raw.csv saved  →  {len(df_raw)} rows  |  {df_raw['is_fraud'].sum()} fraud")

# ─────────────────────────────────────────────
# SECTION 4 — Feature engineering (processed CSV)
# ─────────────────────────────────────────────
df = df_raw.copy()

# 4a. Encode categorical columns as numbers (ML needs numbers, not text)
le_sector  = LabelEncoder()
le_state   = LabelEncoder()
le_status  = LabelEncoder()

df['sector_enc']  = le_sector.fit_transform(df['sector'])
df['state_enc']   = le_state.fit_transform(df['state'])
df['status_enc']  = le_status.fit_transform(df['filing_status'])

# 4b. Create a new feature: tax efficiency = tax_paid / (taxable_value + 1)
df['tax_efficiency'] = df['tax_paid'] / (df['taxable_value'] + 1)

# 4c. Drop columns that are identifiers (not useful for ML)
df_processed = df.drop(columns=['gstin', 'taxpayer_name', 'sector', 'state', 'filing_status'])

# 4d. Scale numeric features to the same range (needed for some models)
feature_cols = ['taxable_value', 'itc_claimed', 'tax_paid',
                'itc_ratio', 'invoice_count', 'mismatch_ratio',
                'num_buyers', 'tax_efficiency']

scaler = StandardScaler()
df_processed[feature_cols] = scaler.fit_transform(df_processed[feature_cols])

df_processed.to_csv('gst_processed.csv', index=False)
print(f"✅ gst_processed.csv saved  →  columns: {list(df_processed.columns)}")

# ─────────────────────────────────────────────
# SECTION 5 — Save encoders (backend needs them)
# ─────────────────────────────────────────────
joblib.dump(scaler,    'scaler.pkl')
joblib.dump(le_sector, 'le_sector.pkl')
joblib.dump(le_state,  'le_state.pkl')
joblib.dump(le_status, 'le_status.pkl')
print("✅ scaler.pkl + le_*.pkl saved")

print("\n🎉 STEP 1 DONE — Now run step2_model_training.py")