import { validateIIN, formatRKPhone } from './iinValidator';

describe('IIN Validator Utility (src/utils/iinValidator.ts)', () => {
  describe('validateIIN', () => {
    it('should return isValid: true for a valid 12-digit Kazakh IIN', () => {
      const validIIN = '990101300123';
      const result = validateIIN(validIIN);
      expect(result.isValid).toBe(true);
      expect(result.gender).toBe('male');
      expect(result.birthDate).toBeInstanceOf(Date);
    });

    it('should return isValid: false for empty or non-string input', () => {
      const result = validateIIN('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ИИН не должен быть пустым');
    });

    it('should return isValid: false for input with incorrect digit count', () => {
      const result = validateIIN('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('12 цифр');
    });

    it('should return isValid: false for invalid 7th digit (century/gender indicator)', () => {
      const invalidCenturyIIN = '990101900123'; // 7th digit '9' is invalid (only 1-6)
      const result = validateIIN(invalidCenturyIIN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Некорректная 7-я цифра');
    });

    it('should return isValid: false for invalid month in birth date', () => {
      const invalidMonthIIN = '991301300123'; // Month 13 is invalid
      const result = validateIIN(invalidMonthIIN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Некорректный месяц');
    });
  });

  describe('formatRKPhone', () => {
    it('should format 11-digit number starting with 8 to +7 format', () => {
      expect(formatRKPhone('87071234567')).toBe('+77071234567');
    });

    it('should format 11-digit number starting with 7 to +7 format', () => {
      expect(formatRKPhone('77071234567')).toBe('+77071234567');
    });

    it('should format 10-digit number starting with 7 to +7 format', () => {
      expect(formatRKPhone('7071234567')).toBe('+77071234567');
    });
  });
});
