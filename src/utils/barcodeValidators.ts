/**
 * Módulo de validación para múltiples formatos de códigos de barras (1D y 2D)
 */

/**
 * Valida un código EAN-13
 */
export function validateEAN13(code: string): boolean {
  if (code.length !== 13 || !/^\d+$/.test(code)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code[12]);
}

/**
 * Valida un código EAN-8
 */
export function validateEAN8(code: string): boolean {
  if (code.length !== 8 || !/^\d+$/.test(code)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code[7]);
}

/**
 * Valida un código UPC-A (12 dígitos)
 */
export function validateUPCA(code: string): boolean {
  if (code.length !== 12 || !/^\d+$/.test(code)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code[11]);
}

/**
 * Valida un código Code 128 (ASCII estándar, longitud razonable)
 */
export function validateCode128(code: string): boolean {
  if (code.length < 1 || code.length > 80) {
    return false;
  }
  // Code 128 soporta cualquier carácter ASCII imprimible (rango 32 a 126)
  return /^[\x20-\x7E]+$/.test(code);
}

/**
 * Valida un código Code 39
 */
export function validateCode39(code: string): boolean {
  if (code.length < 1 || code.length > 80) {
    return false;
  }
  // Code 39 admite A-Z, 0-9, espacio, y caracteres -, ., $, /, +, %, *
  return /^[A-Z0-9\-\.\s\$\/\+\%]+$/.test(code.toUpperCase());
}

/**
 * Valida un código ITF (Interleaved 2 of 5 / ITF-14)
 */
export function validateITF(code: string): boolean {
  if (!/^\d+$/.test(code) || code.length < 2) {
    return false;
  }
  // ITF-14 requiere exactamente 14 dígitos, otros ITF requieren longitud par
  return code.length % 2 === 0;
}

/**
 * Valida un código Codabar
 */
export function validateCodabar(code: string): boolean {
  if (code.length < 2 || code.length > 80) {
    return false;
  }
  // Comienza y termina con A, B, C o D. Los caracteres del medio son números o -, $, :, /, ., +
  const upper = code.toUpperCase();
  const startEndOk = /^[A-D]/.test(upper) && /[A-D]$/.test(upper);
  if (!startEndOk) return false;
  const middle = upper.slice(1, -1);
  if (middle.length === 0) return true;
  return /^[0-9\-\$\:\/\.\+]+$/.test(middle);
}

/**
 * Valida códigos bidimensionales (QR y Data Matrix)
 */
export function validate2D(code: string): boolean {
  return code.trim().length > 0 && code.length <= 2500;
}

/**
 * Validador principal unificado
 */
export function validateBarcode(code: string, format: string): boolean {
  switch (format) {
    case 'EAN13':
      return validateEAN13(code);
    case 'EAN8':
      return validateEAN8(code);
    case 'UPC':
      return validateUPCA(code);
    case 'CODE128':
      return validateCode128(code);
    case 'CODE39':
      return validateCode39(code);
    case 'ITF':
      return validateITF(code);
    case 'CODABAR':
      return validateCodabar(code);
    case 'QR':
    case 'DATAMATRIX':
      return validate2D(code);
    default:
      return false;
  }
}

/**
 * Obtiene un placeholder sugerido según el formato
 */
export function getPlaceholderForFormat(format: string): string {
  switch (format) {
    case 'EAN13':
      return 'Ingrese código EAN-13 (13 dígitos)';
    case 'EAN8':
      return 'Ingrese código EAN-8 (8 dígitos)';
    case 'UPC':
      return 'Ingrese código UPC-A (12 dígitos)';
    case 'CODE128':
      return 'Ingrese texto o código para Code 128';
    case 'CODE39':
      return 'Ingrese texto para Code 39 (letras, números y espacio)';
    case 'ITF':
      return 'Ingrese código numérico ITF (longitud par, ej. 14 dígitos)';
    case 'CODABAR':
      return 'Ingrese código Codabar (Ej: A12345B)';
    case 'QR':
      return 'Ingrese enlace URL o texto para Código QR';
    case 'DATAMATRIX':
      return 'Ingrese datos para código Data Matrix';
    default:
      return 'Ingrese el código';
  }
}

/**
 * Filtra los caracteres ingresados según el formato en tiempo real
 */
export function filterInputForFormat(value: string, format: string): string {
  switch (format) {
    case 'EAN13':
      return value.replace(/[^0-9]/g, '').slice(0, 13);
    case 'EAN8':
      return value.replace(/[^0-9]/g, '').slice(0, 8);
    case 'UPC':
      return value.replace(/[^0-9]/g, '').slice(0, 12);
    case 'ITF':
      return value.replace(/[^0-9]/g, '');
    case 'CODE39':
      return value.toUpperCase().replace(/[^A-Z0-9\-\.\s\$\/\+\%]/g, '');
    case 'CODABAR':
      return value.toUpperCase().replace(/[^A-D0-9\-\$\:\/\.\+]/g, '');
    default:
      // Code 128, QR, Data Matrix permiten todo
      return value;
  }
}

/**
 * Obtiene el mensaje de error explicativo para cada formato
 */
