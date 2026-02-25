var mesDict = ee.Dictionary({'Enero': '01',
  'Febrero':'02',
  'Marzo': '03',
  'Abril':'04',
  'Mayo': '05',
  'Junio': '06',
  'Julio': '07',
  'Agosto': '08',
  'Septiembre': '09',
  'Octubre': '10',
  'Noviembre': '11',
  'Diciembre': '12'
});

var Leyenda = require('users/corfobbppciren2024/App_HS_User:Leyenda2'); 


function reqEva(anno, mes, c, region) {
  c.evapo.warning.setValue('');  // Limpiar advertencias anteriores
  
  // Verificación de año y mes
  if (!anno || anno === '') {
    c.evapo.warning.setValue('Seleccione el año');
    return;
  }
  if (!mes || mes === '') {
    c.evapo.warning.setValue('Seleccione el mes');
    return;
  }
  c.evapo.buscar.setDisabled(true);
  //Eliminar capa anterior si existe
  var layers = c.map.layers();
    for (var i = 0; i < layers.length(); i++) {
      var layer = layers.get(i);
      if (layer.getName() === 'Evapotranspiración') {
        c.map.remove(layer);
        break;
      }
    }

  // Generar la ruta de la imagen a partir del año y mes
  var img1 = ee.Image('projects/usgs-ssebop/viirs_et_v6_monthly/' + anno + mes);

  // Intentar obtener información sobre la imagen para verificar si existe
  img1.getInfo(function(info) {
    if (info === null) {
      // Si la imagen no existe, mostrar advertencia
      
      var warning = 'No se encontró imagen para la fecha seleccionada';
      c.evapo.warning.setValue(warning);
    } else {
      // Si la imagen existe, aplicamos la paleta y la agregamos al mapa
      var imgRecortada = img1.clip(region);
      
      // Reducir la región para obtener estadísticas (ej. valor máximo de ET)
      imgRecortada.reduceRegion({
        reducer: ee.Reducer.max(),  // Cambiar según la estadística deseada
        geometry: region,
        scale: 1000
      }).getInfo(function(stats) {
        if (stats && stats.et !== undefined) {
          var maxEt = stats.et;  // Valor máximo de evapotranspiración

          // Definir la paleta de colores con el valor máximo obtenido
          var et_palette = {
            min: 0,
            max: maxEt,  // Usar el valor máximo calculado para la paleta
            palette: [ '#1c8691',  '#20998f','#3bb369', '#6bcc5c', '#c3e683','#fff4ad', '#f5e4a9'],
            opacity: 0.9
          };

          // Agregar la imagen recortada al mapa con la nueva paleta
          c.map.addLayer(imgRecortada, et_palette, 'Evapotranspiración');

          // Actualizar la leyenda con el nuevo valor máximo
          Leyenda.updateLegend(0, maxEt, c, et_palette.palette);
          
          

        } else {
          c.evapo.warning.setValue('No se pudieron calcular las estadísticas.');
        }
      });
    }
  });
  
}

exports.reqEva = reqEva;
exports.actualizarEvapo = function(point, evapo, fecha, c) {
  c.evapo.fecha.setValue('Fecha: ' + fecha);
  // Acceder a las coordenadas del punto
  point.coordinates().evaluate(function(coords) {
    var lat = parseFloat(coords[1].toFixed(2));
    var lon = parseFloat(coords[0].toFixed(2));
    c.evapo.lat.setValue('Lat.: ' + lat + '°');
    c.evapo.lon.setValue('Lon.: ' + lon + '°');
  });

  // 1. Clear all dynamic panels
  c.evapo.dynamicPanel.clear();
  
  // Obtener el valor de la capa en el punto
  var value = evapo.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: point,
    scale: 1000,  
    bestEffort: true
  });

  value.evaluate(function(result) {
    if (result && result.et) {
      c.evapo.et.setValue('E.T.: ' + result.et + ' mm.');
    } else {
      c.evapo.panelResult.style().set('shown', false);
      return;
    }
    
    c.evapo.dynamicPanel.add(c.evapo.lat);
    c.evapo.dynamicPanel.add(c.evapo.lon);
    c.evapo.dynamicPanel.add(c.evapo.et);
    c.evapo.dynamicPanel.add(c.evapo.fecha);
    // Mostrar el panel si hay resultados
    c.evapo.panelResult.style().set('shown', true);
    c.evapo.panelResult.style().set('position', 'bottom-left');
  });

};
