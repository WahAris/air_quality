import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

# Base path ke folder model (relatif dari backend/app/services/)
MODEL_BASE = Path(__file__).resolve().parent.parent.parent.parent / "model"

COUNTRIES = ["bangkok", "canberra", "hongkong", "london", "philadelphia"]

POLLUTANT_KEY_MAP = {
    "co": "co",
    "no2": "no2",
    "o3": "o3",
    "pm10": "pm10",
    "pm25": "pm25",
    "pm2.5": "pm25",
}

def build_xgboost_features(history: pd.Series, horizon: int, base_dt=None) -> pd.DataFrame:
    # Gunakan waktu sekarang sebagai titik acuan, bukan waktu data terakhir
    if base_dt is None:
        base_dt = datetime.utcnow()
    target_dt = base_dt + timedelta(hours=horizon)
    row = {
        "hour": target_dt.hour,
        "day": target_dt.day,
        "weekday": target_dt.weekday(),
        "month": target_dt.month,
        "quarter": (target_dt.month - 1) // 3 + 1,
        "weekofyear": int(target_dt.strftime("%W")),
        "dayofyear": target_dt.timetuple().tm_yday,
        "year": target_dt.year,
        "is_weekend": int(target_dt.weekday() >= 5),
        "lag_1": float(history.iloc[-1]) if len(history) >= 1 else 0,
        "lag_6": float(history.iloc[-6]) if len(history) >= 6 else float(history.iloc[0]),
        "lag_24": float(history.iloc[-24]) if len(history) >= 24 else float(history.iloc[0]),
        "lag_48": float(history.iloc[-48]) if len(history) >= 48 else float(history.iloc[0]),
        "lag_72": float(history.iloc[-72]) if len(history) >= 72 else float(history.iloc[0]),
        "diff_1": float(history.iloc[-1] - history.iloc[-2]) if len(history) >= 2 else 0,
        "diff_24": float(history.iloc[-1] - history.iloc[-24]) if len(history) >= 24 else 0,
        "rolling_mean_6": float(history.iloc[-6:].mean()) if len(history) >= 6 else float(history.mean()),
        "rolling_mean_24": float(history.iloc[-24:].mean()) if len(history) >= 24 else float(history.mean()),
        "rolling_std_24": float(history.iloc[-24:].std()) if len(history) >= 24 else 0.0,
    }
    return pd.DataFrame([row])


def run_xgboost_forecast(pollutant: str, horizon_key: str, country: str, history_data: list) -> dict:
    poll_key = POLLUTANT_KEY_MAP.get(pollutant.lower(), pollutant.lower())
    if poll_key == "co":
        model_path = MODEL_BASE / "co" / "xgboost" / f"co_xgboost_{horizon_key}.joblib"
    else:
        model_path = MODEL_BASE / poll_key / f"xgboost_{poll_key}_{horizon_key}.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Model tidak ditemukan: {model_path}")
    model = joblib.load(model_path)
    df = pd.DataFrame(history_data)
    df["datetime_utc"] = pd.to_datetime(df["datetime_utc"], utc=True)
    df = df.sort_values("datetime_utc").set_index("datetime_utc")
    history = df["value"].astype(float)
    horizon_hours = {"h1": 1, "h6": 6, "h24": 24}
    h = horizon_hours.get(horizon_key, 1)
    # Gunakan waktu sekarang sebagai acuan prediksi
    now = datetime.utcnow()
    X = build_xgboost_features(history, h, base_dt=now)
    pred = float(model.predict(X)[0])
    pred = max(0.0, round(pred, 4))
    target_dt = now + timedelta(hours=h)
    std = float(history.iloc[-24:].std()) if len(history) >= 24 else float(history.std())
    return {
        "model": "XGBoost",
        "horizon": horizon_key,
        "country": country,
        "pollutant": pollutant.upper(),
        "predictions": [{
            "ds": target_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "yhat": pred,
            "yhat_lower": max(0.0, round(pred - std, 4)),
            "yhat_upper": round(pred + std, 4),
        }]
    }


