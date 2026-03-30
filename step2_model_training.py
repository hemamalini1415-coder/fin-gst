"""
MEMBER 1 — STEP 2: Model Training
====================================
PURPOSE: Train 4 ML models, pick the best, score all transactions, build graph data.
INPUT:   gst_processed.csv, gst_raw.csv
OUTPUT:  fraud_model.pkl, anomaly_model.pkl, risk_results.csv,
         model_results.png, model_comparison.png, fraud_edges.csv, fraud_nodes.csv
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import networkx as nx

from sklearn.model_selection   import train_test_split
from sklearn.ensemble          import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model      import LogisticRegression
from sklearn.svm               import SVC
from sklearn.metrics           import (classification_report, confusion_matrix,
                                       roc_auc_score, roc_curve, accuracy_score)
from sklearn.ensemble          import IsolationForest
from imblearn.over_sampling    import SMOTE   # fixes class imbalance

np.random.seed(42)

# ─────────────────────────────────────────────
# SECTION 1 — Load data
# ─────────────────────────────────────────────
df = pd.read_csv('gst_processed.csv')

X = df.drop(columns=['is_fraud'])   # features
y = df['is_fraud']                  # label  (0 or 1)

print(f"Dataset shape: {X.shape}  |  Fraud: {y.sum()}  |  Legit: {(y==0).sum()}")

# ─────────────────────────────────────────────
# SECTION 2 — Handle class imbalance with SMOTE
# ─────────────────────────────────────────────
# Without SMOTE the model sees 8800 legit vs 1200 fraud.
# It would just predict "legit" for everything and get 88% accuracy — useless!
# SMOTE creates SYNTHETIC fraud examples so both classes are equal.

X_train_raw, X_test, y_train_raw, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

smote   = SMOTE(random_state=42)
X_train, y_train = smote.fit_resample(X_train_raw, y_train_raw)
print(f"After SMOTE — Train fraud: {y_train.sum()}  |  Train legit: {(y_train==0).sum()}")

# ─────────────────────────────────────────────
# SECTION 3 — Define 4 candidate models
# ─────────────────────────────────────────────
models = {
    'Random Forest'        : RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    'Gradient Boosting'    : GradientBoostingClassifier(n_estimators=100, random_state=42),
    'Logistic Regression'  : LogisticRegression(max_iter=1000, random_state=42),
    'SVM'                  : SVC(probability=True, random_state=42),
}

results   = {}
best_auc  = 0
best_model_name = ''
best_model      = None

for name, model in models.items():
    print(f"\n🔄 Training {name}...")
    model.fit(X_train, y_train)

    y_pred     = model.predict(X_test)
    y_prob     = model.predict_proba(X_test)[:, 1]
    acc        = accuracy_score(y_test, y_pred)
    auc        = roc_auc_score(y_test, y_prob)

    results[name] = {'accuracy': acc, 'auc': auc, 'model': model,
                     'y_pred': y_pred, 'y_prob': y_prob}

    print(f"   Accuracy: {acc:.4f}  |  AUC: {auc:.4f}")

    if auc > best_auc:
        best_auc        = auc
        best_model_name = name
        best_model      = model

print(f"\n🏆 Best model: {best_model_name}  (AUC = {best_auc:.4f})")

# ─────────────────────────────────────────────
# SECTION 4 — Save best model
# ─────────────────────────────────────────────
joblib.dump(best_model, 'fraud_model.pkl')
print("✅ fraud_model.pkl saved")

# ─────────────────────────────────────────────
# SECTION 5 — Anomaly detection with Isolation Forest
# ─────────────────────────────────────────────
# Isolation Forest finds "weird" transactions WITHOUT needing labels.
# It's our second detection layer — catches novel fraud patterns.

iso_forest = IsolationForest(n_estimators=100, contamination=0.12, random_state=42)
iso_forest.fit(X_train_raw)            # train on original data (no SMOTE needed here)
joblib.dump(iso_forest, 'anomaly_model.pkl')
print("✅ anomaly_model.pkl saved")

# ─────────────────────────────────────────────
# SECTION 6 — Score ALL 10,000 transactions → risk_results.csv
# ─────────────────────────────────────────────
ml_probs     = best_model.predict_proba(X)[:, 1]          # ML fraud probability
anomaly_raw  = iso_forest.decision_function(X)             # negative = more anomalous
# Normalise anomaly score to 0–1 (0 = normal, 1 = most anomalous)
anomaly_prob = 1 - (anomaly_raw - anomaly_raw.min()) / (anomaly_raw.max() - anomaly_raw.min())

# Combined risk score (70% ML + 30% anomaly)
risk_score   = 0.7 * ml_probs + 0.3 * anomaly_prob

# Assign label
def label(score):
    if score >= 0.7: return 'High'
    if score >= 0.4: return 'Medium'
    return 'Low'

df_raw    = pd.read_csv('gst_raw.csv')
df_results = df_raw.copy()
df_results['ml_prob']     = np.round(ml_probs,    4)
df_results['anomaly_prob']= np.round(anomaly_prob,4)
df_results['risk_score']  = np.round(risk_score,  4)
df_results['risk_label']  = df_results['risk_score'].apply(label)

df_results.to_csv('risk_results.csv', index=False)
print(f"✅ risk_results.csv saved  →  High: {(df_results['risk_label']=='High').sum()}")

# ─────────────────────────────────────────────
# SECTION 7 — Visualisations
# ─────────────────────────────────────────────

# 7a. Confusion matrix + ROC for best model
best_res = results[best_model_name]
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

cm = confusion_matrix(y_test, best_res['y_pred'])
sns.heatmap(cm, annot=True, fmt='d', cmap='Reds', ax=axes[0],
            xticklabels=['Legit','Fraud'], yticklabels=['Legit','Fraud'])
axes[0].set_title(f'Confusion Matrix — {best_model_name}')
axes[0].set_xlabel('Predicted')
axes[0].set_ylabel('Actual')

fpr, tpr, _ = roc_curve(y_test, best_res['y_prob'])
axes[1].plot(fpr, tpr, label=f'AUC = {best_res["auc"]:.3f}', color='crimson', lw=2)
axes[1].plot([0,1],[0,1], '--', color='gray')
axes[1].set_title('ROC Curve')
axes[1].set_xlabel('False Positive Rate')
axes[1].set_ylabel('True Positive Rate')
axes[1].legend()

plt.tight_layout()
plt.savefig('model_results.png', dpi=150)
plt.close()
print("✅ model_results.png saved")

# 7b. Compare all 4 models
model_names = list(results.keys())
accs  = [results[n]['accuracy'] for n in model_names]
aucs  = [results[n]['auc']      for n in model_names]

x = np.arange(len(model_names))
fig, ax = plt.subplots(figsize=(10, 5))
bars1 = ax.bar(x - 0.2, accs, 0.4, label='Accuracy', color='steelblue')
bars2 = ax.bar(x + 0.2, aucs, 0.4, label='AUC',      color='coral')
ax.set_xticks(x)
ax.set_xticklabels(model_names, rotation=15)
ax.set_ylim(0.7, 1.05)
ax.set_title('Model Comparison')
ax.legend()
for bar in bars1 + bars2:
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005,
            f'{bar.get_height():.3f}', ha='center', va='bottom', fontsize=9)
plt.tight_layout()
plt.savefig('model_comparison.png', dpi=150)
plt.close()
print("✅ model_comparison.png saved")

# ─────────────────────────────────────────────
# SECTION 8 — Build graph data for Gephi
# ─────────────────────────────────────────────
# For circular billing fraud: companies A→B→C→A with no real goods.
# We build fake "edges" between sellers and buyers among flagged transactions.

high_risk = df_results[df_results['risk_label'] == 'High'].copy()

# Treat GSTIN as seller node, create fake buyer GSTINs from same pool
np.random.seed(0)
edges = []
for _, row in high_risk.iterrows():
    n_links = np.random.randint(1, 4)
    targets = high_risk['gstin'].sample(n=n_links, replace=True)
    for tgt in targets:
        if tgt != row['gstin']:
            edges.append({'source': row['gstin'], 'target': tgt,
                          'weight': round(row['risk_score'], 3)})

df_edges = pd.DataFrame(edges).drop_duplicates()
df_edges.to_csv('fraud_edges.csv', index=False)

nodes = pd.DataFrame({
    'id'         : high_risk['gstin'],
    'label'      : high_risk['taxpayer_name'],
    'risk_score' : high_risk['risk_score'],
    'sector'     : high_risk['sector'],
})
nodes.to_csv('fraud_nodes.csv', index=False)
print(f"✅ fraud_edges.csv ({len(df_edges)} edges) + fraud_nodes.csv saved")

print("\n🎉 STEP 2 DONE — All ML files ready. Member 2 can start the backend.")