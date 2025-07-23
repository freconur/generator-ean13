import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/Navbar.module.css';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  // Detectar scroll para cambiar apariencia del navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    // Añadir una pequeña vibración en dispositivos que lo soporten
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Cerrar menú móvil cuando se hace click en un enlace
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  // Obtener el icono del tema actual
  const getThemeIcon = () => {
    return isDark ? '☀️' : '🌙';
  };

  const getThemeText = () => {
    return isDark ? 'Modo claro' : 'Modo oscuro';
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''} ${className || ''}`}>
      <div className={styles.container}>
        {/* Logo/Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📊</span>
            <span className={styles.logoText}>EAN-13</span>
            <span className={styles.logoSubtext}>Generator</span>
          </div>
        </div>

        {/* Enlaces de navegación - Desktop */}
        <div className={styles.navLinks}>
          <a href="#generator" className={styles.navLink}>
            <span className={styles.linkIcon}>🏠</span>
            Generador
          </a>
          <a href="#features" className={styles.navLink}>
            <span className={styles.linkIcon}>⚡</span>
            Características
          </a>
          <a href="#help" className={styles.navLink}>
            <span className={styles.linkIcon}>❓</span>
            Ayuda
          </a>
          <a href="#about" className={styles.navLink}>
            <span className={styles.linkIcon}>ℹ️</span>
            Acerca de
          </a>
        </div>

        {/* Botones de acción */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.themeToggle} 
            onClick={handleThemeToggle}
            title={getThemeText()}
            aria-label={getThemeText()}
          >
            <span className={styles.themeIcon}>{getThemeIcon()}</span>
          </button>
          
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.githubButton}
            title="Ver en GitHub"
          >
            <span className={styles.githubIcon}>⭐</span>
            <span className={styles.githubText}>GitHub</span>
          </a>
        </div>

        {/* Botón hamburguesa - Mobile */}
        <button 
          className={`${styles.hamburger} ${isMenuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Abrir menú"
        >
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>
      </div>

      {/* Menú móvil */}
      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.mobileMenuContent}>
          <a href="#generator" className={styles.mobileNavLink} onClick={handleLinkClick}>
            <span className={styles.linkIcon}>🏠</span>
            Generador
          </a>
          <a href="#features" className={styles.mobileNavLink} onClick={handleLinkClick}>
            <span className={styles.linkIcon}>⚡</span>
            Características
          </a>
          <a href="#help" className={styles.mobileNavLink} onClick={handleLinkClick}>
            <span className={styles.linkIcon}>❓</span>
            Ayuda
          </a>
          <a href="#about" className={styles.mobileNavLink} onClick={handleLinkClick}>
            <span className={styles.linkIcon}>ℹ️</span>
            Acerca de
          </a>
          
          <div className={styles.mobileActionButtons}>
            <button 
              className={styles.mobileThemeToggle}
              onClick={handleThemeToggle}
              aria-label={getThemeText()}
            >
              <span className={styles.themeIcon}>{getThemeIcon()}</span>
              {getThemeText()}
            </button>
            
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.mobileGithubButton}
              onClick={handleLinkClick}
            >
              <span className={styles.githubIcon}>⭐</span>
              Ver en GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Overlay para cerrar menú móvil */}
      {isMenuOpen && (
        <div 
          className={styles.mobileMenuOverlay} 
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navbar; 