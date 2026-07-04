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

def insert_batches(table_name, df, batch_size=3000):
    df = df.replace({np.nan: None})
    records = df.to_dict('records')
    total = len(records)
    print(f"Inserting {total} records into '{table_name}'...")
    
    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        retries = 3
        while retries > 0:
            try:
                supabase.table(table_name).insert(batch).execute()
                print(f"  Inserted {min(i+batch_size, total)} / {total}")
                break
            except Exception as e:
                print(f"  Error inserting batch {i} (Retries left: {retries-1}): {e}")
                retries -= 1
                time.sleep(2)
        if retries == 0:
            print("  Skipping batch due to repeated failures.")

pollutants = ['no2', 'o3', 'pm10', 'pm25']

for p in pollutants:
    print(f"\n==============================")
    print(f"Processing Pollutant: {p.upper()}")
    print(f"==============================")
    
    db_pollutant = 'pm2.5' if p == 'pm25' else p
    is_gas = p in ['no2', 'o3']
    
    t_monthly = "gas_monthly_agg" if is_gas else "particulate_monthly_agg"
    t_daily = "gas_daily_agg" if is_gas else "particulate_daily_agg"
    t_hourly = "gas_measurements" if is_gas else "particulate_measurements"
    
    # Monthly
    print(f"[{p}] Monthly Data...")
    df_monthly = pd.read_csv(rf"c:\web_air_baru\data_other\monthly_{p}_df.csv")
    df_monthly = df_monthly.rename(columns={f"{p}_avg": "avg_val"})
    df_monthly['pollutant'] = db_pollutant
    insert_batches(t_monthly, df_monthly)

    # Daily
    print(f"[{p}] Daily Data...")
    df_daily = pd.read_csv(rf"c:\web_air_baru\data_other\daily_{p}_df.csv")
    df_daily = df_daily.rename(columns={f"{p}_avg": "avg_val"})
    df_daily['pollutant'] = db_pollutant
    insert_batches(t_daily, df_daily)

    # Hourly
    print(f"[{p}] Hourly Data...")
    df_hourly = pd.read_csv(rf"c:\web_air_baru\data_other\all_{p}_df.csv")
    df_hourly = df_hourly.rename(columns={
        "location": "location_name",
        "is_missing_after_resample": "is_missing"
    })
    
    # Correct pollutant name in dataframe if it's pm25
    df_hourly['pollutant'] = db_pollutant
    
    if 'is_missing' in df_hourly.columns:
        df_hourly['is_missing'] = df_hourly['is_missing'].astype(bool)

    # Drop potential extra columns (like unit, if we want to rely on DB default, but keeping it is fine as long as DB accepts it)
    
    insert_batches(t_hourly, df_hourly, batch_size=3000)

print("\nAll Extra Data Import Complete!")