def run_prophet_forecast(pollutant: str, horizon_key: str, country: str) -> dict:
    from prophet.serialize import model_from_json
    poll_key = POLLUTANT_KEY_MAP.get(pollutant.lower(), pollutant.lower())
    gran = "monthly" if horizon_key == "1_year" else "daily"
    if poll_key == "co":
        model_path = MODEL_BASE / "co" / "prophet" / f"co_prophet_{gran}_{country}.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Model tidak ditemukan: {model_path}")
        m = joblib.load(model_path)
    else:
        model_path = MODEL_BASE / poll_key / f"prophet_{gran}_{poll_key}_{country}.json"
        if not model_path.exists():
            raise FileNotFoundError(f"Model tidak ditemukan: {model_path}")
        with open(model_path, "r") as f:
            m = model_from_json(f.read())
    periods_map = {"1_week": (7, "D"), "1_month": (30, "D"), "1_year": (12, "MS")}
    periods, freq = periods_map.get(horizon_key, (7, "D"))

    # Buat future dataframe mulai dari HARI INI, bukan dari akhir data training
    now = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if freq == "MS":
        # Monthly: mulai dari awal bulan depan
        future_dates = pd.date_range(
            start=now.replace(day=1) + pd.DateOffset(months=1),
            periods=periods,
            freq="MS"
        )
    else:
        # Daily: mulai dari besok
        future_dates = pd.date_range(
            start=now + timedelta(days=1),
            periods=periods,
            freq="D"
        )

    future = pd.DataFrame({"ds": future_dates})
    forecast = m.predict(future)

    predictions = []
    for _, row in forecast.iterrows():
        predictions.append({
            "ds": row["ds"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "yhat": max(0.0, round(float(row["yhat"]), 4)),
            "yhat_lower": max(0.0, round(float(row["yhat_lower"]), 4)),
            "yhat_upper": round(float(row["yhat_upper"]), 4),
        })
    return {
        "model": "Prophet",
        "horizon": horizon_key,
        "country": country,
        "pollutant": pollutant.upper(),
        "predictions": predictions
    }


def get_model_metrics(pollutant: str, model_type: str, horizon_key: str) -> dict:
    poll_key = POLLUTANT_KEY_MAP.get(pollutant.lower(), pollutant.lower())
    try:
        if poll_key == "co":
            outputs_dir = MODEL_BASE / "co" / "outputs"
            if model_type == "xgboost":
                df = pd.read_csv(outputs_dir / "xgboost_evaluation_results.csv")
                row = df[df["horizon"] == horizon_key]
                if not row.empty:
                    return {"mae": round(float(row["mae"].values[0]), 4), "rmse": round(float(row["rmse"].values[0]), 4), "smape": round(float(row["smape"].values[0]), 2)}
            else:
                df = pd.read_csv(outputs_dir / "prophet_daily_evaluation_results.csv")
                if not df.empty:
                    avg = df[["mae", "rmse", "smape"]].mean()
                    return {"mae": round(float(avg["mae"]), 4), "rmse": round(float(avg["rmse"]), 4), "smape": round(float(avg["smape"]), 2)}
        else:
            base = MODEL_BASE / poll_key
            if model_type == "xgboost":
                df = pd.read_csv(base / f"xgboost_results_{poll_key}.csv")
                row = df[df["horizon"] == horizon_key]
                if not row.empty:
                    return {"mae": round(float(row["mae"].values[0]), 4), "rmse": round(float(row["rmse"].values[0]), 4), "smape": round(float(row["smape"].values[0]), 2)}
            else:
                fname = f"prophet_daily_comparison_{poll_key}.csv"
                df = pd.read_csv(base / fname)
                if not df.empty:
                    avg = df[["mae", "rmse", "smape"]].mean()
                    return {"mae": round(float(avg["mae"]), 4), "rmse": round(float(avg["rmse"]), 4), "smape": round(float(avg["smape"]), 2)}
    except Exception:
        pass
    return {"mae": None, "rmse": None, "smape": None}

