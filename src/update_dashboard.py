#!/usr/bin/env python3
"""
Soil Moisture Dashboard Update Script
Processes soil moisture results and makes assets public
Runs after SM exports complete
"""

import ee
import sys
import os
import json

def initialize_earth_engine():
    """Initialize Earth Engine with service account or user credentials"""
    print("\nInitializing Earth Engine...")
    
    # GitHub Actions: use service account
    if os.getenv('EE_PRIVATE_KEY'):
        try:
            key_data = os.getenv('EE_PRIVATE_KEY')
            if not key_data:
                raise ValueError('EE_PRIVATE_KEY is empty')
            
            # Parse the JSON to get service account info
            service_account_info = json.loads(key_data)
            
            # Use ee.ServiceAccountCredentials (correct Python API method)
            credentials = ee.ServiceAccountCredentials(
                email=service_account_info['client_email'],
                key_data=key_data
            )
            ee.Initialize(credentials)
            print(f"✓ Initialized with service account: {service_account_info['client_email']}\n")
            return
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse EE_PRIVATE_KEY as JSON: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Service account initialization failed: {e}")
            sys.exit(1)
    
    # Local development: use default credentials
    try:
        ee.Initialize(project='ee-corfobbppciren2023')
        print("✓ Initialized with user credentials\n")
    except Exception as e:
        print("❌ Please authenticate first:")
        print("  python -c \"import ee; ee.Authenticate()\"")
        print(f"\nError: {e}")
        sys.exit(1)

# Import the processing modules AFTER defining initialize function
import hs_update
import publish_asset

def main():
    """Main entry point for dashboard update"""
    
    print("=" * 60)
    print("SOIL MOISTURE DASHBOARD UPDATE")
    print("=" * 60)
    
    # Initialize Earth Engine FIRST
    initialize_earth_engine()
    
    # Asset folders to process
    folder_hs = 'projects/ee-corfobbppciren2023/assets/HS'
    folder_dashboard = 'projects/ee-corfobbppciren2023/assets/MetricsHSTransposed'
    
    # Step 1: Process soil moisture data and create metrics
    print("=" * 60)
    print("STEP 1: PROCESSING SOIL MOISTURE DATA")
    print("=" * 60)
    
    try:
        resultado = hs_update.main()
        print(f"\n✓ Processing completed with status: {resultado['status']}")
        
        if resultado.get('taskCompleted'):
            print(f"✓ Export task completed successfully")
            print(f"  Asset: {resultado.get('assetPath', 'N/A')}")
        else:
            print(f"⚠️  Task did not complete or no new data to process")
            
    except Exception as e:
        print(f"\n❌ Error processing soil moisture data: {e}")
        sys.exit(1)
    
    # Step 2: Make assets public
    print("\n" + "=" * 60)
    print("STEP 2: MAKING ASSETS PUBLIC")
    print("=" * 60)
    
    folders_to_publish = [folder_hs, folder_dashboard]
    
    for folder in folders_to_publish:
        print(f"\nProcessing folder: {folder}")
        try:
            publish_asset.main(folder)
            print(f"✓ Assets in {folder} are now public")
        except Exception as e:
            print(f"❌ Error making assets public in {folder}: {e}")
            # Don't exit - continue with other folders
    
    print("\n" + "=" * 60)
    print("DASHBOARD UPDATE COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print(f"Total dates processed: {resultado.get('totalFechas', 0)}")
    print(f"Last execution: {resultado.get('ultimaEjecucion', 'N/A')}")
    print("=" * 60)

if __name__ == '__main__':
    main()
