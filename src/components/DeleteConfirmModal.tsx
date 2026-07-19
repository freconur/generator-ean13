import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Home.module.css';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  batchName: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, batchName }: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = async () => {
    if (confirmInput !== batchName) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming delete batch:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmed = confirmInput === batchName;

  return createPortal(
    <div className={styles.modalOverlay} onClick={isDeleting ? undefined : onClose}>
      <div 
        className={styles.importModal} 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
      >
        <div className={styles.importModalHeader} style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m10.29 3.86 7.9 13.5a2 2 0 0 1-1.7 3H3.84a2 2 0 0 1-1.7-3l7.9-13.5a2 2 0 0 1 3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className={styles.importModalTitle} style={{ color: '#ef4444' }}>¿Eliminar Lote?</h3>
          </div>
          <button 
            className={styles.importModalCloseBtn} 
            onClick={onClose} 
            disabled={isDeleting}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className={styles.importModalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px 20px' }}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            ¿Estás seguro de que deseas eliminar permanentemente el lote <strong>&ldquo;{batchName}&rdquo;</strong>?
          </p>
          <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '12px', color: '#dc2626' }}>
            Esta acción no se puede deshacer. Se borrarán el lote y todos sus códigos asociados.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <label htmlFor="confirmBatchName" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Escribe el nombre del lote para confirmar:
            </label>
            <input
              id="confirmBatchName"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={batchName}
              disabled={isDeleting}
              className={styles.input}
              style={{ 
                width: '100%', 
                borderColor: isConfirmed ? '#10b981' : 'rgba(239, 68, 68, 0.3)',
                boxShadow: isConfirmed ? '0 0 0 1px #10b981' : 'none',
                transition: 'all 0.2s ease'
              }}
              autoComplete="off"
            />
          </div>
          
          <div className={styles.saveButtonsContainer} style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className={styles.modalCancelBtn}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || !isConfirmed}
              className={styles.modalConfirmBtn}
              style={{ 
                background: isConfirmed ? '#ef4444' : '#cbd5e1', 
                color: isConfirmed ? '#ffffff' : '#94a3b8', 
                boxShadow: isConfirmed ? '0 4px 10px rgba(239, 68, 68, 0.25)' : 'none',
                cursor: isConfirmed && !isDeleting ? 'pointer' : 'not-allowed'
              }}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                  </svg>
                  <span>Eliminando...</span>
                </>
              ) : (
                <span>Eliminar Lote</span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
