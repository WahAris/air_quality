from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import data, forecast, gis

app = FastAPI(title="AirWatch Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])
app.include_router(gis.router, prefix="/api/gis", tags=["gis"])


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running"}
