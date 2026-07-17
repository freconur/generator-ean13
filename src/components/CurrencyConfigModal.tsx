import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/BarcodeGeneratorWorkspace.module.css';
import { commonCurrencies, getCurrencySymbol, getLocalizationDebugInfo } from '../utils/formatPrice';

interface CurrencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  useManualCurrency: boolean;
  setUseManualCurrency: (val: boolean) => void;
  manualCurrencyCode: string;
  setManualCurrencyCode: (val: string) => void;
  customCurrencyInput: string;
  setCustomCurrencyInput: (val: string) => void;
  detectedCurrency: { code: string; symbol: string; country: string };
  getCurrentCurrency: () => string;
  onSaveCurrency: (code: string | null) => Promise<void>;
}

export default function CurrencyConfigModal({
  isOpen,
  onClose,
  useManualCurrency,
  setUseManualCurrency,
  manualCurrencyCode,
  setManualCurrencyCode,
  customCurrencyInput,
  setCustomCurrencyInput,
  detectedCurrency,
  getCurrentCurrency,
  onSaveCurrency,
}: CurrencyConfigModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const debug = getLocalizationDebugInfo();
      setDebugInfo(debug);
    } catch (error) {
      console.warn('Error al obtener info de debug de localización:', error);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!mounted || !isOpen || typeof window === 'undefined') {
    return null;
  }

  const handleSave = async () => {
    const activeCurrency = useManualCurrency ? getCurrentCurrency() : null;
    await onSaveCurrency(activeCurrency);
    onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.currencyModalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.importModalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg className={styles.inlineIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h3 className={styles.importModalTitle}>Configuración de Moneda</h3>
          </div>
          <button
            onClick={onClose}
            className={styles.importModalCloseBtn}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className={styles.currencyModalBody}>
          {/* Indicador de moneda detectada */}
          {detectedCurrency.code && (
            <div className={styles.currencyDetectedBanner}>
              <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 6v12" />
              </svg>
              Moneda detectada: <strong>{detectedCurrency.symbol} ({detectedCurrency.code})</strong>

              {/* Botón para mostrar información de debug */}
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className={styles.debugButton}
                title="Ver información de detección para diagnosticar problemas"
              >
                {showDebugInfo ? '🔼 Ocultar detalles' : '🔽 Ver detalles'}
              </button>
            </div>
          )}

          {/* Información de debug expandible */}
          {showDebugInfo && debugInfo && (
            <div className={styles.debugInfoBox}>
              <span className={styles.debugTitle}>
                <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Información de Detección de Localización
              </span>
              <div>
                <div><strong>Idioma principal:</strong> {debugInfo.primaryLocale}</div>
                <div><strong>Todos los idiomas:</strong> {debugInfo.allLanguages.join(', ')}</div>
                <div><strong>Región extraída:</strong> {debugInfo.extractedRegion}</div>
                <div><strong>Zona horaria:</strong> {debugInfo.timeZone}</div>
                <div><strong>Moneda detectada:</strong> {debugInfo.detectedCurrency}</div>
              </div>
              <div className={styles.debugHelpBox}>
                <strong>
                  <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5c-3 0-5.5 2.5-5.5 5.5 0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                  </svg>
                  ¿Moneda incorrecta?
                </strong><br/>
                Si estás en Lima, Perú pero detecta EUR en lugar de PEN, verifica:<br/>
                • Tu zona horaria debería ser &quot;America/Lima&quot;<br/>
                • Tu idioma puede estar configurado como &quot;es-ES&quot; (España) en lugar de &quot;es-PE&quot; (Perú)<br/>
                • Puedes usar la configuración manual de moneda para solucionarlo
              </div>
            </div>
          )}

          {/* Configuración manual de moneda */}
          <div className={styles.manualCurrencySection}>
            <label className={styles.manualCurrencyLabel}>
              <input
                type="checkbox"
                checked={useManualCurrency}
                onChange={(e) => {
                  setUseManualCurrency(e.target.checked);
                  if (!e.target.checked) {
                    setManualCurrencyCode('');
                    setCustomCurrencyInput('');
                    setIsDropdownOpen(false);
                  }
                }}
                className={styles.manualCurrencyCheckbox}
              />
              <strong>Configurar moneda manualmente</strong>
            </label>

            {useManualCurrency && (
              <div className={styles.manualCurrencyFormGroup}>
                <div style={{ marginBottom: '15px' }} ref={dropdownRef}>
                  <label className={styles.customCurrencyLabel}>
                    Seleccionar moneda común:
                  </label>
                  <div className={styles.customDropdownContainer}>
                    <button
                      type="button"
                      className={styles.customDropdownTrigger}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span>
                        {manualCurrencyCode
                          ? (() => {
                              const curr = commonCurrencies.find(c => c.code === manualCurrencyCode);
                              return curr ? `${curr.symbol} ${curr.code} - ${curr.name}` : manualCurrencyCode;
                            })()
                          : '-- Seleccionar moneda --'}
                      </span>
                      <svg
                        className={`${styles.customDropdownChevron} ${isDropdownOpen ? styles.customDropdownChevronOpen : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <ul className={styles.customDropdownMenu} role="listbox">
                        <li
                          className={`${styles.customDropdownItem} ${!manualCurrencyCode ? styles.customDropdownItemActive : ''}`}
                          onClick={() => {
                            setManualCurrencyCode('');
                            setCustomCurrencyInput('');
                            setIsDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={!manualCurrencyCode}
                        >
                          -- Seleccionar moneda --
                        </li>
                        {commonCurrencies.map((currency) => (
                          <li
                            key={currency.code}
                            className={`${styles.customDropdownItem} ${manualCurrencyCode === currency.code ? styles.customDropdownItemActive : ''}`}
                            onClick={() => {
                              setManualCurrencyCode(currency.code);
                              setCustomCurrencyInput('');
                              setIsDropdownOpen(false);
                            }}
                            role="option"
                            aria-selected={manualCurrencyCode === currency.code}
                          >
                            {currency.symbol} {currency.code} - {currency.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.customCurrencyField}>
                  <label className={styles.customCurrencyLabel}>
                    O escribir código de moneda personalizado:
                  </label>
                  <input
                    type="text"
                    value={customCurrencyInput}
                    onChange={(e) => {
                      setCustomCurrencyInput(e.target.value.toUpperCase());
                      setManualCurrencyCode('');
                    }}
                    placeholder="Ej: USD, EUR, GBP..."
                    maxLength={3}
                    className={styles.customCurrencyInput}
                  />
                </div>

                {/* Vista previa de la moneda seleccionada */}
                {(manualCurrencyCode || customCurrencyInput) && (
                  <div className={styles.currencyConfiguredAlert}>
                    <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Moneda configurada: <strong>
                      {getCurrencySymbol(getCurrentCurrency())} ({getCurrentCurrency()})
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botón de guardar configuración */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '15px' }}>
            <button
              type="button"
              onClick={handleSave}
              className={styles.newBatchBtn}
            >
              <svg className={styles.inlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
