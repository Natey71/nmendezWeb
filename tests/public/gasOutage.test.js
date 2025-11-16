import {
  clampOutageLevel,
  computeGasOutageDuration,
  describeGasOutageLevel,
  formatOutageDuration
} from '../../src/public/js/gas-outage.js';

describe('gas outage helpers', ()=>{
  test('clamps outage levels into valid range', ()=>{
    expect(clampOutageLevel(1)).toBe(1);
    expect(clampOutageLevel(10)).toBe(10);
    expect(clampOutageLevel(100)).toBe(10);
    expect(clampOutageLevel(-5)).toBe(1);
    expect(clampOutageLevel('3.6')).toBe(4);
  });

  test('computes duration scaling from level 1 to 10', ()=>{
    expect(computeGasOutageDuration(1)).toBe(30);
    expect(computeGasOutageDuration(10)).toBe(480);
    expect(computeGasOutageDuration(5)).toBe(230);
  });

  test('describes outage severity bands', ()=>{
    expect(describeGasOutageLevel(2)).toBe('Minor');
    expect(describeGasOutageLevel(5)).toBe('Moderate');
    expect(describeGasOutageLevel(7)).toBe('Severe');
    expect(describeGasOutageLevel(9)).toBe('Critical');
  });

  test('formats outage durations as minutes and seconds', ()=>{
    expect(formatOutageDuration(30)).toBe('30s');
    expect(formatOutageDuration(120)).toBe('2m');
    expect(formatOutageDuration(185)).toBe('3m 5s');
    expect(formatOutageDuration('59.4')).toBe('59s');
  });
});
