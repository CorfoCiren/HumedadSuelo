
/**
 * Module: API.js
 * Antecedent Precipitation Index calculation
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';
import repYGeometria from './rep_y_geometria.js';

// var firstYear=require('users/corfobbppciren2023/firstYear:0.firstYear.js');
/////////////////////////**********************************
//*******API************
//1979-01-02T00:00:00 - 2020-07-09T00:00:00
///////filter ERA5 collection according to Date
//because t=34, so we need to use 34 days data before 2018-01-01
//And drop them after API calculation
export function run(config) {
  var firstYear = config.firstYear;

var firstDayPreci = ee.String(ee.Number(firstYear).subtract(1)).cat('-11-28');
var firstDay = ee.String(firstYear.toString()).cat('-01-01');
var lastDay  = ee.String(ee.Number(firstYear).add(1)).cat('-01-01');
var lastDayExtra1  = ee.String(ee.Number(firstYear).add(1)).cat('-01-02');
var ERA5LandPre = coleccionImagenes.ERA5LandHour.filterDate(firstDayPreci,lastDayExtra1).map(function(img){
                     return img.select(["total_precipitation",'total_evaporation']).clip(repYGeometria.Boundary)
                           // 20151129T00 represents total precipitation of 20151128 (T01-T00), so one hour shift earlier
                           .set("system:time_start",ee.Number(img.get("system:time_start")).subtract(86400000))
                   })
           .filterDate(firstDayPreci,lastDay)
           .filterMetadata("hour","equals",0);
           

 ERA5LandPre = ERA5LandPre.map(function(img){
   return img.select("total_precipitation").add(img.select('total_evaporation'))
         .set("system:time_start",ee.Number(img.get("system:time_start")))
         .set('hour',img.get('hour'))
 })
 
//t=34(0-33) k=0.91 
 var lagRange = 33;
// Looks for all images up to 'lagRange' days away from the current image.
 var maxDiffFilter = ee.Filter([
   ee.Filter.maxDifference({
     difference: lagRange * 24 * 60 * 60 * 1000,
     leftField: 'system:time_start',
     rightField: 'system:time_start'
   })]);

//Images before, sorted in ascending order (so closest is last).
//here we cannot remove the equals, otherwise the timeseries will lost first element
 var FilterBefore = ee.Filter.and(maxDiffFilter, ee.Filter.greaterThanOrEquals('system:time_start', null, 'system:time_start'))
 var ERA5LandPre_BeforeJoinedCols = ee.Join.saveAll('before', 'system:time_start', true).apply(ERA5LandPre, ERA5LandPre, FilterBefore)
 
// ////////////calculate apiCollection over all precipitation datasets
 var apiLandCollection = ERA5LandPre_BeforeJoinedCols.map(function(image1) {
   image1 = ee.Image(image1);
   var beforeImages=ee.List(image1.get('before'))
   beforeImages=beforeImages.map(function(image2){
   image2=ee.Image(image2)
   var startTime=ee.Number(image1.get('system:time_start'))
   var id=startTime.subtract(ee.Number(image2.get('system:time_start'))).divide(86400000);
   return ee.Image(image2).set('id',id)
 })
   beforeImages=ee.ImageCollection(beforeImages)//.filterMetadata("id","not_equals",0)
   var k=ee.Image(0.91)
   var apiItem=beforeImages.map(function(image3){
     image3=ee.Image(image3)
     var id=ee.Image(ee.Number(image3.get('id')));
     var api=image3.multiply(k.pow(id))
     return api
   })
   var api=ee.ImageCollection(apiItem).sum()
   //return api.rename([ee.String('band').cat(ee.String('_')).cat(image1.get('system:index')).cat("_APEI")])
   return api.rename([ee.String('band').cat(ee.String('_')).cat("_APEI")])
             .set('system:index1',ee.String(image1.get('system:index')).slice(0,8))
             .set("system:time_start",image1.get("system:time_start"))
 })
 
   apiLandCollection=ee.ImageCollection(apiLandCollection
                   .filterMetadata("system:index","not_less_than",ee.String(ee.Number(firstYear)).cat("0102T00")))

var APILand = apiLandCollection
  return {APILand: apiLandCollection};
};