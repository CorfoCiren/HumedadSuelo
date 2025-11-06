
/**
 * Module: predictores.js
 * Combines all predictors for Soil Moisture model
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import repYGeometria from './rep_y_geometria.js';
import soilTextureGeographic from './soil_texture_geographic.js';
import { run as getNDVI_EVI } from './NDVI_EVI.js';
import { run as getAPI } from './API.js';
import { run as getTairEvapoPrecip } from './Tair_Evapo_Precip.js';
import { run as getLST } from './LST_versioned.js';

export function run(config) {
  const firstYear = config.firstYear;
  const mes = config.mes;

  const NDVI_EVI = getNDVI_EVI(config);
  const API = getAPI(config);
  const Tair_Evapo_Precip = getTairEvapoPrecip(config);
  const LST = getLST(config);


var Boundary = repYGeometria.Boundary;

// Define a function to check if a year is a leap year
function isLeapYear(year) {
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
        return true;
    } else {
        return false;
    }
}

///////////////////////combine all predictors
var predictors=LST.dailyLST.map(function(img){
    var time=img.get("system:time_start")
//    var dailyLSTDiff1=LST.dailyLSTDiff.filterMetadata("system:time_start","equals",time).first().rename("LST_Diff")
    var NDVI1=ee.ImageCollection(NDVI_EVI.NDVI).filterMetadata("system:time_start","equals",time).first().rename("NDVI_SG_linear").divide(10000);
    var EVI1=NDVI_EVI.EVI.filterMetadata("system:time_start","equals",time).first().rename("EVI_SG_linear").divide(10000);
    var Preci1=Tair_Evapo_Precip.precipCollection.filterMetadata("system:time_start","equals",time).first().rename("Preci").multiply(1000);
    var APILand1=API.APILand.filterMetadata("system:time_start","equals",time).first().rename("apei").multiply(1000);
    var Tair1=Tair_Evapo_Precip.TairCollection.filterMetadata("system:time_start","equals",time).first().rename("Tair").subtract(273.15);
    var Evapo1=Tair_Evapo_Precip.evapoCollection.filterMetadata("system:time_start","equals",time).first().rename("Evapo").multiply(-1000);
    return img.rename("LST_DAILY")//.addBands(dailyLSTDiff1)
              .addBands(Preci1)
              .addBands(APILand1)
              .addBands(Tair1)
              .addBands(Evapo1)
              .addBands(NDVI1)
              .addBands(EVI1)
              .addBands(soilTextureGeographic.TI)
              .addBands(soilTextureGeographic.soilProper.select("porosity")).addBands(soilTextureGeographic.soilProper.select("omc"))
              .addBands(soilTextureGeographic.soilProper.select("clay")).addBands(soilTextureGeographic.soilProper.select("sand")).addBands(soilTextureGeographic.soilProper.select("silt"))
              .addBands(soilTextureGeographic.longitude).addBands(soilTextureGeographic.latitude).addBands(soilTextureGeographic.elevation)
              .addBands(repYGeometria.WTD)
              .addBands(repYGeometria.DTB);
})
.map(function(img){
  return img.clip(repYGeometria.Boundary).reproject("EPSG:4326",null,1000);
});

//print(Tair_Evapo_Precip.precipCollection)
//var removeNullBands = function(image) {
//    var bandNames = image.bandNames();
//    var validBands = bandNames.map(function(band) {
//        band = ee.String(band);
//        var bandData = image.select([band]);
//        var mask = bandData.mask().reduceRegion({
//            reducer: ee.Reducer.min(),
//            geometry: image.geometry(),
//            scale: 30,
//            maxPixels: 1e9
//        });
//        // Return band name if not fully masked, else null
//        return ee.Algorithms.If(mask.get(band), band, null);
//    });
//    // Remove nulls from the list
//    validBands = ee.List(validBands).removeAll([null]);
//    return image.select(validBands);
//};

//var predictors = predictors.map(function(img) {
//    var bandNames = img.bandNames();
//    var validBands = bandNames.filter(ee.Filter.notNull());
//    return img.select(validBands);
//});


//var predictors = predictors.map(removeNullBands);

// Para cada imagen, obtener las bandas que no tienen ningún valor null en toda la imagen
//var predictors = predictors.map(function(img) {
//    var bandNames = img.bandNames();
//    // Usar ee.List.iterate para construir la lista de bandas válidas
//    var validBands = ee.List(bandNames).iterate(function(band, list) {
//        band = ee.String(band);
//        var stats = img.select([band]).reduceRegion({
//            reducer: ee.Reducer.count(),
//            geometry: img.geometry(),
//            scale: 10,
//            maxPixels: 1e13
//        });
//        // Si el conteo es mayor que cero, no hay nulls
//        return ee.Algorithms.If(
//            ee.Number(stats.get(band)).gt(0),
//            ee.List(list).add(band),
//            ee.List(list)
//        );
//    }, ee.List([]));
//    return img.select(ee.List(validBands));
//});


//print(ee.DateRange(firstYear.firstYear+'-04-10', firstYear.firstYear+'-07-18'));
if (mes === 1){
//print('Enero');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-01-01', firstYear+'-02-01'))));
}
if (mes === 2){
//print('Febrero');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-02-01', firstYear+'-03-01'))));
}
if (mes === 3){
//print('Marzo');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-03-01', firstYear+'-04-01'))));
}
if (mes === 4){
//print('Abril');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-04-01', firstYear+'-05-01'))));
}
if (mes === 5){
//print('Mayo');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-05-01', firstYear+'-06-01'))));
}
if (mes === 6){
//print('Junio');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-06-01', firstYear+'-07-01'))));
}
if (mes === 7){
//print('Julio');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-07-01', firstYear+'-08-01'))));
}
if (mes === 8){
//print('Agosto');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-08-01', firstYear+'-09-01'))));
}
if (mes === 9){
//print('Septiembre');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-09-01', firstYear+'-10-01'))));
}
if (mes === 10){
//print('Octubre');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-10-01', firstYear+'-11-01'))));
}
if (mes === 11){
//print('Noviembre');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-11-01', firstYear+'-12-01'))));
}
if (mes === 12){
//print('Diciembre');
predictors=predictors.filter(ee.Filter.date((ee.DateRange(firstYear+'-12-01', ee.String(ee.Number(firstYear).add(1)).cat('-01-01')))));
}

////////////

/////////select a certain number of training and testing samples
var sample = coleccionImagenes.trainTestant;
var station=sample.toList(556443).map(function(a){
  return ee.Feature(a).get('station');
});

//número de muestras en el traintesTant 512992

sample = sample.randomColumn();
//var sampleSplit = 0.34;
var sampleSplit = 0.0347;
sample = sample.filter(ee.Filter.lt('random', sampleSplit));

//var trainSMAP = coleccionImagenes.trainTest.randomColumn();
var trainsensores = coleccionImagenes.trainTest;
//var trainSMAPSplit = 0.0; 
//trainSMAP = trainSMAP.filter(ee.Filter.lt('random', trainSMAPSplit));

var training = sample.merge(trainsensores);
//var training = trainSMAP;

//print("sample size",trainSMA.size());
//print("training size",training.size());

//var training = sample

//Map.addLayer(LST.dailyLST)
//Map.addLayer(NDVI_EVI.NDVI)
//Map.addLayer(NDVI_EVI.EVI)
//Map.addLayer(Tair_Evapo_Precip.precipCollection)
//Map.addLayer(API.APILand)
//Map.addLayer(Tair_Evapo_Precip.TairCollection)
//Map.addLayer(Tair_Evapo_Precip.evapoCollection)
//Map.addLayer(soil_texture_geographic.TI)
//Map.addLayer(soil_texture_geographic.soilProper)
//Map.addLayer(soil_texture_geographic.soilProper)
//Map.addLayer(soil_texture_geographic.longitude)
//Map.addLayer(rep_y_geometria.WTD)
//Map.addLayer(rep_y_geometria.DTB)


//print("predictores")
  return {
    training: training,
    predictors: predictors
  };
}