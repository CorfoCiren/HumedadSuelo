
/*******************************************************************************
 * Modulos *
 * Importa todos los módulos desde otros scripts
 ******************************************************************************/
var Selectores = require('users/corfobbppciren2024/App_HS_User:Selectores_opt'); 
var ImgClass = require('users/corfobbppciren2024/App_HS_User:ColeccionImagenes_opt'); 
var chartClass = require('users/corfobbppciren2024/App_HS_User:Graficos_opt'); 
var Sensores = require('users/corfobbppciren2024/App_HS_User:Sensores_opt'); 
var Leyenda = require('users/corfobbppciren2024/App_HS_User:Leyenda_opt'); 
var Eva = require('users/corfobbppciren2024/App_HS_User:Evapotranspiracion_opt'); 
var init = require('users/corfobbppciren2024/App_HS_User:Inicio_opt'); 
var s = require('users/corfobbppciren2024/App_HS_User:Style_opt').styles; 
var c = {}; // Define a JSON object for storing UI components.
var region = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/Coquimbo");
var sensores_puntos = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/Sensores");
var viirs_et_m_ic = ee.ImageCollection('projects/usgs-ssebop/viirs_et_v6_monthly');

var listAssets = null; // Loaded lazily — available before first user interaction
var disp_year = init.dispYear();
var sensores_id = init.sensores_id; 

var currentYear = new Date().getFullYear();

// Lazy-loaded raster dictionary — only built on first sensor selection
var rasterDict = null;
var startYearRaster = 2025; // Año inicial donde comienzan los rasters
function getRasterDict() {
  if (rasterDict !== null) return rasterDict;
  if (!listAssets) listAssets = init.assetsListSync();
  rasterDict = {};
  for (var year = startYearRaster; year <= currentYear; year++) {
    rasterDict[year.toString()] = ImgClass.collection(year.toString(), '01/01/0101', [year.toString()], listAssets)[0];
  }
  return rasterDict;
}

var annos_evapo = init.evapoUpdate(viirs_et_m_ic);

// Pre-evaluate region bounds for download URLs and chart point-in-region checks
var cachedRegionGeoJSON = null;
region.geometry().bounds().evaluate(function(geom) {
  cachedRegionGeoJSON = geom;
  // Also set chart module's bounding box from the same evaluate call
  if (geom && geom.coordinates && geom.coordinates[0]) {
    var coords = geom.coordinates[0];
    if (chartClass.setRegionBBox) {
      chartClass.setRegionBBox({
        minLon: coords[0][0],
        minLat: coords[0][1],
        maxLon: coords[2][0],
        maxLat: coords[2][1]
      });
    }
  }
});

/*******************************************************************************
 * Componentes *
 * Un sección para definir los elementos que compondrán la app.
 * 
 ******************************************************************************/

// Licencias
c.licencias = {};
c.licencias.NOAA = ui.Label(
  'Los datos de temperaturas y anomalías son proporcionados por ' +
  'NOAA Climate Forecast System Version 2 (CFSv2). Fuente:  https://www.ncdc.noaa.gov/data-access/model-data/model-datasets/climate-forecast-system-version2-cfsv2'
);
c.licencias.GCOM = ui.Label(
  'Los datos de temperatura de superficie (LST) son proporcionados por ' 
  +'la Agencia Espacial Japonesa (JAXA) como parte de la misión GCOM-C.' +
  'Fuente: https://global.jaxa.jp/projects/sat/gcom/');


var panelLicencias = ui.Panel([
  c.licencias.NOAA,
  c.licencias.GCOM
]);



// Define a control panel for user input.
c.controlPanel = ui.Panel();

// Define a series of panel widgets to be used as horizontal dividers.
c.dividers = {};
c.dividers.divider1 = ui.Panel();
c.dividers.divider2 = ui.Panel();
c.dividers.divider3 = ui.Panel();
c.dividers.divider4 = ui.Panel();
c.dividers.divider5 = ui.Panel();
c.dividers.divider6 = ui.Panel();
// Define the main interactive map.
c.map = ui.Map();

// Define an app info widget group.
c.info = {};
c.info.titleLabel = ui.Label('Humedad de suelo');
c.info.aboutLabel = ui.Label(
  'Mapa de humedad del suelo con valores mostrados en porcentaje (%) desde 2015, con datos cada 1 km². '+
  'Para consultar la evolución temporal en cualquier ubicación, simplemente haga clic '+
  'sobre el punto de interés. La visibilidad de las capas puede ajustarse en el panel '+
  '"Layers" ubicado en la esquina superior derecha.');

c.info.websiteLabel = ui.Label({
  value: 'Publicación de referencia',
  targetUrl: 'https://www.nature.com/articles/s41597-023-02011-7'
});
c.info.panel = ui.Panel([
  c.info.titleLabel, c.info.aboutLabel
]);

