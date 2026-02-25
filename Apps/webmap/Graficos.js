// TimeSeries.js

var Sensores = require('users/corfobbppciren2024/App_HS_User:Sensores'); 
var s = require('users/corfobbppciren2024/App_HS_User:Style').styles; 

// Cached region bounding box for instant client-side point-in-region checks
var regionBBox = null;

// Set bbox directly (used when bounds are already evaluated)
exports.setRegionBBox = function(bbox) {
  regionBBox = bbox;
};

exports.initRegionBBox = function(region) {
  region.geometry().bounds().coordinates().evaluate(function(coords) {
    if (coords && coords[0]) {
      regionBBox = {
        minLon: coords[0][0][0],
        minLat: coords[0][0][1],
        maxLon: coords[0][2][0],
        maxLat: coords[0][2][1]
      };
    }
  });
};


exports.Click = function(year, coords, region, rasterCollection, callback) {
// 1. Obtener las coordenadas  
  // coords can be array [lon, lat] or object {lon, lat}
  var lon = Array.isArray(coords) ? coords[0] : coords.lon;
  var lat = Array.isArray(coords) ? coords[1] : coords.lat;
  var point = ee.Geometry.Point([lon, lat]);
  if(!insideRegion(coords, region)){

    return null;
  }

  // Función para obtener los valores de los píxeles en un punto específico para una imagen
  var getPixelValues = function(image) {
    return image.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: point,
      scale: 1000, // Ajusta la escala según la resolución de tus imágenes
      maxPixels: 1e5
    });
  };

  // Combinar todos los diccionarios en uno solo
  var comb = ee.Dictionary({});
  var imgCount = rasterCollection.length;
  for (var i = 0; i < imgCount; i++) {
    var pixelRaster = getPixelValues(rasterCollection[i]);
    comb = comb.combine(pixelRaster);
  }
  var newDict = renameDict(comb);

  return [newDict, coords];
};


// Función para crear el gráfico cuando se hace clic en el mapa

exports.createChartOUT = function(c, listGeometry) {

  if (listGeometry=== null) {
    //no se crea el gráfico, tampoco da alerta
    return null;
  }
  
  var point = listGeometry[1];
  // point puede ser un array [lon, lat] o un objeto {lon, lat}
  var lat = (Array.isArray(point) ? point[1] : point.lat).toFixed(3);
  var lon = (Array.isArray(point) ? point[0] : point.lon).toFixed(3);
  var title = 'Humedad de suelo de punto: '+lat +','+ lon;
  
  var valueDict = listGeometry[0];
  
  // Always show the chart panel
  c.chart.chartPanel.style().set('shown', true);
  c.chart.container.style().set({shown: true});
  c.chart.shownButton.setLabel('Ocultar gráfico');

  var xValues = ee.List(valueDict.keys());
  var yValues = ee.List(valueDict.values());

  // Para establecer el límite del gráfico
  var minYValue = yValues.reduce(ee.Reducer.min());
  var minYLimit = ee.Number(minYValue).subtract(2.5);
  var ylim = minYLimit.getInfo();

  // Creación del gráfico
  var chart = ui.Chart.array.values({array: yValues, axis: 0, xLabels: xValues})
  .setSeriesNames(['HS'])
  .setOptions({
    title: title,
    colors: ['1d6b99'],
    hAxis: {
      title: 'Fecha',
      titleTextStyle: s.styleChartAxis,
      slantedText: true,
      slantedTextAngle: 90,
      textStyle: {fontSize: 12},
    },
    vAxis: {
      title: 'Humedad de suelo (%)',
      titleTextStyle: s.styleChartAxis,
      viewWindow: {min: ylim}
    },
    lineSize: 2,
    pointSize: 1,
    legend: {position: 'none'},
  });

  chart.style().set(s.styleChartArea);

  // Limpiar el panel y agregar el nuevo gráfico
  c.chart.container.widgets().reset([chart]);
  c.chart.shownButton.setLabel('Ocultar gráfico');
};

