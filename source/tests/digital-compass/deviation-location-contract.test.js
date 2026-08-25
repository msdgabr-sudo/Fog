'use strict';

const assert=require('assert');
const path=require('path');

const apiPath=path.resolve(__dirname,'../../js/digital-compass/digital-compass-deviation.js');
delete require.cache[apiPath];
require(apiPath);
const api=globalThis.QiblaDigitalCompassDeviation;

assert(api&&typeof api.distanceKm==='function');
assert.strictEqual(api.baseDistanceKm(null),null,'missing state must not fall back to a fabricated distance');
assert.strictEqual(api.baseDistanceKm({gnssTrusted:false,latitude:30.0444,longitude:31.2357}),null,'untrusted coordinates must not drive distance');
assert.strictEqual(api.distanceKm(5,{gnssTrusted:true,latitude:91,longitude:31}),null,'out-of-range latitude must be rejected');

const locations=[
  ['Cairo',30.0444,31.2357,112],
  ['London',51.5074,-0.1278,418],
  ['New York',40.7128,-74.0060,899],
  ['Jakarta',-6.2088,106.8456,691],
  ['Sydney',-33.8688,151.2093,1155]
];

const results=[];
for(const [name,latitude,longitude,expected5DegKm] of locations){
  const state={gnssTrusted:true,latitude,longitude};
  const base=api.baseDistanceKm(state);
  const km=api.distanceKm(5,state);
  assert(Number.isFinite(base)&&base>0,`${name}: distance to Kaaba must be finite`);
  assert.strictEqual(km,expected5DegKm,`${name}: 5° deviation must use its own location-to-Kaaba distance`);
  assert.strictEqual(api.distanceKm(0,state),0,`${name}: 0° deviation must be 0 km`);
  results.push(km);
}
assert.strictEqual(new Set(results).size,locations.length,'the calculator must not publish one fixed distance globally');

console.log('Digital compass GNSS-derived deviation contract: PASS');
console.log(Object.fromEntries(locations.map((x,i)=>[x[0],results[i]+' km at 5°'])));
