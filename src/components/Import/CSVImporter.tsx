import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateEAN13 } from '../../utils/ean13Generator';
import styles from '../../styles/Import.module.css';

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

interface CSVImporterProps {
  onImport: (items: BarcodeItem[]) => void;
}

export default function CSVImporter({ onImport }: CSVImporterProps) {
  const { user, profile, setIsAuthModalOpen } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<BarcodeItem[]>([]);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);

  // Determinar si el usuario tiene privilegios Pro/Premium
  const isPro = profile?.role === 'admin' || (
    profile?.subscription?.tier === 'pro' &&
    profile?.subscription?.status === 'active' &&
    (!profile?.subscription?.expiresAt ||
     Date.now() < (profile.subscription.expiresAt < 99999999999 ? profile.subscription.expiresAt * 1000 : profile.subscription.expiresAt))
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Procesar y parsear el archivo CSV/TXT
  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorLog([]);
    setParsedItems([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setErrorLog(['Error al leer el archivo. Inténtalo de nuevo.']);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    const tempItems: BarcodeItem[] = [];
    const tempErrors: string[] = [];
    const codeSet = new Set<string>();

    let hasHeader = false;
    let startIndex = 0;

    // Detectar si la primera fila es una cabecera
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (
        firstLine.includes('code') || 
        firstLine.includes('código') || 
        firstLine.includes('codigo') ||
        firstLine.includes('quantity') ||
        firstLine.includes('cantidad') ||
        firstLine.includes('description') ||
        firstLine.includes('descripción') ||
        firstLine.includes('price') ||
        firstLine.includes('precio')
      ) {
        hasHeader = true;
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Saltar líneas vacías

      // Detectar separador (coma, punto y coma, o tabulador)
      let parts = line.split(',');
      if (parts.length === 1) parts = line.split(';');
      if (parts.length === 1) parts = line.split('\t');

      // Limpiar comillas y espacios de los campos
      const cleanParts = parts.map(p => p.replace(/^["']|["']$/g, '').trim());

      const rawCode = cleanParts[0] || '';
      const rawQty = cleanParts[1] || '1';
      const description = cleanParts[2] || undefined;
      const rawPrice = cleanParts[3] || undefined;

      if (!rawCode) {
        tempErrors.push(`Fila ${i + 1}: Código vacío.`);
        continue;
      }

      // Validar código
      const isValid = validateEAN13(rawCode);
      const quantity = parseInt(rawQty, 10) || 1;
      
      const cleanDesc = description ? String(description).toLowerCase().trim() : '';
      const hasDesc = cleanDesc !== '';

      const parsedPrice = rawPrice ? (parseFloat(rawPrice) || 0) : 0;
      const hasPrice = rawPrice !== undefined && rawPrice !== '' && !isNaN(parseFloat(rawPrice)) && parseFloat(rawPrice) > 0;

      const isDuplicate = codeSet.has(rawCode);

      if (isValid) {
        codeSet.add(rawCode);
      } else {
        tempErrors.push(`Fila ${i + 1}: Código "${rawCode}" no es un EAN-13 válido.`);
      }

      tempItems.push({
        code: rawCode,
        quantity: quantity,
        isValid: isValid,
        isDuplicate: isDuplicate,
        description: cleanDesc,
        price: parsedPrice,
        hasDescription: hasDesc,
        hasPrice: hasPrice
      });
    }

    setParsedItems(tempItems);
    setErrorLog(tempErrors);
    setShowResults(true);
  };

  const handleImportClick = () => {
    const validItems = parsedItems.filter(item => item.isValid);
    
    if (validItems.length === 0) {
      alert('No hay códigos válidos para importar.');
      return;
    }

    // Aplicar lógica PLG (Product-Led Growth)
    if (!isPro && validItems.length > 3) {
      // Si no es pro, importamos solo los 3 primeros y avisamos
      const limitedItems = validItems.slice(0, 3);
      onImport(limitedItems);
      alert(
        `Plan Gratis: Se importaron los primeros 3 códigos válidos de un total de ${validItems.length}.\n\n¡Actualiza a Pro para importar listas ilimitadas!`
      );
      // Hacer scroll a los precios
      const pricingElement = document.getElementById('pricing');
      if (pricingElement) {
        pricingElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Usuario Pro/Admin o lote pequeño (<3 códigos)
      onImport(validItems);
      alert(`Importación exitosa: Se agregaron ${validItems.length} códigos a tu generador.`);
    }

    resetImporter();
  };

  const resetImporter = () => {
    setFileName('');
    setParsedItems([]);
    setErrorLog([]);
    setShowResults(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = parsedItems.filter(item => item.isValid).length;
  const invalidCount = parsedItems.filter(item => !item.isValid).length;
  const duplicateCount = parsedItems.filter(item => item.isValid && item.isDuplicate).length;

  return (
    <div className={styles.importerContainer}>
      <h3 className={styles.title}>
        📤 Importador Masivo de Códigos (CSV / Excel)
      </h3>
      <p className={styles.description}>
        Sube un archivo `.csv` o `.txt` con columnas separadas por comas, punto y coma, o tabuladores. 
        El archivo debe organizarse de la siguiente manera:
      </p>

      <div className={styles.helpTableContainer}>
        <div className={styles.helpTableTitle}>Estructura del Archivo (Orden de Columnas)</div>
        <table className={styles.helpTable}>
          <thead>
            <tr>
              <th>Columna 1 (A)</th>
              <th>Columna 2 (B)</th>
              <th>Columna 3 (C)</th>
              <th>Columna 4 (D)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className={styles.badgeMandatory}>Código EAN-13</span>
                <span className={styles.badgeReq}>Obligatorio</span>
              </td>
              <td>
                <span className={styles.badgeName}>Cantidad</span>
                <span className={styles.badgeOpt}>Opcional</span>
              </td>
              <td>
                <span className={styles.badgeName}>Descripción</span>
                <span className={styles.badgeOpt}>Opcional</span>
              </td>
              <td>
                <span className={styles.badgeName}>Precio</span>
                <span className={styles.badgeOpt}>Opcional</span>
              </td>
            </tr>
            <tr>
              <td className={styles.exampleVal}>7790813227495</td>
              <td className={styles.exampleVal}>12</td>
              <td className={styles.exampleVal}>gaseosa cola 1.5l</td>
              <td className={styles.exampleVal}>12.50</td>
            </tr>
            <tr>
              <td className={styles.exampleVal}>7501006506309</td>
              <td className={styles.exampleVal} style={{ color: '#94a3b8', fontStyle: 'italic' }}>(vacío) &rarr; por defecto 1</td>
              <td className={styles.exampleVal} style={{ color: '#94a3b8', fontStyle: 'italic' }}>(vacío) &rarr; sin desc.</td>
              <td className={styles.exampleVal} style={{ color: '#94a3b8', fontStyle: 'italic' }}>(vacío) &rarr; sin precio</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!showResults ? (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            className={styles.fileInput}
            accept=".csv,.txt"
            onChange={handleFileChange}
          />
          <span className={styles.dropzoneIcon}>📄</span>
          <p className={styles.dropzoneText}>
            Arrastra tu archivo aquí o haz clic para buscarlo
          </p>
          <p className={styles.dropzoneHelp}>
            Solo archivos CSV o TXT de hasta 2MB
          </p>
        </div>
      ) : (
        <div className={styles.resultPanel}>
          <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--text-color)' }}>
            Archivo cargado: <strong>{fileName}</strong>
          </div>
          
          <div className={styles.summaryList}>
            <span className={`${styles.summaryBadge} ${styles.badgeSuccess}`}>
              ✓ {validCount} Válidos
            </span>
            {invalidCount > 0 && (
              <span className={`${styles.summaryBadge} ${styles.badgeError}`}>
                ✗ {invalidCount} Inválidos
              </span>
            )}
            {duplicateCount > 0 && (
              <span className={`${styles.summaryBadge} ${styles.badgeWarning}`}>
                ⚠️ {duplicateCount} Duplicados
              </span>
            )}
          </div>

          {!isPro && validCount > 3 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--warning-color)',
              color: 'var(--warning-color)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              🔒 <strong>Límite del Plan Gratis:</strong> Se detectaron {validCount} códigos válidos, pero solo podrás importar los primeros 3. ¡Actualiza a Pro para carga ilimitada sin límites!
            </div>
          )}

          {errorLog.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--error-color)', marginBottom: '6px' }}>
                Errores de validación encontrados:
              </div>
              <div className={styles.errorLog}>
                {errorLog.slice(0, 10).map((err, i) => (
                  <div key={i} className={styles.errorLogItem}>{err}</div>
                ))}
                {errorLog.length > 10 && (
                  <div className={styles.errorLogItem}>... y {errorLog.length - 10} errores más.</div>
                )}
              </div>
            </div>
          )}

          <div className={styles.actionRow}>
            <button className={styles.btnCancel} onClick={resetImporter}>
              Cancelar
            </button>
            <button className={styles.btnImport} onClick={handleImportClick}>
              Importar {validCount > 0 ? `(${isPro ? validCount : Math.min(3, validCount)} códigos)` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
