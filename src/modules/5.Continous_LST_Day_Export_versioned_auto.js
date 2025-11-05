/**
 * Module: 5.Continous_LST_Day_Export_versioned_auto.js
 * Optimized VIIRS LST continuous processing with date-aware temperature handling
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import CFSv2_day from './1.CFSv2_TFA_Day.js';
import MODIS_day from './3.VIIRS_TFA_Day.js';

const table = coleccionImagenes.tabla;

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
  // ============================================================================
  // OPTIMIZATION 1: Pre-compute reusable values once
  // ============================================================================

  const MODIS_TFA = ee.Image(MODIS_day.TFA_Images);
  const CFSV2_TFA = ee.Image(CFSv2_day.TFA_Images);

  // Keep ee.Number/ee.String patterns as requested
  const firstYear_ = ee.String(ee.Number(config.firstYear));
  const firstYearplusone_ = ee.String(ee.Number(config.firstYear).add(1));

  const firstDay = firstYear_.cat('-01-01');
  const lastDay = firstYearplusone_.cat('-01-01');

  // Pre-compute constants
  const geometry = table;
  const geometria = geometry;
  const KELVIN_OFFSET = ee.Image(273.15);

  // Define the transition date (October 21, 2025)
  const TRANSITION_DATE = ee.Date('2025-10-21');
  const TRANSITION_MILLIS = TRANSITION_DATE.millis();

  // Get projection info once (avoid repeated .getInfo() calls)
  const modisProjection = MODIS_TFA.projection().crs().getInfo();
  const scale = MODIS_TFA.projection().nominalScale().getInfo();

  // ============================================================================
  // OPTIMIZATION 2: Efficient TFA ImageCollection creation
  // ============================================================================

  // Fixed band name parsing (handles "TFA", "TFA_1", "TFA_2", etc.)
  let MODIS_TFA_ic = ee.ImageCollection(
    MODIS_TFA.bandNames().map(function(name) {
      const nameStr = ee.Algorithms.String(name);
      const doy = ee.Algorithms.If(
        nameStr.equals('TFA'),
        ee.Number(1),
        ee.Number.parse(nameStr.slice(4)).add(1)
      );
      return MODIS_TFA.select([nameStr], ['mod']).set('system:DOY', doy);
    })
  );

  let CFSV2_TFA_ic = ee.ImageCollection(
    CFSV2_TFA.bandNames().map(function(name) {
      const nameStr = ee.Algorithms.String(name);
      const doy = ee.Algorithms.If(
        nameStr.equals('TFA'),
        ee.Number(1),
        ee.Number.parse(nameStr.slice(4)).add(1)
      );
      return CFSV2_TFA.select([nameStr], ['cfs']).set('system:DOY', doy);
    })
  );

  // ============================================================================
  // OPTIMIZATION 3: Streamlined processing functions
  // ============================================================================

  // Resample function - use copyProperties to preserve metadata
  const resample = function(image) {
    return image.resample('bilinear')
                .reproject({crs: modisProjection, scale: scale})
                .copyProperties(image, ['system:DOY', 'system:time_start']);
  };

  // NEW OPTIMIZED: Date-aware temperature conversion
  // Converts to Celsius only if needed based on date
  const toCelsius = function(image) {
    const imageDate = ee.Date(image.get('system:time_start'));
    const isBeforeTransition = imageDate.millis().lt(TRANSITION_MILLIS);
    
    // If before transition date, data is in Kelvin - convert to Celsius
    // If after transition date, data is already in Celsius - use as is
    const result = ee.Image(ee.Algorithms.If(
      isBeforeTransition,
      image.subtract(KELVIN_OFFSET),  // Kelvin to Celsius
      image                            // Already Celsius
    ));
    
    return result.clip(geometry)
                 .copyProperties(image, ['system:time_start', 'system:DOY']);
  };

  // Add DOY property
  function createDoyBand(img) {
    const d = ee.Date(img.get('system:time_start')).getRelative('day', 'year').add(1);
    return img.set('system:DOY', d);
  }

  // Parse CFSv2 timestamp - optimized string operations
  const addTimeStampToCFSv2 = function(image) {
    const start = ee.String(image.get('system:index'));
    const date = start.slice(0, 4).cat('-').cat(start.slice(4, 6)).cat('-').cat(start.slice(6, 8));
    return image.set('system:time_start', date);
  };

  // Parse MODIS/VIIRS timestamp
  const addTimeStampToMODIS = function(image) {
    const start = ee.String(image.get('system:index'));
    const date = start.replace('_', '-').replace('_', '-');
    return image.set('system:time_start', ee.String(date));
  };

  // ============================================================================
  // OPTIMIZATION 4: Efficient CFSv2 processing pipeline
  // ============================================================================

  // Resample TFA collection once
  CFSV2_TFA_ic = CFSV2_TFA_ic.map(resample);

  // Load and process CFSv2 with chained operations
  const CFSV2 = ee.ImageCollection('NOAA/CFSV2/FOR6H')
    .filterDate(firstDay, lastDay)
    .filter(ee.Filter.stringEndsWith('system:index', '12'))
    .select('Maximum_temperature_height_above_ground_6_Hour_Interval')
    .map(addTimeStampToCFSv2)  // Add timestamp first
    .map(resample)
    .map(toCelsius)            // Single conversion step based on date
    .map(createDoyBand);

  // ============================================================================
  // OPTIMIZATION 5: Efficient joins (reuse join objects)
  // ============================================================================

  const doyFilter = ee.Filter.equals({leftField: 'system:DOY', rightField: 'system:DOY'});
  const innerJoin = ee.Join.inner('primary', 'secondary');

  // Join CFSv2 with TFA
  const CFSV2_JoinInner = innerJoin.apply(CFSV2, CFSV2_TFA_ic, doyFilter);

  // Calculate CFSv2 anomalies
  const CFSV2_Anomalies = CFSV2_JoinInner.map(function(f) {
    return ee.Image(f.get('primary')).subtract(ee.Image(f.get('secondary')));
  }).map(addTimeStampToCFSv2).map(createDoyBand);

  // Join MODIS TFA with CFSv2 anomalies
  const MODIS_JoinInner = innerJoin.apply(CFSV2_Anomalies, MODIS_TFA_ic, doyFilter);

  // Calculate MODIS continuous (TFA + CFSv2 anomalies)
  const MODIS_Continuous = MODIS_JoinInner.map(function(f) {
    return ee.Image(f.get('primary')).add(ee.Image(f.get('secondary')));
  }).map(addTimeStampToCFSv2).map(createDoyBand);

  // ============================================================================
  // OPTIMIZATION 6: Efficient VIIRS LST processing
  // ============================================================================

  // VIIRS-specific conversion with band renaming
  const modis_k2celsius = function(image) {
    const imageDate = ee.Date(image.get('system:time_start'));

    // Format date as YYYY-MM-DD
    const dateStr = imageDate.format('YYYY-MM-dd');
    const bandName = ee.String('DayLSTcont_').cat(dateStr);
    
    // Apply conversion based on date
    const result = ee.Image(image.subtract(KELVIN_OFFSET));  // Kelvin to Celsius
    
    return result
      .clip(geometry)
      .rename([bandName])
      .copyProperties(image, ['system:time_start']);
  };

  const MODIS_LST = ee.ImageCollection('NASA/VIIRS/002/VNP21A1D')
    .filterDate(firstDay, lastDay)
    .select('LST_1KM')
    .map(addTimeStampToMODIS)
    .map(modis_k2celsius);

  // ============================================================================
  // OPTIMIZATION 7: Blend VIIRS with continuous data
  // ============================================================================

  const timeFilter = ee.Filter.equals({
    leftField: 'system:time_start',
    rightField: 'system:time_start'
  });

  const MODIS_Blended_JoinInner = innerJoin.apply(MODIS_Continuous, MODIS_LST, timeFilter);

  // Convert to ImageCollection and blend
  const MODIS_LST_Blended = ee.ImageCollection(
    MODIS_Blended_JoinInner.map(function(f) {
      const continuous = ee.Image(f.get('primary'));
      const actual = ee.Image(f.get('secondary'));
      return actual.blend(continuous).copyProperties(continuous, ['system:time_start']);
    })
  );

  // ============================================================================
  // OPTIMIZATION 8: Convert to multi-band image (MAJOR SPEEDUP!)
  // ============================================================================

  // FASTEST: Use toBands() instead of iterate()
  const targetDateRange = ee.DateRange(firstDay, lastDay);
  const filteredBlended = MODIS_LST_Blended.filterDate(targetDateRange);

  // Set proper system:index before toBands to control band naming
  const indexedBlended = filteredBlended.map(function(img) {
    const date = ee.Date(img.get('system:time_start'));
    const id = date.format('YYYY-MM-dd');
    return img.set('system:index', id);
  });

  const LST_Images = indexedBlended.toBands();

  // Clean up band names: remove the date prefix that toBands adds
  const bandNames = LST_Images.bandNames();
  const cleanNames = bandNames.map(function(name) {
    // Extract just the DayLSTcont_YYYY-MM-DD part
    const nameStr = ee.String(name);
    return nameStr.slice(nameStr.index('DayLSTcont'));
  });

  const LST_ic = LST_Images.rename(cleanNames);

  // ==========================================================================
  // OPTIMIZATION 9: Versioned export helpers
  // ==========================================================================

  function assetExists(assetIdUsers) {
    var cloudPath = assetIdUsers
      .replace(/^projects\/earthengine-legacy\/assets\/users\/corfobbppciren2023\//, 'projects/ee-corfobbppciren2023/assets/')
      .replace(/^users\/corfobbppciren2023\//, 'projects/ee-corfobbppciren2023/assets/');

    try {
      ee.data.getAsset(cloudPath);
      return true;
    } catch (e) {
      return false;
    }
  }

  function nextVersionAssetId(baseAssetPrefix, year) {
    const base = baseAssetPrefix + '_' + String(year);
    let v = 1;
    while (v < 1000 && assetExists(base + '_v' + v)) v++;
    return base + '_v' + v;
  }

  async function exportImageVersioned(image, baseAssetPrefix, year, region, scale, crs) {
    const assetId = nextVersionAssetId(baseAssetPrefix, year);
    const desc = assetId.split('/').pop();

    const cloudAssetId = assetId
      .replace(/^projects\/earthengine-legacy\/assets\/users\/corfobbppciren2023\//, 'projects/ee-corfobbppciren2023/assets/')
      .replace(/^users\/corfobbppciren2023\//, 'projects/ee-corfobbppciren2023/assets/');

    // Convert region to client-side coordinates
    const regionCoords = await getRegionCoordinates(region);

    const task = ee.batch.Export.image.toAsset({
      image: ee.Image(image),
      assetId: cloudAssetId,
      description: desc,
      scale: scale || 1000,
      region: regionCoords,
      crs: crs || 'EPSG:4326',
      maxPixels: 1e13
    });

    task.start();
    console.log('Export started ->', cloudAssetId);
    
    // Return task info for tracking
    return {
      taskId: task.id,
      assetPath: cloudAssetId,
      year: year,
      description: desc,
      status: 'SUBMITTED'
    };
  }

  // ==========================================================================
  // OPTIMIZATION 10: Execute exports
  // ==========================================================================

  const basePrefix = 'projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Day_Valparaiso';
  const taskInfo = await exportImageVersioned(LST_ic, basePrefix, config.firstYear, geometria, 1000, 'EPSG:4326');

  console.log('Processing complete for year:', config.firstYear);
  console.log('Temperature handling: Kelvin->Celsius before 2025-10-21, Celsius after');
  
  // Return task info for tracking
  return taskInfo;
}
