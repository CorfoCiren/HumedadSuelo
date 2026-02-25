

var sub_nameCode = {
  'Rio del Carmen': '0381',
  'Q. Los Choros hasta junta Q. del Pelicano': '0410',
  'Q.  del Pelicano': '0411',
  'Rio Turbio': '0430',
  'Rio Claro': '0431',
  'R. Elqui Medio': '0432',
  'R. Elqui Bajo': '0433',
  'Rio Hurtado': '0450',
  'Rio Grande Alto (hasta arriba junta Rio Rapel)': '0451',
  'R. Grande Medio (arriba Junta R. Rapel y R. Guatulame o Muro Emb. Paloma)': '0452',
  'R. Guatulame (Muro Embalse Paloma)': '0453',
  'Rio Grande Bajo (entre Embalse Paloma y Rio Hurtado)': '0454',
  'Rio Limari': '0455',
  'Rio Choapa Alto (hasta abajo junta Rio Cuncumen)': '0470',
  'Rio Choapa Medio (entre Rios Cuncumen e Illapel)': '0471',
  'Rio Illapel': '0472',
  'Rio Choapa Bajo (entre Rio Illapel y Desembocadura)': '0473',
  'Costeras entre Estero Millahue y Estero Pupio': '0480',
  'Estero Pupio': '0481',
  'Costeras entre Estero Pupio y Rio Quilimari': '0482',
  'Rio Quilimari hasta Muro Embalse Culimo': '0490',
  'Región de Coquimbo': 'Region'
  
};

exports.sub_nameCode = sub_nameCode;


exports.subcuencaNumber = [
  '0381', '0410', '0411', '0430', '0431', '0432', '0433',
  '0450', '0451', '0452', '0453', '0454', '0455', '0470', 
  '0471', '0472', '0473', '0480', '0481', '0482', '0490'
];




// Load base CSV
var folderPath = 'projects/humedad-y-superficie-regada/assets/MetricsHS';
 
// Get list of assets in the folder
var assetList = ee.data.listAssets(folderPath).assets;

var format = 'yyyy M'; 
var getName = function(asset) {
  var date = asset.name.split('/')[4];
  return date;
};

// Sort dates numerically (by year, then by month/week number)
var sortDates = function(dateStr) {
  var parts = dateStr.split('_');
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]);
  // Return a sortable value: year * 1000 + month (assuming month < 1000)
  return year * 1000 + month;
};

// assetList is already a JavaScript array, so we can map and sort directly
var dateArray = assetList.map(getName);
// Sort numerically
var sortedDates = dateArray.sort(function(a, b) {
  return sortDates(a) - sortDates(b);
});
var dateList = sortedDates[sortedDates.length - 1]; // Get the last (most recent) element
//print('dateList', dateList);


var latestAssetId = folderPath + '/' + dateList;

// Load the FeatureCollection
var csv = ee.FeatureCollection(latestAssetId);
exports.matrixSubBasinTransposed = csv;

// Single server call: fetch all date-like property names as a client-side array
var filteredProperties = csv.first().propertyNames()
  .filter(ee.Filter.stringStartsWith('item', '20'))
  .distinct().sort();
var listDatesArray = filteredProperties.getInfo();

exports.listDates = listDatesArray;

// Derive years client-side from dates (no additional server call)
var yearsSet = {};
listDatesArray.forEach(function(d) {
  yearsSet[String(d).substring(0, 4)] = true;
});
exports.listYears = Object.keys(yearsSet).sort();
