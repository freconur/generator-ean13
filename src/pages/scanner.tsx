import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import { validateEAN13 } from '../utils/ean13Generator';
import sidebarStyles from '../styles/Sidebar.module.css';
import styles from '../styles/Scanner.module.css';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraDevice {
  id: string;
  label: string;
}

interface ScanItem {
  id: string;
  code: string;
  isValid: boolean;
  timestamp: string;
}

interface MockSearchResult {
  code: string;
  name: string;
  category: string;
  price: string;
  brand: string;
}

export default function ScannerPage() {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [history, setHistory] = useState<ScanItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mockResult, setMockResult] = useState<MockSearchResult | null>(null);

  const qrCodeReaderRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const containerId = 'scanner-page-reader';

  // Sonido de confirmación sintetizado
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Tono A5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // Volumen sutil

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // beep de 100ms
    } catch (e) {
      console.warn('No se pudo reproducir el sonido de escaneo:', e);
    }
  };

  // Cargar historial inicial desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('izicode_scan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error al cargar historial de escaneos:', e);
      }
    }
  }, []);

  // Inicializar cámaras al montar
  useEffect(() => {
    let isMounted = true;

    const initCameras = async () => {
      try {
        setIsInitializing(true);
        setErrorMessage('');
        
        // Solicitar permisos de cámara y listar dispositivos
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          
          // Buscar cámara trasera por defecto
          const backCamera = devices.find(
            (device) =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('trasera')
          );
          
          const defaultCameraId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(defaultCameraId);

          // Esperar un tick de render para iniciar el stream
          setTimeout(() => {
            if (isMounted) {
              startCamera(defaultCameraId);
            }
          }, 150);
        } else {
          setErrorMessage('No se detectaron cámaras en este dispositivo.');
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Error al iniciar cámaras:', err);
        if (isMounted) {
          if (err?.name === 'NotAllowedError' || err?.toString().includes('Permission denied')) {
            setErrorMessage('Permiso de cámara denegado. Por favor, actívalo en los ajustes de tu navegador.');
          } else {
            setErrorMessage('No se pudo acceder a la cámara. Asegúrate de que no esté siendo usada por otra aplicación.');
          }
          setIsInitializing(false);
        }
      }
    };

    initCameras();

    return () => {
      isMounted = false;
      // Detener escáner al desmontar
      if (qrCodeReaderRef.current && qrCodeReaderRef.current.isScanning) {
        qrCodeReaderRef.current
          .stop()
          .catch((err) => console.error('Error al detener la cámara en cleanup:', err));
      }
    };
  }, []);

  // Iniciar la cámara seleccionada
  const startCamera = async (cameraId: string) => {
    if (!cameraId) return;
    try {
      setIsInitializing(true);
      setErrorMessage('');

      let scanner = qrCodeReaderRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId);
        qrCodeReaderRef.current = scanner;
      }

      if (scanner.isScanning) {
        await scanner.stop();
      }

      await scanner.start(
        cameraId,
        {
          fps: 20,
          qrbox: (width, height) => {
            // Recuadro optimizado para códigos de barra
            const boxWidth = Math.min(width * 0.85, 360);
            const boxHeight = Math.min(height * 0.45, 180);
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          const cleanedText = decodedText.trim();
          // Validar longitud del código de barras (generalmente 13 dígitos para EAN-13)
          if (/^\d{13}$/.test(cleanedText)) {
            const now = Date.now();
            
            // Evitar escaneos duplicados rápidos del mismo código
            if (lastScannedCodeRef.current === cleanedText && now - lastScannedTimeRef.current < 2500) {
              return;
            }

            lastScannedCodeRef.current = cleanedText;
            lastScannedTimeRef.current = now;

            playBeep();
            handleNewScan(cleanedText);
          }
        },
        () => {
          // Callback de error de frames, omitido para evitar saturar la consola
        }
      );

      setIsScanning(true);
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Error al iniciar el stream de la cámara:', err);
      setErrorMessage('Error al intentar abrir el flujo de la cámara seleccionada.');
      setIsScanning(false);
      setIsInitializing(false);
    }
  };

  // Detener la cámara
  const stopCamera = async () => {
    try {
      if (qrCodeReaderRef.current && qrCodeReaderRef.current.isScanning) {
        await qrCodeReaderRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error al detener la cámara:', err);
    }
  };

  // Manejar el cambio de cámara
  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    setSelectedCameraId(newCameraId);
    await startCamera(newCameraId);
  };

  // Agregar nuevo escaneo al historial
  const handleNewScan = (code: string) => {
    const isValid = validateEAN13(code);
    const newItem: ScanItem = {
      id: Math.random().toString(36).substring(2, 9),
      code,
      isValid,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem('izicode_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Copiar código al portapapeles
  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch((err) => {
      console.error('Error al copiar:', err);
    });
  };

  // Buscar producto (simulado y enlace externo)
  const handleSearch = (item: ScanItem) => {
    // Abrir búsqueda externa de Google
    window.open(`https://www.google.com/search?q=${item.code}`, '_blank');

    // Simular búsqueda interna con datos
    const mockProducts = [
      { name: 'Cereal de Trigo Integral', category: 'Alimentos', price: '$45.00 MXN', brand: 'Nestlé' },
      { name: 'Refresco de Cola 600ml', category: 'Bebidas', price: '$18.50 MXN', brand: 'Coca-Cola' },
      { name: 'Jabón Líquido Antibacterial', category: 'Higiene', price: '$32.00 MXN', brand: 'Protex' },
      { name: 'Leche Entera Pasteurizada 1L', category: 'Lácteos', price: '$26.00 MXN', brand: 'Lala' },
      { name: 'Pasta Dental Triple Acción', category: 'Cuidado Personal', price: '$29.90 MXN', brand: 'Colgate' },
    ];

    const index = parseInt(item.code.substring(6, 9)) % mockProducts.length;
    const selectedMock = mockProducts[index];

    setMockResult({
      code: item.code,
      name: item.isValid ? selectedMock.name : 'Producto Desconocido',
      category: item.isValid ? selectedMock.category : 'N/A',
      price: item.isValid ? selectedMock.price : 'N/A',
      brand: item.isValid ? selectedMock.brand : 'N/A',
    });
  };

  // Eliminar un elemento individual
  const handleDeleteItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('izicode_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Limpiar historial
  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar el historial de escaneos?')) {
      setHistory([]);
      localStorage.removeItem('izicode_scan_history');
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Escáner de Códigos - izicode</title>
        <meta name="description" content="Escanea tus códigos de barras EAN-13 en tiempo real usando tu cámara." />
      </Head>

      <div className={sidebarStyles.appLayout}>
        <Sidebar />

        <div className={sidebarStyles.contentContainer}>
          <main className={sidebarStyles.mainContent}>
            <div className={styles.scannerPage}>
              {/* Cabecera de la página */}
              <div className={styles.header}>
                <h1 className={styles.title}>Lector de Códigos</h1>
                <p className={styles.subtitle}>
                  Escanea códigos de barras EAN-13 en tiempo real utilizando la cámara de tu dispositivo.
                </p>
              </div>

              {/* Grid principal */}
              <div className={styles.scannerGrid}>
                {/* Panel del Escáner */}
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Visor de Cámara
                  </h2>

                  {/* Contenedor del video */}
                  <div className={styles.viewportContainer}>
                    <div id={containerId} className={styles.readerElement} />

                    {/* Animación láser si está activo */}
                    {isScanning && !isInitializing && !errorMessage && (
                      <div className={styles.scannerOverlay}>
                        <div className={styles.targetBox}>
                          <div className={styles.laserLine} />
                        </div>
                      </div>
                    )}

                    {/* Pantalla de carga */}
                    {isInitializing && !errorMessage && (
                      <div className={styles.loadingOverlay}>
                        <svg className={styles.spinner} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                        </svg>
                        <span>Inicializando cámara...</span>
                      </div>
                    )}
                  </div>

                  {/* Controles del Lector */}
                  <div className={styles.controls}>
                    {/* Selector de cámara si hay más de una */}
                    {cameras.length > 1 && !errorMessage && (
                      <div className={styles.cameraSelectContainer}>
                        <label className={styles.label}>Cámara / Lente</label>
                        <select value={selectedCameraId} onChange={handleCameraChange} className={styles.select}>
                          {cameras.map((camera) => (
                            <option key={camera.id} value={camera.id}>
                              {camera.label || `Lente ${cameras.indexOf(camera) + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Botones de acción del lector */}
                    <div className={styles.buttonGroup}>
                      {isScanning ? (
                        <button onClick={stopCamera} className={`${styles.btn} ${styles.btnSecondary}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                          </svg>
                          Pausar Cámara
                        </button>
                      ) : (
                        <button onClick={() => startCamera(selectedCameraId)} className={`${styles.btn} ${styles.btnPrimary}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Encender Cámara
                        </button>
                      )}
                    </div>

                    {/* Mensaje de Error */}
                    {errorMessage && (
                      <div className={styles.errorBox}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Guía de uso */}
                    {!errorMessage && (
                      <div className={styles.infoBox}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>Sostén el código de barras EAN-13 frente al visor central para decodificarlo de forma automática.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel de Historial de Escaneos */}
                <div className={styles.card}>
                  <div className={styles.historyHeader}>
                    <h2 className={styles.cardTitle}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      Historial de Escaneos
                      <span className={styles.historyCountBadge}>{history.length}</span>
                    </h2>

                    {history.length > 0 && (
                      <button onClick={handleClearHistory} className={styles.btnClear} title="Limpiar todo el historial">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Limpiar Historial
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                        <path d="M7 9v6m3-6v6m4-6v6m3-6v6" />
                      </svg>
                      <p className={styles.emptyText}>No has escaneado ningún código en esta sesión.</p>
                    </div>
                  ) : (
                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.th}>Código</th>
                            <th className={styles.th}>Validez (EAN)</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr key={item.id} className={styles.tr}>
                              <td className={`${styles.td} ${styles.codeCell}`}>
                                {item.code}
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)', fontWeight: 'normal', marginTop: '2px' }}>
                                  {item.timestamp}
                                </span>
                              </td>
                              <td className={styles.td}>
                                {item.isValid ? (
                                  <span className={`${styles.badge} ${styles.badgeValid}`}>
                                    ✓ Válido
                                  </span>
                                ) : (
                                  <span className={`${styles.badge} ${styles.badgeInvalid}`}>
                                    ✗ Inválido
                                  </span>
                                )}
                              </td>
                              <td className={styles.td} style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleCopy(item.id, item.code)}
                                  className={`${styles.actionBtn} ${copiedId === item.id ? styles.actionBtnCopied : ''}`}
                                  title="Copiar código al portapapeles"
                                >
                                  {copiedId === item.id ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSearch(item)}
                                  className={styles.actionBtn}
                                  title="Buscar producto"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                                  title="Eliminar de la lista"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal de simulación de resultado de búsqueda */}
              {mockResult && (
                <div className={styles.loadingOverlay} style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 100 }} onClick={() => setMockResult(null)}>
                  <div 
                    className={styles.card} 
                    style={{ maxWidth: '400px', width: '90%', animation: 'scaleIn 0.25s ease-out' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)' }}>
                        🔎 Búsqueda de Producto
                      </h3>
                      <button 
                        onClick={() => setMockResult(null)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Código EAN-13:</span>
                        <strong style={{ fontFamily: 'monospace' }}>{mockResult.code}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Nombre:</span>
                        <strong style={{ textAlign: 'right' }}>{mockResult.name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Marca:</span>
                        <strong>{mockResult.brand}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Categoría:</span>
                        <strong>{mockResult.category}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Precio Aprox:</span>
                        <strong style={{ color: 'var(--success-color, #10b981)' }}>{mockResult.price}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => window.open(`https://www.google.com/search?q=${mockResult.code}`, '_blank')}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ padding: '0.5rem' }}
                      >
                        Búsqueda Completa (Google)
                      </button>
                      <button 
                        onClick={() => setMockResult(null)}
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ padding: '0.5rem' }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
