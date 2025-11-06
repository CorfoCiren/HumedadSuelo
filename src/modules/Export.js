/**
 * Module: Export.js
 * Handles export of Soil Moisture products to Drive and Assets
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import { run as productoSM } from './Producto_SM.js';

// Helper to evaluate an EE geometry to client-side coordinates (GeoJSON ring)
function getRegionCoordinates(region) {
  return new Promise((resolve, reject) => {
    try {
      const geom = region && region.geometry ? region.geometry() : ee.Geometry(region);
      // Simplify slightly and use bounds to avoid overly complex polygons
      geom.simplify(1000).bounds().coordinates().evaluate((coords, err) => {
        if (err) return reject(err);
        resolve(coords);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function run(config) {
  const firstYear = config.firstYear;
  const mes = config.mes;

  const Producto_SM = productoSM(config);

  // Convert region to client-side coordinates
  const regionCoords = await getRegionCoordinates(coleccionImagenes.tabla);

  // Exportar imagen a Asset ONLY (Drive upload will be done later via OAuth2)
  const description = ee.String("Asset_SM").cat(ee.String(ee.Number(firstYear))).cat("Valparaiso_mes").cat(ee.String(ee.Number(mes))).getInfo();
  const assetId = 'projects/ee-corfobbppciren2023/assets/HS/' + 'SM' + firstYear + 'Valparaiso_GCOM_mes' + mes;
  
  const task = ee.batch.Export.image.toAsset({
    image: Producto_SM.SM,
    description: description,
    assetId: assetId,
    scale: 1000,
    region: regionCoords,
    crs: "EPSG:4326",
    maxPixels: 1e13,
  });
  
  task.start();
  
  console.log(`Export started for year ${firstYear}, month ${mes}`);
  
  // Return task info for tracking
  return {
    taskId: task.id,
    assetPath: assetId,
    year: firstYear,
    month: mes,
    status: 'SUBMITTED'
  };
}