export function getErrorMessageForFormat(format: string): string {
  switch (format) {
    case 'EAN13':
      return 'El código EAN-13 debe tener exactamente 13 dígitos y cumplir el algoritmo de dígito verificador.';
    case 'EAN8':
      return 'El código EAN-8 debe tener exactamente 8 dígitos y cumplir el algoritmo de dígito verificador.';
    case 'UPC':
      return 'El código UPC-A debe tener exactamente 12 dígitos y cumplir el algoritmo de dígito verificador.';
    case 'CODE128':
      return 'El código Code 128 debe contener caracteres ASCII válidos (longitud 1 a 80).';
    case 'CODE39':
      return 'El código Code 39 debe ser alfanumérico en mayúsculas y contener solo caracteres permitidos.';
    case 'ITF':
      return 'El código ITF debe contener únicamente dígitos y tener longitud par.';
    case 'CODABAR':
      return 'El código Codabar debe comenzar y terminar con A, B, C o D y usar dígitos intermedios.';
    case 'QR':
      return 'El código QR debe contener texto o una URL válida (hasta 2500 caracteres).';
    case 'DATAMATRIX':
      return 'El código Data Matrix debe contener datos válidos (hasta 2500 caracteres).';
    default:
      return 'El código ingresado no cumple con el formato especificado.';
  }
}

/**
 * Obtiene un código de ejemplo válido según el formato
 */
export function getSampleCodeForFormat(format: string): string {
  switch (format) {
    case 'EAN13':
      return '4006381333931';
    case 'EAN8':
      return '90311017';
    case 'UPC':
      return '012345678905';
    case 'CODE128':
      return 'PROD-12345';
    case 'CODE39':
      return 'PROD 123';
    case 'ITF':
      return '12345678901234';
    case 'CODABAR':
      return 'A12345B';
    case 'QR':
      return 'https://izicode.com';
    case 'DATAMATRIX':
      return 'DATA123';
    default:
      return '12345678';
  }
}

/**
 * Genera una lista de N códigos de ejemplo válidos para el formato especificado
 */
export function generateSampleBarcodes(format: string, count: number = 5): { code: string; description: string; price: number }[] {
  const samples: { code: string; description: string; price: number }[] = [];
  const sampleDescriptions = [
    'Camiseta de Algodón Premium',
    'Zapatillas Deportivas Pro',
    'Auriculares Inalámbricos BT',
    'Botella Térmica 750ml',
    'Mochila Ergonómica Urbana',
    'Reloj Inteligente Sport',
    'Cuaderno Ejecutivo A5',
    'Lámpara LED Escritorio'
  ];

  for (let i = 0; i < count; i++) {
    let code = '';
    const desc = sampleDescriptions[i % sampleDescriptions.length];
    const price = Math.floor(Math.random() * 50 + 10) + 0.99;

    switch (format) {
      case 'EAN13': {
        let digits = '';
        for (let j = 0; j < 12; j++) {
          digits += Math.floor(Math.random() * 10).toString();
        }
        let sum = 0;
        for (let j = 0; j < 12; j++) {
          sum += parseInt(digits[j]) * (j % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        code = digits + check;
        break;
      }
      case 'EAN8': {
        let digits = '';
        for (let j = 0; j < 7; j++) {
          digits += Math.floor(Math.random() * 10).toString();
        }
        let sum = 0;
        for (let j = 0; j < 7; j++) {
          sum += parseInt(digits[j]) * (j % 2 === 0 ? 3 : 1);
        }
        const check = (10 - (sum % 10)) % 10;
        code = digits + check;
        break;
      }
      case 'UPC': {
        let digits = '';
        for (let j = 0; j < 11; j++) {
          digits += Math.floor(Math.random() * 10).toString();
        }
        let sum = 0;
        for (let j = 0; j < 11; j++) {
          sum += parseInt(digits[j]) * (j % 2 === 0 ? 3 : 1);
        }
        const check = (10 - (sum % 10)) % 10;
        code = digits + check;
        break;
      }
      case 'CODE128': {
        const prefixes = ['SKU', 'PROD', 'INV', 'ITEM', 'BOX'];
        const num = Math.floor(1000 + Math.random() * 9000);
        code = `${prefixes[i % prefixes.length]}-${num}`;
        break;
      }
      case 'CODE39': {
        const prefixes = ['PART', 'CODE', 'BATCH', 'SER', 'UNIT'];
        const num = Math.floor(100 + Math.random() * 900);
        code = `${prefixes[i % prefixes.length]} ${num}`;
        break;
      }
      case 'ITF': {
        let digits = '100';
        for (let j = 0; j < 10; j++) {
          digits += Math.floor(Math.random() * 10).toString();
        }
        let sum = 0;
        for (let j = 0; j < 13; j++) {
          sum += parseInt(digits[j]) * (j % 2 === 0 ? 3 : 1);
        }
        const check = (10 - (sum % 10)) % 10;
        code = digits + check;
        break;
      }
      case 'CODABAR': {
        const num = Math.floor(10000 + Math.random() * 90000);
        code = `A${num}B`;
        break;
      }
      case 'QR': {
        const urls = [
          'https://izicode.com/demo/1',
          'https://izicode.com/demo/2',
          'https://izicode.com/demo/3',
          'https://izicode.com/demo/4',
          'https://izicode.com/demo/5'
        ];
        code = urls[i % urls.length];
        break;
      }
      case 'DATAMATRIX': {
        const num = Math.floor(1000 + Math.random() * 9000);
        code = `DM-LOT-${num}`;
        break;
      }
      default:
        code = `SAMPLE-${i + 1}`;
    }

    samples.push({ code, description: desc, price });
  }

  return samples;
}



