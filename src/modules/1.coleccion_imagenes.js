/**
 * Module: 1.coleccion_imagenes.js
 * Collections and assets for soil moisture processing
 * NOTE: This module should only be imported AFTER Earth Engine is initialized
 */

import ee from '@google/earthengine';

// Asset definitions
const tabla = ee.FeatureCollection('projects/ee-corfobbppciren2023/assets/Geometrias/Valparaiso_1km');
const MERIT = ee.Image("MERIT/Hydro/v1_0_1");
const ERA5Land = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR");
const WTD = ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/WTD_v2");
const DTB = ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/DTB");
const trainTestant = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/trainTestFinal2022-0509coor");
const trainTest = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/trainsample_SM_2024_CORFO");
const valiEva = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/valiEvaFinal2022-0509coor");
const NLsamples = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/trainTestNL2022-0509coor");
const TIele = ee.Image("projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/TIele1000resample0709");
const ERA5LandHour = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY");

export default {
  tabla,
  MERIT: MERIT.clip(tabla),
  ERA5Land: ERA5Land.filterBounds(tabla),
  WTD: WTD.clip(tabla),
  DTB: DTB.clip(tabla),
  trainTest,
  trainTestant,
  valiEva,
  NLsamples,
  TIele: TIele.clip(tabla),
  ERA5LandHour: ERA5LandHour.filterBounds(tabla)
};
