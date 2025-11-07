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
  var rename=image.bandNames().map(function(name){
    return ee.String("b").cat(ee.String(name).replace('_classification', ''));
  });
  return image.rename(rename);
}

// Classify predictors directly (fast approach)
// Filter removes any images with null/masked bands before classification
var SM=ee.ImageCollection(predictores.predictors.map(function(img){
  return img.classify(RandomForest.clasificador).multiply(1000).round().toUint16();
}));

// Convert to multi-band image (fast)
SM=batchRename(SM.toBands()).divide(10);

  return {SM: SM};
}
//print("producto SM")