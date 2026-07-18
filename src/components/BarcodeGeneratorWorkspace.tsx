import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/BarcodeGeneratorWorkspace.module.css';
import { PdfImprimir, BarcodeSettings } from './PDF-ean13';
import BarcodeForm from './BarcodeForm';
import { getCurrencyCode, getCurrencySymbol, getLocalizationDebugInfo } from '../utils/formatPrice';
import CurrencyConfigModal from './CurrencyConfigModal';
import CreateBatchModal from './CreateBatchModal';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLimits } from '../hooks/useLimits';
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface BarcodeItem {
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

// Helper asíncrono para eliminar todos los items de la subcolección
export const deleteItemsSubcollection = async (userId: string, batchId: string) => {
  const itemsColRef = collection(db, 'users', userId, 'batches', batchId, 'items');
  const itemsSnapshot = await getDocs(itemsColRef);
  if (itemsSnapshot.empty) return;

  const docs = itemsSnapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500);
    const writeB = writeBatch(db);
    chunk.forEach(docSnap => {
      writeB.delete(docSnap.ref);
    });
    await writeB.commit();
  }
};

// Helper asíncrono para guardar todos los items en la subcolección usando writeBatch
export const saveItemsSubcollection = async (userId: string, batchId: string, barcodes: BarcodeItem[]): Promise<BarcodeItem[]> => {
  await deleteItemsSubcollection(userId, batchId);

  if (barcodes.length === 0) return [];

  const savedBarcodes = [...barcodes];

  for (let i = 0; i < barcodes.length; i += 500) {
    const chunk = barcodes.slice(i, i + 500);
    const writeB = writeBatch(db);
    chunk.forEach((item, idx) => {
      const orderIndex = i + idx;
      const itemDocRef = doc(collection(db, 'users', userId, 'batches', batchId, 'items'));
      
      const itemData = {
        code: item.code,
        quantity: item.quantity,
        isValid: !!item.isValid,
        description: String(item.description || '').toLowerCase().trim(),
        price: item.price || 0,
        hasDescription: !!item.hasDescription,
        hasPrice: !!item.hasPrice,
        orderIndex: orderIndex,
        print: item.print !== false
      };
      
      writeB.set(itemDocRef, itemData);
      savedBarcodes[orderIndex] = {
        ...item,
        id: itemDocRef.id,
        description: String(item.description || '').toLowerCase().trim(),
        print: item.print !== false
      };
    });
    await writeB.commit();
  }
  return savedBarcodes;
};

