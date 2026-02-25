var init = require('users/corfobbppciren2024/Dashboard_HS:Init');
var chartUtils = require('users/corfobbppciren2024/Dashboard_HS:ChartSubBassin');
var s = require('users/corfobbppciren2024/Dashboard_HS:Style').styles;

var c = {};
var matrixSubBasinTransposed = init.matrixSubBasinTransposed;
var sub_nameCode = init.sub_nameCode;
var listYears = init.listYears;

var title = ui.Label({
  value: 'Dashboard humedad de suelo',
  style: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '16px 0 8px 16px',
    color: '#333'
  }
});


c.selectedLayer = null;


// 1) Elimina todo lo que hay en la interfaz predeterminada.

ui.root.widgets().reset([]);

// 2) Crea un mapa independiente y oculta sus controles si quieres un look simple.
c.map = ui.Map();
c.map.setControlVisibility({ all: false });            // Oculta zoom, escala, etc.
c.map.centerObject(matrixSubBasinTransposed); // Centro inicial

// 3) Ajusta el tamaño del mapa con style() o desde el panel contenedor.
c.map.style().set({
  width:  '300px',
  height: '300px',
  border: '1px solid #ccc',
  margin: '8px'
});

// 4) Panel vaciío
c.chartPanel = ui.Panel({
  style: {
    stretch: 'both',        // Ocupe todo el alto
    padding: '8px'
  }
});

// 5) Organiza todo en un horizontal flow: canvas | c.map
c.mainPanel = ui.Panel({
  widgets: [c.chartPanel, c.map],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {stretch: 'both'}  // Hace que el panel se adapte al tamaño de la ventana
});

// 6) Coloca el nuevo layout en la raíz.
ui.root.add(c.mainPanel);


var styledFC = matrixSubBasinTransposed.style(s.subBasin);
var layer = ui.Map.Layer(styledFC, {}, 'subBasin');
c.map.layers().add(layer);



// Subcuencas Graphs
c.subBasin = {};
c.subBasin.globalPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical', true)});
c.subBasin.selectorPanel = ui.Panel({layout: ui.Panel.Layout.flow('horizontal', false)});
c.subBasin.globalPanel.add(title);
c.subBasin.globalPanel.add(c.subBasin.selectorPanel);
c.chartPanel.add(c.subBasin.globalPanel);

var subBasinValues = Object.keys(sub_nameCode);

// Shared chart-update helper – avoids duplicated logic
function updateChart() {
  var subcuenca = c.subBasin.selectSubcuenca.getValue();
  var year = c.subBasin.selectYear.getValue();
  if (!year || !subcuenca) return;
  if (c.subBasin.chart) {
    c.subBasin.globalPanel.remove(c.subBasin.chart);
  }
  var codeSubcuenca = sub_nameCode[subcuenca];
  c.subBasin.chart = chartUtils.createChartSubcuencasSoilMoisture(
    matrixSubBasinTransposed, codeSubcuenca, year);
  c.subBasin.globalPanel.add(c.subBasin.chart);
  c.subBasin.chart.style().set(s.chart);
}

c.subBasin.selectSubcuenca = ui.Select({
  items: subBasinValues.sort(),
  placeholder: 'Selecione una subcuenca',
  onChange: function(subcuenca){
    updateChart();
    if(c.selectedLayer !== null){
      c.map.remove(c.selectedLayer);
    }
    var selectedLayer = matrixSubBasinTransposed
      .filter(ee.Filter.eq('NOM_SUBC', subcuenca)).first();
    var styledArea = selectedLayer.geometry();
    c.selectedLayer = ui.Map.Layer(styledArea, {}, 'selectedSubBasin');
    c.map.add(c.selectedLayer);
    c.map.centerObject(styledArea);
  }
});

c.subBasin.selectYear = ui.Select({
  items: ['Todos los años'].concat(listYears),
  placeholder: 'Selecione un año',
  onChange: function(){ updateChart(); }
});

c.subBasin.selectorPanel.add(c.subBasin.selectSubcuenca);
c.subBasin.selectorPanel.add(c.subBasin.selectYear);

c.subBasin.selectSubcuenca.setValue('Región de Coquimbo', true);  
c.subBasin.selectYear.setValue('Todos los años', true);

//Handle on click events on the map
c.map.onClick(function(coords) {
  
    
    var clickedPoint = ee.Geometry.Point(coords.lon, coords.lat);
    
    var selectedLayer = matrixSubBasinTransposed.filterBounds(clickedPoint).first();
    
    selectedLayer.get('NOM_SUBC').evaluate(function(name) {
      if (name) { c.subBasin.selectSubcuenca.setValue(name); }
    });
});







// Style 

c.subBasin.selectSubcuenca.style().set(s.dropdownSubcuencas);
c.subBasin.selectYear.style().set(s.dropdownSubcuencas);