//Define a download per year widget group
c.downloadYear = {};
c.downloadYear.title = ui.Label();
c.downloadYear.label1 = ui.Label('Enero');
c.downloadYear.label2 = ui.Label('Febrero');
c.downloadYear.label3 = ui.Label('Marzo');
c.downloadYear.label4 = ui.Label('Abril');
c.downloadYear.label5 = ui.Label('Mayo');
c.downloadYear.label6 = ui.Label('Junio');
c.downloadYear.label7 = ui.Label('Julio');
c.downloadYear.label8 = ui.Label('Agosto');
c.downloadYear.label9 = ui.Label('Septiembre');
c.downloadYear.label10 = ui.Label('Octubre');
c.downloadYear.label11 = ui.Label('Noviembre');
c.downloadYear.label12 = ui.Label('Diciembre');

//Lista donde se almacenara el valor min y max de la capa mostrada. 
//Se usa para actualizar la leyenda y renderizar la capa
c.minmax= [];

//posicion capas: [HS (dummy), REGION, SENSORES]


// dummy layer para no perder la posicion 0 en el arreglo de capas
var dummyImage = ee.Image(0).selfMask(); // Lightweight empty image
var layerDummy = ui.Map.Layer(dummyImage,{}, 'Base');
layerDummy.setShown(false); // Ocultar del control de capas
c.map.layers().set(0, layerDummy); //queda en posicion 0

//region
var styled_region = region.style(s.visParams_region);
var layer_region = ui.Map.Layer(styled_region, {}, 'Región de Coquimbo');
c.map.layers().add(layer_region); //queda en posicion 1


// Define a data year selector widget group.
var links;
c.selectYear = {};
c.selectYear.label = ui.Label('Seleccione un año para mostrar');
c.selectYear.selector = ui.Select({
  items: disp_year,
  placeholder: 'Seleccione un año',
  onChange: function(selectedYear) {
    if (!listAssets) listAssets = init.assetsListSync();
    
    // 1. Definir lista de días disponibles para el año
    //var days_agno = Selectores.getDateList(selectedYear, disp_year, listAssets);
    var month_ano = Selectores.getMonthList(selectedYear, disp_year, listAssets);
    //c.selectBand.selector.items().reset(days_agno);
    c.selectMonth.selector.items().reset(month_ano);
    
    // 2.Obtener colección de imágenes. Agregar a caché si no están
  if (!c.cachedLinks) {
      c.cachedLinks = {};
    }
  if (!(selectedYear in c.cachedLinks)) {
      c.cachedLinks[selectedYear] = ImgClass.collection(selectedYear, '01/01/0101', disp_year, listAssets)[0];
    }
    // 3. Limpiar interfaz
    Selectores.cleanScreen(c, selectedYear, s);
  }
  
});


c.selectMonth = {};
c.selectMonth.label = ui.Label('Seleccione un mes para mostrar');
c.selectMonth.selector = ui.Select({
  items: [], // Populated when a year is selected
  placeholder: 'Seleccione un mes',
  onChange: function(selectedMonth){
    if (!listAssets) listAssets = init.assetsListSync();
    
    var selectedYear = c.selectYear.selector.getValue();
    var days_agno = Selectores.getDayList(selectedYear, selectedMonth, disp_year, listAssets);
    c.selectBand.selector.items().reset(days_agno);
    
    Selectores.cleanScreen(c, selectedYear, s);
    
  }
});



c.selectMonth.panel= ui.Panel([c.selectMonth.label, c.selectMonth.selector]);





c.selectDay = {};
c.selectDay.label = ui.Label('Seleccione el día a visualizar');
c.selectDay.warning = ui.Label('', {
  color: 'red',
  fontSize: '12px'
});
c.selectDay.input = ui.Textbox({
  placeholder: 'DD/MM/AAAA',
  onChange: function(date){
    if (!listAssets) listAssets = init.assetsListSync();
    if(date &&
    date.length === 10 && 
    date.split('/')[0].length === 2 && 
    date.split('/')[1].length === 2 && 
    date.split('/')[2].length === 4){
      
      var splittedDate = date.split('/');
      var year = splittedDate[2];
      // Client-side date validation - no server call needed
      var dateList = Selectores.getDateList(year, disp_year, listAssets);
      var isInList = dateList.indexOf(date) !== -1;
      
        if(isInList && year >= disp_year[0] && year <= disp_year[disp_year.length-1]){
          // 1.Obtener colección de imágenes. Agregar a caché si no están
          if (!c.cachedLinks) {
              c.cachedLinks = {};
            }
          if (!(year in c.cachedLinks)) {
              c.cachedLinks[year] = ImgClass.collection(year, '01/01/0101', disp_year, listAssets)[0];
            }
            
            // 2. Limpiar interfaz
            Selectores.cleanScreen(c, year, s);
            c.selectDay.warning.setValue('');
            
          
          c.downloadBand.panel.style().set('shown', false);
    
            raster = ImgClass.collection(1, date, disp_year, listAssets)[1];
            
            var activeLayers = c.map.layers();
            var numLayers = activeLayers.length();
          // Recorrer las capas y buscar la capa con el nombre dado
          /*
          removeLayerByName('Evapotranspiración');
          c.legend2.panel.style().set('shown', false);
          c.evapo.anselector.setValue(null);
          c.evapo.messelector.setValue(null);
          */
            // Verificar si se obtuvo un raster válido
            if (raster !== null) {
              
              updateMinMax(raster, date, function(minMaxResult) {
                try{
                  // Utilizar los valores min y max directamente
                  var clippedRaster = raster.clip(region);
                  var layer = ui.Map.Layer(clippedRaster, {
                    min: minMaxResult.min,
                    max: minMaxResult.max,
                    palette: ['ECF0FF', '8A4089', '00145D']
                  }, 'Humedad de Suelo');
                  
                  c.map.layers().set(0, layer); //se agrega a la tercera posicion
                // setear evapotranspiracion a no visible si existe
          
                Leyenda.updateLegend(minMaxResult.min, minMaxResult.max, c);
          
                c.selectBand.downloadButon.setDisabled(false);
                if(c.infoTable !== undefined){
                  //borrar la tabla si es que existe
                  c.infoTable.style().set('shown', false);
                }
                
                }catch (err) {
                  print('Error:', err);
                }
              });
            
            } else {
              Selectores.cleanScreen(c, year, s);
              c.selectDay.warning.setValue('No se encontró un raster para la fecha seleccionada.');
            }
          

          }else{
            Selectores.cleanScreen(c, year, s);
            c.selectDay.warning.setValue('Introduzca una fecha válida');
          }
      
      
    }else{
      if(date && date!==''){
        Selectores.cleanScreen(c, year, s);
        c.selectDay.warning.setValue('Respetar el formato DD/MM/AAAA');
      }else{
        Selectores.cleanScreen(c, year, s);
        c.selectDay.warning.setValue('');
      }
    }
  }
});



