"""
ml-service/train.py
Genera datos sintéticos de cooperativas y entrena un modelo de riesgo crediticio.
"""
import numpy as np
import pickle
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import os

np.random.seed(42)
N_SAMPLES = 2000

def generate_synthetic_data():
    consistencia = np.random.uniform(10, 100, N_SAMPLES)
    pagos = np.random.uniform(10, 100, N_SAMPLES)
    cooperativa = np.random.uniform(10, 100, N_SAMPLES)
    endeudamiento = np.random.uniform(10, 100, N_SAMPLES)
    ahorro = np.random.uniform(10, 100, N_SAMPLES)

    risk_score = (
        (100 - consistencia) * 0.25 +
        (100 - pagos) * 0.30 +
        (100 - cooperativa) * 0.15 +
        endeudamiento * 0.20 +
        (100 - ahorro) * 0.10
    ) / 100

    noise = np.random.normal(0, 0.05, N_SAMPLES)
    risk_score = np.clip(risk_score + noise, 0, 1)

    labels = np.zeros(N_SAMPLES, dtype=int)
    labels[risk_score < 0.35] = 1

    X = np.column_stack([consistencia, pagos, cooperativa, endeudamiento, ahorro])
    y = labels

    return X, y, risk_score

def train():
    print("Generando datos sinteticos...")
    X, y, _ = generate_synthetic_data()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Entrenando modelo con {len(X_train)} muestras...")
    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\nReporte de clasificacion:")
    print(classification_report(y_test, y_pred, target_names=["Riesgoso", "Bueno"]))

    features = ["consistencia_ingresos", "responsabilidad_pagos", "compromiso_cooperativo", "perfil_endeudamiento", "capacidad_ahorro"]
    importances = model.feature_importances_
    print("\nImportancia de features:")
    for f, imp in zip(features, importances):
        print(f"  {f}: {imp:.3f}")

    with open("model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("\nModelo guardado en model.pkl")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    train()
