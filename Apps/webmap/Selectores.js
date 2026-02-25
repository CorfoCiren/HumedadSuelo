// Clase para manejar métodos de fecha, dado que se selecciona un año

var init = require('users/corfobbppciren2024/App_HS_User:Inicio');

var dummyImage = ee.Image(0).selfMask(); // Lightweight empty image
//Selectores.onChangeDownloadYear(c, links, selectedYear, s);
// Función auxiliar para generar los IDs de los assets
function generateAssetList(year) {
    var basePath = init.basePath();
  var suffix = init.suffixNorte();
  return [
    basePath + year + suffix + 'mes1',
    basePath + year + suffix + 'mes2',
    basePath + year + suffix + 'mes3',
    basePath + year + suffix + 'mes4',
    basePath + year + suffix + 'mes5',
    basePath + year + suffix + 'mes6',
    basePath + year + suffix + 'mes7',
    basePath + year + suffix + 'mes8',
    basePath + year + suffix + 'mes9',
    basePath + year + suffix + 'mes10',
    basePath + year + suffix + 'mes11',
    basePath + year + suffix + 'mes12'
  ];
}

// Función para verificar los assets por año y retorna los meses disponibles
function checkAssetsYear(year, listAssets) {
  var assetList = generateAssetList(year);
  var availableMonths = [];

  // Build a set of existing asset IDs for O(1) lookup (no server calls)
  var existingIds = {};
  if (listAssets) {
    listAssets.forEach(function(asset) {
      existingIds[asset.id] = true;
    });
  }

  assetList.forEach(function(path, index) {
    if (existingIds[path]) {
      availableMonths.push(index + 1); // Guarda el número del mes (1-12)
    }
  });

  return availableMonths; // Retorna array de meses disponibles
}

// Función auxiliar para obtener la última banda disponible (usada por getDayList)
function getLastAvailableBandName(year, listAssets) {
  var assetList = generateAssetList(year);
  var lastAvailableId = null;

  // Build a set of existing asset IDs for O(1) lookup
  var existingIds = {};
  if (listAssets) {
    listAssets.forEach(function(asset) {
      existingIds[asset.id] = true;
    });
  }

  assetList.forEach(function(path) {
    if (existingIds[path]) {
      lastAvailableId = path;
    }
  });

  if (lastAvailableId) {
    var lastAvailableAsset = ee.Image(lastAvailableId);
    var bandNames = lastAvailableAsset.bandNames();
    var lastBandName = bandNames.get(bandNames.size().subtract(1));
    return lastBandName.getInfo(); // 1 server call instead of up to 12
  } else {
    return null;
  }
}

// Función para obtener el año actual (client-side, sin server calls)
function getYear() {
  return new Date().getFullYear();
}
exports.getYear = getYear;

function getMonth() {
  return new Date().getMonth() + 1; // 1-12, same as ee.Date.get('month')
}
exports.getMonth = getMonth;

// Función para generar la lista de fechas para un año dado
exports.getDateList = function(year, disp_year, listAssets) {
  var currentYear = getYear();
  var dates = [];
  var endDate;

  if (year !== null) {
    if (year === currentYear.toString()) {
      var lastBandName = getLastAvailableBandName(currentYear, listAssets);
      if (lastBandName) {
        var datePart = lastBandName.substring(1); // Elimina la 'b'
        var cMonth = parseInt(datePart.substring(5, 7), 10) - 1; // Mes (0 basado)
        var cDay = parseInt(datePart.substring(8, 10), 10); // Día
        endDate = new Date(year, cMonth, cDay);
      } else {
        endDate = new Date(year, 11, 32);
      }
    } else {
      endDate = new Date(year, 11, 32);
    }

    var startDate = new Date(year, 0, 1);
    for (var date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
      var day = ('0' + date.getDate()).slice(-2);
      var month = ('0' + (date.getMonth() + 1)).slice(-2);
      var formattedDate = day + '/' + month + '/' + date.getFullYear();
      dates.push(formattedDate);
    }
  }

  return dates;
};


exports.getMonthList = function(year, disp_year, listAssets) {
  var currentYear = getYear();
  var dates = [];

  if (year !== null) {
    var yearInt = parseInt(year, 10);
    
    if (yearInt === currentYear) {
      // Para el año actual, obtener los meses disponibles en los assets
      var availableMonths = checkAssetsYear(yearInt, listAssets);
      availableMonths.forEach(function(month) {
        dates.push(('0' + month).slice(-2));
      });
    } else {
      // Para años anteriores, mostrar todos los 12 meses
      for (var month = 1; month <= 12; month++) {
        dates.push(('0' + month).slice(-2));
      }
    }
  }

  return dates;
};