c.selectYear.panel = ui.Panel([c.selectYear.label, c.selectYear.selector]);
c.selectYear.downloadButon = ui.Button({
  label: 'Año completo',
  disabled: true,
   onClick: function() {
    var selectedYear = c.selectYear.selector.getValue(); // Obtener el valor seleccionado
    links = c.cachedLinks[selectedYear];
    Selectores.onChangeDownloadYear(c, links, selectedYear, s);
    c.downloadInfoLabel.style().set('shown', true);
    c.downloadHSTitle.style().set('shown', true);
   }});

c.downloadYear.panel = ui.Panel([c.downloadYear.title, 
                                  c.downloadYear.label1,
                                  c.downloadYear.label2,
                                  c.downloadYear.label3,
                                  c.downloadYear.label4,
                                  c.downloadYear.label5,
                                  c.downloadYear.label6,
                                  c.downloadYear.label7,
                                  c.downloadYear.label8,
                                  c.downloadYear.label9,
                                  c.downloadYear.label10,
                                  c.downloadYear.label11,
                                  c.downloadYear.label12]);

// Define a download per day widget group
c.downloadBand = {}; //Etiqueta de descarga que se actualizará dinámicamente
c.downloadBand.title = ui.Label('');
c.downloadBand.label = ui.Label('');

var raster; //variable para almacenar el raster del dia

// Define a data band selector widget group.
c.selectBand = {};
c.selectBand.label = ui.Label('Seleccione el día a visualizar');
c.selectBand.selector = ui.Select({
  items: [], // Populated when a month is selected
  placeholder: 'Seleccione una fecha',
  onChange: function(selectedDate) {
    if (!listAssets) listAssets = init.assetsListSync();
    c.downloadBand.panel.style().set('shown', false);
    
    raster = ImgClass.collection(1,selectedDate, disp_year, listAssets)[1];
    
    var activeLayers = c.map.layers();
    var numLayers = activeLayers.length();
  // Recorrer las capas y buscar la capa con el nombre dado
  removeLayerByName('Evapotranspiración');
  c.legend2.panel.style().set('shown', false);
  c.evapo.anselector.setValue(null);
  c.evapo.messelector.setValue(null);
  
    // Verificar si se obtuvo un raster válido
    if (raster !== null) {
      
      updateMinMax(raster, selectedDate, function(minMaxResult) {
        try{
          // Utilizar los valores min y max directamente
          var clippedRaster = raster.clip(region);
          var layer = ui.Map.Layer(clippedRaster, {
            min: minMaxResult.min,
            max: minMaxResult.max,
            palette: ['ECF0FF', '8A4089', '00145D']
          }, 'Humedad de Suelo');
          
          c.map.layers().set(0, layer); //se agrega a la tercera posicion
        // setear evapotranspiracion a no visible si existe

        Leyenda.updateLegend(minMaxResult.min, minMaxResult.max, c);

        c.selectBand.downloadButon.setDisabled(false);
        if(c.infoTable !== undefined){
          //borrar la tabla si es que existe
          c.infoTable.style().set('shown', false);
        }
        
        }catch (err) {
          print('Error:', err);
        }
      });
    
    } else {
      print('No se encontró un raster para la fecha seleccionada.');
    }
    
    
  }
});

