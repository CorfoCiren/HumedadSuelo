/**
 * Module: maskS2clouds.js
 * Cloud masking function for Sentinel-2 imagery
 */

import ee from '@google/earthengine';

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image - Sentinel-2 image
 * @returns {ee.Image} Cloud-masked image
 */
export function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

export default {
  maskS2clouds: maskS2clouds
};