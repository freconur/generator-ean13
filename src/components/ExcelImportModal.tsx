import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Home.module.css';
import CSVImporter from './Import/CSVImporter';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[]) => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImport,
}: ExcelImportModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.importModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.importModalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h3 className={styles.importModalTitle}>Cargar Excel / CSV</h3>
          </div>
          <button
            onClick={onClose}
            className={styles.importModalCloseBtn}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className={styles.importModalBody}>
          <CSVImporter
            onImport={(items) => {
              onImport(items);
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