c.selectBand.downloadButon = ui.Button({label:'Fecha seleccionada', 
  disabled: true,
   onClick: function() {
    if (!cachedRegionGeoJSON) {
      print('Región aún cargando, intente de nuevo.');
      return;
    }
    // Show panel immediately with loading state
    c.downloadBand.panel.style().set('shown', true);
    c.downloadBand.title.setValue('Descarga día seleccionado');
    c.downloadBand.title.style().set(s.widgetTitle);
    c.downloadBand.label.setValue('Generando enlace...');
    c.downloadBand.label.setUrl('');
    c.downloadBand.label.style().set(s.ableLabel);
    c.downloadInfoLabel.style().set('shown', true);
    c.downloadHSTitle.style().set('shown', true);
    
    // Async URL generation — callback form for broad GEE compatibility
    raster.getDownloadURL({
      name: 'HS_dia',
      scale: 1000,
      crs: 'EPSG:4326',
      region: cachedRegionGeoJSON
    }, function(downloadUrl, error) {
      if (downloadUrl) {
        c.downloadBand.label.setValue('Descarga Imagen día');
        c.downloadBand.label.setUrl(downloadUrl);
      } else {
        c.downloadBand.label.setValue('Error al generar enlace');
        if (error) print('Download error:', error);
      }
    });
   }});



c.downloadTitle = ui.Label('Descargas');

c.downloadInfoLabel = ui.Label(
  'Los enlaces para descargar los archivos se encuentran al final de este panel, por favor desplácese hacia abajo.'
);
c.downloadInfoLabel.style().set('shown', false);

c.downloadHSTitle = ui.Label('Descarga Humedad de suelo');
c.downloadHSTitle.style().set('shown', false);

c.downloadHSPanel  = ui.Panel({
  
  widgets: [c.selectYear.downloadButon,c.selectBand.downloadButon],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    stretch: 'horizontal',
    margin: '5px'
  }
});

c.downloadBand.panel = ui.Panel([c.downloadBand.title, c.downloadBand.label ]);

c.downloadBand.panel.style().set('shown', false);
c.downloadYear.panel.style().set('shown', false);

c.mainDownload = ui.Panel([c.downloadBand.panel, c.downloadYear.panel]);



c.selectBand.panel = ui.Panel([c.selectBand.label, c.selectBand.selector]);

// Define a legend widget group.

