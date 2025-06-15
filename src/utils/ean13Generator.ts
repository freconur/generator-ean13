/**
 * Utilidades para trabajar con códigos EAN-13
 * EAN-13 es un código de barras que consiste en 13 dígitos:
 * - 12 dígitos de datos
 * - 1 dígito verificador
 */

/**
 * Genera un código EAN-13 aleatorio
 * @returns string - El código EAN-13 generado
 */
export function generateEAN13(): string {
    // Generar los primeros 12 dígitos aleatoriamente
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    
    // Calcular el dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
}

/**
 * Valida si un código EAN-13 es correcto
 * @param code - El código EAN-13 a validar (13 dígitos)
 * @returns boolean - true si el código es válido, false si no lo es
 */
export function validateEAN13(code: string): boolean {
    // Verifica que el código tenga 13 dígitos y solo contenga números
    if (code.length !== 13 || !/^\d+$/.test(code)) {
        return false;
    }

    // Calcula la suma ponderada según el algoritmo EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        // Multiplica por 3 los dígitos en posiciones pares (índice impar)
        sum += (i % 2 === 0) ? digit : digit * 3;
    }

    // Calcula el dígito verificador
    const checkDigit = (10 - (sum % 10)) % 10;
    // Compara con el último dígito del código
    return checkDigit === parseInt(code[12]);
} 