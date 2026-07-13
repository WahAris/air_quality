import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client
import time

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
if not url or not key:
    print("Error: Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

def get_max_date(table_name, date_column, pollutant):
    # Query database to get the latest date for a given pollutant
    try:
        res = supabase.table(table_name).select(date_column).eq('pollutant', pollutant).order(date_column, desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0][date_column]
        return None
    except Exception as e:
        print(f"Error fetching max date for {table_name} ({pollutant}): {e}")
        return None

def insert_batches(table_name, df, batch_size=3000):
    if df.empty:
        print(f"  No new data to insert into '{table_name}'.")
        return
        
    df = df.replace({np.nan: None})
    records = df.to_dict('records')
    total = len(records)
    print(f"  Inserting {total} records into '{table_name}'...")
    
    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        retries = 3
        while retries > 0:
            try:
                # Using upsert is safer if there are overlapping edges
                # but without knowing exactly the constraints, insert is standard here
                # if there is a conflict, upsert will update if PK matches.
                supabase.table(table_name).upsert(batch).execute()
                print(f"    Inserted/Upserted {min(i+batch_size, total)} / {total}")
                break
            except Exception as e:
                print(f"    Error inserting batch {i} (Retries left: {retries-1}): {e}")
                retries -= 1
                time.sleep(2)
        if retries == 0:
            print("    Skipping batch due to repeated failures.")

pollutants = ['co', 'no2', 'o3', 'pm10', 'pm25']

for p in pollutants:
    print(f"\n==============================")
    print(f"Processing Pollutant: {p.upper()}")
    print(f"==============================")
    
    db_pollutant = 'pm2.5' if p == 'pm25' else p
    is_gas = p in ['co', 'no2', 'o3']
    
    t_monthly = "gas_monthly_agg" if is_gas else "particulate_monthly_agg"
    t_daily = "gas_daily_agg" if is_gas else "particulate_daily_agg"
    t_hourly = "gas_measurements" if is_gas else "particulate_measurements"
    
    # --- HOURLY ---
    print(f"\n[{p}] Hourly Data...")
    max_hourly = get_max_date(t_hourly, 'datetime_utc', db_pollutant)
    print(f"  Max datetime_utc in DB: {max_hourly}")
    
    df_hourly = pd.read_csv(rf"c:\web_air_baru\dataset\all_{p}_df.csv")
    df_hourly = df_hourly.rename(columns={
        "location": "location_name",
        "is_missing_after_resample": "is_missing"
    })
    df_hourly['pollutant'] = db_pollutant
    if 'is_missing' in df_hourly.columns:
        df_hourly['is_missing'] = df_hourly['is_missing'].astype(bool)
        
    if max_hourly:
        # Filter new data (strictly greater)
        df_hourly_new = df_hourly[df_hourly['datetime_utc'] > max_hourly]
    else:
        df_hourly_new = df_hourly
        
    insert_batches(t_hourly, df_hourly_new, batch_size=2000)

    # --- DAILY ---
    print(f"\n[{p}] Daily Data...")
    max_daily = get_max_date(t_daily, 'date', db_pollutant)
    print(f"  Max date in DB: {max_daily}")
    
    df_daily = pd.read_csv(rf"c:\web_air_baru\dataset\daily_{p}_df.csv")
    df_daily = df_daily.rename(columns={f"{p}_avg": "avg_val", "co_avg": "avg_val"}) # handle co_avg if column name is inconsistent
    # make sure avg_val exists
    for col in df_daily.columns:
        if '_avg' in col and col != 'avg_val':
            df_daily = df_daily.rename(columns={col: "avg_val"})
            
    df_daily['pollutant'] = db_pollutant
    
    if max_daily:
        df_daily_new = df_daily[df_daily['date'] > max_daily]
    else:
        df_daily_new = df_daily
        
    insert_batches(t_daily, df_daily_new)

    # --- MONTHLY ---
    print(f"\n[{p}] Monthly Data...")
    max_monthly = get_max_date(t_monthly, 'month', db_pollutant)
    print(f"  Max month in DB: {max_monthly}")
    
    df_monthly = pd.read_csv(rf"c:\web_air_baru\dataset\monthly_{p}_df.csv")
    for col in df_monthly.columns:
        if '_avg' in col and col != 'avg_val':
            df_monthly = df_monthly.rename(columns={col: "avg_val"})
    df_monthly['pollutant'] = db_pollutant
    
    if max_monthly:
        df_monthly_new = df_monthly[df_monthly['month'] > max_monthly]
    else:
        df_monthly_new = df_monthly
        
    insert_batches(t_monthly, df_monthly_new)

print("\nIncremental Dataset Update Complete!")