//Leyenda 1
c.legend = {};
c.legend.title = ui.Label();
c.legend.colorbar = ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legend.leftLabel = ui.Label('[min]');
c.legend.centerLabel = ui.Label();
c.legend.rightLabel = ui.Label('[max]');
c.legend.labelPanel = ui.Panel({
  widgets: [
    c.legend.leftLabel,
    c.legend.centerLabel,
    c.legend.rightLabel,
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
c.legend.panel = ui.Panel([
  c.legend.title,
  c.legend.colorbar,
  c.legend.labelPanel
]);
//Leyenda 2

c.legend2 = {};
c.legend2.title = ui.Label();
c.legend2.colorbar = ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legend2.leftLabel = ui.Label('[min]');
c.legend2.centerLabel = ui.Label();
c.legend2.rightLabel = ui.Label('[max]');
c.legend2.labelPanel = ui.Panel({
  widgets: [
    c.legend2.leftLabel,
    c.legend2.centerLabel,
    c.legend2.rightLabel,
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
c.legend2.panel = ui.Panel([
  c.legend2.title,
  c.legend2.colorbar,
  c.legend2.labelPanel
]);

// Widgets del mapa

//Define a panel for informative table
c.infoTable = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    shown: false  // Esconder el panel inicialmente
  }}); //panel con información onClick 

// Crear un botón de cerrar
var closeButton = ui.Button({
  label : 'Cerrar tabla',
  onClick: function() {
    c.infoTable.style().set('shown', false);
  }
});


// Crear las filas con etiquetas vacías que se actualizarán más tarde
var latRow = createRow('Latitud', '', 'white');
var lonRow = createRow('Longitud', '', '#D3D3D3');
var humRow = createRow('Humedad (%)', '', 'white');
var dateRow = createRow('Fecha', '', '#D3D3D3');

// Panel para mostrar gráficos
c.chart = {};
c.chart.shownButton = ui.Button({ 
  label: 'Ocultar gráfico', 
  onClick: function() { 
    chartClass.showHideChart(c); 
  } });


c.chart.container = ui.Panel();  
c.chart.chartPanel = ui.Panel([c.chart.shownButton, c.chart.container]);


//Punto para funciones onClick
var pointLayer = null;
var pointLayer2 = null;


//Sensores
c.sensores = {};
c.sensores.label = ui.Label('Seleccione el sensor a visualizar');
c.sensores.aboutLabel = ui.Label(
  'Los sensores fueron utilizados para calibrar el modelo. Cuentan ' +
  'con mediciones desde marzo de 2024 hasta junio de 2024.');

c.sensores.cerrar = ui.Button({
  label : 'Cerrar tabla',
  onClick: function() {
    c.sensores.panel.style().set('shown', false);
  }
});
c.sensores.nom_sensor = ui.Label('Nombre sensor:');
c.sensores.comuna = ui.Label('Comuna:');
c.sensores.lon = ui.Label('Lon:');
c.sensores.lat= ui.Label('Lat:');
c.sensores.panel = ui.Panel([
  c.sensores.cerrar,
  c.sensores.nom_sensor, 
  c.sensores.comuna,
  c.sensores.lon,
  c.sensores.lat]);

//var listSensores = Sensores.nom_sensores.keys().getInfo();

var listSensores = Object.keys(sensores_id).map(function(id) {
  return {label: sensores_id[id], value: parseInt(id,10)};
});


c.sensores.selector = ui.Select({
  items: listSensores,
  placeholder: 'Seleccione un sensor',
  onChange: function(idSeleccionado) {
    

  Sensores.zoomSensor(idSeleccionado, sensores_puntos,c.map);

  Sensores.updateTooltip(idSeleccionado, sensores_puntos, c.sensores.panel);

  // Llamar a serieSensor con un callback que maneje el resultado
  try{
  Sensores.serieSensor(idSeleccionado, sensores_puntos, function(listGeometry) {
    if (listGeometry) {
      chartClass.createChartSensor2(c, idSeleccionado, listGeometry, region, getRasterDict());
    }
  })}catch(e){
    // Error al crear el gráfico del sensor
  }
  }
});


//Evapotranspiracion
          
c.evapo = {};
c.evapo.label = ui.Label('Evapotranspiración mensual');
c.evapo.aboutLabel = ui.Label(
  'Imagen de evapotranspiración mensual provista por USGS. https://gee-community-catalog.org/projects/usgs_viirs/?h=evapo');
c.evapo.anselector = ui.Select({
    items: annos_evapo,
    placeholder: 'Año',
    onChange: function(selectedValue) { 
    c.evapo.buscar.setDisabled(false); 
  }
  });

c.evapo.messelector = ui.Select({
    items: ['01', '02', '03', '04', '05', '06', '07',
    '08', '09', '10', '11', '12'],
    placeholder: 'Mes',
    onChange: function(selectedValue) { 
    c.evapo.buscar.setDisabled(false); 
  }

  });
  
c.evapo.panel = ui.Panel({
  widgets: [c.evapo.anselector, c.evapo.messelector],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    stretch: 'horizontal',
    margin: '5px'
  }
});
c.evapo.buscar = ui.Button({
  label: 'Buscar imagen',
  disabled: true,
  onClick: function() {
    var anno = c.evapo.anselector.getValue();
    var mes = c.evapo.messelector.getValue();
    //agrego la capa
    Eva.reqEva(anno, mes, c, region);
    c.evapo.buscar.setDisabled(true);
    if((anno!==null) && (mes !==null)){
    c.evapo.eliminar.setDisabled(false);}
  }
});

c.evapo.eliminar = ui.Button({
  label: 'Eliminar imagen',
  disabled: true,
  onClick: function() {
    c.evapo.eliminar.setDisabled(true);
    c.evapo.messelector.setValue(null);
    c.evapo.anselector.setValue(null);
    c.legend2.panel.style().set('shown', false);
    c.evapo.panelResult.style().set('shown', false);
    removeLayerByName("Evapotranspiración");
    if(pointLayer2){
      c.map.layers().remove(pointLayer2);
    }
  }
});

c.evapo.warning = ui.Label('', {
  color: 'red',
  fontSize: '12px'
});

c.evapo.cerrar = ui.Button({
  label : 'Cerrar tabla',
  style: {stretch: 'horizontal', fontSize: '12px', padding: '1px'},
  onClick: function() {
    c.evapo.panelResult.style().set('shown', false);
  }});
  
c.evapo.buttonPanel = ui.Panel({
  widgets: [c.evapo.cerrar],
});

c.evapo.dynamicPanel= ui.Panel({
  // Panel para almacenar la informacion a presentar
  widgets: [],
});

c.evapo.lat = ui.Label('');
c.evapo.lon = ui.Label('');
c.evapo.et = ui.Label('');
c.evapo.fecha = ui.Label('');

c.evapo.panelResult = ui.Panel({
  widgets: [c.evapo.buttonPanel, c.evapo.dynamicPanel]});
c.evapo.panelResult.style().set('shown', false);

//Boton "Borrar selección"
c.resetButton = ui.Button({
  label : 'Borrar Selección',
  onClick: function() {
    borrarSeleccion();
  }});

// Reset view button
c.resetViewButton = ui.Button({
  label : 'Resetear vista',
  onClick: function(){
    c.map.setCenter({
      lon: ui.url.get('lon', -70.8),
      lat: ui.url.get('lat', -29.8),
      zoom: ui.url.get('zoom', 7)
    });
  }
});
  
/*******************************************************************************
 * Composicion *
 * 
 * Una sección para agregar los elementos a nuestra aplicación  
 * 
 ******************************************************************************/

c.controlPanel.add(c.info.panel);
c.controlPanel.add(c.dividers.divider1);
c.controlPanel.add(c.selectYear.panel);
c.controlPanel.add(c.selectMonth.panel)
c.controlPanel.add(c.selectBand.panel);
c.controlPanel.add(c.downloadTitle);
c.controlPanel.add(c.downloadInfoLabel);
c.controlPanel.add(c.downloadHSPanel);
c.controlPanel.add(c.dividers.divider2);
c.controlPanel.add(c.sensores.label);
c.controlPanel.add(c.sensores.aboutLabel);
c.controlPanel.add(c.sensores.selector);
c.controlPanel.add(c.dividers.divider3);
c.controlPanel.add(c.evapo.label);
c.controlPanel.add(c.evapo.aboutLabel);
c.controlPanel.add(c.evapo.panel);
c.controlPanel.add(c.evapo.buscar);
c.controlPanel.add(c.evapo.eliminar);
c.controlPanel.add(c.evapo.warning);

c.controlPanel.add(c.dividers.divider4);
c.controlPanel.add(c.resetButton);
c.controlPanel.add(c.dividers.divider6);
c.controlPanel.add(c.downloadHSTitle);
c.controlPanel.add(c.mainDownload);
c.controlPanel.add(c.dividers.divider5);

c.controlPanel.add(panelLicencias);

c.infoTable.add(closeButton);
c.infoTable.add(latRow);
c.infoTable.add(lonRow);
c.infoTable.add(humRow);
c.infoTable.add(dateRow);


c.map.add(c.legend.panel);
c.map.add(c.legend2.panel);
c.map.add(c.chart.chartPanel);
c.map.add(c.infoTable);
c.map.add(c.evapo.panelResult);
c.map.add(c.resetViewButton);



//capa sensores

var senVis = sensores_puntos.style({
  color: '1e90ff',
  width: 2,
  fillColor: 'ff475788',
  pointSize: 7,
  pointShape: 'circle'
});

var layerSensor = ui.Map.Layer(sensores_puntos,senVis, 'Puntos sensores');
c.map.addLayer(senVis, null, 'Puntos sensores');
c.map.add(c.sensores.panel);

/*******************************************************************************
 * Styling *
 * 
 * Una sección para definir los estilos de los componentes. 
 * La mayoría de los estilos se definen en el módulo "Style" y son importados 
 * con el nombre de variable "s".
 * Styles are set BEFORE ui.root.add() so widgets render correctly on first paint.
 * 
 ******************************************************************************/

  c.licencias.NOAA.style().set(s.aboutText);
  c.licencias.GCOM.style().set(s.aboutText);


           
c.info.titleLabel.style().set({
  fontSize: '20px',
  fontWeight: 'bold'
});
c.info.titleLabel.style().set(s.bigTopMargin);
c.info.aboutLabel.style().set(s.aboutText);
c.info.websiteLabel.style().set(s.aboutText);
c.info.websiteLabel.style().set(s.noTopMargin);

c.selectYear.selector.style().set(s.stretchHorizontal);
c.selectYear.label.style().set(s.widgetTitle);

c.selectMonth.selector.style().set(s.stretchHorizontal);
c.selectMonth.label.style().set(s.widgetTitle);

c.selectBand.selector.style().set(s.stretchHorizontal);
c.selectBand.label.style().set(s.widgetTitle);
c.selectDay.label.style().set(s.widgetTitle);
c.downloadTitle.style().set(s.widgetTitle);
c.downloadInfoLabel.style().set(s.aboutText);
c.downloadHSTitle.style().set(s.widgetTitle);
c.downloadHSPanel.style().set(s.stretchHorizontal);
c.downloadYear.label1.style().set(s.disableLabel);
c.downloadYear.label2.style().set(s.disableLabel);
c.downloadYear.label3.style().set(s.disableLabel);
c.downloadYear.label4.style().set(s.disableLabel);
c.downloadYear.label5.style().set(s.disableLabel);
c.downloadYear.label6.style().set(s.disableLabel);
c.downloadYear.label7.style().set(s.disableLabel);
c.downloadYear.label8.style().set(s.disableLabel);
c.downloadYear.label9.style().set(s.disableLabel);
c.downloadYear.label10.style().set(s.disableLabel);
c.downloadYear.label11.style().set(s.disableLabel);
c.downloadYear.label12.style().set(s.disableLabel);

c.controlPanel.style().set({
  width: '275px',
  padding: '0px'
});

c.map.style().set({
  cursor: 'crosshair'
});

c.map.setOptions('ROADMAP');

c.chart.chartPanel.style().set({
  position: 'bottom-right',
  shown: false
});
c.chart.chartPanel.style().set(s.opacityWhiteMed);

c.chart.shownButton.style().set({
  margin: '0px 0px',
});


//estilo leyenda1
c.legend.title.style().set(s.legendTitle);
c.legend.title.style().set(s.opacityWhiteNone);
c.legend.colorbar.style().set(s.legendColorbar);
c.legend.leftLabel.style().set(s.legendLabel);
c.legend.leftLabel.style().set(s.opacityWhiteNone);
c.legend.centerLabel.style().set(s.legendCenterLabel);
c.legend.centerLabel.style().set(s.opacityWhiteNone);
c.legend.rightLabel.style().set(s.legendLabel);
c.legend.rightLabel.style().set(s.opacityWhiteNone);
c.legend.panel.style().set(s.legendPanel);
c.legend.panel.style().set(s.opacityWhiteMed);
c.legend.labelPanel.style().set(s.opacityWhiteNone);
//estilo leyenda2
c.legend2.title.style().set(s.legendTitle);
c.legend2.title.style().set(s.opacityWhiteNone);
c.legend2.colorbar.style().set(s.legendColorbar);
c.legend2.leftLabel.style().set(s.legendLabel);
c.legend2.leftLabel.style().set(s.opacityWhiteNone);
c.legend2.centerLabel.style().set(s.legendCenterLabel);
c.legend2.centerLabel.style().set(s.opacityWhiteNone);
c.legend2.rightLabel.style().set(s.legendLabel);
c.legend2.rightLabel.style().set(s.opacityWhiteNone);
c.legend2.panel.style().set(s.legendPanel);
c.legend2.panel.style().set(s.opacityWhiteMed);
c.legend2.labelPanel.style().set(s.opacityWhiteNone);

c.infoTable.style().set(s.opacityWhiteMed);
closeButton.style().set(s.buttonStyle);

c.sensores.label.style().set(s.widgetTitle);
c.sensores.aboutLabel.style().set(s.aboutText);
c.sensores.selector.style().set(s.stretchHorizontal);
c.evapo.label.style().set(s.widgetTitle);
c.evapo.aboutLabel.style().set(s.aboutText);
c.evapo.anselector.style().set(s.stretchHorizontal);
c.evapo.messelector.style().set(s.stretchHorizontal);
c.evapo.panel.style().set(s.stretchHorizontal);
c.evapo.buscar.style().set(s.stretchHorizontal);
c.evapo.eliminar.style().set(s.stretchHorizontal);
c.sensores.cerrar.style().set(s.buttonStyle);
c.sensores.panel.style().set(s.infoTable);
c.sensores.panel.style().set(s.opacityWhiteMed);
c.sensores.panel.style().set({position: 'top-right'});
c.sensores.nom_sensor.style().set(s.labelTabla1);
c.sensores.comuna.style().set(s.labelTabla2);
c.sensores.lon.style().set(s.labelTabla1);
c.sensores.lat.style().set(s.labelTabla2);

c.evapo.lat.style().set(s.labelTabla1);
c.evapo.lon.style().set(s.labelTabla2);
c.evapo.et.style().set(s.labelTabla1);
c.evapo.fecha.style().set(s.labelTabla2);

c.resetButton.style().set(s.stretchHorizontal);

c.resetViewButton.style().set(s.buttonStyle);

// Loop para dividers.
Object.keys(c.dividers).forEach(function(key) {
  c.dividers[key].style().set(s.divider);
});

// Mount UI — all styles already set, so only one render pass
ui.root.clear();
ui.root.add(c.controlPanel);
ui.root.add(c.map);

/*******************************************************************************
 * Comportamiento *
 * 
 * Una sección para definir el comportamiento de los elementos UI.
 * Estas funciones están relacionadas con capas presentes en el mapa, por lo que
 * no están definidas en los módulos. 
 ******************************************************************************/
function borrarSeleccion(){
  var actualLayers = c.map.layers();
  var anno =c.selectYear.selector.getValue();
  var dia = c.selectBand.selector.getValue();
  var sensores = c.sensores.selector.getValue();
  var et = checkLayerStatus('Evapotranspiración');
  var date = c.selectBand.selector.getValue();
  
  //1. Recentrar
  c.map.centerObject(region, 7);

 //1. Capas humedad de suelo
 
 // 1.1 Selector año
 if(anno!== null){
  c.selectYear.selector.setValue(null);
  c.chart.container.style().set({shown: false});
  c.downloadYear.panel.style().set('shown', false);
  c.downloadInfoLabel.style().set('shown', false);
  c.downloadHSTitle.style().set('shown', false);
 }
 if(date !== null){
  //c.selectDay.input.setValue(null);
  c.chart.container.style().set({shown: false});
  c.downloadYear.panel.style().set('shown', false);
  c.downloadBand.panel.style().set('shown', false);
  c.map.layers().set(0, layerDummy);
  c.selectBand.downloadButon.setDisabled(true);
  c.selectYear.downloadButon.setDisabled(true);
  c.downloadInfoLabel.style().set('shown', false);
  c.downloadHSTitle.style().set('shown', false);
 }
 
 //1.2 Selector Día
 if(dia!== null){
  c.selectBand.selector.setValue(null);
  try{
    c.map.layers().set(0, layerDummy); //queda en posicion 0
  }catch(e){
    // Error al limpiar la capa
  }
  c.downloadBand.panel.style().set('shown', false);
  c.downloadInfoLabel.style().set('shown', false);
  c.downloadHSTitle.style().set('shown', false);
 }
 // 2. Puntos rojos
  if (pointLayer) {
      actualLayers.remove(pointLayer); // Remove the previous point layer
  }
  if (pointLayer2) {
      actualLayers.remove(pointLayer2); // Remove the previous point layer
  }
  
  //3. Sensores 
  if(sensores){
      c.sensores.panel.style().set({shown: false});
      c.chart.chartPanel.style().set('shown', false);
      c.sensores.selector.setValue(null);
  }
  
  //4. Evapotranspiracion
  if(et[0]){
    c.evapo.anselector.setValue(null);
    c.evapo.messelector.setValue(null);
    c.evapo.buscar.setDisabled(true);
    c.evapo.eliminar.setDisabled(true);
    c.legend2.panel.style().set('shown', false);
    c.evapo.panelResult.style().set('shown', false);
    removeLayerByName("Evapotranspiración");
    
  }

}

function removeLayerByName(layerName) {
  // Obtener todas las capas añadidas al mapa
  var layers = c.map.layers();

  // Iterar sobre las capas para encontrar la capa con el nombre dado
  for (var i = 0; i < layers.length(); i++) {
    var layer = layers.get(i);
    
    // Si el nombre de la capa coincide con el que buscamos
    if (layer.getName() === layerName) {
      // Eliminar la capa del mapa
      c.map.remove(layer);
    return;  // Salir de la función una vez eliminada la capa
    }
  }
  }

//crear fila para panel de informacion 
function createRow(label, value, bgColor) {
  return ui.Panel({
    widgets: [
      ui.Label(label, {padding: '1px', backgroundColor: bgColor || 'white'}),
      ui.Label(value, {padding: '1px', backgroundColor: bgColor || 'white'})
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      backgroundColor: bgColor || 'white',
      border: '1px solid black',
      stretch: 'horizontal',
      fontSize: '4px',
      height: '35px'
    }
  });
}

function updateMinMax(layer, date, callback) {
  var minMaxDict = ImgClass.MinMaxBand(layer, date);

  // Async evaluation - non-blocking UI
  minMaxDict.evaluate(function(result) {
    if (result) {
      callback(result);
    } else {
      print('Error: No se pudieron obtener los valores min y max.');
    }
  });
}


function checkLayerStatus(layerName) {
  var layers = c.map.layers();
  var isLayerAdded = false;
  var isLayerVisible = false;
  var eeObject = null;

  for (var i = 0; i < layers.length(); i++) {
    var layer = layers.get(i);
    if (layer.getName() === layerName) {
      isLayerAdded = true;           // La capa está agregada
      isLayerVisible = layer.getShown();  // Verificar si está visible
      if (isLayerVisible) {
        eeObject = layer.getEeObject();// Asignar la capa si es visible
      }
      break;  // Salir del bucle al encontrar la capa
    }
  }

  // Retornar un arreglo con los resultados [bool, bool, Object]
  return [isLayerAdded, isLayerVisible, eeObject];
}

function handleMouseMove(coords) {
  Sensores.updateTooltip(coords, sensores_puntos, c.sensores.panel);
}

// Capturar eventos del ratón en la capa
c.map.onClick(handleMouseMove);

c.map.onClick(function(coords) {
  var Time1 = new Date().getTime();
  var clickedPoint = ee.Geometry.Point(coords.lon, coords.lat);
  
  // Eliminar todas las capas "Punto seleccionado" existentes
  var layers = c.map.layers();
  var layersToRemove = [];
  for (var i = 0; i < layers.length(); i++) {
    var layer = layers.get(i);
    if (layer.getName() === 'Punto seleccionado') {
      layersToRemove.push(layer);
    }
  }
  // Remover todas las capas encontradas
  for (var j = 0; j < layersToRemove.length; j++) {
    c.map.remove(layersToRemove[j]);
  }
  
  // Resetear las variables de punto
  pointLayer = null;
  pointLayer2 = null;
  
  //esta funcion solo se debe activar si hay un año cargado
  if(checkLayerStatus('Humedad de Suelo')[0]) {
  var selectedYear = c.selectYear.selector.getValue();
  
  // Convertir coords de objeto a array [lon, lat] para la función Click
  var coordsArray = [coords.lon, coords.lat];
  var valueDict = chartClass.Click(c.selectYear.selector.getValue(), coordsArray, region, c.cachedLinks[selectedYear]);
  c.chart.container.style().set({shown: true});
  chartClass.createChartOUT(c,valueDict);
  
  //if(c.selectBand.selector.getValue()!== null){
  chartClass.tablaInfo(coords, {map: c.map}, region, valueDict, c.selectBand.selector.getValue(), function(values) {
    if (values) {
     
      // Actualizar las etiquetas con los valores retornados
      latRow.widgets().get(1).setValue(values.lat);
      lonRow.widgets().get(1).setValue(values.lon);
      humRow.widgets().get(1).setValue(values.hs);
      dateRow.widgets().get(1).setValue(values.newDate);
      
      // Mostrar el panel
      c.infoTable.style().set('shown', true);
      c.infoTable.style().set('position', 'bottom-left');
    } else {
      // Si no hay datos para las coordenadas clickeadas, esconder el panel
      c.infoTable.style().set('shown', false);
    }
  });
  
  }

  //si evapotranspiracion esta visible se debe hacer visible la caja con las estadisticas
  var resultEva = checkLayerStatus('Evapotranspiración');
  if(resultEva[1]){
    var an = c.evapo.anselector.getValue();
    var mes = c.evapo.messelector.getValue();
    var evapoDate = an.toString() + '/'+ mes.toString();
    Eva.actualizarEvapo(clickedPoint, resultEva[2],evapoDate ,c);
  }
  
  // Agregar un solo punto al final si alguna de las condiciones se cumplió
  var hasHumedadSuelo = checkLayerStatus('Humedad de Suelo')[0];
  if (hasHumedadSuelo || resultEva[1]) {
    pointLayer = ui.Map.Layer(clickedPoint, {color: 'red'}, 'Punto seleccionado');
    c.map.layers().add(pointLayer);
  }
  
  }
  
);

/*******************************************************************************
 * Inicialización *
 * 
 ******************************************************************************/

// Set model state based on URL parameters or default values.
c.map.centerObject(region, 7);
