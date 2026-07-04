from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from ..database import supabase
from ..services.forecast_service import (
    run_xgboost_forecast,
    run_prophet_forecast,
    get_model_metrics,
    COUNTRIES,
)

router = APIRouter()

class XGBoostRequest(BaseModel):
    country: str
    horizon: str        # h1 | h6 | h24
    pollutant: str = "co"

class ProphetRequest(BaseModel):
    country: str
    horizon: str        # 1_week | 1_month | 1_year
    pollutant: str = "co"

def fetch_history(pollutant: str, country: str, limit: int = 100) -> list:
    """Ambil data historis dari Supabase untuk membangun lag features XGBoost."""
    poll = pollutant.lower()
    if poll == "pm25": poll = "pm2.5"
    is_gas = poll in ["co", "no2", "o3"]
    table = "gas_measurements" if is_gas else "particulate_measurements"
    res = (
        supabase.table(table)
        .select("datetime_utc,value")
        .eq("pollutant", poll)
        .eq("country", country)
        .order("datetime_utc", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data if res.data else []


@router.post("/xgboost")
def forecast_xgboost(req: XGBoostRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    if req.country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country tidak valid. Pilih dari: {COUNTRIES}")
    if req.horizon not in ["h1", "h6", "h24"]:
        raise HTTPException(status_code=400, detail="Horizon XGBoost harus h1, h6, atau h24")

    history = fetch_history(req.pollutant, req.country, limit=100)
    if not history:
        raise HTTPException(status_code=404, detail=f"Tidak ada data historis untuk {req.country}/{req.pollutant}")

    try:
        result = run_xgboost_forecast(req.pollutant, req.horizon, req.country, history)
        metrics = get_model_metrics(req.pollutant, "xgboost", req.horizon)
        result["metrics"] = metrics
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@router.post("/prophet")
def forecast_prophet(req: ProphetRequest):
    if req.country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country tidak valid. Pilih dari: {COUNTRIES}")
    if req.horizon not in ["1_week", "1_month", "1_year"]:
        raise HTTPException(status_code=400, detail="Horizon Prophet harus 1_week, 1_month, atau 1_year")

    try:
        result = run_prophet_forecast(req.pollutant, req.horizon, req.country)
        metrics = get_model_metrics(req.pollutant, "prophet", req.horizon)
        result["metrics"] = metrics
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@router.get("/models")
def get_available_models():
    """Kembalikan daftar model, pollutant, horizon, dan kota yang tersedia."""
    return {
        "pollutants": ["CO", "NO2", "O3", "PM10", "PM2.5"],
        "countries": COUNTRIES,
        "models": {
            "XGBoost": {
                "description": "Short-term hourly prediction",
                "horizons": [
                    {"key": "h1",  "label": "1 Jam ke Depan"},
                    {"key": "h6",  "label": "6 Jam ke Depan"},
                    {"key": "h24", "label": "24 Jam ke Depan"},
                ]
            },
            "Prophet": {
                "description": "Long-term daily/monthly prediction",
                "horizons": [
                    {"key": "1_week",  "label": "1 Minggu ke Depan"},
                    {"key": "1_month", "label": "1 Bulan ke Depan"},
                    {"key": "1_year",  "label": "1 Tahun ke Depan"},
                ]
            }
        }
    }
