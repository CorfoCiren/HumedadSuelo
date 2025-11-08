import datetime
import time
import ee

#!/usr/bin/env python3
"""
Soil Moisture Metrics Processing
Note: Earth Engine must be initialized BEFORE calling functions in this module
"""

import ee
import time
import datetime

# Note: Do NOT initialize EE here - it's done in update_dashboard.py

def asegurar_geometrias_fixed(fc, subcuencas):
    """Versión corregida que maneja correctamente las geometrías de Earth Engine"""

    def map_geometry(feature):
        try:
            # Get geometry and check if it exists and is valid
            geom = feature.geometry()

            # In Earth Engine Python API, check if geometry is valid
            # by trying to compute its area (this will fail for null/invalid geometries)
            try:
                # This will trigger an error if geometry is null/invalid
                geom.area().getInfo()
                return feature  # Geometry is valid, return as is
            except:
                # Get geometry from subcuencas if original geometry is invalid
                cod_subc = feature.get('COD_SUBC')
                subc_feature = subcuencas.filter(ee.Filter.eq('COD_SUBC', cod_subc)).first()
                return feature.setGeometry(subc_feature.geometry())
                
        except Exception as e:
            print(f"Error in map_geometry: {e}")
            return feature

    return ee.FeatureCollection(fc).map(map_geometry)

# Function to wait for task completion
def wait_for_task_completion(task, check_interval=10, max_wait=1800):
    """Wait for an Earth Engine task to complete with progress reporting"""
    if task is None:
        print("❌ No task provided")
        return False

    task_id = task.id
    if task_id is None:
        print("❌ Task has no valid ID")
        return False

    start_time = time.time()
    previous_state = None

    print(f"🔍 Monitoring task {task_id}...")

    while time.time() - start_time < max_wait:
        try:
            status = ee.data.getTaskStatus(task_id)[0]
            state = status['state']

            # Print status only when it changes
            if state != previous_state:
                print(f"⏳ Task status: {state} ({time.strftime('%H:%M:%S')})")
                previous_state = state

            if state == 'COMPLETED':
                print(f"✅ Task completed successfully after {int(time.time() - start_time)} seconds")
                return True
            elif state == 'FAILED':
                error_msg = status.get('error_message', 'No error message')
                print(f"❌ Task failed: {error_msg}")
                return False
            elif state == 'CANCELLED':
                print("❌ Task was cancelled")
                return False

            time.sleep(check_interval)

        except Exception as e:
            print(f"Error checking task status: {e}")
            time.sleep(check_interval)

    print(f"⚠️ Timed out after waiting {max_wait} seconds")
    return False

# Asset sharing functions
def is_asset_public(asset_id):
    """Función para verificar si un asset ya es público."""
    try:
        acl = ee.data.getAssetAcl(asset_id)
        return acl.get('all_users_can_read', False)
    except Exception as e:
        print(f"Error al verificar el estado del asset {asset_id}: {e}")
        return False

def make_asset_public(asset_id):
    """Función para compartir un asset de GEE con permisos públicos."""
    try:
        if is_asset_public(asset_id):
            pass
            # print(f"Asset {asset_id} ya es público.")
        else:
            acl = ee.data.getAssetAcl(asset_id)
            acl['all_users_can_read'] = True
            ee.data.setAssetAcl(asset_id, acl)
            print(f"✅ Asset {asset_id} ahora es público.")
            return True
    except Exception as e:
        print(f"❌ Error al hacer público el asset {asset_id}: {e}")
    return False

def make_assets_public_in_folder(folder):
    """Función para hacer públicos todos los assets dentro de una carpeta específica."""
    try:
        asset_list = ee.data.listAssets({'parent': folder})['assets']
        print(f"Found {len(asset_list)} assets in {folder}")
        for asset in asset_list:
            asset_id = asset['id']
            make_asset_public(asset_id)
    except Exception as e:
        print(f"Error al listar o hacer públicos los assets en {folder}: {e}")

