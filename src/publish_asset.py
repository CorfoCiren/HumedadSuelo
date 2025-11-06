import ee

# Autenticación e inicialización de Earth Engine
try:
    ee.Initialize(project='ee-corfobbppciren2023')
except Exception as e:
    print("EE may need authentication if running standalone")
    ee.Authenticate()
    ee.Initialize(project='ee-corfobbppciren2023')

# Carpeta con los assets a hacer públicos
#folder = 'users/corfobbppciren2024/SR'

def is_asset_public(asset_id: str) -> bool:
    """Verifica si un asset ya es público."""
    try:
        acl = ee.data.getAssetAcl(asset_id)
        return acl.get('all_users_can_read', False)
    except Exception as e:
        print(f"Error al verificar el estado del asset {asset_id}: {e}")
        return False


def make_asset_public(asset_id: str) -> None:
    """Hace público un asset de Google Earth Engine."""
    try:
        if is_asset_public(asset_id):
            pass
            # print(f"Asset {asset_id} ya es público.")
        else:
            acl = ee.data.getAssetAcl(asset_id)
            acl['all_users_can_read'] = True
            ee.data.setAssetAcl(asset_id, acl)
            print(f"Asset {asset_id} ahora es público.")
    except Exception as e:
        print(f"Error al hacer público el asset {asset_id}: {e}")


def make_assets_public_in_folder(folder: str) -> None:
    """Hace públicos todos los assets dentro de una carpeta."""
    try:
        asset_list = ee.data.listAssets({'parent': folder}).get('assets', [])
        print(f"Se encontraron {len(asset_list)} assets en {folder}")
        for asset in asset_list:
            make_asset_public(asset['id'])
    except Exception as e:
        print(f"Error al listar o hacer públicos los assets en {folder}: {e}")


def main(folder):
    make_assets_public_in_folder(folder)