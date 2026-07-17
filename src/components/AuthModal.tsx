import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/AuthModal.module.css';
import { useRouter } from 'next/router';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {

      // Capturar cancelación u otros errores
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
      }
      setIsSigningIn(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={() => setIsAuthModalOpen(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={() => setIsAuthModalOpen(false)}
          aria-label="Cerrar modal"
        >
          ×
        </button>

        <div className={styles.modalHeader}>
          <span className={styles.logoIcon}>📊</span>
          <h2>Únete al Plan SaaS</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Desbloquea todo el poder del generador EAN-13
          </p>
        </div>

        <div className={styles.modalBody}>
          <ul className={styles.valueProp}>
            <li>
              <span className={styles.bulletIcon}>✨</span>
              <span><strong>Generación ilimitada:</strong> Olvídate de los límites de invitado de 3 códigos.</span>
            </li>
            <li>
              <span className={styles.bulletIcon}>📂</span>
              <span><strong>Historial en la nube:</strong> Accede a tu panel personal con tus códigos guardados.</span>
            </li>
            <li>
              <span className={styles.bulletIcon}>🚀</span>
              <span><strong>Preparado para Pro:</strong> Habilita la integración futura de suscripción de Stripe para personalización y descargas masivas avanzadas.</span>
            </li>
          </ul>

          {errorMsg && (
            <div style={{
              background: '#fee2e2',
              color: '#ef4444',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
              fontWeight: 500,
              border: '1px solid #fca5a5'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button 
            className={styles.googleBtn} 
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Iniciando sesión...
              </span>
            ) : (
              <>
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.97 1 12 1 7.35 1 3.39 3.67 1.49 7.56l3.75 2.91C6.12 7.02 8.84 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.84c2.15-1.98 3.74-4.9 3.74-8.49z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.24 14.73c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.49 7.42C.54 9.33 0 11.55 0 13.91s.54 4.58 1.49 6.49l3.75-2.91a7.842 7.842 0 0 1-.36-2.76z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.67-2.84c-1.02.68-2.33 1.09-4.29 1.09-3.16 0-5.88-1.98-6.84-4.87L1.41 16.3C3.3 20.21 7.29 23 12 23z"
                  />
                </svg>
                Continuar con Google
              </>
            )}
          </button>
        </div>

        <div className={styles.footerText}>
          Al continuar aceptas nuestros términos de servicio y políticas de privacidad.
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
