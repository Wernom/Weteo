import { toPrecipitation, toTemperature, toWind } from '../units';

it('convertit les températures', () => {
  expect(toTemperature(18.4, 'celsius')).toBe(18.4);
  expect(toTemperature(20, 'fahrenheit')).toBe(68);
  expect(toTemperature(0, 'fahrenheit')).toBe(32);
  expect(toTemperature(-40, 'fahrenheit')).toBe(-40);
});

it('convertit le vent', () => {
  expect(toWind(36, 'kmh')).toBe(36);
  expect(toWind(36, 'ms')).toBe(10);
  expect(toWind(36, 'mph')).toBe(22);
  expect(toWind(36, 'kn')).toBe(19);
});

it('convertit les précipitations', () => {
  expect(toPrecipitation(2.4, 'mm')).toBe(2.4);
  expect(toPrecipitation(25.4, 'inch')).toBe(1);
});
