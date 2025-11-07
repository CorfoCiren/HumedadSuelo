/**
 * Module: Producto_SM.js
 * Generates Soil Moisture product using Random Forest predictions
 */

import ee from '@google/earthengine';
import { run as getPredictores } from './predictores.js';
import { run as getRandomForest } from './RandomForest.js';

export function run(config) {

  const predictores = getPredictores(config);
  const RandomForest = getRandomForest(config);

function batchRename(image){
  var names = image.bandNames();
  var rename = names.map(function(name){
    return ee.String('b').cat(ee.String(name).replace('_classification', ''));
  });
  return image.rename(rename);
}

// Classify each available day; do NOT force a fixed length list
var SMcol = predictores.predictors.map(function(img){
  return ee.Image(img)
    .classify(RandomForest.clasificador)
    .multiply(1000).round().toUint16()
    .rename('classification');
});

// If the month has no valid days, return a masked placeholder to avoid crashes
var smSize = SMcol.size();
var SM_bands = ee.Image(ee.Algorithms.If(
  smSize.gt(0),
  SMcol.toBands(),
  ee.Image(0).rename('nodata').updateMask(ee.Image(0))
));

// Only rename and scale when there are bands
var SM = ee.Image(ee.Algorithms.If(
  smSize.gt(0),
  batchRename(SM_bands).divide(10),
  SM_bands // remains fully masked if no data
));

  return {SM: SM};
}
//print("producto SM")