// Función para crear el gráfico cuando se selecciona un sensor
exports.createChartSensor2 = function(c, sensor, listGeometry, region, rasterDict ) {
  
//se crea un grafico con la data del modelo y la del sensor
//listGeometry es la data del sensor
//sensor coordinates
var coords = listGeometry[1];

// Wrap in evaluate-style callback to handle coords that may be an ee object
var coordsObj = Array.isArray(coords) ? {lon: coords[0], lat: coords[1]} : coords;

    var keysYears = Object.keys(rasterDict);
    var globalData = {};
    
    for(var i=0; i<keysYears.length; i++){
      var year = keysYears[i];
      globalData[year] = exports.Click(year, coords, region, rasterDict[year]);
    }
    
    // Guard: if any year returned null (point outside region), skip chart
    var hasNullData = false;
    for(var i=0; i<keysYears.length; i++){
      if(globalData[keysYears[i]] === null){
        hasNullData = true;
        break;
      }
    }
    if(hasNullData){
      print('Sensor fuera de la región o datos no disponibles.');
      return;
    }
    
    if (listGeometry=== null) {
    //no se crea el gráfico, tampoco da alerta
    return null;
  }
  
  var point = listGeometry[1];
  var lat = Array.isArray(point) ? point[1] : point.lat;
  var lon = Array.isArray(point) ? point[0] : point.lon;
  var title = 'Humedad de suelo sensor: ' + sensor;
  
  var valueDict = ee.Dictionary(listGeometry[0]); //convertir porque evaluate pasa los objetos a JS nativos 

  // Always show the chart panel
  c.chart.chartPanel.style().set('shown', true);
  c.chart.container.style().set({shown: true});
  c.chart.shownButton.setLabel('Ocultar gráfico');

  var keyList = valueDict.keys();
  
  var fusedList = keyList.map(function(key){
    var parts = ee.String(key).split('/'); // [dd, mm, yyyy]
    var newKey = ee.String(parts.get(2))  // yyyy
      .cat('-').cat(parts.get(1))              // mm
      .cat('-').cat(parts.get(0));             // dd
    
    return [newKey, ee.Number(valueDict.get(key))];
    
    
  });
  
  valueDict = ee.Dictionary(fusedList.flatten());

  //data sensor
  var xValues = ee.List(valueDict.keys());
  
  
  //data modelo - usar el primer año disponible en lugar de hardcodear 2025
  var xValuesModAll = ee.List(globalData[keysYears[0]][0].keys());
  for(var i=1; i<keysYears.length; i++){
    var xValuesModi = ee.List(globalData[keysYears[i]][0].keys());
    var xValuesModAll = ee.List(xValuesModAll.cat(xValuesModi));
  }
  
  var combinedDates = ee.List(xValues.cat(xValuesModAll));
  
  // Convierte las fechas a ee.Date
  var dateList = combinedDates.map(function(dateStr) {
    return ee.Date(dateStr);
  });
  var minDate = ee.Date(dateList.reduce(ee.Reducer.min()));
  var maxDate = ee.Date(dateList.reduce(ee.Reducer.max()));
  
  var numDays = maxDate.difference(minDate, 'day');

// Generar una secuencia de fechas
  var dateSequence = ee.List.sequence(0, numDays).map(function(day) {
    return minDate.advance(day, 'day');
  });

  // Convertir la secuencia de fechas a un formato legible
  var formattedDateSequence = dateSequence.map(function(date) {
    return ee.Date(date).format('YYYY-MM-dd');
  });

  var updatedDataAllList = ee.List([]);
  for(var i=0; i<keysYears.length; i++){
    var updatedDataiList = ee.List(addMissingDates(ee.Dictionary(globalData[keysYears[i]][0]), formattedDateSequence).values());
    var updatedDataAllList = updatedDataAllList.add(updatedDataiList);
  }

  var indices = ee.List.sequence(0, ee.List(updatedDataAllList.get(0)).length().subtract(1));
  var numLists = updatedDataAllList.length();
  
  
  var zippedDataAll = indices.map(function(i) {
    var innerIndices = ee.List.sequence(0, numLists.subtract(1));
    var zippedDataj = innerIndices.map(function(j) {
      return ee.List(updatedDataAllList.get(j)).get(i);
    });
    return zippedDataj;
  });


  var updatedValueDict = addMissingDates(valueDict, formattedDateSequence);

  var yValuesModAll = zippedDataAll.map(function(tuple) {
    tuple = ee.List(tuple);
    return tuple.reduce(ee.Reducer.max());
  });
  
  var minYValueAllMod = keysYears.map(function(key) {
    return globalData[key][0].values().reduce(ee.Reducer.min());
    
  });
  minYValueAllMod = ee.Number(ee.List( minYValueAllMod).reduce(ee.Reducer.min()));
  
  var yValues = ee.List(updatedValueDict.values());

  var minYValue = ee.Number.parse(valueDict.values().reduce(ee.Reducer.min()));
  var overallMinYValue = minYValue.min(ee.Number(minYValueAllMod));

  // Casting again into number for safety
  yValues = yValues.map(function(value){
    return ee.Number.parse(value);
  });
  yValuesModAll = yValuesModAll.map(function(value){
    return ee.Number.parse(value);
  });
  

  // Para establecer el límite del gráfico
  var minYLimit = ee.Number(overallMinYValue).subtract(2.5);
  var ylim = minYLimit.getInfo();
  
  var combinedLists = ee.List([yValues, yValuesModAll]);
  var yArray = ee.Array(combinedLists);
  
  // Creación del gráfico
  var chart = ui.Chart.array.values({array: yArray, axis: 1, xLabels: formattedDateSequence})
  .setSeriesNames(['Sensor','Modelo'])
  .setOptions({
    //title: title,
    colors: ['1d6b99', 'cf513e'],
    hAxis: {
      title: 'Fecha',
      titleTextStyle: s.styleChartAxis,
      slantedText: true,
      slantedTextAngle: 90,
      textStyle: {fontSize: 12},
      showTextEvery: 1, // Mostrar todas las etiquetas (no omitir ninguna)
    },
    vAxis: {
      title: 'Humedad de suelo (%)',
      titleTextStyle: s.styleChartAxis,
      viewWindow: {min: ylim}
    },
    lineSize: 1,
    pointSize: 2,
    legend: {position: 'right'},
  });
  
  // Limpiar el panel y agregar el nuevo gráfico
  c.chart.container.widgets().reset([chart]);

  chart.style().set(s.styleChartArea);

};

