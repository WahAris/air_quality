from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
from ..database import supabase

router = APIRouter()

def get_table_name(pollutant: str):
    return "gas_measurements" if pollutant in ['co', 'no2', 'o3'] else "particulate_measurements"

@router.get("/sensors")
def get_gis_sensors(pollutant: Optional[str] = Query("co")):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    pollutant = pollutant.lower()
    if pollutant == "pm25":
        pollutant = "pm2.5"
        
    is_particulate = pollutant in ['pm10', 'pm2.5']
    unit = "ug/m3" if is_particulate else "ppm"
    table = get_table_name(pollutant)
    
    # Get sensor metadata
    sensors_res = supabase.table("sensor_locations").select("*").execute()
    sensors = sensors_res.data
    
    features = []
    
    for sensor in sensors:
        country_key = sensor['country_key']
        # Fetch latest measurement
        res = supabase.table(table).select("*").eq("country", country_key).eq("pollutant", pollutant).order("datetime_utc", desc=True).limit(1).execute()
        
        value = 0
        measured_at = datetime.utcnow().isoformat() + "Z"
        
        if res.data:
            latest = res.data[0]
            value = latest.get("value", 0)
            measured_at = latest.get("datetime_utc", measured_at)
            
        features.append({
            "type": "Feature",
            "geometry": { 
                "type": "Point", 
                "coordinates": [float(sensor['longitude']), float(sensor['latitude'])] 
            },
            "properties": {
                "country": country_key,
                "city": sensor['city_name'],
                "pollutant": pollutant,
                "value": float(value),
                "unit": unit,
                "measured_at_local": measured_at
            }
        })
        
    return { "type": "FeatureCollection", "features": features }
