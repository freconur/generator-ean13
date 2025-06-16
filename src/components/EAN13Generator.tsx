'use client';

import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface EAN13GeneratorProps {
  initialCode?: string;
}

export default function EAN13Generator({ initialCode = '' }: EAN13GeneratorProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const barcodeRef = useRef<SVGSVGElement>(null);

  const validateEAN13 = (code: string): boolean => {
    if (code.length !== 13 || !/^\d+$/.test(code)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]);
  };

  const generateRandomEAN13 = () => {
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    code += checkDigit;
    
    setCode(code);
    setError('');
  };

  useEffect(() => {
    if (barcodeRef.current && code) {
      try {
        JsBarcode(barcodeRef.current, code, {
          format: 'EAN13',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 20,
          margin: 10
        });
        setError('');
      } catch {
        setError('Error al generar el código de barras');
      }
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-4">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            const newCode = e.target.value;
            if (newCode.length <= 13 && /^\d*$/.test(newCode)) {
              setCode(newCode);
              if (newCode.length === 13 && !validateEAN13(newCode)) {
                setError('Código EAN-13 inválido');
              } else {
                setError('');
              }
            }
          }}
          placeholder="Ingrese código EAN-13"
          className="px-4 py-2 border rounded"
        />
        <button
          onClick={generateRandomEAN13}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generar Aleatorio
        </button>
      </div>
      
      {error && <p className="text-red-500">{error}</p>}
      
      <div className="mt-4">
        <svg ref={barcodeRef} />
      </div>
    </div>
  );
} 