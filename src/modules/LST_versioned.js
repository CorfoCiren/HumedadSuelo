
import ee from '@google/earthengine';

export function run(config) {
  var firstYear = config.firstYear;

// var firstYear=require('users/corfobbppciren2023/firstYear:0.firstYear.js');

///////////////////////////***********************************
//LST
//var LST=ee.ImageCollection("users/qianrswaterAmerica/LSTEuropeMOD11A1");
//var dayLSTfilter = ee.String("MODIS_LST_Blended_Day_Europe").cat(ee.String(ee.Number(firstYear)));
//var nightLSTfilter = ee.String("MODIS_LST_Blended_Night_Europe").cat(ee.String(ee.Number(firstYear)));
//var dayLST = LST.filterMetadata("system:index","equals",dayLSTfilter).first().divide(100);
//var nightLST = LST.filterMetadata("system:index","equals",nightLSTfilter).first().divide(100);

//var image_day = ee.Image('users/corfobbppciren2023/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Day_Valparaiso_'+firstYear.firstYear);
//var image_night = ee.Image('users/corfobbppciren2023/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Night_Valparaiso_'+firstYear.firstYear);

function toLegacyPath(usersPath) {
  return 'projects/earthengine-legacy/assets/' +
         usersPath.replace(/^projects\/earthengine-legacy\/assets\//, '');
}

function assetExists(assetIdUsers) {
  // Use the path as-is if it's already a Cloud Asset path
  var testPath = assetIdUsers;
  
  // If it starts with 'users/', convert to Cloud Asset format
  if (assetIdUsers.indexOf('users/') === 0) {
    var parts = assetIdUsers.split('/');
    if (parts.length >= 3) {
      var username = parts[1];
      var rest = parts.slice(2).join('/');
      testPath = 'projects/ee-' + username + '/assets/' + rest;
    }
  }
  
  try {
    ee.data.getAsset(testPath);
    return true;
  } catch (e) {
    return false;
  }
}

// Find latest version: …_<year>_vN. Probes v1..maxProbe.
function latestVersionAssetId(baseAssetPrefix, year, maxProbe) {
  var base = baseAssetPrefix + '_' + String(year);   // e.g. users/.../LST_VIIRS_Day_Valparaiso_2024
  var v = 1;
  while (v <= (maxProbe || 200) && assetExists(base + '_v' + v)) v++;
  if (v > 1) return base + '_v' + (v - 1);          // last existing version
  if (assetExists(base)) return base;               // fallback to non-versioned
  return null;
}

function loadLatestVersionedImage(baseAssetPrefix, year) {
  var id = latestVersionAssetId(baseAssetPrefix, year, 200);
  if (!id) throw new Error('No asset found for base ' + baseAssetPrefix + ' and year ' + year);
  console.log('Using versioned asset:', id);
  return ee.Image(id);
}

// ---- use it for your day image ----
var basePrefixDay = 'projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Day_Valparaiso';
var image_day = loadLatestVersionedImage(basePrefixDay, firstYear);

var dayLST = ee.ImageCollection(image_day).first();
//var nightLST = ee.ImageCollection(image_night).first();

function batchRename_dailyLST(image){
  var rename=image.bandNames().map(function(name){
    return ee.String("band_").cat(ee.String(name).slice(-10)).cat(ee.String("_dailyLST"));
  });
  return image.rename(rename);
}

var dailyLST0=batchRename_dailyLST(dayLST)
.reproject("EPSG:4326",null,1000);

function batchRename_dailyLSTDiff(image){
  var rename=image.bandNames().map(function(name){
    return ee.String("band_").cat(ee.String(name).slice(-10)).cat(ee.String("_dailyLSTDiff"));
  })
  return image.rename(rename);
}

//var dailyLSTDiff0=batchRename_dailyLSTDiff(dayLST.subtract(nightLST))
//.reproject("EPSG:4326",null,1000);

//print("dailyLSTDiff0",dailyLSTDiff0)

///dailyLST
var bandNamesdailyLST=dailyLST0.bandNames();
var dailyLST=ee.ImageCollection(bandNamesdailyLST.map(function(BandNameElement){
  var stringLength=ee.String(BandNameElement).length();
  var stryearBegin=ee.String(BandNameElement).slice(-19,-9);
  var startIndex=ee.String(BandNameElement).rindex(stryearBegin);
  var DateString=ee.String(BandNameElement).slice(startIndex,startIndex.add(10));
  var yearStr=ee.Number.parse(DateString.slice(0,4));
  var monthStr=ee.Number.parse(DateString.slice(5,7));
  var DayStr=ee.Number.parse(DateString.slice(8,10));
   
  return ee.Image(dailyLST0.select([BandNameElement])).rename(['dailyLST']).cast({"dailyLST": "double"}, ["dailyLST"])
.set('system:time_start', ee.Date.fromYMD(yearStr.int(), monthStr.int(), DayStr.int()).millis())
.set('bandName',BandNameElement)
.set("system:index",stryearBegin);
}));

//var bandNamesdailyLSTDiff=dailyLSTDiff0.bandNames();
//var dailyLSTDiff=ee.ImageCollection(bandNamesdailyLSTDiff.map(function(BandNameElement){
//  var stringLength=ee.String(BandNameElement).length();
//  var stryearBegin=ee.String(BandNameElement).slice(-23,-13)
//  var startIndex=ee.String(BandNameElement).rindex(stryearBegin)
//  var DateString=ee.String(BandNameElement).slice(startIndex,startIndex.add(10))
//  var yearStr=ee.Number.parse(DateString.slice(0,4));
//  var monthStr=ee.Number.parse(DateString.slice(5,7));
//  var DayStr=ee.Number.parse(DateString.slice(8,10));
   
//  return ee.Image(dailyLSTDiff0.select([BandNameElement])).rename(['dailyLSTDiff']).cast({"dailyLSTDiff": "double"}, ["dailyLSTDiff"])
//.set('system:time_start', ee.Date.fromYMD(yearStr.int(), monthStr.int(), DayStr.int()).millis())
//.set('bandName',BandNameElement)
//.set("system:index",stryearBegin)
//}))

////////////////////////////////////////
///////////////


  return {dailyLST: dailyLST};
};
//exports.dailyLSTDiff = dailyLSTDiff;

////////////////////////////////////////
///////////////