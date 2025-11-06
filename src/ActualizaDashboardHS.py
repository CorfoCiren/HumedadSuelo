# First cell: Install and initialize Earth Engine
!pip install earthengine-api

import ee
from google.colab import drive
import sys

# Authenticate - you'll need to follow the authorization link the first time
try:
  ee.Initialize(project='ee-corfobbppciren2023')
except Exception:
  ee.Authenticate()
  ee.Initialize(project='ee-corfobbppciren2023')

# Agregar ruta donde está el .py
drive.mount('/content/drive')
drive_path = '/content/drive/MyDrive/Colab Notebooks'  # Note: 'MyDrive' not 'My Drive'
folder_hs = 'projects/ee-corfobbppciren2023/assets/HS'
# folder_lst = 'projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares'

folder_dashboard = 'projects/ee-corfobbppciren2023/assets/MetricsHSTransposed'
sys.path.append(drive_path)

import hs_update
import publish_asset

# Third cell: Execute the function
# resultado = hs_update.main()
publish_asset.main(folder_hs)
# publish_asset.main(folder_lst)
publish_asset.main(folder_dashboard)
