import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/Home.module.css';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  defaultName?: string;
}

export default function CreateBatchModal({ isOpen, onClose, onCreate, defaultName }: CreateBatchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setBatchName(defaultName || '');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, defaultName]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = batchName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch (error) {
      console.error('Error creating batch:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.importModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className={styles.importModalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <h3 className={styles.importModalTitle}>Crear Nuevo Lote</h3>
          </div>
          <button className={styles.importModalCloseBtn} onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.importModalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'visible' }}>
          <div>
            <label htmlFor="batchNameInput" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Nombre del lote:
            </label>
            <input
              id="batchNameInput"
              ref={inputRef}
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`Lote del ${new Date().toLocaleDateString('es-PE')}`}
              className={styles.input}
              maxLength={100}
              required
              style={{ width: '100%' }}
            />
          </div>
          <div className={styles.saveButtonsContainer} style={{ marginTop: '8px', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className={styles.modalCancelBtn}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !batchName.trim()}
              className={styles.modalConfirmBtn}
            >
              {isSubmitting ? 'Creando...' : 'Crear Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
