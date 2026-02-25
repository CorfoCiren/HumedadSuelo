var init = require('users/corfobbppciren2024/App_HS_User:Inicio');
var basePath = init.basePath();
var suffix = init.suffixNorte();
var suffix2 = init.suffixSur();

function filterImagesByYear(listAssets,year) {
  // If listAssets not available, generate images from known naming pattern
  if (!listAssets || !listAssets.length) {
    var images = [];
    for (var m = 1; m <= 12; m++) {
      var imgNorte = ee.Image(basePath + year + suffix + 'mes' + m);
      var imgSur = ee.Image(basePath + year + suffix2 + 'mes' + m);
      var proj = imgNorte.projection();
      var geom = imgNorte.geometry().union(imgSur.geometry());
      images.push(
        ee.ImageCollection([imgNorte, imgSur])
          .mosaic()
          .setDefaultProjection(proj)
          .clip(geom)
      );
    }
    return images;
  }
  // Convierte el año a string para compararlo con el ID
  var yearString = 'SM' + year; // Ejemplo: 'SM2015'
  
  // Filtra los assets cuyo ID contiene el año especificado
  var filteredAssets = listAssets.filter(function(asset) {
    return asset.id.indexOf(yearString) !== -1; // Verifica si el ID contiene el año
  });

  var norteAssets = filteredAssets.filter(function(asset){
    return asset.id.indexOf('norte') !== -1;
  });
  
  // Ordenar los assets por mes para asegurar el orden correcto
  norteAssets.sort(function(a, b) {
    // Extraer el número del mes del ID (ej: "mes7" -> 7)
    var mesA = parseInt(a.id.match(/mes(\d+)/)[1], 10);
    var mesB = parseInt(b.id.match(/mes(\d+)/)[1], 10);
    return mesA - mesB;
  });
  
  // Retorna las imágenes como una lista de ee.Image
  var images = norteAssets.map(function(asset) {
    
    var imageNorte = ee.Image(asset.id);
    var imageSur = ee.Image(asset.id.replace('norte', 'sur'));
    
    var projection = imageNorte.projection();
    var geometry = imageNorte.geometry().union(imageSur.geometry());
    var returnImage = ee.ImageCollection([imageNorte, imageSur])
      .mosaic()
      .setDefaultProjection(projection)
      .clip(geometry);
      
      
    return returnImage;
  });

  return images;
}

function getImageId(year, month){
  // Convertir el mes a número (base 10) y luego a string para eliminar ceros a la izquierda
  var formattedMonth = String(parseInt(month, 10));
  return basePath + year + suffix + 'mes' + formattedMonth;
}

function getImageId2(year, month){
  // Convertir el mes a número (base 10) y luego a string para eliminar ceros a la izquierda
  var formattedMonth = String(parseInt(month, 10));
  return basePath + year + suffix2 + 'mes' + formattedMonth;
}

// Función para formatear fecha
function dateFormat(date) {
  var parts = date.split('/');
  return ['b' + parts[2] + '-' + parts[1] + '-' + parts[0], parts[2], parts[1], parts[0]];
}

// Exporta una colección de imágenes
exports.collection = function(selectedYear, date, disp_year, listAssets) {
  var year = (selectedYear != 1) ? selectedYear : dateFormat(date)[1];
  var month = date.split('/')[1];
  var newDate = dateFormat(date)[0]; //para generar el nombre de la banda
  

  
  // Obtiene las imágenes filtradas por el año
  var rasters = filterImagesByYear(listAssets,year);
  
  var returnRaster = null;

    if (selectedYear == 1) {
    var imID = ee.Image(getImageId(year, month));
    var imID2 = ee.Image(getImageId2(year, month));
    // Select the expected band directly - no getInfo() needed.
    // Band name is deterministic from the date; invalid dates are
    // already filtered by the UI selectors.
    var returnRasterNorte = imID.select([newDate]);
    var returnRasterSur = imID2.select([newDate]);
    
    var projection = returnRasterNorte.projection();
    var geometry = returnRasterNorte.geometry().union(returnRasterSur.geometry());
    returnRaster = ee.ImageCollection([returnRasterNorte, returnRasterSur])
      .mosaic()
      .setDefaultProjection(projection)
      .clip(geometry);
  }
  // Devuelve las imágenes y la imagen seleccionada
  return [rasters, returnRaster];
};

// Función para obtener min y max de la banda
exports.MinMaxBand = function(layer, date) {
  var bandName = dateFormat(date)[0];
  var stats = layer.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: layer.geometry(),
    scale: 1000
  });
  
  return ee.Dictionary({ 
    min: stats.get(bandName + '_min'), 
    max: stats.get(bandName + '_max')
  });
};