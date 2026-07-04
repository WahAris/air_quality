import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")
    exit(1)

print(f"Connecting to: {url}")
try:
    supabase: Client = create_client(url, key)
    # Coba query ke tabel sensor_locations
    response = supabase.table("sensor_locations").select("*").execute()
    print("==============================")
    print("Connection successful! (OK)")
    print(f"Found {len(response.data)} sensor locations in database.")
    for loc in response.data:
        print(f" - {loc['city_name']} ({loc['country_key']})")
    print("==============================")
except Exception as e:
    print("==============================")
    print("Failed to connect or query database.")
    print("Exception:", e)
    print("==============================")
