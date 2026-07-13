from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from ..database import supabase

router = APIRouter()

COUNTRIES = ['canberra', 'bangkok', 'hongkong', 'london', 'philadelphia']
LOCATION_NAMES = {
    'canberra': 'Canberra',
    'bangkok': 'Bangkok',
    'hongkong': 'Causeway Bay',
    'london': 'London',
    'philadelphia': 'Philadelphia'
}

def get_table_name(pollutant: str, gran: str = "hourly"):
    is_gas = pollutant in ['co', 'no2', 'o3']
    if gran == "hourly":
        return "gas_measurements" if is_gas else "particulate_measurements"
    elif gran == "daily":
        return "gas_daily_agg" if is_gas else "particulate_daily_agg"
    elif gran == "monthly":
        return "gas_monthly_agg" if is_gas else "particulate_monthly_agg"
    return "gas_measurements"

@router.get("/summary")
def get_summary(pollutant: Optional[str] = Query("co")):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    pollutant = pollutant.lower()
    if pollutant == "pm25":
        pollutant = "pm2.5"
        
    is_particulate = pollutant in ['pm10', 'pm2.5']
    table = get_table_name(pollutant, "hourly")
    unit = "ug/m3" if is_particulate else "ppm"
    
    summary_data = []
    
    for country in COUNTRIES:
        # Fetch latest 25 records per country to get the current value and the 24h ago value
        res = supabase.table(table).select("*").eq("pollutant", pollutant).eq("country", country).order("datetime_utc", desc=True).limit(25).execute()
        records = res.data
        
        if not records:
            continue
            
        latest_record = records[0]
        value = latest_record.get("value", 0)
        
        change_24h = 0.0
        if len(records) > 24:
            old_record = records[24]
            change_24h = value - old_record.get("value", 0)
            
        summary_data.append({
            "country": country,
            "location_name": LOCATION_NAMES.get(country, country),
            "value": float(value),
            "unit": unit,
            "change_24h": float(change_24h),
            "datetime_utc": latest_record.get("datetime_utc")
        })
        
    return summary_data

@router.get("/{pollutant}")
def get_pollutant_data(
    pollutant: str,
    countries: Optional[str] = Query(None),
    gran: Optional[str] = Query("hourly"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    pollutant = pollutant.lower()
    if pollutant == "pm25":
        pollutant = "pm2.5"
        
    is_particulate = pollutant in ['pm10', 'pm2.5']
    unit = "ug/m3" if is_particulate else "ppm"
    
    country_list = countries.split(',') if countries else COUNTRIES
    table = get_table_name(pollutant, gran)
    
    time_col = "month" if gran == "monthly" else "date" if gran == "daily" else "datetime_utc"
    val_col = "avg_val" if gran in ["daily", "monthly"] else "value"
    
    data = []
    
    if gran == "yearly":
        table_monthly = get_table_name(pollutant, "monthly")
        query = supabase.table(table_monthly).select(f"country,month,avg_val,pollutant").eq("pollutant", pollutant).in_("country", country_list)
        if start:
            query = query.gte("month", start)
        if end:
            query = query.lte("month", end)
            
        res = query.order("month", desc=True).limit(10000).execute()
        
        yearly_data = {}
        for row in res.data:
            country = row.get("country")
            try:
                dt = datetime.fromisoformat(row.get("month"))
            except:
                dt = datetime.strptime(row.get("month"), "%Y-%m-%d")
            
            year = dt.year
            key = f"{country}_{year}"
            if key not in yearly_data:
                yearly_data[key] = {"country": country, "year": year, "vals": []}
            val = row.get("avg_val")
            yearly_data[key]["vals"].append(float(val if val is not None else 0))
            
        for key, info in yearly_data.items():
            data.append({
                "datetime_utc": f"{info['year']}-01-01T00:00:00Z",
                "country": info["country"],
                "pollutant": pollutant,
                "value": sum(info["vals"]) / len(info["vals"]),
                "unit": unit
            })
    else:
        query = supabase.table(table).select(f"country,{time_col},{val_col},pollutant").eq("pollutant", pollutant).in_("country", country_list)
        if start:
            query = query.gte(time_col, start)
        if end:
            query = query.lte(time_col, end)
            
        res = query.order(time_col, desc=True).limit(5000).execute()
        
        if start or end:
            row_limit = 10000
        else:
            if gran == "hourly":
                row_limit = 48
            elif gran == "daily":
                row_limit = 7
            elif gran == "monthly":
                row_limit = 12
            else:
                row_limit = 1000
            
        country_counts = {}
        for row in res.data:
            c = row.get("country")
            if country_counts.get(c, 0) < row_limit:
                data.append({
                    "datetime_utc": row.get(time_col),
                    "country": c,
                    "pollutant": row.get("pollutant"),
                    "value": float(row.get(val_col) if row.get(val_col) is not None else 0),
                    "unit": unit
                })
                country_counts[c] = country_counts.get(c, 0) + 1
            
    # Sort final merged data before returning
    data.sort(key=lambda x: x["datetime_utc"], reverse=True)
    return data
