import React from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Home.module.css';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving = false
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={isDeleting => isSaving ? undefined : onClose}>
      <div 
        className={styles.importModal} 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '420px', border: '1px solid rgba(245, 158, 11, 0.2)' }}
      >
        <div className={styles.importModalHeader} style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#f59e0b" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m10.29 3.86 7.9 13.5a2 2 0 0 1-1.7 3H3.84a2 2 0 0 1-1.7-3l7.9-13.5a2 2 0 0 1 3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className={styles.importModalTitle} style={{ color: '#d97706' }}>Cambios sin guardar</h3>
          </div>
          <button 
            className={styles.importModalCloseBtn} 
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className={styles.importModalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 20px' }}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            Tienes cambios sin guardar en este lote. ¿Deseas guardarlos antes de salir?
          </p>
          
          <div className={styles.saveButtonsContainer} style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={styles.modalCancelBtn}
              style={{ flex: '1', minWidth: '80px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className={styles.modalCancelBtn}
              style={{ 
                flex: '1.2', 
                minWidth: '120px', 
                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                color: '#ef4444', 
                borderColor: 'rgba(239, 68, 68, 0.2)' 
              }}
            >
              Salir sin guardar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className={styles.modalConfirmBtn}
              style={{ 
                flex: '1.2', 
                minWidth: '120px', 
                backgroundColor: '#10b981', 
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' 
              }}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
