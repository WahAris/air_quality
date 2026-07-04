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

print("Processing Monthly Data...")
df_monthly = pd.read_csv(r"c:\web_air_baru\data_co\monthly_co_df.csv")
df_monthly = df_monthly.rename(columns={"co_avg": "avg_val"})
df_monthly['pollutant'] = 'co'
insert_batches("gas_monthly_agg", df_monthly)

print("\nProcessing Daily Data...")
df_daily = pd.read_csv(r"c:\web_air_baru\data_co\daily_co_df.csv")
df_daily = df_daily.rename(columns={"co_avg": "avg_val"})
df_daily['pollutant'] = 'co'
insert_batches("gas_daily_agg", df_daily)

print("\nProcessing Hourly Data...")
df_hourly = pd.read_csv(r"c:\web_air_baru\data_co\all_co_df.csv")
df_hourly = df_hourly.rename(columns={
    "location": "location_name",
    "is_missing_after_resample": "is_missing"
})
# Memastikan boolean column sesuai
if 'is_missing' in df_hourly.columns:
    df_hourly['is_missing'] = df_hourly['is_missing'].astype(bool)

insert_batches("gas_measurements", df_hourly, batch_size=2000)

print("\nData Import Complete!")
