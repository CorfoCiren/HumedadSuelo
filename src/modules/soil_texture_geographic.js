
/**
 * Module: soil_texture_geographic.js
 * Soil texture and geographic predictors
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import repYGeometria from './rep_y_geometria.js';
//var firstYear=require('users/corfobbppciren2023/Humedad_de_Suelo:firstYear');

////////////////////////////////////////
///////////////

//var modis = coleccion_imagenes.MOD13A2.first().reproject("EPSG:4326",null,1000);
// Get information about the MODIS projection.
//var modisProjection = modis.projection();



//var b1scale = clayFraction.select("clay_0-5cm_mean").projection().nominalScale();
//print('Band 1 scale:', b1scale);

//Export.image.toAsset({
//  image: ee.Image("projects/soilgrids-isric/clay_mean"),
//  region: ee.FeatureCollection(coleccion_imagenes.tabla),
//  crs: 'EPSG:4326',
//  scale: 250,
//  description: 'clay_mean',
//  pyramidingPolicy: {'.default': 'sample'}
//});

//Export.image.toAsset({
//  image: ee.Image("projects/soilgrids-isric/sand_mean"),
//  region: ee.FeatureCollection(coleccion_imagenes.tabla),
//  crs: 'EPSG:4326',
//  scale: 250,
//  description: 'sand_mean',
//  pyramidingPolicy: {'.default': 'sample'}
//});

//Export.image.toAsset({
//  image: ee.Image("projects/soilgrids-isric/silt_mean"),
//  region: ee.FeatureCollection(coleccion_imagenes.tabla),
//  crs: 'EPSG:4326',
//  scale: 250,
//  description: 'silt_mean',
//  pyramidingPolicy: {'.default': 'sample'}
//});

//Export.image.toAsset({
//  image: ee.Image("projects/soilgrids-isric/bdod_mean"),
//  region: ee.FeatureCollection(coleccion_imagenes.tabla),
//  crs: 'EPSG:4326',
//  scale: 250,
//  description: 'bdod_mean',
//  pyramidingPolicy: {'.default': 'sample'}
//});

//Export.image.toAsset({
//  image: ee.Image("projects/soilgrids-isric/soc_mean"),
//  region: ee.FeatureCollection(coleccion_imagenes.tabla),
//  crs: 'EPSG:4326',
//  scale: 250,
//  description: 'soc_mean',
//  pyramidingPolicy: {'.default': 'sample'}
//});

//soilTexture

//print(clayFraction)

// divide 10, convert "g/kg" to "g/100g (%)"
var clayFraction =ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/clay_mean").select("clay_0-5cm_mean")
                  .rename("clay").divide(10).reproject("EPSG:4326",null,250);
var sandFraction =ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/sand_mean").select("sand_0-5cm_mean")
                  .rename("sand").divide(10).reproject("EPSG:4326",null,250);
var siltFraction =ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/silt_mean").select("silt_0-5cm_mean")
                  .rename("silt").divide(10).reproject("EPSG:4326",null,250);
//porosity
//divide 100, convert "cg/cm³" to "kg/dm³", which is same as "g/cm³"
var bulkDensity=ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/bdod_mean").select("bdod_0-5cm_mean")
                .divide(100).reproject("EPSG:4326",null,250);
var porosity = ee.Image(1).subtract(bulkDensity.divide(ee.Image(2.65)))
              .rename("porosity").reproject("EPSG:4326",null,250);
//organic matter content
var soc = ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/soc_mean");
//divide 10, convert "dg/kg" to "g/kg", then divide 10, convert "g/kg" to "%"
var omc = soc.select("soc_0-5cm_mean").multiply(0.01).multiply(1.724).reproject("EPSG:4326",null,250).rename("omc");

var soilProper = clayFraction.addBands(sandFraction).addBands(siltFraction).addBands(porosity).addBands(omc);

var resample = function(image) {
  return image.resample('bilinear')
              .reproject({
                    crs: "EPSG:4326",
                    scale: 1000});
};
soilProper = resample(soilProper);

////////////////////////
var longitude = ee.Image.pixelLonLat().select("longitude").reproject("EPSG:4326",null,1000).rename("lon").clip(repYGeometria.Boundary);

var latitude = ee.Image.pixelLonLat().select("latitude").reproject("EPSG:4326",null,1000).rename("lat").clip(repYGeometria.Boundary);

var elevation=coleccionImagenes.TIele.select("elevation").reproject("EPSG:4326",null,1000).clip(repYGeometria.Boundary);
var TI=coleccionImagenes.TIele.select("TI").reproject("EPSG:4326",null,1000).clip(repYGeometria.Boundary);

export default {
  soilProper: soilProper,
  longitude: longitude,
  latitude: latitude,
  elevation: elevation,
  TI: TI
};