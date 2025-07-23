import React from 'react';
import styles from '../styles/Footer.module.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${styles.footer} ${className || ''}`}>
      <div className={styles.container}>
        {/* Sección principal */}
        <div className={styles.mainSection}>
          <div className={styles.logoSection}>
            <h3 className={styles.title}>📊 EAN-13 Generator</h3>
            <p className={styles.description}>
              Generador profesional de códigos de barras con soporte para múltiples monedas
            </p>
          </div>
          
          <div className={styles.linksSection}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkTitle}>Tecnologías</h4>
              <ul className={styles.linkList}>
                <li>
                  <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Next.js
                  </a>
                </li>
                <li>
                  <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    React
                  </a>
                </li>
                <li>
                  <a href="https://www.npmjs.com/package/jsbarcode" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    JsBarcode
                  </a>
                </li>
                <li>
                  <a href="https://react-pdf.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    React-PDF
                  </a>
                </li>
              </ul>
            </div>
            
            <div className={styles.linkGroup}>
              <h4 className={styles.linkTitle}>Recursos</h4>
              <ul className={styles.linkList}>
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className={styles.link}>
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className={styles.link}>
                    Soporte
                  </a>
                </li>
                <li>
                  <a href="#" className={styles.link}>
                    API
                  </a>
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
            <p>© {currentYear} EAN-13 Generator. Hecho con 💜 y código.</p>
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
  );
};

export default Footer; 