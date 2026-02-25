// * Carpeta donde están almacenados los assets

var folderPath = 'users/corfobbppciren2024/HS_v4';

// --- Async asset loading: fires immediately, UI renders while waiting ---
var _assetsCache = null;
ee.data.listAssets(folderPath, null, function(result) {
  _assetsCache = (result && result.assets) ? result.assets : null;
});

// Returns cached assets (null if async hasn't completed yet)
exports.assetsList = function(){
  return _assetsCache;
};

// Blocking fallback — only called if user interacts before async finishes
exports.assetsListSync = function() {
  if (_assetsCache !== null) return _assetsCache;
  _assetsCache = ee.data.listAssets(folderPath).assets;
  return _assetsCache;
};

// Exportar el path base para uso en otros módulos
exports.basePath = function(){
  return folderPath + '/SM';
};

// Exportar los sufijos para uso en otros módulos
exports.suffixNorte = function(){
  return 'Coquimbo_norte_VIIRS_';
};

exports.suffixSur = function(){
  return 'Coquimbo_sur_VIIRS_';
};

var currentYear = new Date().getFullYear();
// Año inicial desde el cual se quiere empezar la lista
var startYear = 2015;

// Crear una lista de años desde el año inicial hasta el año actual
var disp_year = [];
for (var year = startYear; year <= currentYear; year++) {
  disp_year.push(year.toString());
}
exports.dispYear = function(){
  return disp_year;
};


// Evaluación de imágenes nuevas de evapotranspiración

exports.evapoUpdate = function(viirs_et_m_ic){
  // Client-side computation - no server calls needed
  var nativeList = ['2012', '2013', '2014', '2015', '2016', '2017', '2018',
    '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  var currentYearStr = new Date().getFullYear().toString();
  if (nativeList.indexOf(currentYearStr) === -1) {
    nativeList.push(currentYearStr);
  }
  return nativeList;
};



exports.sensores_id = {
  1: "Frutícola Pan de Azucar",
  2: "Parcela 1 Santa Catalin",
  3: "ASMARA Sector 3",
  4: "Parcela 10 cuartel 4_2",
  5: "Fundo Siberia",
  6: "Huerto 1 Nogales Riego",
  7: "Quebrada Paihuano",
  8: "Cárcamo",
  9: "El Almendral",
  10: "Parcela 9 Huentel Sur",
  11: "Las Cardas",
  12: "Los Choros",
  13: "El Carmen",
  14: "Illapel Arriba El Bato",
  15: "Las Verbenas",
  16: "Santa Rosa El Palqui",
  17: "Chañaral Bajo",
  18: "Fundo Puente Plomo",
  19: "Punta Colorada",
  20: "La Higuera"
};