export default function BarcodeGeneratorWorkspace({ isDashboard = false }: { isDashboard?: boolean }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { limits } = useLimits();
  const isPro = profile?.subscription?.tier === 'pro' &&
                profile?.subscription?.status === 'active' &&
                (!profile?.subscription?.expiresAt ||
                 Date.now() < (profile.subscription.expiresAt < 99999999999 ? profile.subscription.expiresAt * 1000 : profile.subscription.expiresAt));
  const router = useRouter();
  const { batch } = router.query;

  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [enableDescription, setEnableDescription] = useState<boolean>(false);
  const [enablePrice, setEnablePrice] = useState<boolean>(false);
  const [showPDFPreview, setShowPDFPreview] = useState<boolean>(false);
  const [detectedCurrency, setDetectedCurrency] = useState<{ code: string; symbol: string; country: string }>({ code: '', symbol: '', country: '' });
  const [useManualCurrency, setUseManualCurrency] = useState<boolean>(false);
  const [manualCurrencyCode, setManualCurrencyCode] = useState<string>('');
  const [customCurrencyInput, setCustomCurrencyInput] = useState<string>('');
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Manejo de SSR
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Estados para el manejo de "Playlists" de lotes
  const [userBatches, setUserBatches] = useState<any[]>([]);
  const [loadedBatchId, setLoadedBatchId] = useState<string | null>(null);
  const [loadedBatchName, setLoadedBatchName] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempBatchName, setTempBatchName] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveDefaultName, setSaveDefaultName] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const bypassWarningRef = useRef<boolean>(false);

  const maxCodesAllowed = !user 
    ? limits.guest.maxCodesPerBatch 
    : (isPro ? limits.pro.maxCodesPerBatch : limits.free.maxCodesPerBatch);

  // Determinar si el lote actual excede el límite del número máximo de lotes permitidos del plan
  const loadedBatchIndex = userBatches.findIndex(b => b.id === loadedBatchId);
  const isBatchExceeded = !isPro && loadedBatchIndex !== -1 && loadedBatchIndex >= limits.free.maxBatches;

  const isReadOnly = barcodes.length > maxCodesAllowed || isBatchExceeded;

  // Escuchar el estado de conexión a internet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Cargar respaldo de invitado desde localStorage
  useEffect(() => {
    if (!user && !authLoading) {
      try {
        const backup = localStorage.getItem('izicode_guest_barcodes');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBarcodes(parsed);
            console.log('✅ Recuperados códigos de sesión de invitado desde almacenamiento local.');
          }
        }
      } catch (err) {
        console.error('Error al recuperar códigos de invitado:', err);
      }
    }
  }, [user, authLoading]);

  // Respaldar códigos de invitado en localStorage cuando cambien
  useEffect(() => {
    if (!user) {
      try {
        if (barcodes.length > 0) {
          localStorage.setItem('izicode_guest_barcodes', JSON.stringify(barcodes));
        } else {
          localStorage.removeItem('izicode_guest_barcodes');
        }
      } catch (err) {
        console.error('Error al respaldar códigos de invitado:', err);
      }
    }
  }, [barcodes, user]);

  const [barcodeSettings, setBarcodeSettings] = useState<BarcodeSettings>({
    width: 3,
    height: 110,
    fontSize: 24,
    marginHorizontal: 0,
    marginVertical: 0,
    showNumber: true,
    generalSpacing: 1,
    containerHeight: 60,
    textMargin: 2,
    descAlign: 'center',
    descFontSize: 10
  });

  // Obtener la moneda actual (manual o automática)
  const getCurrentCurrency = () => {
    if (useManualCurrency) {
      return manualCurrencyCode || customCurrencyInput || detectedCurrency.code;
    }
    return detectedCurrency.code;
  };

  // Guardar moneda configurada (por ejemplo, en el lote de Firestore)
  const handleSaveCurrency = async (code: string | null) => {
    if (user && loadedBatchId) {
      try {
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, { customCurrency: code });
        console.log('✅ Moneda actualizada en el lote:', code);
      } catch (error) {
        console.error('Error al actualizar moneda en el lote:', error);
      }
    }
  };

  // Detectar moneda local
  useEffect(() => {
    try {
      const currencyCode = getCurrencyCode();
      const currencySymbol = getCurrencySymbol();
      const debug = getLocalizationDebugInfo();
      setDetectedCurrency({ 
        code: currencyCode, 
        symbol: currencySymbol, 
        country: debug?.extractedRegion || 'ES' 
      });
      console.log('🔍 Detección de moneda inicial:', { currencyCode, currencySymbol, region: debug?.extractedRegion });
    } catch (error) {
      console.warn('Error detectando moneda:', error);
      setDetectedCurrency({ code: 'EUR', symbol: '€', country: 'ES' });
    }
  }, []);

  // Escuchar todos los lotes del usuario en tiempo real (Playlists)
  useEffect(() => {
    if (!user) {
      setUserBatches([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'batches'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedBatches: any[] = [];
      snapshot.forEach((doc) => {
        loadedBatches.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUserBatches(loadedBatches);
    }, (error) => {
      console.error("Error loading batches:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Cargar lote desde Firestore si viene en la URL
  useEffect(() => {
    const loadBatchFromFirestore = async () => {
      if (batch && user && !authLoading) {
        setIsLoadingBatch(true);
        try {
          const batchDocRef = doc(db, 'users', user.uid, 'batches', batch as string);
          const docSnap = await getDoc(batchDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Cargar los items correspondientes (soporte legacy y subcolección)
            if (data.barcodes && data.barcodes.length > 0) {
              setBarcodes(data.barcodes);
            } else {
              const itemsColRef = collection(db, 'users', user.uid, 'batches', batch as string, 'items');
              const q = query(itemsColRef, orderBy('orderIndex', 'asc'));
              const itemsSnap = await getDocs(q);
              const loadedCodes: BarcodeItem[] = [];
              itemsSnap.forEach((itemDoc) => {
                loadedCodes.push({ id: itemDoc.id, ...itemDoc.data() as BarcodeItem });
              });
              setBarcodes(loadedCodes);
            }

            if (data.enableDescription !== undefined) {
              setEnableDescription(data.enableDescription);
            }
            if (data.enablePrice !== undefined) {
              setEnablePrice(data.enablePrice);
            }
            if (data.customCurrency) {
              setUseManualCurrency(true);
              setManualCurrencyCode(data.customCurrency);
            }
            setLoadedBatchId(docSnap.id);
            setLoadedBatchName(data.name || 'Lote');
            console.log('✅ Lote cargado con éxito:', data.name);
          } else {
            console.error('El lote no existe o no tienes permisos para verlo.');
            alert('El lote no existe o no tienes permisos para verlo.');
          }
        } catch (error) {
          console.error('Error cargando el lote:', error);
        } finally {
          setIsLoadingBatch(false);
        }
      }
    };

    loadBatchFromFirestore();
  }, [batch, user, authLoading]);

  // Mostrar la vista previa automáticamente cuando se detecte que hay códigos
  useEffect(() => {
    if (barcodes.length > 0) {
      setShowPDFPreview(true);
    } else {
      setShowPDFPreview(false);
    }
  }, [barcodes.length, setShowPDFPreview]);

  // Advertir al usuario antes de salir/recargar la página si hay códigos sin guardar
  useEffect(() => {
    const warningText = "Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?";

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (bypassWarningRef.current) return;
      if ((!loadedBatchId && barcodes.length > 0) || isSavingBatch) {
        e.preventDefault();
        e.returnValue = warningText;
        return warningText;
      }
    };

    const handleBrowseAway = (url: string) => {
      if (bypassWarningRef.current) {
        // Reset reference so subsequent routing isn't bypassed
        bypassWarningRef.current = false;
        return;
      }
      if ((!loadedBatchId && barcodes.length > 0) || isSavingBatch) {
        if (!window.confirm(warningText)) {
          router.events.emit('routeChangeError');
          throw 'routeChange aborted';
        }
      }
    };

    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);

    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [loadedBatchId, barcodes.length, isSavingBatch, router]);

  // Manejar selección de lote desde la barra lateral (tipo playlist)
  const handleSelectBatch = async (selectedBatch: any) => {
    if (!user) return;
    
    // Advertir si hay cambios sin guardar en un lote nuevo
    if (!loadedBatchId && barcodes.length > 0) {
      const confirmLeave = window.confirm("Tienes un lote nuevo con códigos sin guardar. Si cambias de lote, perderás estos códigos. ¿Deseas continuar?");
      if (!confirmLeave) return;
    }

    try {
      let loadedCodes: BarcodeItem[] = [];
      if (selectedBatch.barcodes && selectedBatch.barcodes.length > 0) {
        loadedCodes = selectedBatch.barcodes;
      } else {
        const itemsColRef = collection(db, 'users', user.uid, 'batches', selectedBatch.id, 'items');
        const q = query(itemsColRef, orderBy('orderIndex', 'asc'));
        const itemsSnap = await getDocs(q);
        itemsSnap.forEach((itemDoc) => {
          loadedCodes.push({ id: itemDoc.id, ...itemDoc.data() as BarcodeItem });
        });
      }
      setBarcodes(loadedCodes);
      setEnableDescription(selectedBatch.enableDescription || false);
      setEnablePrice(selectedBatch.enablePrice || false);
      if (selectedBatch.customCurrency) {
        setUseManualCurrency(true);
        setManualCurrencyCode(selectedBatch.customCurrency);
      } else {
        setUseManualCurrency(false);
        setManualCurrencyCode('');
      }
      setLoadedBatchId(selectedBatch.id);
      setLoadedBatchName(selectedBatch.name);
    } catch (error) {
      console.error("Error al seleccionar lote:", error);
      alert("No se pudieron cargar los productos de este lote.");
    }
  };

  // Crear una nueva lista de códigos y limpiar estados
  const handleCreateNewBatch = () => {
    // Advertir si hay cambios sin guardar en un lote nuevo
    if (!loadedBatchId && barcodes.length > 0) {
      const confirmLeave = window.confirm("Tienes un lote nuevo con códigos sin guardar. Si creas uno nuevo, perderás estos códigos. ¿Deseas continuar?");
      if (!confirmLeave) return;
    }

    setBarcodes([]);
    setEnableDescription(false);
    setEnablePrice(false);
    setUseManualCurrency(false);
    setManualCurrencyCode('');
    setLoadedBatchId(null);
    setLoadedBatchName(null);
    if (router.query.batch) {
      router.push(isDashboard ? '/dashboard' : '/', undefined, { shallow: true });
    }
  };

  const handleRenameBatch = async () => {
    setIsEditingName(false);
    const sanitized = tempBatchName.replace(/[<>]/g, '').trim();
    if (!sanitized || sanitized === loadedBatchName) return;
    setLoadedBatchName(sanitized);
    if (user && loadedBatchId) {
      try {
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, { name: sanitized });
        console.log("✅ Lote renombrado en Firestore a:", sanitized);
      } catch (error) {
        console.error("Error al renombrar lote en Firestore:", error);
        alert("No se pudo guardar el nuevo nombre del lote.");
      }
    }
  };

  // Guardar Lote (Guardar Cambios o Guardar como Nuevo)
  const handleSaveBatch = async (name?: string, overwrite: boolean = false) => {
    if (!user) {
      alert("Por favor inicia sesión para guardar tus lotes.");
      return;
    }

    if (!overwrite || !loadedBatchId) {
      if (!name) {
        const defaultName = loadedBatchName 
          ? `${loadedBatchName} (Copia)` 
          : `Lote del ${new Date().toLocaleDateString('es-PE')}`;
        setSaveDefaultName(defaultName);
        setIsSaveModalOpen(true);
        return;
      }
    }

    const batchName = (name || (loadedBatchName 
      ? `${loadedBatchName} (Copia)` 
      : `Lote del ${new Date().toLocaleDateString('es-PE')}`)).replace(/[<>]/g, '').trim();

    setIsSavingBatch(true);

    try {
      const batchMetadata = {
        name: batchName,
        totalCount: barcodes.length,
        enableDescription,
        enablePrice,
        customCurrency: useManualCurrency ? getCurrentCurrency() : null,
        updatedAt: serverTimestamp()
      };

      let targetBatchId = loadedBatchId;

      if (overwrite && loadedBatchId) {
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, batchMetadata);
        setLoadedBatchName(batchName || 'Lote');
      } else {
        // Verificar límites de lotes
        const maxBatches = isPro ? limits.pro.maxBatches : limits.free.maxBatches;
        if (userBatches.length >= maxBatches) {
          alert(`Has alcanzado el límite máximo de lotes permitidos para tu plan (${maxBatches} lotes). ${isPro ? '' : 'Actualiza a Pro para tener hasta 20 lotes.'}`);
          setIsSavingBatch(false);
          return;
        }

        const newDocRef = doc(collection(db, 'users', user.uid, 'batches'));
        targetBatchId = newDocRef.id;
        const newBatchData = {
          ...batchMetadata,
          id: targetBatchId,
          createdAt: serverTimestamp()
        };
        await setDoc(newDocRef, newBatchData);
        setLoadedBatchId(targetBatchId);
        setLoadedBatchName(batchName || 'Lote');
        // Redireccionar al nuevo lote en el dashboard (evitando advertencia de salida)
        bypassWarningRef.current = true;
        router.push(`/dashboard?batch=${targetBatchId}`, undefined, { shallow: true });
      }

      // Guardar los items correspondientes en la subcolección
      if (targetBatchId) {
        const savedBarcodes = await saveItemsSubcollection(user.uid, targetBatchId, barcodes);
        setBarcodes(savedBarcodes);
      }

      if (overwrite && loadedBatchId) {
        alert(`¡Lote "${batchName}" actualizado con éxito!`);
      } else {
        alert(`¡Lote "${batchName}" guardado como nuevo en la nube!`);
      }
    } catch (error) {
      console.error('Error al guardar el lote:', error);
      alert('Hubo un error al guardar el lote. Por favor verifica tu conexión.');
    } finally {
      setIsSavingBatch(false);
      setTimeout(() => {
        bypassWarningRef.current = false;
      }, 500);
    }
  };

  // Eliminar lote directamente desde el Workspace
  const handleDeleteBatch = async (e: React.MouseEvent, batchId: string, batchName: string) => {
    e.stopPropagation(); // Evitar seleccionar el lote al borrar
    if (!user) return;
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar el lote "${batchName}"? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    try {
      // 1. Borrar todos los documentos de la subcolección 'items'
      await deleteItemsSubcollection(user.uid, batchId);

      // 2. Borrar el documento principal del lote
      await deleteDoc(doc(db, 'users', user.uid, 'batches', batchId));
      if (loadedBatchId === batchId) {
        handleCreateNewBatch();
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Hubo un error al eliminar el lote.");
    }
  };

  // Manejar códigos importados por CSV/Excel
  const handleImportBarcodes = async (importedItems: BarcodeItem[]) => {
    const hasAnyDescription = importedItems.some(item => item.description);
    const hasAnyPrice = importedItems.some(item => item.price);
    
    if (hasAnyDescription) setEnableDescription(true);
    if (hasAnyPrice) setEnablePrice(true);

    let savedItems: BarcodeItem[] = [];

    if (user && loadedBatchId) {
      try {
        const itemsColRef = collection(db, 'users', user.uid, 'batches', loadedBatchId, 'items');
        const newItemsWithIds: BarcodeItem[] = [];
        let currentOrderIndex = barcodes.length;
        
        for (let i = 0; i < importedItems.length; i += 500) {
          const chunk = importedItems.slice(i, i + 500);
          const writeB = writeBatch(db);
          
          chunk.forEach((item, idx) => {
            const newItemDocRef = doc(itemsColRef);
            const orderIndex = currentOrderIndex + i + idx;
            
            const itemData = {
              code: item.code,
              quantity: item.quantity || 1,
              isValid: item.isValid !== false,
              description: String(item.description || '').toLowerCase().trim(),
              price: item.price || 0,
              hasDescription: hasAnyDescription || !!item.hasDescription,
              hasPrice: hasAnyPrice || !!item.hasPrice,
              orderIndex: orderIndex,
              print: item.print !== false
            };
            
            writeB.set(newItemDocRef, itemData);
            
            newItemsWithIds.push({
              ...item,
              id: newItemDocRef.id,
              description: String(item.description || '').toLowerCase().trim(),
              print: item.print !== false
            });
          });
          
          await writeB.commit();
        }
        
        // Actualizar el totalCount en el documento del lote
        const batchDocRef = doc(db, 'users', user.uid, 'batches', loadedBatchId);
        await updateDoc(batchDocRef, {
          totalCount: barcodes.length + importedItems.length,
          updatedAt: serverTimestamp()
        });
        
        savedItems = newItemsWithIds;
        console.log('✅ Ítems importados guardados en Firestore.');
      } catch (error) {
        console.error('Error al guardar ítems importados en Firestore:', error);
        alert('Hubo un error al guardar los ítems importados en la nube.');
      }
    } else {
      savedItems = importedItems;
    }

    setBarcodes(prev => {
      const existingCodes = new Set(prev.map(item => item.code));
      const newItems = savedItems.map(item => ({
        ...item,
        description: item.description ? String(item.description).toLowerCase().trim() : '',
        isDuplicate: existingCodes.has(item.code) || item.isDuplicate
      }));
      return [...prev, ...newItems];
    });
  };

  return (
    <div className={styles.workspaceWrapper}>
        {isDashboard && (
          <div className={styles.workspaceHeader}>
            {isEditingName ? (
              <input
                type="text"
                value={tempBatchName}
                onChange={(e) => setTempBatchName(e.target.value)}
                onBlur={handleRenameBatch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameBatch();
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
                className={styles.renameInput}
                autoFocus
              />
            ) : (
              <h2 
                className={styles.workspaceTitle} 
                onClick={() => {
                  if (loadedBatchId && !isReadOnly) {
                    setTempBatchName(loadedBatchName || '');
                    setIsEditingName(true);
                  }
                }}
                style={loadedBatchId && !isReadOnly ? { cursor: 'pointer' } : { cursor: 'default' }}
                title={loadedBatchId && !isReadOnly ? "Haga clic para renombrar el lote" : undefined}
              >
                <svg className={styles.inlineIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                {loadedBatchName ? loadedBatchName : 'Tu Espacio de Trabajo Premium'}
                {loadedBatchId && !isReadOnly && (
                  <svg className={styles.editIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                )}
              </h2>
            )}
            <div className={styles.headerRightActions}>
              <div 
                className={`${styles.connectionIndicator} ${isOnline ? styles.online : styles.offline}`}
                title={isOnline ? "Conectado a la nube" : "Sin conexión: Guardando localmente en este dispositivo"}
              >
                <span className={styles.statusDot} />
                <span className={styles.statusText}>{isOnline ? "Conectado" : "Sin conexión"}</span>
              </div>
              <button
                onClick={() => {
                  if (!user) {
                    alert("Por favor inicia sesión para crear un lote.");
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className={styles.newBatchBtn}
                title="Limpiar mesa de trabajo y crear nuevo lote"
              >
                <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span className={styles.newBatchBtnText}>Nuevo Lote</span>
              </button>
            </div>
          </div>
        )}
        {/* Banner para usuarios no autenticados */}
        {!user && (
          <div className={styles.guestBanner}>
            <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
            </svg>
            ¡Prueba la herramienta ahora! Genera hasta 3 códigos gratis sin registrarte.
          </div>
        )}
        
        {/* Modal de diálogo premium para configuración de moneda */}
        <CurrencyConfigModal
          isOpen={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
          useManualCurrency={useManualCurrency}
          setUseManualCurrency={setUseManualCurrency}
          manualCurrencyCode={manualCurrencyCode}
          setManualCurrencyCode={setManualCurrencyCode}
          customCurrencyInput={customCurrencyInput}
          setCustomCurrencyInput={setCustomCurrencyInput}
          detectedCurrency={detectedCurrency}
          getCurrentCurrency={getCurrentCurrency}
          onSaveCurrency={handleSaveCurrency}
        />
        
        <CreateBatchModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onCreate={async (name) => {
            await handleSaveBatch(name, false);
          }}
          defaultName={saveDefaultName}
        />

        <CreateBatchModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={async (name) => {
            if (!user) return;
            const maxBatches = isPro ? limits.pro.maxBatches : limits.free.maxBatches;
            if (userBatches.length >= maxBatches) {
              alert(`Has alcanzado el límite máximo de lotes permitidos para tu plan (${maxBatches} lotes). ${isPro ? '' : 'Actualiza a Pro para tener hasta 20 lotes.'}`);
              return;
            }
            try {
              const newDocRef = doc(collection(db, 'users', user.uid, 'batches'));
              const newBatchData = {
                id: newDocRef.id,
                name: name,
                totalCount: 0,
                enableDescription: false,
                enablePrice: false,
                customCurrency: null,
                createdAt: serverTimestamp()
              };
              await setDoc(newDocRef, newBatchData);
              router.push(`/dashboard?batch=${newDocRef.id}`);
            } catch (error) {
              console.error("Error al crear lote vacío:", error);
            }
          }}
        />
        
        {/* Formulario y Tabla a ancho completo de la página */}
        <BarcodeForm
          barcodes={barcodes}
          setBarcodes={setBarcodes}
          enableDescription={enableDescription}
          setEnableDescription={setEnableDescription}
          enablePrice={enablePrice}
          setEnablePrice={setEnablePrice}
          showPDFPreview={showPDFPreview}
          setShowPDFPreview={setShowPDFPreview}
          customCurrency={useManualCurrency ? getCurrentCurrency() : undefined}
          barcodeSettings={barcodeSettings}
          onImportCSV={handleImportBarcodes}
          loadedBatchId={loadedBatchId}
          loadedBatchName={loadedBatchName}
          onSaveBatch={handleSaveBatch}
          isSavingBatchParent={isSavingBatch}
          isDashboard={isDashboard}
          onOpenCurrencyModal={() => setShowCurrencyModal(true)}
          isBatchExceeded={isBatchExceeded}
          userBatchesCount={userBatches.length}
        />

        {/* Workspace de dos columnas inferior (PDF a la izquierda y Ajustes a la derecha) */}
        <div className={`${styles.workspaceLayout} ${barcodes.length > 0 ? styles.workspaceLayoutVisible : styles.workspaceLayoutHidden}`}>
          <div className={styles.leftColumn}>
            {/* Contenedor para el Portal de la Vista Previa del PDF */}
            <div id="pdf-preview-portal-container" className={styles.pdfPreviewPortal} />
          </div>
          <div className={styles.rightColumn}>
            <PdfImprimir 
              barcodes={barcodes.filter(item => item.print !== false)} 
              enableDescription={enableDescription}
              enablePrice={enablePrice}
              showPDFPreview={showPDFPreview}
              onTogglePDFPreview={setShowPDFPreview}
              customCurrency={useManualCurrency ? getCurrentCurrency() : undefined}
              barcodeSettings={barcodeSettings}
              setBarcodeSettings={setBarcodeSettings}
            />
        </div>
      </div>

      {/* Loader de transición al cambiar de lote */}
      {isLoadingBatch && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Cargando Lote...</p>
        </div>
      )}
    </div>
  );
}
