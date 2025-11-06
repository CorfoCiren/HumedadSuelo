// ============================================================================
// OPTIMIZED LANDSAT NDVI/EVI PROCESSING SCRIPT
// ============================================================================

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import repYGeometria from './rep_y_geometria.js';
import { maskS2clouds } from './maskS2clouds.js';

export function run(config) {
  var year = config.firstYear;
  var mes = config.mes;

// Carga Módulos.
var region = coleccionImagenes.tabla;
 
//var mes = firstYear.mes;
//var year = firstYear.firstYear;
var yearNum = ee.Number(year);
var yearStr = ee.String(yearNum);

// Pre-compute all date strings at once
var startDate = yearStr.cat('-01-01');
var endDate = yearStr.cat('-12-31');

// Constants
var SCALE_FACTOR = 0.0000275;
var OFFSET = -0.2;

// Get current month/year for comparison (compute once)
var today = ee.Date(Date.now());
var currentYear = today.get('year');
var isCurrentYear = yearNum.eq(currentYear);

// ============================================================================
// OPTIMIZATION 2: Efficient processing functions with chaining
// ============================================================================

// Combined scale and NDVI/EVI calculation in single pass
function processLandsatImage(image) {
  // Apply scale factors
  var opticalBands = image.select('SR_B.').multiply(SCALE_FACTOR).add(OFFSET);
  var scaled = image.addBands(opticalBands, null, true).clip(region);
  
  // Calculate NDVI
  var ndvi = scaled.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  
  // Calculate EVI
  var evi = scaled.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': scaled.select('SR_B5'),
      'RED': scaled.select('SR_B4'),
      'BLUE': scaled.select('SR_B2')
    }).rename('EVI');
  
  return scaled.addBands([ndvi, evi]);
}

// Optimized mosaic by date
function mosaicByDate(collection) {
  var dates = collection.aggregate_array('system:time_start')
    .map(function(date) {
      return ee.Date(date).format('YYYY-MM-dd');
    }).distinct();
  
  return ee.ImageCollection(dates.map(function(date) {
    var dateObj = ee.Date(date);
    return collection.filterDate(dateObj, dateObj.advance(1, 'day'))
      .mosaic()
      .set('system:time_start', dateObj.millis());
  }));
}

// ============================================================================
// OPTIMIZATION 3: Load and process Landsat data efficiently
// ============================================================================

// Load both Landsat collections at once with merged processing
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(region)
  .filterDate(startDate, endDate)
  .sort('system:time_start');

// Process in single pipeline: scale + mosaic + NDVI/EVI
var processedMosaics = mosaicByDate(landsat.map(processLandsatImage));

// Split into separate collections (more efficient than separate processing)
var NDVI_COLLECTION = processedMosaics.select('NDVI');
var EVI_COLLECTION = processedMosaics.select('EVI');

// ============================================================================
// OPTIMIZATION 4: Vectorized monthly mean calculation
// ============================================================================

// Pre-compute month date ranges
var monthRanges = [
  {month: 1, start: '-01-01', end: '-01-31'},
  {month: 2, start: '-02-01', end: '-02-28'},
  {month: 3, start: '-03-01', end: '-03-31'},
  {month: 4, start: '-04-01', end: '-04-30'},
  {month: 5, start: '-05-01', end: '-05-31'},
  {month: 6, start: '-06-01', end: '-06-30'},
  {month: 7, start: '-07-01', end: '-07-31'},
  {month: 8, start: '-08-01', end: '-08-31'},
  {month: 9, start: '-09-01', end: '-09-30'},
  {month: 10, start: '-10-01', end: '-10-31'},
  {month: 11, start: '-11-01', end: '-11-30'},
  {month: 12, start: '-12-01', end: '-12-31'}
];

// Calculate all monthly means at once using map
var monthlyMeans = monthRanges.map(function(range) {
  var startDateStr = yearStr.cat(range.start);
  var endDateStr = yearStr.cat(range.end);
  
  var ndviMean = NDVI_COLLECTION.filterDate(startDateStr, endDateStr).mean();
  var eviMean = EVI_COLLECTION.filterDate(startDateStr, endDateStr).mean();
  
  return {
    month: range.month,
    ndvi: ndviMean,
    evi: eviMean
  };
});

// ============================================================================
// OPTIMIZATION 5: Efficient daily assignment using single loop
// ============================================================================

function assignMonthlyImagesToDays(monthlyData, year, maxMonth) {
  var collections = {ndvi: [], evi: []};
  
  // Process only up to maxMonth
  for (var m = 0; m < maxMonth; m++) {
    var data = monthlyData[m];
    var month = data.month;
    
    // Calculate days in month
    var daysInMonth = ee.Date.fromYMD(year, month, 1)
      .advance(1, 'month')
      .difference(ee.Date.fromYMD(year, month, 1), 'day');
    
    var daysList = ee.List.sequence(1, daysInMonth);
    
    // Create daily images for NDVI
    var ndviDaily = ee.ImageCollection(daysList.map(function(day) {
      var date = ee.Date.fromYMD(year, month, day);
      return data.ndvi.set('system:time_start', date.millis());
    }));
    
    // Create daily images for EVI
    var eviDaily = ee.ImageCollection(daysList.map(function(day) {
      var date = ee.Date.fromYMD(year, month, day);
      return data.evi.set('system:time_start', date.millis());
    }));
    
    collections.ndvi.push(ndviDaily);
    collections.evi.push(eviDaily);
  }
  
  // Merge all monthly collections efficiently
  var ndviCollection = collections.ndvi[0];
  var eviCollection = collections.evi[0];
  
  for (var i = 1; i < collections.ndvi.length; i++) {
    ndviCollection = ndviCollection.merge(collections.ndvi[i]);
    eviCollection = eviCollection.merge(collections.evi[i]);
  }
  
  return {
    NDVI: ndviCollection,
    EVI: eviCollection
  };
}

// ============================================================================
// OPTIMIZATION 6: Conditional logic - determine months to process
// ============================================================================

var result;

// Use server-side logic where possible
var monthsToProcess = ee.Algorithms.If(
  isCurrentYear,
  ee.Number(mes),
  ee.Number(12)
);

// Convert to client-side for processing
var maxMonth = ee.Number(monthsToProcess).getInfo();

console.log('Processing year:', year);
console.log('Months to process:', maxMonth);

// Generate final collections
result = assignMonthlyImagesToDays(monthlyMeans, yearNum, maxMonth);

// ============================================================================
// EXPORTS
// ============================================================================

  return {
    NDVI: result.NDVI,
    EVI: result.EVI
  };  // FIXED: return instead of exports
};