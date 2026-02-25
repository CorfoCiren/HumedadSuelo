
/*******************************************************************************
 * Sensores *
 * 
 * En esta sección se almacenan todos las funciones relacionadas
 * con los sensores. 
 * 
 * Guidelines: Los widgets se definen en el main y se actualizan aqui.
 ******************************************************************************/
//var sensores_puntos = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/sensores_corfo");
var dataSensores = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/DataSensores");

var nom_sensores = ee.Dictionary({
  "Frutícola Pan de Azúcar": {'lat': -30.108616, 'lon': -71.218714},
  "Parcela 1 Santa Catalin": {'lat': -30.613491, 'lon': -71.153457},
  "ASMARA Sector 3": {'lat': -30.593236, 'lon': -71.240098},
  "Parcela 10 cuartel 4_2": {'lat': -30.628894, 'lon': -71.159675},
  "Fundo Siberia": {'lat': -30.627344, 'lon': -71.351948},
  "Huerto 1 Nogales Riego": {'lat': -31.806531, 'lon': -71.014156},
  "Quebrada Paihuano": {'lat': -30.032063, 'lon': -70.470496},
  "Cárcamo": {'lat': -31.594961, 'lon': -71.062351},
  "El Almendral": {'lat': -29.981330, 'lon': -70.901481},
  "Parcela 9 Huentel Sur": {'lat': -31.600053, 'lon': -71.527379},
  "Las Cardas": {'lat': -30.252743, 'lon': -71.257009},
  "Los Choros": {'lat': -29.295051, 'lon': -71.303318},
  "El Carmen": {'lat': -30.472775, 'lon': -71.061232},
  "Illapel Arriba El Bato": {'lat': -31.517137, 'lon': -70.809264},
  "Las Verbenas": {'lat': -32.116725, 'lon': -71.494935},
  "Santa Rosa El Palqui": {'lat': -30.768690, 'lon': -70.915219},
  "Chañaral Bajo": {'lat': -30.786012, 'lon': -70.956428},
  "Fundo Puente Plomo": {'lat': -30.761863, 'lon': -70.951822},
  "Punta Colorada": {'lat': -29.355253, 'lon': -71.013857},
  "La Higuera": {'lat': -29.506120, 'lon': -71.205739}
});


exports.nom_sensores = nom_sensores;

/*******************************************************************************
 * Funciones internas *
 ******************************************************************************/


var extraerAtributo = function(feature) {
  var atributo = 'filename';
  return feature.get(atributo);
};
/*******************************************************************************
 ******************************************************************************/


//importa el panel completo con todas las labels
function updateTooltip(input, shapefile, panel) {

  if (typeof(input) === 'number' || (typeof(input) === 'string' && !isNaN(input))) {
    // Caso cuando input es el ID numérico del sensor
    getPointFromSensorId(parseInt(input, 10), shapefile, function(point) {
      processAndUpdateLabels(point, shapefile, panel);
    });
  } else if (typeof(input) === 'object') {
    // Caso cuando input son las coordenadas del click en el mapa
    var point = ee.Geometry.Point([input.lon, input.lat]);
    processAndUpdateLabels(point, shapefile, panel);
  }

}

function getPointFromSensorId(idSeleccionado, shapefile, callback) {
  var feature = shapefile.filter(ee.Filter.eq('Id', idSeleccionado)).first();
  
  feature.evaluate(function(f) {
    if (f && f.properties) {
      var lat = parseFloat(f.properties.LAT);
      var lon = parseFloat(f.properties.LONG);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        var point = ee.Geometry.Point([lon, lat]);
        callback(point);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

function processAndUpdateLabels(point, shapefile, panel) {
  if (!point) return;
  var bufferedPoint = point.buffer(2000);  // Buffer para ayudar en la búsqueda
  
  // Encontrar el punto más cercano en el shapefile
  var nearestFeature = shapefile.filterBounds(bufferedPoint).first();

  nearestFeature.evaluate(function(feature) {
    if (feature && feature.properties) {
      var nombre = feature.properties.NOMBRE || 'No especificado';
      var comuna = feature.properties.COMUNA || 'No especificada';
      var lon = parseFloat(feature.properties.LONG);
      var lat = parseFloat(feature.properties.LAT);

      if (!isNaN(lat) && !isNaN(lon)) {
        var labels = panel.widgets();
        labels.get(1).setValue('Nombre sensor: ' + nombre);
        labels.get(2).setValue('Comuna: ' + comuna);
        labels.get(3).setValue('Lon: ' + lon.toFixed(4) + '°');
        labels.get(4).setValue('Lat: ' + lat.toFixed(4) + '°');

        panel.style().set('shown', true);
      }
    }
  });
}



exports.updateTooltip = updateTooltip;

function zoomSensor(idSeleccionado, shapefile, map) {
  var feature = shapefile.filter(ee.Filter.eq('Id', idSeleccionado)).first();

  feature.evaluate(function(f) {
    if (f && f.properties) {
      var lat = parseFloat(f.properties.LAT);
      var lon = parseFloat(f.properties.LONG);

      if (!isNaN(lat) && !isNaN(lon)) {
        var punto = ee.Geometry.Point([lon, lat]);
        map.centerObject(punto, 15);
      }
    }
  });
}


exports.zoomSensor = zoomSensor;


// Agregar una serie de tiempo al chart

function serieSensor(idSeleccionado, shapefile, callback) {

  // Filtrar la data por la columna 'Id'
  var filtered = dataSensores.filter(ee.Filter.eq('Id', idSeleccionado));

  // Agregar arrays de HS y Fecha
  var hsList = filtered.aggregate_array('HS');
  var fechaList = filtered.aggregate_array('﻿Fecha'); // nota el caracter invisible si existe

  // Obtener coordenadas del sensor desde el shapefile (fire in parallel)
  var feature = shapefile.filter(ee.Filter.eq('Id', idSeleccionado)).first();

  // Evaluar todo en paralelo
  fechaList.evaluate(function(fList) {
    hsList.evaluate(function(hList) {
      feature.evaluate(function(f) {

        if (!fList || !hList || fList.length !== hList.length) {
          callback(null);
          return;
        }

        // Crear diccionario JS nativo fecha -> HS
        var sensorDict = {};
        for (var i = 0; i < fList.length; i++) {
          sensorDict[fList[i]] = hList[i];
        }

        if (f && f.properties) {
          var lat = parseFloat(f.properties.LAT);
          var lon = parseFloat(f.properties.LONG);

          if (isNaN(lat) || isNaN(lon)) {
            callback(null);
            return;
          }

          callback([sensorDict, [lon, lat]]);
        } else {
          callback(null);
        }
      });
    });
  });
}

exports.serieSensor = serieSensor;







