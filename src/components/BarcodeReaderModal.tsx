import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from '../styles/BarcodeReaderModal.module.css';

interface BarcodeReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function BarcodeReaderModal({ isOpen, onClose, onScanSuccess }: BarcodeReaderModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [focusRing, setFocusRing] = useState({ x: 0, y: 0, active: false });
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qrCodeReaderRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'reader-container';

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

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setIsInitializing(true);
    let isMounted = true;

    // Inicializar el lector de HTML5 QRCode
    const html5Qrcode = new Html5Qrcode(containerId);
    qrCodeReaderRef.current = html5Qrcode;

    const startScanning = async () => {
      try {
        // Solicitar permisos de cámara y obtener lista de dispositivos
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
          await startCamera(html5Qrcode, defaultCameraId);
        } else {
          setErrorMessage('No se detectaron cámaras en este dispositivo.');
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Error al inicializar la cámara:', err);
        if (isMounted) {
          if (err?.name === 'NotAllowedError' || err?.toString().includes('Permission denied')) {
            setErrorMessage('Permiso de acceso a la cámara denegado. Actívalo en los ajustes de tu navegador.');
          } else {
            setErrorMessage('No se pudo acceder a la cámara. Asegúrate de que no esté siendo usada por otra aplicación.');
          }
          setIsInitializing(false);
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      // Detener el escáner si está activo al desmontar
      if (qrCodeReaderRef.current) {
        if (qrCodeReaderRef.current.isScanning) {
          qrCodeReaderRef.current
            .stop()
            .catch((err) => console.error('Error al detener la cámara en cleanup:', err));
        }
      }
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const startCamera = async (scannerInstance: Html5Qrcode, cameraId: string) => {
    try {
      setIsInitializing(true);
      
      // Si ya está escaneando, detener primero
      if (scannerInstance.isScanning) {
        await scannerInstance.stop();
      }

      await scannerInstance.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            // Rectángulo horizontal adaptado a la forma del código de barras
            const boxWidth = Math.min(width * 0.8, 320);
            const boxHeight = Math.min(height * 0.4, 160);
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          // Callback de lectura exitosa
          // Solo procesamos si parece un código de barras de 13 dígitos
          const cleanedText = decodedText.trim();
          if (/^\d{13}$/.test(cleanedText)) {
            playBeep();
            onScanSuccess(cleanedText);
            onClose();
          }
        },
        () => {
          // Callback silencioso para fallos de frames (se descarta para evitar saturar la consola)
        }
      );

      setIsInitializing(false);
    } catch (err) {
      console.error('Error al iniciar el stream de la cámara:', err);
      setErrorMessage('Error al intentar abrir el flujo de la cámara seleccionada.');
      setIsInitializing(false);
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    setSelectedCameraId(newCameraId);
    if (qrCodeReaderRef.current) {
      await startCamera(qrCodeReaderRef.current, newCameraId);
    }
  };

  const handleViewportClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusRing({ x, y, active: true });

    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusRing((prev) => ({ ...prev, active: false }));
    }, 800);

    try {
      const video = e.currentTarget.querySelector('video');
      if (video && video.srcObject && video.srcObject instanceof MediaStream) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function' && typeof track.applyConstraints === 'function') {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.focusMode) {
            if (capabilities.focusMode.includes('single-shot')) {
              await track.applyConstraints({ focusMode: 'single-shot' } as any);
            } else if (capabilities.focusMode.includes('continuous')) {
              await track.applyConstraints({ focusMode: 'continuous' } as any);
            }
          }
        }
      }
    } catch (err) {
      // Manejar posibles fallos silenciosamente
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span>📷 Escáner de Códigos EAN-13</span>
          </h3>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Selector de cámara si hay múltiples dispositivos */}
        {cameras.length > 1 && !errorMessage && (
          <div className={styles.cameraControls}>
            <label className={styles.label}>Seleccionar Cámara</label>
            <select value={selectedCameraId} onChange={handleCameraChange} className={styles.select}>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Cámara ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Visor de Escaneo */}
        <div className={styles.scannerViewport} onClick={handleViewportClick} data-testid="scanner-viewport">
          <div id={containerId} className={styles.readerElement} />
          
          {/* Aro de enfoque (Focus Ring) */}
          {focusRing.active && (
            <div
              className={`${styles.focusRing} ${styles.focusRingActive}`}
              style={{ left: focusRing.x, top: focusRing.y }}
              data-testid="focus-ring"
            />
          )}

          {/* Overlay de guía para centrar el código de barras */}
          {!errorMessage && !isInitializing && (
            <div className={styles.scannerOverlay}>
              <div className={styles.targetBox}>
                <div className={styles.laserLine} />
              </div>
            </div>
          )}

          {/* Estado de carga */}
          {isInitializing && !errorMessage && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#000000', color: '#ffffff', gap: '12px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
              </svg>
              <span style={{ fontSize: '0.85rem' }}>Encendiendo cámara...</span>
            </div>
          )}
        </div>

        {/* Mensaje de Error */}
        {errorMessage ? (
          <div className={styles.errorBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ margin: 0 }}>{errorMessage}</p>
          </div>
        ) : (
          <p className={styles.infoText}>
            Coloca el código de barras físico EAN-13 dentro del recuadro central para leerlo automáticamente.
          </p>
        )}

      </div>
    </div>
  );
}
