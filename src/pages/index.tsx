import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import styles from '../styles/Home.module.css';
import { validateEAN13 } from '../utils/ean13Generator';
import { PdfImprimir } from '@/components/PDF-ean13';

// Interfaz para el tipo de código de barras
interface BarcodeItem {
  code: string;
  quantity: number;
  isValid: boolean;
  isDuplicate?: boolean;
}

/**
 * Componente principal de la aplicación
 * Permite validar códigos EAN-13 y mostrar su representación en código de barras
 */
export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const validateButtonRef = useRef<HTMLButtonElement>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [tempQuantity, setTempQuantity] = useState<string>('1');
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pendingCode, setPendingCode] = useState<{code: string, quantity: number} | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Activar el efecto de fade después de que el componente se monte
    setFadeIn(true);
  }, []);

  /**
   * Verifica si un código ya existe en el array
   */
  const isCodeDuplicate = (code: string): boolean => {
    return barcodes.some(item => item.code === code);
  };

  /**
   * Marca todos los códigos duplicados en el array
   */
  const markDuplicates = (code: string) => {
    setBarcodes(prev => prev.map(item => ({
      ...item,
      isDuplicate: item.code === code
    })));
  };

  /**
   * Maneja los cambios en el campo de entrada
   * - Filtra caracteres no numéricos
   * - Limita a 13 dígitos
   * - Resetea estados de validación
   * - Hace focus al input de cantidad cuando se completa el código
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
    setInputCode(value);
    setError('');
    setIsValid(null);

    // Si el código tiene 13 dígitos, hacer focus al input de cantidad y limpiar su valor
    if (value.length === 13 && quantityInputRef.current) {
      setTempQuantity('');
      setQuantity(1);
      quantityInputRef.current.focus();
    }
  };

  /**
   * Maneja los cambios en el campo de cantidad
   * - Asegura que sea un número positivo
   * - Limita a un máximo de 100
   */
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setTempQuantity(value);
    if (value === '') {
      return;
    }
    const numValue = parseInt(value);
    if (numValue > 0) {
      setQuantity(Math.min(numValue, 100));
    }
  };

  const handleQuantityBlur = () => {
    if (tempQuantity === '') {
      setTempQuantity('1');
      setQuantity(1);
    }
  };

  /**
   * Maneja el evento focus del input de cantidad
   * - Limpia el valor actual para permitir una nueva entrada
   */
  const handleQuantityFocus = () => {
    setTempQuantity('');
  };

  /**
   * Maneja el evento keyDown del input de cantidad
   * - Si se presiona Enter y hay un valor válido, activa el botón de validar
   */
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempQuantity && parseInt(tempQuantity) > 0) {
      e.preventDefault();
      validateButtonRef.current?.click();
    }
  };

  /**
   * Maneja el cambio de cantidad en la tabla de códigos
   */
  const handleTableQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    
    if (value === '') {
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: 0 } : barcode
      ));
      return;
    }

    const numValue = parseInt(value);
    if (numValue > 0) {
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: Math.min(numValue, 100) } : barcode
      ));
    }
  };

  /**
   * Maneja el evento blur del input de cantidad en la tabla
   */
  const handleTableQuantityBlur = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (value === '' || parseInt(value) <= 0) {
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: 1 } : barcode
      ));
    }
  };

  /**
   * Agrega el código al array
   */
  const addCode = (code: string, quantity: number) => {
    setBarcodes(prev => [...prev, { 
      code, 
      quantity, 
      isValid: true,
      isDuplicate: false 
    }]);
    setInputCode('');
    setQuantity(1);
  };

  /**
   * Verifica si un código ya existe en el array y retorna su cantidad
   */
  const getExistingQuantity = (code: string): number => {
    const existingItem = barcodes.find(item => item.code === code);
    return existingItem ? existingItem.quantity : 0;
  };

  /**
   * Valida el código EAN-13 ingresado y lo agrega al array
   * - Verifica la longitud del código
   * - Valida el código usando el algoritmo EAN-13
   * - Agrega el código y su cantidad al array si es válido
   */
  const handleValidateCode = () => {
    if (inputCode.length !== 13) {
      setError('El código debe tener 13 dígitos');
      setIsValid(false);
      return;
    }

    const isValidCode = validateEAN13(inputCode);
    setIsValid(isValidCode);

    if (isValidCode) {
      if (isCodeDuplicate(inputCode)) {
        setPendingCode({ code: inputCode, quantity });
        setShowModal(true);
        return;
      }

      addCode(inputCode, quantity);
      setTempQuantity('1');
      setQuantity(1);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  /**
   * Maneja la confirmación del modal
   */
  const handleModalConfirm = () => {
    if (pendingCode) {
      setBarcodes(prev => prev.map(item => {
        if (item.code === pendingCode.code) {
          return {
            ...item,
            quantity: item.quantity + pendingCode.quantity
          };
        }
        return item;
      }));
      setShowModal(false);
      setPendingCode(null);
    }
  };

  /**
   * Maneja la cancelación del modal
   */
  const handleModalCancel = () => {
    setShowModal(false);
    setPendingCode(null);
  };

  /**
   * Elimina un código del array
   */
  const handleRemoveCode = (index: number) => {
    setBarcodes(prev => {
      const newBarcodes = prev.filter((_, i) => i !== index);
      // Actualizar el estado de duplicados después de eliminar
      const codes = newBarcodes.map(item => item.code);
      return newBarcodes.map(item => ({
        ...item,
        isDuplicate: codes.filter(code => code === item.code).length > 1
      }));
    });
  };

  console.log('barcodes', barcodes);
  return (
    <div className={`${styles.container} ${fadeIn ? styles.fadeIn : ''}`}>
      <Head>
        <title>Generador de Código de Barras EAN-13</title>
        <meta name="description" content="Lector de códigos de barras EAN-13" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
      <h1 className={styles.title}>
        Generador de Código de Barras EAN-13
        </h1>
        <PdfImprimir barcodes={barcodes}/>
        

        {/* Contenedor principal de la aplicación */}
        <div className={styles.codeContainer}>
          {/* Grupo de entrada y botón de validación */}
          <div className={styles.inputGroup}>
            <input
              ref={inputRef}
              type="text"
              value={inputCode}
              onChange={handleInputChange}
              placeholder="Ingrese el código EAN-13"
              className={styles.input}
            />
            <input
              ref={quantityInputRef}
              type="text"
              value={tempQuantity}
              onChange={handleQuantityChange}
              onBlur={handleQuantityBlur}
              onFocus={handleQuantityFocus}
              onKeyDown={handleQuantityKeyDown}
              className={styles.quantityInput}
              pattern="[1-9][0-9]*"
              inputMode="numeric"
            />
            <button 
              ref={validateButtonRef}
              onClick={handleValidateCode}
              className={styles.validateButton}
            >
              Validar Código
            </button>
          </div>

          {/* Mensaje de error si existe */}
          {error && (
            <p className={styles.error}>{error}</p>
          )}

          {/* Modal de confirmación */}
          {showModal && pendingCode && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>¡Código Duplicado!</h3>
                <p>
                  Este código ya existe en la lista con {getExistingQuantity(pendingCode.code)} unidades.
                  ¿Desea agregar {pendingCode.quantity} unidades más?
                </p>
                <div className={styles.modalButtons}>
                  <button onClick={handleModalConfirm} className={styles.modalConfirmButton}>
                    Sí, Agregar
                  </button>
                  <button onClick={handleModalCancel} className={styles.modalCancelButton}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de códigos guardados */}
          {barcodes.length > 0 && (
            <div className={styles.savedCodesContainer}>
              <h2 className={styles.subtitle}>Códigos Guardados</h2>
              <table className={styles.barcodesTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Código EAN</th>
                    <th>Imagen</th>
                    <th>Cantidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {barcodes.map((item, index) => (
                    <tr key={index} className={item.isDuplicate ? styles.duplicateRow : ''}>
                      <td>{index + 1}</td>
                      <td>{item.code}</td>
                      <td>
                        <div className={styles.barcodeWrapper}>
                          <Barcode 
                            value={item.code}
                            width={1.5}
                            height={80}
                            fontSize={14}
                            margin={0}
                            displayValue={true}
                            background="#ffffff"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => handleTableQuantityChange(e, index)}
                          onBlur={(e) => handleTableQuantityBlur(e, index)}
                          className={styles.quantityInput}
                          pattern="[1-9][0-9]*"
                          inputMode="numeric"
                          min="1"
                        />
                      </td>
                      <td>
                        <button 
                          onClick={() => handleRemoveCode(index)}
                          className={styles.removeButton}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Desarrollado con Next.js</p>
      </footer>
    </div>
  );
} 