#!/usr/bin/env python3
"""
Soil Moisture Dashboard Update Script
Processes soil moisture results and makes assets public
Runs after SM exports complete
"""

import ee
import sys
import os

# Import the processing modules (from existing files)
try:
    # Try importing from current directory first
    from . import hs_update
    from . import publish_asset
except ImportError:
    # Fallback: import from same directory
    import hs_update
    import publish_asset

def main():
    """Main entry point for dashboard update"""
    
    print("=" * 60)
    print("SOIL MOISTURE DASHBOARD UPDATE")
    print("=" * 60)
    
    # Initialize Earth Engine
    print("\nInitializing Earth Engine...")
    try:
        # Use service account for automation
        if os.getenv('EE_PRIVATE_KEY'):
            import json
            key_data = os.getenv('EE_PRIVATE_KEY')
            if key_data:
                service_account_info = json.loads(key_data)
                credentials = ee.ServiceAccountCredentials(
                    service_account_info['client_email'],
                    key_data
                )
                ee.Initialize(credentials)
            else:
                raise ValueError('EE_PRIVATE_KEY is empty')
        else:
            # Local development - requires authentication
            try:
                ee.Initialize(project='ee-corfobbppciren2023')
            except Exception:
                print("Please authenticate Earth Engine first:")
                print("  python -c \"import ee; ee.Authenticate()\"")
                raise
        
        print("✓ Earth Engine initialized successfully\n")
    except Exception as e:
        print(f"❌ Failed to initialize Earth Engine: {e}")
        sys.exit(1)
    
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
