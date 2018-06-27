'use strict';

const isoCountries = require('../iso-countries');

describe('ISO Countries',  () => {
  it('Returns country name from code',  () => {
    expect(isoCountries.getCountryName('AR')).toEqual('Argentina');
  });

  it('Returns code when not recognized', () => {
    expect(isoCountries.getCountryName('Fakonia')).toEqual('Fakonia');
  });

  it('Accepts lower case codes', () => {
    expect(isoCountries.getCountryName('ar')).toEqual('Argentina');
  });
});