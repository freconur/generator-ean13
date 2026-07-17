import React from 'react';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className={`${styles.footer} ${className || ''}`}>
        <div className={styles.container}>
          {/* Sección principal */}
          <div className={styles.mainSection}>
            <div className={styles.logoSection}>
              <div className={styles.title}>📊 izicode</div>
              <p className={styles.description}>
                izicode es la plataforma inteligente para la generación, validación e impresión de códigos de barras EAN-13. Optimiza el control de tu inventario y acelera tus ventas.
              </p>
            </div>
            
            <div className={styles.linksSection}>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Producto</h4>
                <ul className={styles.linkList}>
                  <li>
                    <a href="#generator" className={styles.link}>
                      Generador
                    </a>
                  </li>
                  <li>
                    <a href="#features" className={styles.link}>
                      Características
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className={styles.link}>
                      Precios
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className={styles.link}>
                      Preguntas Frecuentes
                    </a>
                  </li>
                </ul>
              </div>
              
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Soporte</h4>
                <ul className={styles.linkList}>
                  <li>
                    <a href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20pregunta%20sobre%20izicode" target="_blank" rel="noopener noreferrer" className={styles.link}>
                      Soporte WhatsApp
                    </a>
                  </li>
                  <li>
                    <Link href="/contact" className={styles.link}>
                      Contacto
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs" className={styles.link}>
                      Documentación
                    </Link>
                  </li>
                </ul>
              </div>

              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Legal</h4>
                <ul className={styles.linkList}>
                  <li>
                    <Link href="/terms" className={styles.link}>
                      Términos de Servicio
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className={styles.link}>
                      Política de Privacidad
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Divisor */}
          <div className={styles.divider}></div>
          
          {/* Sección inferior */}
          <div className={styles.bottomSection}>
            <div className={styles.copyright}>
              <p>© {currentYear} izicode. Hecho con 💜 y código.</p>
            </div>
            
            <div className={styles.badges}>
              <span className={styles.badge}>
                <span className={styles.badgeIcon}>⚡</span>
                Rápido
              </span>
              <span className={styles.badge}>
                <span className={styles.badgeIcon}>🌍</span>
                Global
              </span>
              <span className={styles.badge}>
                <span className={styles.badgeIcon}>🔒</span>
                Seguro
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp (Feedback & Soporte) */}
      <a
        href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20pregunta%20sobre%20izicode"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.whatsappButton}
        title="💬 ¿Necesitas ayuda o tienes una sugerencia?"
      >
        <svg 
          className={styles.whatsappIcon}
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.578 1.98 14.113.953 11.49.951c-5.434 0-9.858 4.372-9.863 9.8-.001 1.838.482 3.633 1.4 5.216l-1.018 3.715 3.829-.997zm11.378-7.918c-.312-.156-1.848-.91-2.137-1.014-.29-.104-.5-.156-.71.156-.21.312-.813 1.014-.997 1.22-.183.208-.368.23-.68.075-.312-.156-1.32-.486-2.515-1.55-.93-.829-1.558-1.854-1.74-2.165-.183-.312-.02-.48.136-.635.14-.14.312-.363.468-.545.156-.182.208-.312.312-.52.104-.208.052-.39-.026-.545-.078-.156-.71-1.71-.973-2.34-.256-.615-.516-.53-.71-.54-.183-.01-.39-.01-.597-.01-.208 0-.547.078-.833.39-.286.312-1.092 1.066-1.092 2.6s1.118 3.016 1.274 3.224c.156.208 2.199 3.358 5.328 4.708.744.32 1.325.512 1.777.656.748.238 1.43.204 1.97.124.602-.09 1.848-.755 2.11-1.485.26-.73.26-1.353.183-1.485-.078-.132-.29-.208-.6-.364z"/>
        </svg>
      </a>
    </>
  );
};

export default Footer; 