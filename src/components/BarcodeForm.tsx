import { useState, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import ExcelImportModal from './ExcelImportModal';
import BarcodeReaderModal from './BarcodeReaderModal';
import { validateEAN13 } from '../utils/ean13Generator';
import { formatPrice } from '../utils/formatPrice';
import { useAuth } from '../context/AuthContext';
import { useLimits } from '../hooks/useLimits';
import { db } from '../utils/firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { saveItemsSubcollection } from './BarcodeGeneratorWorkspace';

import { BarcodeSettings } from './PDF-ean13';

const sanitizeInput = (text: string): string => {
  return text.replace(/[<>]/g, '').trim();
};

interface BarcodeItem {
  id?: string;
  code: string;
  quantity: number;
  isValid: boolean;
  isDuplicate?: boolean;
  description?: string;
  price?: number;
  hasDescription: boolean;
  hasPrice: boolean;
  print?: boolean;
}

const fuzzyMatch = (text: string, queryText: string): boolean => {
  if (!queryText) return true;
  const cleanText = text.toLowerCase();
  const cleanQuery = queryText.toLowerCase().trim();
  
  // 1. Dividir la consulta por palabras
  const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return true;

  // 2. Verificar que todas las palabras coincidan en el texto (intersección AND)
  return tokens.every(token => {
    // Coincidencia exacta de subcadena
    if (cleanText.includes(token)) return true;

    // Para términos muy cortos (<=2 letras), no permitir aproximación difusa para evitar ruido
    if (token.length <= 2) return false;

    // Tolerancia a errores ortográficos (Levenshtein): max 1 error para largo 3-4, max 2 errores para >=5
    const maxDistance = token.length <= 4 ? 1 : 2;
    
    // Separar el texto en palabras individuales
    const textWords = cleanText.split(/[^a-z0-9ñáéíóú]/).filter(w => w.length > 0);
    return textWords.some(word => {
      if (Math.abs(word.length - token.length) > maxDistance) return false;
      
      // Matriz de Levenshtein optimizada
      let prevRow = Array.from({ length: token.length + 1 }, (_, k) => k);
      let currentRow = [];
      
      for (let i = 1; i <= word.length; i++) {
        currentRow = [i];
        for (let j = 1; j <= token.length; j++) {
          const cost = word[i - 1] === token[j - 1] ? 0 : 1;
          currentRow.push(Math.min(
            currentRow[j - 1] + 1,       // Inserción
            prevRow[j] + 1,              // Eliminación
            prevRow[j - 1] + cost        // Sustitución
          ));
        }
        prevRow = currentRow;
      }
      
      const distance = prevRow[token.length];
      return distance <= maxDistance;
    });
  });
};

const highlightText = (text: string, queryText: string) => {
  if (!queryText) return <span>{text}</span>;
  const cleanQuery = queryText.toLowerCase().trim();
  const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return <span>{text}</span>;

  const escapedTokens = tokens.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} style={{ backgroundColor: '#fef08a', color: '#1e293b', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

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
  barcodeSettings: BarcodeSettings;
  onImportCSV: (items: BarcodeItem[]) => void;
  loadedBatchId?: string | null;
  loadedBatchName?: string | null;
  onSaveBatch?: (name?: string, overwrite?: boolean) => Promise<void>;
  isSavingBatchParent?: boolean;
  isDashboard?: boolean;
  onOpenCurrencyModal?: () => void;
  isBatchExceeded?: boolean;
  userBatchesCount?: number;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
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
  customCurrency,
  barcodeSettings,
  onImportCSV,
  loadedBatchId,
  loadedBatchName,
  onSaveBatch,
  isSavingBatchParent,
  isDashboard,
  onOpenCurrencyModal,
  isBatchExceeded = false,
  userBatchesCount = 0,
  isDirty,
  setIsDirty
}: BarcodeFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const validateButtonRef = useRef<HTMLButtonElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  
  const { user, profile, setIsAuthModalOpen } = useAuth();
  const { limits } = useLimits();
  const isPro = profile?.subscription?.tier === 'pro' &&
                profile?.subscription?.status === 'active' &&
                (!profile?.subscription?.expiresAt ||
                 Date.now() < (profile.subscription.expiresAt < 99999999999 ? profile.subscription.expiresAt * 1000 : profile.subscription.expiresAt));
  
  const maxCodes = !user 
    ? limits.guest.maxCodesPerBatch 
    : (isPro ? limits.pro.maxCodesPerBatch : limits.free.maxCodesPerBatch);
  
  const isReadOnly = barcodes.length > maxCodes || isBatchExceeded;

  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const isSaving = isSavingBatchParent !== undefined ? isSavingBatchParent : isSavingBatch;
  
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
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [showInvalidModal, setShowInvalidModal] = useState<boolean>(false);
  const [invalidCodeAttempt, setInvalidCodeAttempt] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showGs1RedirectModal, setShowGs1RedirectModal] = useState<boolean>(false);
  const [editingDescIndex, setEditingDescIndex] = useState<number | null>(null);
  const [tempDescValue, setTempDescValue] = useState<string>('');
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState<string>('');
  const [isReaderOpen, setIsReaderOpen] = useState<boolean>(false);
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = useState<boolean>(false);
  const optionsDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para el Escáner Inteligente (Asistente de Impresión y Selección)
  const [flashingIndex, setFlashingIndex] = useState<number | null>(null);
  const [showQuickPrintConfigModal, setShowQuickPrintConfigModal] = useState<boolean>(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [scannedCodeToInsert, setScannedCodeToInsert] = useState<string>('');
  const [pendingEditCodeIndex, setPendingEditCodeIndex] = useState<number | null>(null);
  const [quickAddQty, setQuickAddQty] = useState<number>(1);
  const [quickAddDesc, setQuickAddDesc] = useState<string>('');
  const [quickAddPrice, setQuickAddPrice] = useState<string>('');
  const [isQuickAdding, setIsQuickAdding] = useState<boolean>(false);
  const [isListExpanded, setIsListExpanded] = useState<boolean>(true);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target as Node)) {
        setIsOptionsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && router.query.addCode) {
      const code = router.query.addCode as string;
      if (code.length === 13 && !barcodes.some(item => item.code === code)) {
        addCode(code, 1, 'código gs1 autogenerado', 0);
        router.replace(
          { pathname: router.pathname, query: { ...router.query, addCode: undefined } },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [mounted, router.query.addCode, barcodes]);

  useEffect(() => {
    if (editingDescIndex !== null && editingInputRef.current) {
      editingInputRef.current.focus();
    }
  }, [editingDescIndex]);

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
      if (numValue > 100) {
        setError('La cantidad máxima permitida es 100');
        setQuantity(100);
        setTempQuantity('100');
      } else {
        if (error === 'La cantidad máxima permitida es 100') {
          setError('');
        }
        setQuantity(numValue);
      }
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
    const val = e.target.value;
    if (val.length > 200) {
      setError('La descripción no puede superar los 200 caracteres');
    } else if (error === 'La descripción no puede superar los 200 caracteres') {
      setError('');
    }
    setDescription(val.slice(0, 200));
    if (error && enableDescription && val.length <= 200) {
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
    const val = e.target.value;
    const num = parseFloat(val);
    if (!isNaN(num) && num < 0) {
      setError('El precio no puede ser negativo');
      setPrice('0');
      return;
    }
    const numVal = parseFloat(val) || 0;
    if (numVal > 999999) {
      setError('El precio máximo permitido es $999,999');
      setPrice('999999');
    } else {
      if (error === 'El precio máximo permitido es $999,999' || error === 'El precio no puede ser negativo') {
        setError('');
      }
      setPrice(val);
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

  const handleInlineUpdateField = async (index: number, updates: Partial<BarcodeItem>) => {
    const item = barcodes[index];
    if (!item) return;

    // Estandarizar la descripción si se actualiza
    const finalUpdates = { ...updates };
    if (finalUpdates.description !== undefined) {
      finalUpdates.description = sanitizeInput(String(finalUpdates.description || '')).toLowerCase();
    }

    if (user && loadedBatchId && item.id) {
      try {
        const itemDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId, 'items', item.id);
        await updateDoc(itemDocRef, finalUpdates);
        console.log('✅ Ítem actualizado en Firestore:', finalUpdates);
      } catch (error) {
        console.error('Error al actualizar ítem en Firestore:', error);
      }
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

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setBarcodes(prev => prev.map((barcode, i) => 
        i === index ? { ...barcode, quantity: Math.min(numValue, 100) } : barcode
      ));
    }
  };

  const handleTableQuantityBlur = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    let finalQty = 1;
    
    if (value !== '' && parseInt(value) > 0) {
      const parsed = parseInt(value);
      if (parsed > 100) {
        alert("La cantidad máxima permitida es 100 etiquetas.");
      }
      finalQty = Math.min(parsed, 100);
    }

    setBarcodes(prev => prev.map((barcode, i) => 
      i === index ? { ...barcode, quantity: finalQty } : barcode
    ));
    
    setTempTableQuantities(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });

    // Sincronizar con Firestore en caliente si hay lote activo
    handleInlineUpdateField(index, { quantity: finalQty });
  };

  const handleTableQuantityFocus = (index: number) => {
    const currentQty = barcodes[index]?.quantity;
    setTempTableQuantities(prev => ({
      ...prev,
      [index]: currentQty !== undefined ? String(currentQty) : ''
    }));
  };

  /**
   * Agrega el código al array
   */
  const addCode = async (code: string, quantity: number, description: string = '', price: number = 0) => {
    const formattedDesc = enableDescription ? sanitizeInput(String(description || '')).toLowerCase() : '';
    
    let newItemId: string | undefined;
    if (user && loadedBatchId) {
      try {
        const itemColRef = collection(db, 'users', user.uid, 'batches', loadedBatchId, 'items');
        const newItemDoc = doc(itemColRef);
        newItemId = newItemDoc.id;
        const itemData = {
          code,
          quantity,
          isValid: true,
          description: formattedDesc,
          price: enablePrice ? price : 0,
          hasDescription: enableDescription,
          hasPrice: enablePrice,
          orderIndex: barcodes.length,
          print: true
        };
        await setDoc(newItemDoc, itemData);
        
        // Actualizar totalCount y updatedAt del lote en Firestore
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, {
          totalCount: barcodes.length + 1,
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Nuevo ítem guardado en Firestore:', newItemId);
      } catch (err) {
        console.error('Error al guardar nuevo ítem en Firestore:', err);
      }
    }

    setBarcodes(prev => [...prev, { 
      id: newItemId,
      code, 
      quantity, 
      isValid: true,
      isDuplicate: false,
      description: formattedDesc,
      price: enablePrice ? price : 0,
      hasDescription: enableDescription,
      hasPrice: enablePrice,
      print: true
    }]);
    setIsListExpanded(true);
    setInputCode('');
    setQuantity(1);
    setDescription('');
    setPrice('');
    setTempQuantity('1');
  };

  const generateNextGS1Correlative = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.gs1Config) {
          const config = data.gs1Config;
          const prefixLen = config.countryPrefix.length;
          const companyLen = config.companyPrefix.length;
          const prodLen = 12 - prefixLen - companyLen;
          if (prodLen > 0) {
            const nextSeq = (config.lastProductSeq || 0) + 1;
            const paddedProductCode = String(nextSeq).padStart(prodLen, '0');
            const code12 = `${config.countryPrefix}${config.companyPrefix}${paddedProductCode}`;
            
            // Calcular dígito verificador
            let sum = 0;
            for (let i = 0; i < 12; i++) {
              sum += parseInt(code12[i]) * (i % 2 === 0 ? 1 : 3);
            }
            const calculatedCheck = (10 - (sum % 10)) % 10;
            const generatedEAN = `${code12}${calculatedCheck}`;
            
            setInputCode(generatedEAN);
            setIsValid(true);
            setError('');
            
            // Actualizar Firestore para bloquear esta secuencia inmediatamente
            await updateDoc(userDocRef, {
              'gs1Config.lastProductSeq': nextSeq
            });
            
            // Enfoque automático según los campos habilitados
            if (enableDescription && descriptionInputRef.current) {
              descriptionInputRef.current.focus();
            } else if (enablePrice && priceInputRef.current) {
              priceInputRef.current.focus();
            } else if (quantityInputRef.current) {
              quantityInputRef.current.focus();
            }
          }
        } else {
          setShowGs1RedirectModal(true);
        }
      }
    } catch (err) {
      console.error('Error al generar correlativo rápido:', err);
    }
  };

  /**
   * Verifica si un código ya existe en el array y retorna su cantidad
   */
  const getExistingQuantity = (code: string): number => {
    const existingItem = barcodes.find(item => item.code === code);
    return existingItem ? existingItem.quantity : 0;
  };

  const handleSaveBatch = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const batchName = prompt("Ingresa un nombre para este lote:", `Lote del ${new Date().toLocaleDateString('es-PE')}`);
    if (batchName === null) return; // Cancelado

    const trimmedName = batchName.trim() || `Lote del ${new Date().toLocaleDateString('es-PE')}`;
    setIsSavingBatch(true);

    try {
      const newDocRef = doc(collection(db, 'users', user.uid, 'batches'));
      const batchMetadata = {
        id: newDocRef.id,
        name: trimmedName,
        totalCount: barcodes.length,
        enableDescription,
        enablePrice,
        customCurrency: customCurrency || null,
        createdAt: serverTimestamp()
      };
      await setDoc(newDocRef, batchMetadata);

      // Guardar los items correspondientes en la subcolección
      await saveItemsSubcollection(user.uid, newDocRef.id, barcodes);

      alert('¡Lote guardado con éxito en la nube! Puedes verlo en tu panel.');
    } catch (error) {
      console.error('Error al guardar el lote:', error);
      alert('Hubo un error al guardar el lote. Por favor verifica tu conexión y base de datos.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  /**
   * Valida el código EAN-13 ingresado y lo agrega al array
   */
  const handleValidateCode = () => {
    // Verificar límites de plan SaaS
    if (!user) {
      const maxCodes = limits.guest.maxCodesPerBatch;
      if (barcodes.length >= maxCodes) {
        setError(`Límite de invitado alcanzado (máx. ${maxCodes} códigos). Regístrate gratis para agregar más.`);
        setIsAuthModalOpen(true);
        return;
      }
    } else {
      const maxCodes = isPro ? limits.pro.maxCodesPerBatch : limits.free.maxCodesPerBatch;
      if (barcodes.length >= maxCodes) {
        setError(`Límite del plan alcanzado (máx. ${maxCodes} códigos por lote).`);
        alert(`Has alcanzado el límite de ${maxCodes} códigos por lote permitido para tu plan actual. ${isPro ? '' : 'Actualiza a Pro para expandir el límite a 1,000 códigos.'}`);
        return;
      }
    }

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

    if (enableDescription && description.length > 200) {
      setError('La descripción no puede superar los 200 caracteres');
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

    if (enablePrice && parseFloat(price) > 999999) {
      setError('El precio máximo permitido es $999,999');
      setIsValid(false);
      if (priceInputRef.current) {
        priceInputRef.current.focus();
      }
      return;
    }

    const qtyVal = parseInt(tempQuantity);
    if (isNaN(qtyVal) || qtyVal <= 0 || qtyVal > 100) {
      setError('La cantidad de etiquetas por código debe estar entre 1 y 100');
      setIsValid(false);
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
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
    } else {
      setInvalidCodeAttempt(inputCode);
      setShowInvalidModal(true);
    }
  };

  /**
   * Maneja la confirmación del modal
   */
  const handleModalConfirm = async () => {
    if (pendingCode) {
      const existingItem = barcodes.find(item => item.code === pendingCode.code);
      if (existingItem) {
        const newQuantity = existingItem.quantity + pendingCode.quantity;
        if (user && loadedBatchId && existingItem.id) {
          try {
            const itemDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId, 'items', existingItem.id);
            await updateDoc(itemDocRef, { quantity: newQuantity });
            console.log('✅ Cantidad duplicada actualizada en Firestore:', existingItem.id);
          } catch (err) {
            console.error('Error al actualizar cantidad duplicada en Firestore:', err);
          }
        }
      }

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
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemoveCode = async (index: number) => {
    const item = barcodes[index];
    if (user && loadedBatchId && item && item.id) {
      try {
        const itemDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId, 'items', item.id);
        await deleteDoc(itemDocRef);
        
        // Actualizar totalCount y updatedAt del lote en Firestore
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, {
          totalCount: Math.max(0, barcodes.length - 1),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Ítem eliminado de Firestore:', item.id);
      } catch (error) {
        console.error('Error al eliminar ítem de Firestore:', error);
      }
    }

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
    <div className={`${styles.codeContainer} ${isDashboard ? styles.codeContainerFullWidth : ''}`}>
      <div className={styles.formsRow}>
        <div className={styles.singleFormCard}>
          {isDashboard && (
            <div className={styles.formCardHeader}>
              <h3 className={styles.formCardTitle}>Generador de Códigos</h3>
              <div className={styles.headerButtons} ref={optionsDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => !isReadOnly && setIsOptionsDropdownOpen(!isOptionsDropdownOpen)}
                  className={`${styles.optionsDropdownBtn} ${isReadOnly ? styles.btnDisabled : ''}`}
                  disabled={isReadOnly}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Opciones
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '6px' }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {isOptionsDropdownOpen && !isReadOnly && (
                  <div className={styles.optionsDropdownMenu}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCurrencyModal?.();
                        setIsOptionsDropdownOpen(false);
                      }}
                      className={styles.dropdownMenuItem}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Configurar Moneda
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOptionsDropdownOpen(false);
                        if (!isPro) {
                          alert("La importación masiva desde Excel/CSV es una característica exclusiva del Plan Pro. ¡Próximamente podrás suscribirte al Plan Pro!");
                          return;
                        }
                        setShowImportModal(true);
                      }}
                      className={styles.dropdownMenuItem}
                    >
                      {!isPro ? '🔒 ' : ''}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Cargar Excel / CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isReadOnly && (
            <div className={styles.readOnlyBanner}>
              <div className={styles.readOnlyBannerIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className={styles.readOnlyBannerText}>
                {isBatchExceeded ? (
                  <>
                    <strong>Lote en modo Solo Lectura:</strong> Tienes {userBatchesCount} lotes, lo cual supera el límite de {limits.free.maxBatches} lotes permitidos en tu plan actual. Para volver a editar este lote, puedes eliminar otros lotes o actualizar tu cuenta.
                  </>
                ) : (
                  <>
                    <strong>Lote en modo Solo Lectura:</strong> Este lote contiene {barcodes.length} códigos, lo cual supera el límite de {maxCodes} códigos para tu plan actual. Para editar o agregar códigos, puedes eliminar códigos excedentes o actualizar tu cuenta.
                  </>
                )}
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className={styles.readOnlyBannerBtn}
                >
                  Actualizar a Pro
                </button>
              )}
            </div>
          )}

          {/* Fila principal de entrada */}
          <div className={styles.formCoreRow}>
            <div className={styles.eanField}>
              <div className={styles.inputWithScanner}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputCode}
                  onChange={handleInputChange}
                  placeholder="Ingrese el código EAN-13"
                  className={styles.input}
                  disabled={isReadOnly}
                />
                <button
                  type="button"
                  onClick={() => !isReadOnly && setIsReaderOpen(true)}
                  className={`${styles.scannerTriggerBtn} ${isReadOnly ? styles.btnDisabled : ''}`}
                  disabled={isReadOnly}
                  title="Escanear Código por Cámara"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      alert("El generador de correlativos GS1 es una característica exclusiva del Plan Pro. ¡Próximamente podrás suscribirte al Plan Pro!");
                      return;
                    }
                    if (!isReadOnly) {
                      generateNextGS1Correlative();
                    }
                  }}
                  className={`${styles.gs1QuickCorrelativeBtn} ${isReadOnly ? styles.btnDisabled : ''}`}
                  disabled={isReadOnly}
                  title="Autocompletar Siguiente Correlativo GS1"
                >
                  {!isPro ? '🔒 ' : ''}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', color: '#f59e0b' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Correlativo</span>
                </button>
              )}
            </div>

            <div className={styles.quantityField}>
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
                disabled={isReadOnly}
              />
            </div>

            <div className={styles.actionField}>
              <button 
                ref={validateButtonRef}
                onClick={handleValidateCode}
                className={`${styles.validateButton} ${isReadOnly ? styles.btnDisabled : ''}`}
                disabled={isReadOnly}
              >
                Validar Código
              </button>
            </div>
          </div>

          {/* Fila secundaria de campos opcionales */}
          <div className={styles.formOptionalRow}>
            {/* Checkbox y input para descripción */}
            <div className={styles.optionalField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enableDescription}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setEnableDescription(checked);
                    if (!checked) {
                      setDescription('');
                    }
                    if (user && loadedBatchId) {
                      try {
                        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
                        await updateDoc(batchDocRef, { enableDescription: checked });
                        console.log('✅ Habilitar descripción actualizado en Firestore:', checked);
                      } catch (err) {
                        console.error('Error al actualizar habilitar descripción en Firestore:', err);
                      }
                    }
                  }}
                  className={styles.checkbox}
                  disabled={isReadOnly}
                />
                Agregar descripción
              </label>
              {enableDescription && (
                <input
                  ref={descriptionInputRef}
                  type="text"
                  value={description}
                  onChange={handleDescriptionChange}
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Descripción (requerida)"
                  className={`${styles.input} ${styles.requiredField}`}
                  required
                  disabled={isReadOnly}
                />
              )}
            </div>

            {/* Checkbox y input para precio */}
            <div className={styles.optionalField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enablePrice}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setEnablePrice(checked);
                    if (!checked) {
                      setPrice('');
                    }
                    if (user && loadedBatchId) {
                      try {
                        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
                        await updateDoc(batchDocRef, { enablePrice: checked });
                        console.log('✅ Habilitar precio actualizado en Firestore:', checked);
                      } catch (err) {
                        console.error('Error al actualizar habilitar precio en Firestore:', err);
                      }
                    }
                  }}
                  className={styles.checkbox}
                  disabled={isReadOnly}
                />
                Agregar precio
              </label>
              {enablePrice && (
                <input
                  ref={priceInputRef}
                  type="number"
                  value={price}
                  onChange={handlePriceChange}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="Precio (requerido)"
                  className={`${styles.input} ${styles.requiredField}`}
                  step="0.01"
                  min="0.01"
                  required
                  disabled={isReadOnly}
                />
              )}
            </div>
          </div>

          {/* Mensaje de error si existe */}
          {error && (
            <p className={styles.error} style={{ margin: 0, color: '#ef4444' }}>{error}</p>
          )}
        </div>

      </div>

      {/* Modal de confirmación */}
      {mounted && showModal && pendingCode && typeof window !== 'undefined' && createPortal(
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
        </div>,
        document.body
      )}

      {mounted && showInvalidModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowInvalidModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '1rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Código EAN-13 No Válido</h3>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: '#475569', lineHeight: '1.5' }}>
              El código <strong>&quot;{invalidCodeAttempt}&quot;</strong> no cumple con la especificación estándar EAN-13 (debe tener exactamente 13 dígitos numéricos y el dígito verificador debe ser correcto).
            </p>
            <div className={styles.modalButtons} style={{ justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowInvalidModal(false);
                  if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                  }
                }} 
                className={styles.modalConfirmButton}
                style={{ background: '#ef4444' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de redirección al Asistente GS1 */}
      {mounted && showGs1RedirectModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowGs1RedirectModal(false)}>
          <div className={styles.importModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.importModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <h3 className={styles.importModalTitle}>Configurar Asistente GS1</h3>
              </div>
              <button className={styles.importModalCloseBtn} onClick={() => setShowGs1RedirectModal(false)} aria-label="Cerrar modal">×</button>
            </div>
            <div className={styles.importModalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 20px' }}>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                No tienes una configuración GS1 guardada. Para generar correlativos automáticos, primero debes configurar tus prefijos oficiales.
              </p>
              <div className={styles.saveButtonsContainer} style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowGs1RedirectModal(false)}
                  className={styles.saveAsNewBtn}
                  style={{ background: 'var(--hover-bg, rgba(0, 0, 0, 0.03))', color: 'var(--text-secondary)', boxShadow: 'none', border: '1px solid var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGs1RedirectModal(false);
                    router.push('/creator');
                  }}
                  className={styles.saveChangesBtn}
                >
                  Ir al Asistente
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de importación */}
      <ExcelImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={onImportCSV} />

      {/* Modal de Configuración de Impresión Rápida (Escáner) */}
      {mounted && showQuickPrintConfigModal && pendingEditCodeIndex !== null && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '420px', borderRadius: '16px', padding: '0', overflow: 'hidden' }}>
            <div className={styles.importModalHeader} style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(129, 140, 248, 0.05))', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success-color, #10b981)' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 className={styles.importModalTitle} style={{ margin: 0, fontSize: '1.1rem' }}>Producto Seleccionado</h3>
              </div>
              <button className={styles.importModalCloseBtn} onClick={() => {
                setShowQuickPrintConfigModal(false);
                setIsReaderOpen(true);
              }}>×</button>
            </div>
            <div className={styles.importModalBody} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Código Detectado
                </p>
                <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: 'var(--text-color, #0f172a)' }}>
                  {barcodes[pendingEditCodeIndex]?.code}
                </p>
                {barcodes[pendingEditCodeIndex]?.description && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-muted, #475569)', fontStyle: 'italic' }}>
                    "{barcodes[pendingEditCodeIndex]?.description}"
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--hover-bg, #f8fafc)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-color, #1e293b)' }}>
                  Configuración de la Etiqueta
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none', color: 'var(--text-color)' }}>
                  <input
                    type="checkbox"
                    checked={barcodes[pendingEditCodeIndex]?.hasDescription}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBarcodes(prev => prev.map((barcode, i) => 
                        i === pendingEditCodeIndex ? { ...barcode, hasDescription: checked } : barcode
                      ));
                      if (setIsDirty) setIsDirty(true);
                    }}
                    className={styles.tableCheckbox}
                    style={{ margin: '0' }}
                  />
                  Incluir Descripción en el PDF
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none', color: 'var(--text-color)' }}>
                  <input
                    type="checkbox"
                    checked={barcodes[pendingEditCodeIndex]?.hasPrice}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBarcodes(prev => prev.map((barcode, i) => 
                        i === pendingEditCodeIndex ? { ...barcode, hasPrice: checked } : barcode
                      ));
                      if (setIsDirty) setIsDirty(true);
                    }}
                    className={styles.tableCheckbox}
                    style={{ margin: '0' }}
                  />
                  Incluir Precio en el PDF
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowQuickPrintConfigModal(false);
                  setIsReaderOpen(true);
                }}
                className={styles.saveChangesBtn}
                style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
              >
                Confirmar y Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Adición Rápida (Escáner) */}
      {mounted && showQuickAddModal && scannedCodeToInsert && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '440px', borderRadius: '16px', padding: '0', overflow: 'hidden' }}>
            <div className={styles.importModalHeader} style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05))', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3 className={styles.importModalTitle} style={{ margin: 0, fontSize: '1.1rem' }}>Producto no Registrado</h3>
              </div>
              <button className={styles.importModalCloseBtn} onClick={() => {
                setShowQuickAddModal(false);
                setIsReaderOpen(true);
              }}>×</button>
            </div>
            <div className={styles.importModalBody} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary, #475569)' }}>
                El código <strong style={{ color: 'var(--text-color, #0f172a)' }}>{scannedCodeToInsert}</strong> no está en este lote. ¿Deseas agregarlo ahora e imprimirlo?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color, #334155)' }}>Cantidad de Etiquetas</label>
                  <input
                    type="number"
                    value={quickAddQty}
                    onChange={(e) => setQuickAddQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className={styles.quantityInput}
                    style={{ width: '100%', maxWidth: '100%', textAlign: 'left', padding: '8px 12px' }}
                    min="1"
                    max="100"
                  />
                </div>

                {enableDescription && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color, #334155)' }}>Descripción</label>
                    <input
                      type="text"
                      value={quickAddDesc}
                      onChange={(e) => setQuickAddDesc(e.target.value.slice(0, 200))}
                      placeholder="Descripción del producto"
                      className={styles.input}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                    />
                  </div>
                )}

                {enablePrice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color, #334155)' }}>Precio</label>
                    <input
                      type="number"
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(e.target.value)}
                      placeholder="0.00"
                      className={styles.input}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <div className={styles.saveButtonsContainer} style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '12px', display: 'flex' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddModal(false);
                    // Reabrir cámara para seguir escaneando si cancela
                    setIsReaderOpen(true);
                  }}
                  className={styles.saveAsNewBtn}
                  style={{ background: 'var(--hover-bg, rgba(0, 0, 0, 0.03))', color: 'var(--text-secondary)', boxShadow: 'none', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                  disabled={isQuickAdding}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // Validar precio
                    const priceVal = enablePrice ? parseFloat(quickAddPrice) || 0 : 0;
                    if (enablePrice && priceVal <= 0) {
                      alert("El precio debe ser mayor a 0 cuando está habilitado.");
                      return;
                    }

                    setIsQuickAdding(true);
                    try {
                      // Agregar código al lote (se sincroniza automáticamente a Firestore)
                      await addCode(
                        scannedCodeToInsert,
                        quickAddQty,
                        enableDescription ? quickAddDesc.trim() : '',
                        priceVal
                      );
                    } catch (error) {
                      console.error('Error al insertar ítem escaneado:', error);
                    } finally {
                      setIsQuickAdding(false);
                      setShowQuickAddModal(false);
                      // Reactivar lector de cámara de forma automática para no interrumpir el flujo
                      setIsReaderOpen(true);
                    }
                  }}
                  className={styles.saveChangesBtn}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                  disabled={isQuickAdding}
                >
                  {isQuickAdding ? 'Guardando...' : 'Guardar y Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lector por cámara */}
      {mounted && (
        <BarcodeReaderModal
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          onScanSuccess={(code) => {
            setIsListExpanded(true);
            const existingIndex = barcodes.findIndex(item => item.code === code);
            if (existingIndex !== -1) {
              // El código YA existe en el lote:
              // 1. Marcarlo para impresión en caliente
              setBarcodes(prev => prev.map((barcode, i) => 
                i === existingIndex ? { ...barcode, print: true } : barcode
              ));
              handleInlineUpdateField(existingIndex, { print: true });

              // 2. Activar efecto visual de destello en la tabla
              setFlashingIndex(existingIndex);
              setTimeout(() => {
                setFlashingIndex(null);
              }, 2200);

              // 3. Hacer scroll suave hacia la fila o tarjeta
              setTimeout(() => {
                const rowEl = document.getElementById(`barcode-row-${existingIndex}`) || document.getElementById(`barcode-card-${existingIndex}`);
                if (rowEl) {
                  rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 200);

              // 4. Abrir modal de configuración de impresión rápida
              setPendingEditCodeIndex(existingIndex);
              setShowQuickPrintConfigModal(true);
              setIsReaderOpen(false); // Cerramos el lector
              setExpandedRowIndex(existingIndex);
            } else {
              // El código NO existe en el lote:
              if (isReadOnly) {
                alert(`Lote en modo Solo Lectura. No se puede agregar el código "${code}" porque supera los límites de tu plan actual.`);
                setIsReaderOpen(false);
                return;
              }

              // Ejecutar validación inmediata del código escaneado
              const isValidCode = validateEAN13(code);
              if (!isValidCode) {
                setInvalidCodeAttempt(code);
                setShowInvalidModal(true);
                setIsReaderOpen(false);
                return;
              }

              // Preparar adición rápida
              setScannedCodeToInsert(code);
              setQuickAddQty(1);
              setQuickAddDesc('');
              setQuickAddPrice('');
              setShowQuickAddModal(true);
              setIsReaderOpen(false);
            }
          }}
        />
      )}

      {/* Tabla de códigos escaneados */}
      {barcodes.length > 0 && (
        <div className={styles.savedCodesContainer} style={{ marginTop: '2rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className={styles.subtitle} style={{ margin: 0 }}>Códigos Escaneados</h2>
                <button
                  type="button"
                  onClick={() => setIsListExpanded(prev => !prev)}
                  className={styles.accordionToggleBtn}
                  aria-expanded={isListExpanded}
                  title={isListExpanded ? "Colapsar lista" : "Expandir lista"}
                >
                  <span className={`${styles.accordionArrow} ${isListExpanded ? styles.accordionArrowExpanded : ''}`}>
                    ▼
                  </span>
                </button>
              </div>
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por descripción o código..."
                  className={styles.searchInputField}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn} title="Limpiar búsqueda">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {isDashboard && (
              <div className={styles.saveButtonsContainer}>
                {loadedBatchId && (
                  <button
                    onClick={() => onSaveBatch ? onSaveBatch(loadedBatchName || '', true) : null}
                    disabled={isSaving}
                    className={styles.saveChangesBtn}
                    title="Guardar Cambios"
                  >
                    {isSaving ? (
                      'Guardando...'
                    ) : (
                      <>
                        <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        <span className={styles.saveBtnText}>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onSaveBatch) {
                      onSaveBatch(undefined, false);
                    } else {
                      handleSaveBatch();
                    }
                  }}
                  disabled={isSaving}
                  className={styles.saveAsNewBtn}
                  title="Guardar Lote"
                >
                  {isSaving ? (
                    'Guardando...'
                  ) : (
                    <>
                      <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a6 6 0 0 0 0-12z" />
                      </svg>
                      <span className={styles.saveBtnText}>Guardar Lote</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {isListExpanded && (
            <div className={styles.tableContainer}>
              <table className={styles.barcodesTable}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={barcodes.length > 0 && barcodes.every(item => item.print !== false)}
                        ref={(el) => {
                          if (el) {
                            const allChecked = barcodes.length > 0 && barcodes.every(item => item.print !== false);
                            const noneChecked = barcodes.every(item => item.print === false);
                            el.indeterminate = barcodes.length > 0 && !allChecked && !noneChecked;
                          }
                        }}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          const checked = e.target.checked;
                          setBarcodes(prev => prev.map(item => ({ ...item, print: checked })));
                          if (setIsDirty) setIsDirty(true);
                        }}
                        disabled={isReadOnly}
                        className={styles.tableCheckbox}
                        title="Seleccionar / Deseleccionar todos para imprimir"
                        style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                      />
                    </th>
                    <th>#</th>
                    <th>Código EAN</th>
                    <th className={styles.descriptionColumn}>
                      <div className={styles.headerCellContent}>
                        <input
                          type="checkbox"
                          checked={barcodes.length > 0 && barcodes.every(item => item.hasDescription)}
                          ref={(el) => {
                            if (el) {
                              const allChecked = barcodes.length > 0 && barcodes.every(item => item.hasDescription);
                              const noneChecked = barcodes.every(item => !item.hasDescription);
                              el.indeterminate = barcodes.length > 0 && !allChecked && !noneChecked;
                            }
                          }}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const checked = e.target.checked;
                            setBarcodes(prev => prev.map(item => ({ ...item, hasDescription: checked })));
                            if (setIsDirty) setIsDirty(true);
                          }}
                          disabled={isReadOnly}
                          className={styles.tableCheckbox}
                          title="Seleccionar / Deseleccionar descripción para todos"
                          style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                        />
                        <span className={styles.columnHeaderText}>Descripción</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.columnHeaderIcon}>
                          <title>Imprimir descripción</title>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                    </th>
                    <th className={styles.priceColumn}>
                      <div className={styles.headerCellContent}>
                        <input
                          type="checkbox"
                          checked={barcodes.length > 0 && barcodes.every(item => item.hasPrice)}
                          ref={(el) => {
                            if (el) {
                              const allChecked = barcodes.length > 0 && barcodes.every(item => item.hasPrice);
                              const noneChecked = barcodes.every(item => !item.hasPrice);
                              el.indeterminate = barcodes.length > 0 && !allChecked && !noneChecked;
                            }
                          }}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const checked = e.target.checked;
                            setBarcodes(prev => prev.map(item => ({ ...item, hasPrice: checked })));
                            if (setIsDirty) setIsDirty(true);
                          }}
                          disabled={isReadOnly}
                          className={styles.tableCheckbox}
                          title="Seleccionar / Deseleccionar precio para todos"
                          style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                        />
                        <span className={styles.columnHeaderText}>Precio</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.columnHeaderIcon}>
                          <title>Imprimir precio</title>
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                      </div>
                    </th>
                    <th className={styles.desktopColumn}>Cantidad</th>
                    <th className={styles.desktopColumn}>Acciones</th>
                    <th className={styles.mobileArrowHeader} style={{ width: '32px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let renderedCount = 0;
                    const rows = barcodes.map((item, index) => {
                      const matchesSearch = !searchQuery || 
                        fuzzyMatch(item.description || '', searchQuery) ||
                        item.code.includes(searchQuery.trim());

                      if (!matchesSearch) return null;
                      renderedCount++;

                      const isExpanded = expandedRowIndex === index;

                      return (
                        <Fragment key={index}>
                          <tr 
                            id={`barcode-row-${index}`}
                            className={`${item.isDuplicate ? styles.duplicateRow : ''} ${item.print === false ? styles.nonPrintingRow : ''} ${flashingIndex === index ? styles.flashingRow : ''} ${isExpanded ? styles.expandedRowParent : ''}`}
                            onClick={(e) => {
                              if (window.innerWidth <= 768) {
                                const target = e.target as HTMLElement;
                                if (!target.closest('input, button, select, textarea, a, .clickable-ignore')) {
                                  setExpandedRowIndex(isExpanded ? null : index);
                                }
                              }
                            }}
                          >
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={item.print !== false}
                                onChange={(e) => {
                                  if (isReadOnly) return;
                                  const checked = e.target.checked;
                                  setBarcodes(prev => prev.map((barcode, i) => 
                                    i === index ? { ...barcode, print: checked } : barcode
                                  ));
                                  if (setIsDirty) setIsDirty(true);
                                }}
                                className={styles.tableCheckbox}
                                title="Incluir este código en el PDF"
                                style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                                disabled={isReadOnly}
                              />
                            </td>
                            <td>{index + 1}</td>
                            <td>{highlightText(item.code, searchQuery)}</td>
                            <td className={styles.descriptionColumn}>
                              <div className={styles.tableCellWithCheckbox}>
                                <input
                                  type="checkbox"
                                  checked={item.hasDescription}
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    const checked = e.target.checked;
                                    setBarcodes(prev => prev.map((barcode, i) => 
                                      i === index ? { ...barcode, hasDescription: checked } : barcode
                                    ));
                                    if (setIsDirty) setIsDirty(true);
                                  }}
                                  className={styles.tableCheckbox}
                                  title="Imprimir descripción en PDF"
                                  disabled={isReadOnly}
                                />
                                {editingDescIndex === index && !isReadOnly ? (
                                  <input
                                    ref={editingInputRef}
                                    type="text"
                                    value={tempDescValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val.length > 200) {
                                        alert("La descripción no puede superar los 200 caracteres.");
                                      }
                                      setTempDescValue(val.slice(0, 200));
                                    }}
                                    className={styles.descriptionInput}
                                    placeholder="Descripción"
                                    onBlur={(e) => {
                                      const val = String(e.target.value || '').toLowerCase().trim();
                                      setBarcodes(prev => prev.map((barcode, i) => 
                                        i === index ? { ...barcode, description: val } : barcode
                                      ));
                                      handleInlineUpdateField(index, { description: val });
                                      setEditingDescIndex(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                  />
                                ) : (
                                  <div
                                    className={styles.descriptionText}
                                    onClick={() => {
                                      if (!isReadOnly) {
                                        setEditingDescIndex(index);
                                        setTempDescValue(item.description || '');
                                      }
                                    }}
                                    style={isReadOnly ? { cursor: 'not-allowed' } : {}}
                                  >
                                    {item.description ? (
                                      highlightText(item.description, searchQuery)
                                    ) : (
                                      <span className={styles.descriptionPlaceholder}>Sin descripción</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={styles.priceColumn}>
                              <div className={styles.tableCellWithCheckbox}>
                                <input
                                  type="checkbox"
                                  checked={item.hasPrice}
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    const checked = e.target.checked;
                                    setBarcodes(prev => prev.map((barcode, i) => 
                                      i === index ? { ...barcode, hasPrice: checked } : barcode
                                    ));
                                    if (setIsDirty) setIsDirty(true);
                                  }}
                                  className={styles.tableCheckbox}
                                  title="Imprimir precio en PDF"
                                  disabled={isReadOnly}
                                />
                                <input
                                  type="number"
                                  value={editingPriceIndex === index ? tempPriceValue : (item.price !== undefined && item.price !== 0 ? String(item.price) : '')}
                                  onFocus={() => {
                                    if (isReadOnly) return;
                                    setEditingPriceIndex(index);
                                    setTempPriceValue(item.price !== undefined && item.price !== 0 ? String(item.price) : '');
                                  }}
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    setTempPriceValue(e.target.value);
                                  }}
                                  className={styles.priceInput}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  disabled={isReadOnly}
                                  onBlur={(e) => {
                                    if (isReadOnly) return;
                                    const val = parseFloat(e.target.value) || 0;
                                    if (val < 0) {
                                      alert("El precio no puede ser negativo.");
                                    }
                                    if (val > 999999) {
                                      alert("El precio máximo permitido es $999,999.");
                                    }
                                    const finalPrice = Math.max(0, Math.min(val, 999999));
                                    
                                    setBarcodes(prev => prev.map((barcode, i) => 
                                      i === index ? { ...barcode, price: finalPrice } : barcode
                                    ));
                                    handleInlineUpdateField(index, { price: finalPrice });
                                    setEditingPriceIndex(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className={styles.desktopColumn}>
                              <input
                                type="text"
                                value={tempTableQuantities[index] !== undefined ? tempTableQuantities[index] : item.quantity}
                                onChange={(e) => !isReadOnly && handleTableQuantityChange(e, index)}
                                onBlur={(e) => !isReadOnly && handleTableQuantityBlur(e, index)}
                                onFocus={() => !isReadOnly && handleTableQuantityFocus(index)}
                                className={styles.quantityInput}
                                pattern="[1-9][0-9]*"
                                inputMode="numeric"
                                min="1"
                                disabled={isReadOnly}
                              />
                            </td>
                            <td className={styles.desktopColumn}>
                              <button 
                                onClick={() => handleRemoveCode(index)}
                                className={styles.removeButton}
                              >
                                ×
                              </button>
                            </td>
                            <td className={styles.mobileArrowCell}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRowIndex(isExpanded ? null : index);
                                }}
                                className={`${styles.mobileArrowBtn} ${isExpanded ? styles.mobileArrowBtnExpanded : ''}`}
                                aria-expanded={isExpanded}
                                title={isExpanded ? "Cerrar detalles" : "Ver detalles"}
                              >
                                ▼
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={styles.expandedDetailRow}>
                              <td colSpan={8}>
                                <div className={styles.expandedDetailPanel}>
                                  <div className={styles.detailRowItem}>
                                    <label className={styles.detailLabel}>
                                      <input
                                        type="checkbox"
                                        checked={item.hasDescription}
                                        onChange={(e) => {
                                          if (isReadOnly) return;
                                          const checked = e.target.checked;
                                          setBarcodes(prev => prev.map((barcode, i) => 
                                            i === index ? { ...barcode, hasDescription: checked } : barcode
                                          ));
                                          if (setIsDirty) setIsDirty(true);
                                        }}
                                        className={styles.tableCheckbox}
                                        disabled={isReadOnly}
                                      />
                                      <span>Imprimir descripción</span>
                                    </label>
                                    {editingDescIndex === index && !isReadOnly ? (
                                      <input
                                        ref={editingInputRef}
                                        type="text"
                                        value={tempDescValue}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val.length > 200) {
                                            alert("La descripción no puede superar los 200 caracteres.");
                                          }
                                          setTempDescValue(val.slice(0, 200));
                                        }}
                                        className={styles.descriptionInput}
                                        style={{ border: '1px solid var(--border-color)', background: 'var(--background-secondary, #fff)', padding: '6px 8px', borderRadius: '6px' }}
                                        placeholder="Descripción"
                                        onBlur={(e) => {
                                          const val = String(e.target.value || '').toLowerCase().trim();
                                          setBarcodes(prev => prev.map((barcode, i) => 
                                            i === index ? { ...barcode, description: val } : barcode
                                          ));
                                          handleInlineUpdateField(index, { description: val });
                                          setEditingDescIndex(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className={styles.descriptionText}
                                        style={{ border: '1px solid var(--border-color)', background: 'var(--background-secondary, #fff)', padding: '6px 8px', borderRadius: '6px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                                        onClick={() => {
                                          if (!isReadOnly) {
                                            setEditingDescIndex(index);
                                            setTempDescValue(item.description || '');
                                          }
                                        }}
                                      >
                                        {item.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Añadir descripción...</span>}
                                      </div>
                                    )}
                                  </div>

                                  <div className={styles.detailRowItem}>
                                    <label className={styles.detailLabel}>
                                      <input
                                        type="checkbox"
                                        checked={item.hasPrice}
                                        onChange={(e) => {
                                          if (isReadOnly) return;
                                          const checked = e.target.checked;
                                          setBarcodes(prev => prev.map((barcode, i) => 
                                            i === index ? { ...barcode, hasPrice: checked } : barcode
                                          ));
                                          if (setIsDirty) setIsDirty(true);
                                        }}
                                        className={styles.tableCheckbox}
                                        disabled={isReadOnly}
                                      />
                                      <span>Imprimir precio</span>
                                    </label>
                                    <input
                                      type="number"
                                      value={editingPriceIndex === index ? tempPriceValue : (item.price !== undefined && item.price !== 0 ? String(item.price) : '')}
                                      onFocus={() => {
                                        if (isReadOnly) return;
                                        setEditingPriceIndex(index);
                                        setTempPriceValue(item.price !== undefined && item.price !== 0 ? String(item.price) : '');
                                      }}
                                      onChange={(e) => {
                                        if (isReadOnly) return;
                                        setTempPriceValue(e.target.value);
                                      }}
                                      className={styles.priceInput}
                                      style={{ border: '1px solid var(--border-color)', background: 'var(--background-secondary, #fff)', padding: '6px 8px', borderRadius: '6px', textAlign: 'left' }}
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                      disabled={isReadOnly}
                                      onBlur={(e) => {
                                        if (isReadOnly) return;
                                        const val = parseFloat(e.target.value) || 0;
                                        if (val < 0) {
                                          alert("El precio no puede ser negativo.");
                                        }
                                        if (val > 999999) {
                                          alert("El precio máximo permitido es $999,999.");
                                        }
                                        const finalPrice = Math.max(0, Math.min(val, 999999));
                                        
                                        setBarcodes(prev => prev.map((barcode, i) => 
                                          i === index ? { ...barcode, price: finalPrice } : barcode
                                        ));
                                        handleInlineUpdateField(index, { price: finalPrice });
                                        setEditingPriceIndex(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                    />
                                  </div>

                                  <div className={styles.detailRowItem}>
                                    <span className={styles.detailLabelText}>Cantidad</span>
                                    <input
                                      type="text"
                                      value={tempTableQuantities[index] !== undefined ? tempTableQuantities[index] : item.quantity}
                                      onChange={(e) => !isReadOnly && handleTableQuantityChange(e, index)}
                                      onBlur={(e) => !isReadOnly && handleTableQuantityBlur(e, index)}
                                      onFocus={() => !isReadOnly && handleTableQuantityFocus(index)}
                                      className={styles.quantityInput}
                                      style={{ border: '1px solid var(--border-color)', background: 'var(--background-secondary, #fff)', padding: '6px 8px', borderRadius: '6px', maxWidth: '100px' }}
                                      pattern="[1-9][0-9]*"
                                      inputMode="numeric"
                                      min="1"
                                      disabled={isReadOnly}
                                    />
                                  </div>

                                  <div className={styles.detailRowItem} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCode(index)}
                                      className={styles.mobileRemoveBtn}
                                      title="Eliminar código"
                                    >
                                      <span style={{ marginRight: '6px', fontSize: '1.2rem', lineHeight: '1' }}>×</span>
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    });

                    if (renderedCount === 0) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No se encontraron códigos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 