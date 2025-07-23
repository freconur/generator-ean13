import { useState, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import styles from '../styles/Home.module.css';
import { validateEAN13 } from '../utils/ean13Generator';
import { formatPrice } from '../utils/formatPrice';

// Interfaz para el tipo de código de barras
interface BarcodeItem {
  code: string;
  quantity: number;
  isValid: boolean;
  isDuplicate?: boolean;
  description?: string;
  price?: number;
  hasDescription: boolean;
  hasPrice: boolean;
}

interface BarcodeFormProps {
  barcodes: BarcodeItem[];
  setBarcodes: React.Dispatch<React.SetStateAction<BarcodeItem[]>>;
  enableDescription: boolean;
  setEnableDescription: React.Dispatch<React.SetStateAction<boolean>>;
  enablePrice: boolean;
  setEnablePrice: React.Dispatch<React.SetStateAction<boolean>>;
  showPDFPreview: boolean;
  setShowPDFPreview: React.Dispatch<React.SetStateAction<boolean>>;
  customCurrency?: string;
}

export default function BarcodeForm({
  barcodes,
  setBarcodes,
  enableDescription,
  setEnableDescription,
  enablePrice,
  setEnablePrice,
  showPDFPreview,
  setShowPDFPreview,
  customCurrency
}: BarcodeFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const validateButtonRef = useRef<HTMLButtonElement>(null);
  
  const [inputCode, setInputCode] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [tempQuantity, setTempQuantity] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pendingCode, setPendingCode] = useState<{code: string, quantity: number, description?: string, price?: number} | null>(null);
  const [wasPreviewOpen, setWasPreviewOpen] = useState<boolean>(false);
  const [tempTableQuantities, setTempTableQuantities] = useState<{[key: number]: string}>({});
  const [barcodeHeight, setBarcodeHeight] = useState<number>(80);

  /**
   * Determina si los checkboxes deben estar deshabilitados basándose en los códigos existentes
   */
  const getCheckboxStates = () => {
    if (barcodes.length === 0) {
      return {
        shouldDisableDescription: false,
        shouldDisablePrice: false,
        shouldEnableDescription: false,
        shouldEnablePrice: false
      };
    }

    const firstCode = barcodes[0];
    const formatHasDescription = firstCode.hasDescription;
    const formatHasPrice = firstCode.hasPrice;

    return {
      shouldDisableDescription: true,
      shouldDisablePrice: true,
      shouldEnableDescription: formatHasDescription,
      shouldEnablePrice: formatHasPrice
    };
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Efecto para auto-habilitar checkboxes basándose en códigos existentes
  useEffect(() => {
    const checkboxStates = getCheckboxStates();
    
    if (checkboxStates.shouldEnableDescription && !enableDescription) {
      setEnableDescription(true);
    }
    
    if (checkboxStates.shouldEnablePrice && !enablePrice) {
      setEnablePrice(true);
    }
  }, [barcodes, enableDescription, enablePrice, setEnableDescription, setEnablePrice]);

  /**
   * Verifica si un código ya existe en el array
   */
  const isCodeDuplicate = (code: string): boolean => {
    return barcodes.some(item => item.code === code);
  };

  /**
   * Maneja los cambios en el campo de entrada
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
    setInputCode(value);
    setError('');
    setIsValid(null);

    if (value.length === 13 && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  };

  /**
   * Maneja los cambios en el campo de cantidad
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

  const handleQuantityFocus = () => {
    setTempQuantity('');
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempQuantity && parseInt(tempQuantity) > 0) {
      e.preventDefault();
      validateButtonRef.current?.click();
    }
  };

  /**
   * Maneja los cambios en el campo de descripción
   */
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
    if (error && enableDescription) {
      setError('');
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && priceInputRef.current) {
      e.preventDefault();
      priceInputRef.current.focus();
    }
  };

  /**
   * Maneja los cambios en el campo de precio
   */
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
    if (error && enablePrice) {
      setError('');
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quantityInputRef.current) {
      e.preventDefault();
      setTempQuantity('');
      setQuantity(1);
      quantityInputRef.current.focus();
    }
  };

  /**
   * Maneja el cambio de cantidad en la tabla de códigos
   */
  const handleTableQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    
    setTempTableQuantities(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleTableQuantityBlur = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    if (value === '' || parseInt(value) <= 0) {
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: 1 } : barcode
      ));
    } else {
      const numValue = parseInt(value);
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: Math.min(numValue, 100) } : barcode
      ));
    }
    
    setTempTableQuantities(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
    
    if (wasPreviewOpen) {
      setTimeout(() => {
        setShowPDFPreview(true);
        setWasPreviewOpen(false);
      }, 200);
    }
  };

  const handleTableQuantityFocus = (index: number) => {
    setTempTableQuantities(prev => ({
      ...prev,
      [index]: ''
    }));
    
    if (showPDFPreview) {
      setWasPreviewOpen(true);
      setShowPDFPreview(false);
    }
  };

  /**
   * Agrega el código al array
   */
  const addCode = (code: string, quantity: number, description: string = '', price: number = 0) => {
    setBarcodes(prev => [...prev, { 
      code, 
      quantity, 
      isValid: true,
      isDuplicate: false,
      description: enableDescription ? description : '',
      price: enablePrice ? price : 0,
      hasDescription: enableDescription,
      hasPrice: enablePrice
    }]);
    setInputCode('');
    setQuantity(1);
    setDescription('');
    setPrice('');
    setTempQuantity('1');
    
    const checkboxStates = getCheckboxStates();
    if (!checkboxStates.shouldEnableDescription) {
      setEnableDescription(false);
    }
    if (!checkboxStates.shouldEnablePrice) {
      setEnablePrice(false);
    }
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
   */
  const handleValidateCode = () => {
    if (inputCode.length !== 13) {
      setError('El código debe tener 13 dígitos');
      setIsValid(false);
      return;
    }

    if (enableDescription && description.trim() === '') {
      setError('La descripción es requerida cuando está habilitada');
      setIsValid(false);
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus();
      }
      return;
    }

    if (enablePrice && (price.trim() === '' || parseFloat(price) <= 0)) {
      setError('El precio debe ser mayor a 0 cuando está habilitado');
      setIsValid(false);
      if (priceInputRef.current) {
        priceInputRef.current.focus();
      }
      return;
    }

    const isValidCode = validateEAN13(inputCode);
    setIsValid(isValidCode);

    if (isValidCode) {
      if (isCodeDuplicate(inputCode)) {
        setPendingCode({ 
          code: inputCode, 
          quantity, 
          description: enableDescription ? description.trim() : '', 
          price: enablePrice ? parseFloat(price) || 0 : 0 
        });
        setShowModal(true);
        return;
      }

      addCode(
        inputCode, 
        quantity, 
        enableDescription ? description.trim() : '', 
        enablePrice ? parseFloat(price) || 0 : 0
      );
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
      
      setInputCode('');
      setQuantity(1);
      setDescription('');
      setPrice('');
      setTempQuantity('1');
      
      const checkboxStates = getCheckboxStates();
      if (!checkboxStates.shouldEnableDescription) {
        setEnableDescription(false);
      }
      if (!checkboxStates.shouldEnablePrice) {
        setEnablePrice(false);
      }
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  /**
   * Maneja la cancelación del modal
   */
  const handleModalCancel = () => {
    setShowModal(false);
    setPendingCode(null);
    
    setInputCode('');
    setQuantity(1);
    setDescription('');
    setPrice('');
    setTempQuantity('1');
    
    const checkboxStates = getCheckboxStates();
    if (!checkboxStates.shouldEnableDescription) {
      setEnableDescription(false);
    }
    if (!checkboxStates.shouldEnablePrice) {
      setEnablePrice(false);
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Elimina un código del array
   */
  const handleRemoveCode = (index: number) => {
    setBarcodes(prev => {
      const newBarcodes = prev.filter((_, i) => i !== index);
      const codes = newBarcodes.map(item => item.code);
      return newBarcodes.map(item => ({
        ...item,
        isDuplicate: codes.filter(code => code === item.code).length > 1
      }));
    });
  };

  return (
    <div className={styles.codeContainer}>
      {/* Mensaje informativo sobre formato bloqueado */}
      {barcodes.length > 0 && (
        <div className={styles.formatInfoMessage}>
          <div className={styles.formatInfoIcon}>🔒</div>
          <div className={styles.formatInfoText}>
            <strong>Formato bloqueado:</strong> Todos los códigos deben tener el mismo formato.
            {barcodes[0].hasDescription && barcodes[0].hasPrice && " Incluyendo descripción y precio."}
            {barcodes[0].hasDescription && !barcodes[0].hasPrice && " Incluyendo descripción solamente."}
            {!barcodes[0].hasDescription && barcodes[0].hasPrice && " Incluyendo precio solamente."}
            {!barcodes[0].hasDescription && !barcodes[0].hasPrice && " Sin descripción ni precio."}
          </div>
        </div>
      )}
      
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
        
        {/* Checkbox y input para descripción */}
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={enableDescription}
              onChange={(e) => {
                setEnableDescription(e.target.checked);
                if (!e.target.checked) {
                  setDescription('');
                }
              }}
              className={styles.checkbox}
              disabled={getCheckboxStates().shouldDisableDescription}
            />
            Agregar descripción
            {barcodes.length > 0 && (
              <span className={styles.formatLockMessage}>
                (formato bloqueado)
              </span>
            )}
          </label>
          <input
            ref={descriptionInputRef}
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={handleDescriptionKeyDown}
            placeholder={enableDescription ? "Descripción (requerida)" : "Descripción (opcional)"}
            className={`${styles.input} ${enableDescription ? styles.requiredField : ''}`}
            disabled={!enableDescription}
            required={enableDescription}
          />
        </div>

        {/* Checkbox y input para precio */}
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={enablePrice}
              onChange={(e) => {
                setEnablePrice(e.target.checked);
                if (!e.target.checked) {
                  setPrice('');
                }
              }}
              className={styles.checkbox}
              disabled={getCheckboxStates().shouldDisablePrice}
            />
            Agregar precio
            {barcodes.length > 0 && (
              <span className={styles.formatLockMessage}>
                (formato bloqueado)
              </span>
            )}
          </label>
          <input
            ref={priceInputRef}
            type="number"
            value={price}
            onChange={handlePriceChange}
            onKeyDown={handlePriceKeyDown}
            placeholder={enablePrice ? "Precio (requerido)" : "Precio (opcional)"}
            className={`${styles.input} ${enablePrice ? styles.requiredField : ''}`}
            step="0.01"
            min="0.01"
            disabled={!enablePrice}
            required={enablePrice}
          />
        </div>

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
              {pendingCode.description && (
                <>
                  <br />
                  <strong>Descripción:</strong> {pendingCode.description}
                </>
              )}
              {pendingCode.price !== undefined && pendingCode.price > 0 && (
                <>
                  <br />
                  <strong>Precio:</strong> {formatPrice(pendingCode.price, customCurrency)}
                </>
              )}
              <br />
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
          
          {/* Control de altura del código de barras */}
          <div className={styles.heightControlContainer}>
            <label className={styles.heightControlLabel}>
              Altura del código de barras: {barcodeHeight}px
            </label>
            <div className={styles.heightControlGroup}>
              <input
                type="range"
                min="40"
                max="150"
                step="5"
                value={barcodeHeight}
                onChange={(e) => setBarcodeHeight(parseInt(e.target.value))}
                className={styles.heightSlider}
              />
              <input
                type="number"
                min="40"
                max="150"
                step="5"
                value={barcodeHeight}
                onChange={(e) => setBarcodeHeight(parseInt(e.target.value) || 80)}
                className={styles.heightInput}
              />
            </div>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.barcodesTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Código EAN</th>
                <th>Descripción</th>
                <th>Precio</th>
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
                    {item.hasDescription ? (
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          setBarcodes(prev => prev.map((barcode, i) => 
                            i === index ? { ...barcode, description: e.target.value } : barcode
                          ));
                        }}
                        className={styles.descriptionInput}
                        placeholder="Descripción"
                      />
                    ) : (
                      <span className={styles.disabledField}>-</span>
                    )}
                  </td>
                  <td>
                    {item.hasPrice ? (
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => {
                          setBarcodes(prev => prev.map((barcode, i) => 
                            i === index ? { ...barcode, price: parseFloat(e.target.value) || 0 } : barcode
                          ));
                        }}
                        className={styles.priceInput}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <span className={styles.disabledField}>-</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.barcodeWrapper}>
                      <Barcode 
                        value={item.code}
                        width={1.5}
                        height={barcodeHeight}
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
                      value={tempTableQuantities[index] !== undefined ? tempTableQuantities[index] : item.quantity}
                      onChange={(e) => handleTableQuantityChange(e, index)}
                      onBlur={(e) => handleTableQuantityBlur(e, index)}
                      onFocus={() => handleTableQuantityFocus(index)}
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
        </div>
      )}
    </div>
  );
} 