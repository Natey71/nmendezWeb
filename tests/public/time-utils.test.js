import assert from 'assert/strict';
import { buildForecastTimeline, formatGameClockLabel, normalizeGameSeconds } from '../../src/public/js/time-utils.js';

describe('time-utils', () => {
  describe('normalizeGameSeconds', () => {
    it('wraps negative values into the range', () => {
      assert.equal(normalizeGameSeconds(-10, 100), 90);
    });
  });

  describe('formatGameClockLabel', () => {
    it('formats hours and minutes with zero padding', () => {
      const label = formatGameClockLabel(180, 720);
      // 180 seconds into a 720 second day = 6 hours -> 06:00
      assert.equal(label, '06:00');
    });

    it('wraps around the day boundary', () => {
      const label = formatGameClockLabel(750, 720);
      assert.equal(label, '01:00');
    });
  });

  describe('buildForecastTimeline', () => {
    it('builds inclusive offsets up to the horizon', () => {
      const timeline = buildForecastTimeline({ startSeconds: 100, horizonSeconds: 20, stepSeconds: 5, daySeconds: 720 });
      const offsets = timeline.map(p => p.offsetSeconds);
      assert.deepEqual(offsets, [0, 5, 10, 15, 20]);
      assert.equal(timeline.at(-1).normalizedSeconds, normalizeGameSeconds(120, 720));
    });

    it('handles horizons shorter than the step', () => {
      const timeline = buildForecastTimeline({ startSeconds: 0, horizonSeconds: 2, stepSeconds: 5, daySeconds: 720 });
      assert.deepEqual(timeline.map(p => p.offsetSeconds), [0, 2]);
    });
  });
});
