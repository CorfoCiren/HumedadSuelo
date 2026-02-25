
/*******************************************************************************
 * Leyenda *
 * 
 * En esta sección se almacenan todos las funciones relacionadas
 * con la leyenda. 
 * 
 * Guidelines: Los widgets se definen en el main y se actualizan aqui.
 ******************************************************************************/
//var sensores_puntos = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/sensores_corfo");


/*******************************************************************************
 * Funciones internas *
 ******************************************************************************/

// Handles drawing the legend when band selector changes.
function updateLegend(minValue, maxValue, c) {
      var date = c.selectBand.selector.getValue();
      // Rev. disponibilidad de valores antes de usarlos
      if (minValue !== null && maxValue !== null) {
        // Redondear los valores a un decimal
        var minValueRounded = minValue.toFixed(1);
        var maxValueRounded = maxValue.toFixed(1);
        var centerValueRounded = ((parseFloat(minValue) + parseFloat(maxValue)) / 2).toFixed(1);
        // Se utiliza la misma paleta para todas las capas renderizadas
        c.legend.title.setValue('Humedad de suelo ' + date + ' (%)');

        c.legend.colorbar.setParams({
          bbox: [0, 0, 1, 0.1],
          dimensions: '100x10',
          format: 'png',
          min:0,
          max:1,
          palette : ['ECF0FF', '8A4089', '00145D']
        });
        c.legend.leftLabel.setValue(minValueRounded);
        c.legend.centerLabel.setValue(centerValueRounded);
        c.legend.rightLabel.setValue(maxValueRounded);
        c.legend.panel.style().set('shown', true);

        
      } else {
        // Error: No se pudieron obtener los valores min y max
      }
    }
    

exports.updateLegend = updateLegend;    