# Second cell: Define the main function and auxiliary functions
def procesar_humedad_suelo():
    """
    Módulo: Humedad de Suelo Processor
    """
    # ============================================================
    # 📌 CONFIGURACIÓN INICIAL
    # ============================================================
    subcuencas = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/Geometrias/SubcuencasValparaiso")

    subcuenca_nombres = [
        '0510', '0511', '0512', '0500', '0520', '0541', '0521', '0522',
        '0530', '0540', '0531', '0542', '0532', '0550', '0551', '0574',
        '0552', '0553', '0580'
    ]

    export_task = None
    fechas_procesadas = []
    estado = "INICIADO"

    # ============================================================
    # 📌 FUNCIONES AUXILIARES
    # ============================================================
    def get_latest_csv(folder_path):
        asset_list = ee.data.listAssets(folder_path)['assets']
        date_list = [asset['name'].split('/')[-1] for asset in asset_list]
        date_list.sort()
        latest_date = date_list[-1]
        latest_asset_id = f"{folder_path}/{latest_date}"
        print(f'Último CSV encontrado: {latest_asset_id}')
        return ee.FeatureCollection(latest_asset_id)

    def get_available_dates_from_folder(folder_path):
        asset_list = ee.data.listAssets(folder_path)['assets']
        dates = []
        for asset in asset_list:
            id_parts = asset['id'].split('/')
            last_part = id_parts[-1]
            # Make parsing more robust
            try:
                year = last_part.split('SM')[1].split('Valparaiso')[0]
                month = last_part.split('_mes')[1]
                dates.append(f"{year}-{month}")
            except IndexError:
                print(f"Couldn't parse date from {last_part}, skipping")
        return ee.List(dates).distinct()

    def get_processed_dates_from_csv(csv):
        first_feature = ee.FeatureCollection(csv).first()
        prop_names = first_feature.propertyNames()
        return prop_names.filter(ee.Filter.stringContains('item', '-'))

    def build_asset_id_from_date(date):
        # Convert to Earth Engine string and get real value
        date_str = ee.String(date).getInfo()

        # Split using Python string methods
        parts = date_str.split('-')
        year = parts[0]
        month = parts[1]

        # Try both naming variants: prefer the one without underscore (existing asset),
        # fall back to the variant with underscore.
        candidate_no_underscore = f'projects/ee-corfobbppciren2023/assets/HS/SM{year}Valparaiso_GCOM_mes{month}'
        candidate_with_underscore = f'projects/ee-corfobbppciren2023/assets/HS/SM{year}Valparaiso_GCOM_mes_{month}'

        try:
            ee.Image(candidate_no_underscore).getInfo()
            print(f'Asset ID generado (no underscore): {candidate_no_underscore}')
            return candidate_no_underscore
        except Exception:
            try:
                ee.Image(candidate_with_underscore).getInfo()
                print(f'Asset ID generado (with underscore): {candidate_with_underscore}')
                return candidate_with_underscore
            except Exception:
                raise RuntimeError(f"Image asset not found for date {date_str}. Tried: {candidate_no_underscore} and {candidate_with_underscore}")

    def calcular_promedios_por_subcuenca(asset_id, current_fc):
        current_fc = ee.FeatureCollection(current_fc)
        partes = ee.String(asset_id).split('/')
        nombre = partes.get(partes.length().subtract(1))
        anio = ee.String(nombre).match('[0-9]{4}').get(0)
        mes = ee.String(nombre).match('mes([0-9]+)').get(1)

        # Check if image exists before loading
        try:
            image_norte = ee.Image(asset_id)

            # For Valparaiso, don't try to replace Norte with sur
            # Just use the same image
            image_sur = image_norte

            date_formatted = ee.String(anio).cat('-').cat(ee.String(mes))
            projection = image_norte.projection()
            geometry = image_norte.geometry()  # Just use north geometry

            mosaic_image = ee.ImageCollection([image_norte]) \
                .mosaic() \
                .setDefaultProjection(projection) \
                .clip(geometry)

            media_global = mosaic_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=mosaic_image.geometry(),
                scale=30,
                maxPixels=1e13
            )

            valores_global = ee.Dictionary(media_global).values()
            promedio_global = ee.Array(valores_global).reduce('mean', [0]).get([0])

            subcuencas_filtradas = subcuencas.filter(ee.Filter.inList('COD_SUBC', subcuenca_nombres))

            def map_feature(feature):
                nombre_sub = ee.String(feature.get('COD_SUBC'))
                geom = ee.Algorithms.If(
                    nombre_sub.compareTo('Region').eq(0),
                    mosaic_image.geometry(),
                    subcuencas_filtradas.filter(ee.Filter.eq('COD_SUBC', nombre_sub)).first().geometry()
                )

                stats = mosaic_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geom,
                    scale=30,
                    maxPixels=1e13
                )

                mean_value = stats.values().reduce(ee.Reducer.mean())
                return feature.set(date_formatted, mean_value)

            resultado_final = current_fc.map(map_feature)
            return resultado_final

        except Exception as e:
            print(f"Error processing image {asset_id}: {e}")
            return current_fc  # Return unchanged if error

    def asegurar_geometrias(fc):
            """Fixed version that properly handles Earth Engine geometries"""
            def map_geometry(feature):
                try:
                    geom = feature.geometry()
                    
                    # Check if geometry is valid by testing if we can get bounds
                    # This is more reliable than isEmpty() in Python API
                    try:
                        # This will fail if geometry is null or invalid
                        bounds = geom.bounds()
                        # If we got here, geometry is valid
                        return feature
                    except:
                        # Geometry is invalid, get from subcuencas
                        cod_subc = feature.get('COD_SUBC')
                        subc_feature = subcuencas.filter(ee.Filter.eq('COD_SUBC', cod_subc)).first()
                        return feature.setGeometry(subc_feature.geometry())
                        
                except Exception as e:
                    print(f"Error ensuring geometry: {e}")
                    # Return feature unchanged if error
                    return feature

            return ee.FeatureCollection(fc).map(map_geometry)
    # ============================================================
    # 📌 PROCESAMIENTO PRINCIPAL
    # ============================================================
    try:
        available_dates = get_available_dates_from_folder('projects/ee-corfobbppciren2023/assets/HS')
        csv = get_latest_csv('projects/ee-corfobbppciren2023/assets/MetricsHSTransposed')
        processed_dates = get_processed_dates_from_csv(csv)
        missing_dates = available_dates.removeAll(
            available_dates.filter(ee.Filter.inList('item', processed_dates))
        )

        print('Fechas disponibles:', available_dates.getInfo())
        print('Fechas procesadas:', processed_dates.getInfo())
        print('Fechas faltantes:', missing_dates.getInfo())

        has_missing_dates = ee.List(missing_dates).size().gt(0).getInfo()
        final_result = csv

        if has_missing_dates:
            print(f'Procesando {missing_dates.size().getInfo()} fechas faltantes')

            # Convert to Python list for iteration
            missing_dates_list = missing_dates.getInfo()
            fecha_procesar = missing_dates_list[0]
            # Use Python's replace method (client-side)
            fecha_asset = fecha_procesar.replace('-', '_')
            print(f'Procesando fecha: {fecha_procesar}')

            # Iterate over each missing date
            for date in missing_dates_list:
                print(f'Procesando fecha: {date}')
                asset_id = build_asset_id_from_date(date)
                final_result = calcular_promedios_por_subcuenca(asset_id, final_result)
                fechas_procesadas.append(date)

            datos_para_exportar = asegurar_geometrias(final_result)

            asset_name = f'projects/ee-corfobbppciren2023/assets/MetricsHSTransposed/{fecha_asset}'

            # Make sure to start the task with a meaningful description
            export_task = ee.batch.Export.table.toAsset(
                collection=datos_para_exportar,
                description=f"HS_Update_{fecha_asset}",  # More descriptive name
                assetId=asset_name
            )

            # In Colab, we need to start the task manually
            export_task.start()
            print(f'Tarea de exportación SHP creada con éxito: {asset_name}')
            estado = "COMPLETED"
        else:
            print('No hay fechas faltantes. No se generó archivo SHP.')
            estado = "NO_PROCESSING_NEEDED"

    except Exception as e:
        estado = "ERROR"
        print(f'Error en el procesamiento: {e}')

    # ============================================================
    # 📌 RESULTADO FINAL
    # ============================================================
    return {
        'status': estado,
        'fechasProcesadas': fechas_procesadas,
        'totalFechas': len(fechas_procesadas),
        'exportTask': export_task,
        'ultimaEjecucion': datetime.datetime.now().isoformat()
    }

