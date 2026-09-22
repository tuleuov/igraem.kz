import { calculateDistanceMeters, formatDistance } from './geo';

describe('Geo Utilities (client/src/utils/geo.ts)', () => {
  describe('calculateDistanceMeters', () => {
    it('should return 0 meters for identical coordinates', () => {
      const lat = 50.0;
      const lon = 73.0;
      expect(calculateDistanceMeters(lat, lon, lat, lon)).toBe(0);
    });

    it('should calculate accurate distance between two GPS points', () => {
      // Coordinates of Astana and Karaganda
      const astanaLat = 51.1694;
      const astanaLon = 71.4491;
      const karagandaLat = 49.8029;
      const karagandaLon = 73.1021;

      const distance = calculateDistanceMeters(astanaLat, astanaLon, karagandaLat, karagandaLon);
      // Distance is ~190-200 km (190,000+ meters)
      expect(distance).toBeGreaterThan(180000);
      expect(distance).toBeLessThan(220000);
    });
  });

  describe('formatDistance', () => {
    it('should format distance under 1000 meters in meters', () => {
      expect(formatDistance(450)).toBe('450 м от вас');
    });

    it('should format distance 1000 meters or more in km with 1 decimal place', () => {
      expect(formatDistance(2500)).toBe('2.5 км от вас');
      expect(formatDistance(12000)).toBe('12.0 км от вас');
    });
  });
});
