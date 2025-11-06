
import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';

var Boundary=ee.FeatureCollection(coleccionImagenes.tabla);
var WTD = coleccionImagenes.WTD.reproject("EPSG:4326",null,1000).rename('WTD').clip(Boundary);
var DTB = coleccionImagenes.DTB.reproject("EPSG:4326",null,1000).rename('DTB').clip(Boundary);

export default {
  WTD: WTD,
  DTB: DTB,
  Boundary: Boundary
};
