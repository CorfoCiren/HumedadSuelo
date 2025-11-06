#!/usr/bin/env python3
"""
Asset Publishing Utility
Makes Earth Engine assets publicly readable
"""

import ee

def is_asset_public(asset_id: str) -> bool:
    """Verifies if an asset is already public."""
    try:
        acl = ee.data.getAssetAcl(asset_id)
        return acl.get('all_users_can_read', False)
    except Exception as e:
        print(f"Error verifying asset status {asset_id}: {e}")
        return False


def make_asset_public(asset_id: str) -> None:
    """Makes an Earth Engine asset public."""
    try:
        if is_asset_public(asset_id):
            pass  # Already public, skip logging
        else:
            acl = ee.data.getAssetAcl(asset_id)
            acl['all_users_can_read'] = True
            ee.data.setAssetAcl(asset_id, acl)
            print(f"✓ Asset {asset_id} is now public")
    except Exception as e:
        print(f"❌ Error making asset public {asset_id}: {e}")


def make_assets_public_in_folder(folder: str) -> None:
    """Makes all assets within a folder public."""
    try:
        asset_list = ee.data.listAssets({'parent': folder}).get('assets', [])
        print(f"  Found {len(asset_list)} assets in {folder}")
        
        public_count = 0
        updated_count = 0
        
        for asset in asset_list:
            asset_id = asset['id']
            was_public = is_asset_public(asset_id)
            
            if was_public:
                public_count += 1
            else:
                make_asset_public(asset_id)
                updated_count += 1
        
        print(f"  Already public: {public_count}")
        print(f"  Made public: {updated_count}")
        
    except Exception as e:
        print(f"❌ Error listing or making assets public in {folder}: {e}")


def main(folder: str):
    """Main entry point for publishing assets"""
    make_assets_public_in_folder(folder)