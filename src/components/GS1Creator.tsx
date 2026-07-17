import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import JsBarcode from 'jsbarcode';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from '../styles/GS1Creator.module.css';

interface CountryConfig {
  name: string;
  prefix: string;
  flag: string;
}

const COUNTRIES: CountryConfig[] = [
  { name: 'Perú', prefix: '775', flag: '🇵🇪' },
  { name: 'Argentina', prefix: '779', flag: '🇦🇷' },
  { name: 'México', prefix: '750', flag: '🇲🇽' },
  { name: 'España', prefix: '84', flag: '🇪🇸' },
  { name: 'Colombia', prefix: '770', flag: '🇨🇴' },
  { name: 'Chile', prefix: '780', flag: '🇨🇱' },
  { name: 'Ecuador', prefix: '786', flag: '🇪🇨' },
  { name: 'Uruguay', prefix: '773', flag: '🇺🇾' },
  { name: 'Bolivia', prefix: '777', flag: '🇧🇴' },
  { name: 'América Central', prefix: '743', flag: '🌎' },
  { name: 'Brasil', prefix: '789', flag: '🇧🇷' },
  { name: 'EE.UU. / Canadá', prefix: '030', flag: '🇺🇸' }
];

export default function GS1Creator() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const isPro = profile?.subscription?.tier === 'pro' &&
                profile?.subscription?.status === 'active' &&
                (!profile?.subscription?.expiresAt ||
                 Date.now() < (profile.subscription.expiresAt < 99999999999 ? profile.subscription.expiresAt * 1000 : profile.subscription.expiresAt));
  const [step, setStep] = useState<number>(1);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(COUNTRIES[0]);
  const [companyPrefix, setCompanyPrefix] = useState<string>('');
  const [productCode, setProductCode] = useState<string>('');
  const [checkDigit, setCheckDigit] = useState<number | null>(null);
  const [finalCode, setFinalCode] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [hasSavedConfig, setHasSavedConfig] = useState<boolean>(false);
  const [savedLastSeq, setSavedLastSeq] = useState<number>(0);

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const loadGS1Config = async () => {
      if (!user) {
        setLoadingConfig(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.gs1Config) {
            const config = data.gs1Config;
            const country = COUNTRIES.find(c => c.prefix === config.countryPrefix);
            if (country) {
              setSelectedCountry(country);
            }
            setCompanyPrefix(config.companyPrefix);
            const lastSeq = config.lastProductSeq || 0;
            setSavedLastSeq(lastSeq);
            setHasSavedConfig(true);

            // Calcular longitud del producto sugerido y rellenar correlativo
            const prefixLen = config.countryPrefix.length;
            const companyLen = config.companyPrefix.length;
            const prodLen = 12 - prefixLen - companyLen;
            if (prodLen > 0) {
              const nextSeq = lastSeq + 1;
              setProductCode(String(nextSeq).padStart(prodLen, '0'));
              setStep(3); // Saltar directamente a confirmación del código de producto
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar gs1Config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadGS1Config();
  }, [user]);

  // Calcular longitud necesaria para el producto
  const prefixLength = selectedCountry.prefix.length;
  // GS1 EAN-13 requiere exactamente 12 dígitos antes del verificador
  const maxCompanyLength = 12 - prefixLength - 1; // Deja al menos 1 dígito para producto
  const neededProductLength = 12 - prefixLength - companyPrefix.length;

  // Recalcular dígito verificador y código final en tiempo real
  useEffect(() => {
    if (companyPrefix && productCode && neededProductLength > 0 && productCode.length === neededProductLength) {
      const code12 = `${selectedCountry.prefix}${companyPrefix}${productCode}`;
      if (code12.length === 12 && /^\d+$/.test(code12)) {
        // Calcular dígito verificador
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(code12[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const calculatedCheck = (10 - (sum % 10)) % 10;
        setCheckDigit(calculatedCheck);
        setFinalCode(`${code12}${calculatedCheck}`);
      }
    } else {
      setCheckDigit(null);
      setFinalCode('');
    }
  }, [selectedCountry, companyPrefix, productCode, neededProductLength]);

  // Dibujar código de barras de vista previa si está listo
  useEffect(() => {
    if (barcodeRef.current && finalCode.length === 13) {
      try {
        JsBarcode(barcodeRef.current, finalCode, {
          format: 'EAN13',
          width: 1.8,
          height: 75,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('Error al generar JsBarcode:', err);
      }
    }
  }, [finalCode, step]);

  const handleNextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCopyToClipboard = async () => {
    if (!finalCode) return;
    if (!isPro) {
      alert("El Asistente GS1 y la generación de correlativos oficiales son características exclusivas del Plan Pro. Por favor, actualiza tu suscripción para copiar este código.");
      return;
    }
    try {
      await navigator.clipboard.writeText(finalCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleSendToWorkspace = async () => {
    if (!finalCode) return;
    if (!isPro) {
      alert("El Asistente GS1 y el envío automático a la mesa de trabajo son características exclusivas del Plan Pro. Por favor, actualiza tu suscripción para guardar este código.");
      return;
    }

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          'gs1Config.countryPrefix': selectedCountry.prefix,
          'gs1Config.companyPrefix': companyPrefix,
          'gs1Config.lastProductSeq': parseInt(productCode) || 0
        });
      } catch (err) {
        console.error('Error al guardar correlativo en Firestore:', err);
      }
    }

    // Redirigir al dashboard inyectando el código como query param
    router.push(`/dashboard?addCode=${finalCode}`);
  };

  if (loadingConfig) {
    return (
      <div className={styles.creatorContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-shadow)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>Cargando tu configuración GS1...</p>
      </div>
    );
  }

  return (
    <div className={styles.creatorContainer}>
      <h2 className={styles.headerTitle}>
        Asistente de Códigos Oficiales GS1 EAN-13 📐
      </h2>
      <p className={styles.headerSubtitle}>
        Este asistente te guía para estructurar tu código de barras bajo la normativa de GS1. 
        Ingresa tus prefijos oficiales y nosotros calcularemos el dígito verificador matemático.
      </p>

      {/* Banner Informativo de Legalidad */}
      <div className={styles.infoBanner}>
        <span className={styles.infoBannerIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </span>
        <div className={styles.infoBannerContent}>
          <strong>Nota de Uso y Legalidad:</strong> Este asistente sirve para estructurar códigos de barra válidos técnicamente. Si vas a vender en supermercados u otros comercios externos, es <strong>obligatorio</strong> que adquieras tus códigos oficiales directamente en la organización <strong>GS1</strong> de tu país. Si deseas dar un uso de manera <strong>interno en tu negocio</strong> (control de stock, ventas locales en tu tienda o almacén), este código es <strong>totalmente válido y libre</strong> para su uso.
        </div>
      </div>

      {/* Indicador de Pasos del Asistente */}
      <div className={styles.stepsContainer}>
        {[1, 2, 3, 4].map((s) => {
          const isActive = step === s;
          const isCompleted = step > s;
          let label = '';
          if (s === 1) label = 'País';
          if (s === 2) label = 'Empresa';
          if (s === 3) label = 'Producto';
          if (s === 4) label = 'Resultado';

          return (
            <div 
              key={s} 
              className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : ''} ${isCompleted ? styles.stepCircleCompleted : ''}`}
            >
              {isCompleted ? '✓' : s}
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.formGrid}>
        {/* Lado Izquierdo: Formularios por Pasos */}
        <div className={styles.formCard}>
          {step === 1 && (
            <div>
              <h3 className={styles.visualLabelTitle} style={{ color: 'var(--primary-color)' }}>
                Paso 1: Selecciona tu Región / País
              </h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>País Emisor de GS1</label>
                <select 
                  className={styles.select}
                  value={selectedCountry.prefix}
                  onChange={(e) => {
                    const country = COUNTRIES.find(c => c.prefix === e.target.value);
                    if (country) {
                      setSelectedCountry(country);
                      setCompanyPrefix('');
                      setProductCode('');
                    }
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.prefix} value={c.prefix}>
                      {c.flag} {c.name} (Prefijo: {c.prefix})
                    </option>
                  ))}
                </select>
                <span className={styles.helpText}>
                  El prefijo es asignado directamente por la oficina de GS1 del país correspondiente.
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className={styles.visualLabelTitle} style={{ color: 'var(--primary-color)' }}>
                Paso 2: Prefijo de Empresa GS1
              </h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Código de Empresa (GS1 Company Prefix)</label>
                <input
                  type="text"
                  maxLength={maxCompanyLength}
                  value={companyPrefix}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCompanyPrefix(val);
                    setProductCode(''); // Reset product code as length needs recalculation
                  }}
                  placeholder={`Ej: 123456 (Máx ${maxCompanyLength} dígitos)`}
                  className={styles.input}
                />
                <span className={styles.helpText}>
                  Ingresa los dígitos de tu código de empresa oficial. Te quedan{' '}
                  <strong style={{ color: 'var(--primary-color)' }}>
                    {maxCompanyLength - companyPrefix.length}
                  </strong>{' '}
                  dígitos disponibles para esta sección.
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className={styles.visualLabelTitle} style={{ color: 'var(--primary-color)' }}>
                Paso 3: Código de Producto
              </h3>
              {hasSavedConfig && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#065f46',
                  lineHeight: '1.4'
                }}>
                  ✨ <strong>Configuración GS1 Cargada:</strong> Detectamos tu prefijo de país <strong>{selectedCountry.prefix}</strong> y empresa <strong>{companyPrefix}</strong>. Hemos autocompletado tu producto sugerido con el siguiente correlativo: <strong>{productCode}</strong>.
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Identificador de Producto (Debe ser exactamente de {neededProductLength} {neededProductLength === 1 ? 'dígito' : 'dígitos'})
                </label>
                <input
                  type="text"
                  maxLength={neededProductLength}
                  value={productCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setProductCode(val);
                  }}
                  placeholder={`Ej: ${'0'.repeat(neededProductLength - 1)}1`}
                  className={styles.input}
                />
                <span className={styles.helpText}>
                  Ingresa tu código numérico interno correlativo. Debe rellenarse hasta cubrir exactamente los{' '}
                  <strong>{neededProductLength}</strong> dígitos de capacidad disponible.
                </span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className={styles.visualLabelTitle} style={{ color: '#10b981' }}>
                Paso 4: ¡Código Compuesto con Éxito!
              </h3>
              <div className={styles.formGroup}>
                <span className={styles.successTitle}>
                  ✓ Dígito Verificador Calculado: {checkDigit}
                </span>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: '0 0 1.5rem 0', color: '#64748b' }}>
                  Tu código EAN-13 ha sido calculado utilizando el algoritmo oficial de GS1. 
                  Ahora puedes copiarlo o agregarlo directamente a tu mesa de trabajo actual.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={handleCopyToClipboard} 
                    className={styles.btnNext}
                    style={{ background: '#0f172a', width: '100%', justifyContent: 'center' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    {copySuccess ? '¡Copiado!' : `Copiar Código de 13 dígitos ${!isPro ? '🔒' : ''}`}
                  </button>

                  <button 
                    onClick={handleSendToWorkspace} 
                    className={styles.btnNext}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Enviar a mi Mesa de Trabajo {!isPro && '🔒'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Navegación de Pasos */}
          <div className={styles.wizardActions}>
            <button 
              onClick={handlePrevStep} 
              disabled={step === 1}
              className={styles.btnBack}
              style={{ opacity: step === 1 ? 0.3 : 1 }}
            >
              ← Atrás
            </button>
            
            {step < 4 && (
              <button 
                onClick={handleNextStep}
                disabled={
                  (step === 2 && companyPrefix.length === 0) ||
                  (step === 3 && productCode.length !== neededProductLength)
                }
                className={styles.btnNext}
              >
                Siguiente →
              </button>
            )}
          </div>
        </div>

        {/* Lado Derecho: Live Preview Card */}
        <div className={styles.previewSection}>
          <div className={styles.barcodeVisualCard}>
            <h4 className={styles.visualLabelTitle}>Estructura del Código</h4>
            
            {/* Visualización del código de barras real */}
            {finalCode.length === 13 ? (
              <div style={{ background: 'white', padding: '4px', borderRadius: '4px' }}>
                <svg ref={barcodeRef} />
              </div>
            ) : (
              <div className={styles.barcodeSvgPlaceholder}>
                Completa los pasos para generar la vista previa del código de barras real...
              </div>
            )}

            {/* Desglose de segmentos coloreados */}
            <div className={styles.segmentsContainer}>
              <div className={`${styles.segmentBlock} ${styles.segCountry}`} title="Prefijo de País">
                <span className={styles.segmentBlockValue}>
                  {selectedCountry.prefix}
                </span>
                <span className={styles.segmentBlockLabel}>País</span>
              </div>

              <div className={`${styles.segmentBlock} ${styles.segCompany}`} title="Código de Empresa">
                <span className={styles.segmentBlockValue}>
                  {companyPrefix || '•'.repeat(maxCompanyLength)}
                </span>
                <span className={styles.segmentBlockLabel}>Empresa</span>
              </div>

              <div className={`${styles.segmentBlock} ${styles.segProduct}`} title="Código de Producto">
                <span className={styles.segmentBlockValue}>
                  {productCode || '•'.repeat(neededProductLength > 0 ? neededProductLength : 3)}
                </span>
                <span className={styles.segmentBlockLabel}>Prod</span>
              </div>

              <div className={`${styles.segmentBlock} ${styles.segCheck}`} title="Dígito Verificador (Calculado)">
                <span className={styles.segmentBlockValue} style={{ color: checkDigit !== null ? '#f59e0b' : 'inherit' }}>
                  {checkDigit !== null ? checkDigit : '?'}
                </span>
                <span className={styles.segmentBlockLabel}>Verif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