//AGREGAR FUNCION PARA HACER UNA TABLA CON INFORMACION DEL PUNTO CLICKEADO
//chartClass.tablaInfo(coords, {map: c.map}, region, valueDict, c.selectBand.selector.getValue()

exports.tablaInfo = function(coords, options, region, dictHS, date, callback) {

  //esta funcion debe funcionar solo si hay un dia seleccionado
  var map = options.map;
  var punto = ee.Geometry.Point([coords.lon, coords.lat]);

  if (map.layers().length() > 1 && insideRegion(coords, region) && date !== null) {
    var point = dictHS[1];
    // point puede ser un array [lon, lat] o un objeto {lon, lat}
    var lat = (Array.isArray(point) ? point[1] : point.lat).toFixed(3);
    var lon = (Array.isArray(point) ? point[0] : point.lon).toFixed(3);
    var parts = date.split('/');
    var day = parts[0];
    var month = parts[1];
    var year = parts[2];
    var newDate = year + '-' + month + '-' + day;
    var hs = dictHS[0].get(newDate);

    hs.evaluate(function(hsValue) {
      // Redondear hsValue a 3 decimales
      var roundedHsValue = hsValue ? hsValue.toFixed(2) : null;
      callback({
        lat: lat,
        lon: lon,
        newDate: newDate,
        hs: roundedHsValue
      });
    }
    
    
    );
  } else {
    callback(null);
  }

};

exports.showHideChart = function(c) {
  var shown = true;
  var label = 'Ocultar gráfico';
  if (c.chart.shownButton.getLabel() === 'Ocultar gráfico') {
    shown = false;
    label = 'Mostrar gráfico';
  }
  c.chart.container.style().set({shown: shown});
  c.chart.shownButton.setLabel(label);
};




// Funciones internas
function renameDict(dict) {
  var keys = dict.keys(); // Llaves del diccionario
  var values = dict.values();
  
  var renameKey = function(key) {
    // Eliminar la letra 'b' inicial
    var newKey = ee.String(key).slice(1);
    return newKey;
  };
  
  var newKeys = keys.map(renameKey);
  var newDict = ee.Dictionary.fromLists(newKeys, values); // Construye nuevo diccionario con nuevas llaves
  return newDict;
}

function insideRegion(coords, region){
  // Use cached bounding box for instant client-side check (no server call)
  if (regionBBox && coords) {
    var lon = Array.isArray(coords) ? coords[0] : coords.lon;
    var lat = Array.isArray(coords) ? coords[1] : coords.lat;
    return lon >= regionBBox.minLon && lon <= regionBBox.maxLon &&
           lat >= regionBBox.minLat && lat <= regionBBox.maxLat;
  }
  // Fallback to server check if bbox not yet cached
  var lon2 = Array.isArray(coords) ? coords[0] : coords.lon;
  var lat2 = Array.isArray(coords) ? coords[1] : coords.lat;
  var point = ee.Geometry.Point([lon2, lat2]);
  var regionFirst = region.first();
  var isInRegion = regionFirst.geometry().contains(point, ee.ErrorMargin(1)).getInfo();
  if(isInRegion){
    return true;
  }else{
    return false;
  }

}

function addMissingDates(dict, dateList) {

  // Usa map para recorrer dateList
  var newDictEntries = dateList.map(function(date) {
    // Convierte date a string para usar como clave
    var dateStr = ee.Date(date).format('YYYY-MM-dd');
    // Obtén el valor de dict para la clave dateStr, o NaN si no existe
    var value = dict.get(dateStr, -9999);
    return ee.List([dateStr, value]);
  });
  
  // Convierte la lista de pares de nuevo a un diccionario
  var newDict = ee.Dictionary(newDictEntries.flatten());

  return newDict;
}





