import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import { PdfImprimir } from '@/components/PDF-ean13';
import BarcodeForm from '@/components/BarcodeForm';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { getCurrencyCode, getCurrencySymbol, commonCurrencies, getLocalizationDebugInfo } from '../utils/formatPrice';

// Interfaz para el tipo de código de barras
interface BarcodeItem {
  code: string;
  quantity: number;
  isValid: boolean;
  isDuplicate?: boolean;
  description?: string;
  price?: number;
  hasDescription: boolean; // Flag para indicar si se habilitó descripción
  hasPrice: boolean; // Flag para indicar si se habilitó precio
}

/**
 * Componente principal de la aplicación
 * Permite validar códigos EAN-13 y mostrar su representación en código de barras
 */
export default function Home() {
  const [fadeIn, setFadeIn] = useState(false);
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [enableDescription, setEnableDescription] = useState<boolean>(false);
  const [enablePrice, setEnablePrice] = useState<boolean>(false);
  const [showPDFPreview, setShowPDFPreview] = useState<boolean>(false);
  const [detectedCurrency, setDetectedCurrency] = useState<{ code: string; symbol: string }>({ code: '', symbol: '' });
  const [useManualCurrency, setUseManualCurrency] = useState<boolean>(false);
  const [manualCurrencyCode, setManualCurrencyCode] = useState<string>('');
  const [customCurrencyInput, setCustomCurrencyInput] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Obtener la moneda actual (manual o automática)
  const getCurrentCurrency = () => {
    if (useManualCurrency) {
      return manualCurrencyCode || customCurrencyInput || detectedCurrency.code;
    }
    return detectedCurrency.code;
  };

  useEffect(() => {
    // Activar el efecto de fade después de que el componente se monte
    setFadeIn(true);
    
    // Detectar la moneda del usuario
    try {
      const currencyCode = getCurrencyCode();
      const currencySymbol = getCurrencySymbol();
      setDetectedCurrency({ code: currencyCode, symbol: currencySymbol });
      
      // Obtener información de debug
      const debug = getLocalizationDebugInfo();
      setDebugInfo(debug);
      console.log('🔍 Información de localización:', debug);
    } catch (error) {
      console.warn('Error detectando moneda:', error);
      setDetectedCurrency({ code: 'EUR', symbol: '€' });
    }
  }, []);
  return (
    <div className={`${styles.container} ${fadeIn ? styles.fadeIn : ''}`}>
      <Head>
        <title>Generador de Código de Barras EAN-13</title>
        <meta name="description" content="Lector de códigos de barras EAN-13" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.main} id="generator">
        <h1 className={styles.title}>
          Plantilla para impresion de codigo de barras EAN-13
        </h1>
        
        {/* Indicador de moneda detectada */}
        {detectedCurrency.code && (
          <div style={{ 
            background: '#f0f8ff', 
            border: '1px solid #0066cc', 
            borderRadius: '8px', 
            padding: '8px 12px', 
            margin: '10px 0',
            fontSize: '14px',
            color: '#0066cc'
          }}>
            💰 Moneda detectada: <strong>{detectedCurrency.symbol} ({detectedCurrency.code})</strong>
            
            {/* Botón para mostrar información de debug */}
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              style={{
                marginLeft: '10px',
                padding: '4px 8px',
                fontSize: '12px',
                background: 'transparent',
                border: '1px solid #0066cc',
                borderRadius: '4px',
                color: '#0066cc',
                cursor: 'pointer'
              }}
              title="Ver información de detección para diagnosticar problemas"
            >
              {showDebugInfo ? '🔼 Ocultar detalles' : '🔽 Ver detalles'}
            </button>
          </div>
        )}
        
        {/* Información de debug expandible */}
        {showDebugInfo && debugInfo && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '12px',
            margin: '10px 0',
            fontSize: '13px',
            fontFamily: 'monospace'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
              🔍 Información de Detección de Localización
            </h4>
            <div style={{ lineHeight: '1.6' }}>
              <div><strong>Idioma principal:</strong> {debugInfo.primaryLocale}</div>
              <div><strong>Todos los idiomas:</strong> {debugInfo.allLanguages.join(', ')}</div>
              <div><strong>Región extraída:</strong> {debugInfo.extractedRegion}</div>
              <div><strong>Zona horaria:</strong> {debugInfo.timeZone}</div>
              <div><strong>Moneda detectada:</strong> {debugInfo.detectedCurrency}</div>
            </div>
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: '#d1ecf1',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0c5460'
            }}>
              <strong>💡 ¿Moneda incorrecta?</strong><br/>
              Si estás en Lima, Perú pero detecta EUR en lugar de PEN, verifica:<br/>
              • Tu zona horaria debería ser "America/Lima"<br/>
              • Tu idioma puede estar configurado como "es-ES" (España) en lugar de "es-PE" (Perú)<br/>
              • Puedes usar la configuración manual de moneda para solucionarlo
            </div>
          </div>
        )}
        
        {/* Configuración manual de moneda */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          margin: '10px 0',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useManualCurrency}
                onChange={(e) => {
                  setUseManualCurrency(e.target.checked);
                  if (!e.target.checked) {
                    setManualCurrencyCode('');
                    setCustomCurrencyInput('');
                  }
                }}
                style={{ marginRight: '8px' }}
              />
              <strong>⚙️ Configurar moneda manualmente</strong>
            </label>
          </div>
          
          {useManualCurrency && (
            <div style={{ marginLeft: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Seleccionar moneda común:
                </label>
                <select
                  value={manualCurrencyCode}
                  onChange={(e) => {
                    setManualCurrencyCode(e.target.value);
                    setCustomCurrencyInput(''); // Limpiar input personalizado
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Seleccionar moneda --</option>
                  {commonCurrencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  O escribir código de moneda personalizado:
                </label>
                <input
                  type="text"
                  value={customCurrencyInput}
                  onChange={(e) => {
                    setCustomCurrencyInput(e.target.value.toUpperCase());
                    setManualCurrencyCode(''); // Limpiar selector
                  }}
                  placeholder="Ej: USD, EUR, GBP..."
                  maxLength={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              {/* Vista previa de la moneda seleccionada */}
              {(manualCurrencyCode || customCurrencyInput) && (
                <div style={{
                  background: '#e8f5e8',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '13px',
                  color: '#155724'
                }}>
                  ✅ Moneda configurada: <strong>
                    {getCurrencySymbol(getCurrentCurrency())} ({getCurrentCurrency()})
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
        
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
        />
        <PdfImprimir 
          barcodes={barcodes} 
          enableDescription={enableDescription}
          enablePrice={enablePrice}
          showPDFPreview={showPDFPreview}
          onTogglePDFPreview={setShowPDFPreview}
          customCurrency={useManualCurrency ? getCurrentCurrency() : undefined}
        />
        
        {/* Sección de características */}
        <section id="features" className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ Características</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌍</div>
              <h3>Soporte Global</h3>
              <p>Detección automática de moneda basada en tu ubicación</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📄</div>
              <h3>Exportación PDF</h3>
              <p>Genera PDFs profesionales listos para imprimir</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚙️</div>
              <h3>Personalizable</h3>
              <p>Ajusta espaciado, altura y formato según tus necesidades</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📱</div>
              <h3>Responsive</h3>
              <p>Funciona perfectamente en todos los dispositivos</p>
            </div>
          </div>
        </section>

        {/* Sección de ayuda */}
        <section id="help" className={styles.section}>
          <h2 className={styles.sectionTitle}>❓ Ayuda</h2>
          <div className={styles.helpContent}>
            <div className={styles.helpCard}>
              <h3>¿Cómo usar el generador?</h3>
              <ol>
                <li>Ingresa un código EAN-13 válido de 13 dígitos</li>
                <li>Opcionalmente agrega descripción y precio</li>
                <li>Ajusta la cantidad de códigos a generar</li>
                <li>Configura el formato en la sección de ajustes</li>
                <li>Descarga tu PDF listo para imprimir</li>
              </ol>
            </div>
            <div className={styles.helpCard}>
              <h3>¿Qué es un código EAN-13?</h3>
              <p>Es un estándar internacional de identificación de productos mediante códigos de barras de 13 dígitos, utilizado globalmente en el comercio minorista.</p>
            </div>
          </div>
        </section>

        {/* Sección acerca de */}
        <section id="about" className={styles.section}>
          <h2 className={styles.sectionTitle}>ℹ️ Acerca de</h2>
          <div className={styles.aboutContent}>
            <p>
              EAN-13 Generator es una herramienta profesional diseñada para crear códigos de barras 
              de alta calidad con soporte para múltiples monedas y configuraciones personalizables.
            </p>
            <p>
              Desarrollado con las últimas tecnologías web para garantizar la mejor experiencia 
              de usuario en todos los dispositivos.
            </p>
          </div>
        </section>
        
        
      </main>

      <Footer />
    </div>
  );
}