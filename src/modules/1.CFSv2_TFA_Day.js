/**
 * Module: 1.CFSv2_TFA_Day.js
 * Temporal Fourier Analysis for CFSv2 day temperatures
 */

import ee from '@google/earthengine';
import coleccionImagenes from './1.coleccion_imagenes.js';

const table = coleccionImagenes.tabla;

// Choose here either day or night
const start_hour = '12'; // '00' for night, '12' for day

// Insert here the coordinates of the area of interest
const geometry = table;
const geometria = table;

// Change the path to your own assets folder
const Assets_path = 'users/corfobbppciren2023/CFSv2_TFA_Day_Valparaiso';

const Temperature_Band = 'Maximum_temperature_height_above_ground_6_Hour_Interval';
const collection = 'NOAA/CFSV2/FOR6H';

// The number of cycles per year to model
const harmonics = 3;

// Make a list of harmonic frequencies to model
const harmonicFrequencies = ee.List.sequence(1, harmonics);

// Function to get a sequence of band names for harmonic terms
const getNames = function(base, list) {
  return ee.List(list).map(function(i) { 
    return ee.String(base).cat(ee.Number(i).int());
  });
};

// Construct lists of names for the harmonic terms
const cosNames = getNames('cos_', harmonicFrequencies);
const sinNames = getNames('sin_', harmonicFrequencies);

const k2celsius = function(image) {
  return image.subtract(ee.Image(273.15))   // convert Kelvin to Celsius
              .set('system:time_start', image.get('system:time_start'));
};

// Function to compute the specified number of harmonics and add them as bands
const addHarmonics = function(freqs) {
  return function(image) {
    // Make an image of frequencies
    const frequencies = ee.Image.constant(freqs);
    // This band should represent lst
    const lst = ee.Image(image).select(Temperature_Band);
    // This band should represent days from start
    const time = ee.Image(image).select('t');
    // Get the cosine terms
    const cosines = lst.multiply(2.0).multiply((frequencies.multiply(2.0 * Math.PI).multiply(time).divide(365.0)).cos())
      .rename(cosNames);
    // Get the sin terms
    const sines = lst.multiply(2.0).multiply((frequencies.multiply(2.0 * Math.PI).multiply(time).divide(365.0)).sin())
      .rename(sinNames);
    return image.addBands(cosines).addBands(sines);
  };
};

const LST = ee.ImageCollection(ee.List.sequence(1, 365).map(function (doy){
  return ee.ImageCollection(collection)
    .select(Temperature_Band)
    .filter(ee.Filter.calendarRange(doy, doy, 'day_of_year'))
    .filter(ee.Filter.stringEndsWith('system:index', start_hour))
    .map(k2celsius)
    .mean()
    .set({doy: doy})
    .addBands(ee.Image(ee.Number(doy)).rename('t'));
}));

const LST_harmonics = LST.map(addHarmonics(harmonicFrequencies));

const num_days = 365;
const a_coef_1 = LST_harmonics.select('cos_1').sum().divide(num_days);
const a_coef_2 = LST_harmonics.select('cos_2').sum().divide(num_days);
const a_coef_3 = LST_harmonics.select('cos_3').sum().divide(num_days);
const b_coef_1 = LST_harmonics.select('sin_1').sum().divide(num_days);
const b_coef_2 = LST_harmonics.select('sin_2').sum().divide(num_days);
const b_coef_3 = LST_harmonics.select('sin_3').sum().divide(num_days);

const H0 = LST_harmonics.select(Temperature_Band).mean();

// Get the omega terms
const omega_1 = ee.Image(1.0).multiply(2.0 * Math.PI).divide(365.0);
const omega_2 = ee.Image(2.0).multiply(2.0 * Math.PI).divide(365.0);
const omega_3 = ee.Image(3.0).multiply(2.0 * Math.PI).divide(365.0);

const phase_1 = a_coef_1.atan2(b_coef_1.multiply(ee.Image(-1.0)));
const phase_2 = a_coef_2.atan2(b_coef_2.multiply(ee.Image(-1.0)));
const phase_3 = a_coef_3.atan2(b_coef_3.multiply(ee.Image(-1.0)));

const amplitude_1 = (a_coef_1.pow(2).add(b_coef_1.pow(2))).sqrt();
const amplitude_2 = (a_coef_2.pow(2).add(b_coef_2.pow(2))).sqrt();
const amplitude_3 = (a_coef_3.pow(2).add(b_coef_3.pow(2))).sqrt();

// Function to add a H band
const addH = function(image) {
  const H_1 = amplitude_1.multiply((omega_1.multiply(image.select('t')).add(phase_1)).cos()).rename('H_1');
  const H_2 = amplitude_2.multiply((omega_2.multiply(image.select('t')).add(phase_2)).cos()).rename('H_2');
  const H_3 = amplitude_3.multiply((omega_3.multiply(image.select('t')).add(phase_3)).cos()).rename('H_3');
  // FTA[t] = H0 + H[0,t] + H[1,t] + H[2,t]
  const TFA = H0.add(H_1).add(H_2).add(H_3).rename('TFA');

  const Anomalies = TFA.subtract(image.select(Temperature_Band)).rename('Anomalies');
  return image.addBands(TFA).addBands(Anomalies);
};

const LST_TFA = LST_harmonics.map(addH);

// Iterating over the image collection
const TFA_Images = LST_TFA.select('TFA')
  .sort('t')
  .iterate(function(img, all) {
    return ee.Image(all).addBands(img);
  }, ee.Image().select());

export default {
  TFA_Images,
  Assets_path,
  start_hour,
  geometria
};
