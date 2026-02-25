/*******************************
 *  Dashboard – Soil Moisture  *
 *******************************/
var init = require('users/corfobbppciren2024/Dashboard_HS:Init');

/*================ REGIÓN COMPLETA ================*/
exports.createChartRegionSoilMoisture = function (matrix) {
  // init.listDates is now a client-side array – no ee.List overhead
  var valuesMatrix = ee.FeatureCollection(init.listDates.map(function (date) {
    var ds    = String(date);
    var parts = ds.split(/[-_]/);
    var year  = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
    return ee.Feature(null, {
      date:   ee.Date.fromYMD(year, month, 1),
      region: matrix.aggregate_mean(ds)
    });
  }).filter(function (f) { return f !== null; }));

  var mean     = valuesMatrix.aggregate_mean('region');
  valuesMatrix = valuesMatrix.map(function (f) { return f.set('Mean', mean); });

  // Single batched getInfo for axis stats
  var stats  = ee.Dictionary({
    maxVal: valuesMatrix.aggregate_max('region'),
    minVal: valuesMatrix.aggregate_min('region')
  }).getInfo();
  var center = (stats.maxVal + stats.minVal) / 2;
  var yRange = stats.maxVal - stats.minVal;

  return ui.Chart.feature.byFeature({
      features: valuesMatrix.sort('date'),
      xProperty: 'date',
      yProperties: ['region', 'Mean']
    })
    .setChartType('LineChart')
    .setSeriesNames(['Humedad de suelo mensual', 'Promedio'])
    .setOptions({
      title: 'Humedad de suelo de Coquimbo',
      hAxis: {title: 'Fecha', format: 'yyyy'},
      vAxis: {
        title: 'Humedad de suelo (%)',
        viewWindow: { min: center - yRange, max: center + yRange }
      },
      lineWidth: 2,
      pointSize: 4,
      series: {
        0: {color: '#2ca02c', lineWidth: 3, pointSize: 4},
        1: {color: '#00BFFF', lineDashStyle: [5, 4], pointSize: 0}
      },
      width: '500px'
    });
};


/*================ SUBCUENCAS ================*/
exports.createChartSubcuencasSoilMoisture = function (matrixSubBasin, codeSubcuenca, selectedYear) {
  var selectedFC    = matrixSubBasin.filter(ee.Filter.eq('COD_SUBC', codeSubcuenca)).first();
  var subcuencaName = selectedFC.get('NOM_SUBC');
  var filteredDates, lineWidth;

  // Client-side date filtering (init.listDates is now a JS array)
  if (selectedYear !== 'Todos los años') {
    lineWidth     = 4;
    filteredDates = init.listDates.filter(function(dateStr) {
      return String(dateStr).indexOf(selectedYear) === 0;
    });
  } else {
    lineWidth     = 2;
    filteredDates = init.listDates.slice();
  }

  if (filteredDates.length === 0) {
    return ui.Label('No hay datos disponibles para el año ' + selectedYear);
  }

  // Single data-point fix: duplicate so LineChart draws a horizontal line
  var isSingleDate = (filteredDates.length === 1);
  if (isSingleDate) { filteredDates.push(filteredDates[0]); }

  /* --- Build date-value collection --- */
  var dateIndex = 0;
  var matrixValues = ee.FeatureCollection(filteredDates.map(function (date) {
    var dateString = String(date);
    var parts      = dateString.split(/[-_]/);
    var year       = parseInt(parts[0]);
    var month      = parseInt(parts[1]);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

    var fDate = ee.Date.fromYMD(year, month, 1);
    var idx   = dateIndex++;
    if (isSingleDate && idx === 1) { fDate = fDate.advance(1, 'day'); }

    return ee.Feature(null, {
      Date:        fDate,
      Value:       selectedFC.get(dateString),
      GlobalValue: matrixSubBasin.aggregate_mean(dateString)
    });
  }).filter(function(f) { return f !== null; }));

  /* --- Batch all server-side stats in one getInfo() call --- */
  var stats = ee.Dictionary({
    count:  matrixValues.size(),
    maxVal: ee.Number(matrixValues.aggregate_max('Value'))
              .max(matrixValues.aggregate_max('GlobalValue')),
    minVal: ee.Number(matrixValues.aggregate_min('Value'))
              .min(matrixValues.aggregate_min('GlobalValue')),
    title:  ee.String('Humedad de suelo de ')
              .cat(subcuencaName).cat(' ').cat(selectedYear)
  }).getInfo();

  if (stats.count === 0) {
    return ui.Label('No se pudieron cargar los datos para esta selección');
  }

  /* --- Averages (stay server-side, no getInfo needed) --- */
  var mean       = matrixValues.aggregate_mean('Value');
  var globalMean = matrixValues.aggregate_mean('GlobalValue');
  matrixValues   = matrixValues.map(function (f) {
    return f.set({Mean: mean, GlobalMean: globalMean});
  });

  /* --- Y-axis window --- */
  var center = (stats.maxVal + stats.minVal) / 2;
  var yRange = stats.maxVal - stats.minVal;
  if (yRange === 0) { yRange = Math.abs(center) * 0.2 || 0.1; }

  var isRegion = stats.title.indexOf('Región de Coquimbo') !== -1;

  /* --- Series config --- */
  var pointSizeBase = isSingleDate ? 8 : lineWidth + 1;
  var seriesOptions = {
    0: {color: '#0a1428', lineWidth: lineWidth, pointSize: pointSizeBase,
        visibleInLegend: !isRegion},
    1: {color: '#ff7f0e', lineDashStyle: [5, lineWidth + 2],
        pointSize: isSingleDate ? 8 : 0, visibleInLegend: !isRegion},
    2: {color: '#00BFFF', lineWidth: lineWidth, pointSize: pointSizeBase},
    3: {color: '#9467bd', lineDashStyle: [5, lineWidth + 2],
        pointSize: isSingleDate ? 8 : 0}
  };

  var xAxisOptions = (selectedYear !== 'Todos los años')
      ? {title: 'Mes', format: 'MMM'}
      : {title: 'Fecha', format: 'yyyy'};

  return ui.Chart.feature.byFeature({
      features:    matrixValues.sort('Date'),
      xProperty:   'Date',
      yProperties: ['Value', 'Mean', 'GlobalValue', 'GlobalMean']
    })
    .setChartType('LineChart')
    .setSeriesNames([
      'Humedad del suelo por Subcuencas',
      'Promedio por Subcuencas',
      'Humedad regional del suelo',
      'Promedio regional'
    ])
    .setOptions({
      title: stats.title,
      hAxis: xAxisOptions,
      vAxis: {
        title: 'Humedad de suelo (%)',
        viewWindow: { min: center - yRange, max: center + yRange }
      },
      lineWidth: 2,
      pointSize: 4,
      series: seriesOptions,
      width: '500px',
      legend: {maxLines: 3}
    });
};