exports.getDayList = function(year, month, disp_year, listAssets) {
  var currentYear = getYear();
  var currentMonthOneBased = getMonth(); // returns 1..12 from client-side JS
  var dates = [];

  var monthInt = parseInt(month, 10); // 1..12
  var yearInt = parseInt(year, 10);

  if (year !== null) {
    var endDateUTC;

    if (yearInt === currentYear && monthInt === currentMonthOneBased) {
      // For current month of current year, cap by last available day from assets
      var lastBandName = getLastAvailableBandName(currentYear, listAssets);
      var datePart = lastBandName ? lastBandName.substring(1) : null; // 'YYYY-MM-DD'
      var cDay = datePart ? parseInt(datePart.substring(8, 10), 10) : new Date(yearInt, monthInt, 0).getDate();
      endDateUTC = new Date(Date.UTC(yearInt, monthInt - 1, cDay));
    } else {
      // Last day of requested month
      endDateUTC = new Date(Date.UTC(yearInt, monthInt, 0)); // last day of month
    }

    var startDateUTC = new Date(Date.UTC(yearInt, monthInt - 1, 1));

    for (var t = startDateUTC.getTime(); t <= endDateUTC.getTime(); t += 86400000) {
      var d = new Date(t);
      var day = ('0' + d.getUTCDate()).slice(-2);
      var formattedDate = day + '/' + month + '/' + d.getUTCFullYear();
      dates.push(formattedDate);
    }
  }

  return dates;
};




// Si las bandas de los TIFF se llaman YYYY-MM-DD, esta función no es necesaria
exports.getBand = function(date, dateList) {
  return dateList.indexOf(date);
};

exports.onChangeDownloadYear = function(c, links, selectedYear, s) {
  c.downloadYear.panel.style().set('shown', true);
  links.forEach(function(link, i) {
    var labelKey = 'label' + (i + 1);
    // Show loading state immediately
    c.downloadYear[labelKey].style().set(s.ableLabel);
    c.downloadYear[labelKey].setUrl('');
    
    // Async URL generation — callback form for broad GEE compatibility
    link.getDownloadURL({ 
      name: 'HS_anual',
      scale: 1000,
      filePerBand: false
    }, function(url, error) {
      if (url) {
        c.downloadYear[labelKey].setUrl(url);
      } else {
        if (error) print('Download error:', error);
      }
    });
  });
};

// Función que se ejecuta al cambiar el año seleccionado
exports.cleanScreen = function(c, selectedYear, s) {
  // Deshabilitar labels y limpiar la interfaz
  c.selectYear.downloadButon.setDisabled(false);
    c.downloadYear.panel.style().set('shown', false);
    
    ['label1', 'label2', 'label3', 'label4', 'label5', 'label6',
   'label7','label8','label9','label10','label11','label12'].forEach(function(label) {
    c.downloadYear[label].style().set(s.disableLabel);
  });
  c.legend.panel.style().set({ shown: false });

  c.downloadYear.title.setValue('Descarga año completo');
  c.downloadYear.title.style().set(s.widgetTitle);
  c.selectBand.selector.setValue(null, false);

  if (c.selectBand.selector.getValue() === null) {
    c.downloadBand.label.style().set(s.disableLabel);
    c.downloadBand.label.setUrl('');
  }

  

  // Eliminar tabla y gráficos si existen
  if (c.infoTable) {
    c.infoTable.style().set('shown', false);
  }
// dummy layer para no perder la posicion 0 en el arreglo de capas
var layerDummy = ui.Map.Layer(dummyImage,{}, 'dummy');

  // Eliminar capa del mapa si existe
  var mapLayer = c.map.layers().get(0);
  if (mapLayer && mapLayer.getName() === 'Humedad de Suelo') {
    c.map.layers().set(0, layerDummy); // Reemplazar con la capa dummy para eliminarla
  }

  // Ocultar gráfico
  c.chart.chartPanel.style().set('shown', false);
};

// Funciones auxiliares para la verificación de fechas
function bisiesto(agno) {
  return (agno % 4 === 0 && agno % 100 !== 0) || (agno % 400 === 0);
}

var meses30 = ['02', '04', '06', '09', '11'];

// Verifica que la fecha sea válida
exports.checkFecha = function(dateString) {
  
  var partesFecha = dateString.split('/');
var dia = Number(partesFecha[0]);
var mes = Number(partesFecha[1]);
var agno = Number(partesFecha[2]);


  try {
    var fechaEspecifica = new Date(agno + '-' + mes + '-' + dia);

    // Verificar que el día no exceda 31
    if (isNaN(dia) || dia > 31) {
      return 'Formato incorrecto de fecha';
    }

    // Verificar año bisiesto
    if (mes === 2 && !bisiesto(agno) && dia > 28) {
      return 'Verifique la fecha';
    }

    // Verificar meses con menos de 31 días
    if (dia > 30 && meses30.includes(mes.toString().padStart(2, '0'))) {
      return 'Verifique la fecha';
    }

    // Verificar rango de años
    if (agno < 2015) {
      return 'Datos disponibles a partir del año 2015';
    }

    if (agno > 2025) {
      return 'Verifique la fecha';
    }

    return ''; // Fecha válida

  } catch (error) {
    return 'Formato incorrecto de fecha';
  }
};
