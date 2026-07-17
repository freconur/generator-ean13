import { generateEAN13, validateEAN13 } from '../ean13Generator';

describe('Pruebas del Algoritmo EAN-13', () => {
  describe('validateEAN13', () => {
    it('debe retornar true para códigos EAN-13 válidos conocidos', () => {
      expect(validateEAN13('7501031301829')).toBe(true);
      expect(validateEAN13('9780201379624')).toBe(true);
      expect(validateEAN13('7750123456781')).toBe(true);
    });

    it('debe retornar false para códigos con dígito verificador incorrecto', () => {
      // 7501031301829 es válido, 7501031301828 no lo es
      expect(validateEAN13('7501031301828')).toBe(false);
    });

    it('debe retornar false para códigos con longitud incorrecta', () => {
      expect(validateEAN13('750103130182')).toBe(false); // 12 dígitos
      expect(validateEAN13('75010313018267')).toBe(false); // 14 dígitos
    });

    it('debe retornar false para códigos que contienen letras o caracteres especiales', () => {
      expect(validateEAN13('750103130182A')).toBe(false);
      expect(validateEAN13('750-103130182')).toBe(false);
    });
  });

  describe('generateEAN13', () => {
    it('debe generar un código de exactamente 13 caracteres numéricos', () => {
      const code = generateEAN13();
      expect(code).toHaveLength(13);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it('debe generar códigos que pasen la validación de validateEAN13', () => {
      for (let i = 0; i < 50; i++) {
        const generatedCode = generateEAN13();
        expect(validateEAN13(generatedCode)).toBe(true);
      }
    });
  });
});
