#!/usr/bin/env python3
"""
Soil Moisture Processing and Metrics Calculation
Processes soil moisture assets and creates transposed metrics
"""

import ee
import time
import datetime

def asegurar_geometrias_fixed(fc, subcuencas):
    """Fixed version that properly handles Earth Engine geometries"""

    def map_geometry(feature):
        try:
            # Get the feature's geometry
            geom = feature.geometry()
            
            # Create a new feature with explicitly set geometry
            return ee.Feature(geom, feature.toDictionary())
        except Exception as e:
            print(f"Error processing feature geometry: {e}")
            return feature

    return ee.FeatureCollection(fc).map(map_geometry)

# ...existing wait_for_task_completion code...
# ...existing is_asset_public code...
# ...existing make_asset_public code...
# ...existing make_assets_public_in_folder code...
# ...existing procesar_humedad_suelo code...
# ...existing main code...