def main():
    resultado = procesar_humedad_suelo()
    print(f"Estado inicial: {resultado['status']}")
    
    # Si no hay tarea o no hay fechas procesadas, retornar temprano
    if resultado['status'] != 'COMPLETED' or not resultado['exportTask']:
        print("\n❌ No task was created or the process didn't complete successfully.")
        print(f"Status: {resultado['status']}")
        return resultado
        
    task = resultado['exportTask']
    if not resultado['fechasProcesadas']:
        print("\n❌ No processed dates found in the results.")
        return resultado
    
    # Determinar ruta del asset
    fecha_asset = resultado['fechasProcesadas'][0].replace('-', '_')
    target_asset = f"projects/ee-corfobbppciren2023/assets/MetricsHSTransposed/{fecha_asset}"
    
    print(f"\n⏳ Monitoring task until completion for asset: {target_asset}")
    print("   (this will automatically wait up to 30 minutes)")
    
    # Esperar a que la tarea se complete
    task_success = wait_for_task_completion(task, check_interval=15, max_wait=1800)
    
    if task_success:
        print("\n🔄 Task completed successfully! Now making assets public...")
        
        # Hacer público el asset específico
        print(f"\n🔑 Making {target_asset} public...")
        if make_asset_public(target_asset):
            print(f"✅ Successfully made {target_asset} public!")
            resultado['assetPublic'] = True
        else:
            print(f"⚠️ Could not make {target_asset} public. Will try making all assets public.")
            
            # Hacer públicos todos los assets en la carpeta
            print("\n📂 Making all assets in folder public...")
            make_assets_public_in_folder('projects/ee-corfobbppciren2023/assets/MetricsHSTransposed')
            resultado['assetPublic'] = 'folder'
    else:
        print("\n⚠️ Task did not complete successfully within the time limit.")
        resultado['taskCompleted'] = False
    
    # Actualizar resultado con información final
    resultado['taskCompleted'] = task_success
    resultado['assetPath'] = target_asset
    resultado['finalStatus'] = task.status()['state'] if task else 'UNKNOWN'
    
    return resultado