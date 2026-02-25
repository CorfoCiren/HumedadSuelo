
// 1. Obtener las coordenadas
exports.borrarSeleccion = function(c,s, layerDummy, pointLayer) {
    c.selectYear.selector.setValue(null);
    c.selectBand.selector.setValue(null, false);
    c.sensores.selector.setValue(null, false);

    // 2. Ocultar las descargas
    c.downloadYear.title.setValue('');
    c.downloadYearlabels.forEach(function(label) {
        label.setValue('');
        label.setUrl('');
        label.style().set(s.disableLabel);
    });
    c.downloadBand.title.setValue('');
    c.downloadBand.label.setValue('');
    c.downloadBand.label.setUrl('');
    c.downloadBand.label.style().set(s.disableLabel);

    // 3. Restaurar el mapa al estado inicial (posición y zoom).
    c.map.setCenter({
        lon: ui.url.get('lon', -70.3), // Coordenadas iniciales
        lat: ui.url.get('lat', -32.9),
        zoom: ui.url.get('zoom', 8)
    });

    // 4. Limpiar capas adicionales en el mapa, excepto las iniciales.
    
    var layerExists = c.map.layers().some(function(layer) {
      return layer.get('name') === 'dummy';
    });
    if (!layerExists) {
  c.map.layers().insert(0, layerDummy); 
      
    }


    //c.map.layers().set(0, layerDummy); // Eliminar capa de humedad del suelo
    //c.map.layers().set(1, layer_region); // Restaurar capa de región
    c.map.layers().remove(pointLayer); // Eliminar el punto de clic, si existe

    // 5. Ocultar elementos adicionales (gráficos, tablas, leyendas).
    c.chart.chartPanel.style().set('shown', false);
    c.infoTable.style().set('shown', false);
    c.legend.panel.style().set('shown', false);
    c.sensores.panel.style().set('shown', false);
    
    // Limpiar el panel de sensores
    c.sensores.nom_sensor.setValue('Nombre sensor:');
    c.sensores.localidad.setValue('Localidad:');
    c.sensores.altitud.setValue('Altitud');
    c.sensores.lon.setValue('Lon:');
    c.sensores.lat.setValue('Lat:');
    
    

}


