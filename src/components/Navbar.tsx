import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/Navbar.module.css';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, profile, loading, setIsAuthModalOpen, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDropdownOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
            <span className={styles.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M3 5v14M21 5v14" strokeWidth="2.5" />
                <path d="M7 5v14M15 5v14" strokeWidth="1.5" />
                <path d="M11 5v14" strokeWidth="3.5" />
              </svg>
            </span>
            <span className={styles.logoText}>izi</span>
            <span className={styles.logoSubtext}>code</span>
          </div>
        </div>

        {/* Enlaces de navegación - Desktop */}
        <div className={styles.navLinks}>
          <Link href="/#features" className={styles.navLink}>
            Características
          </Link>
          <Link href="/#pricing" className={styles.navLink}>
            Precios
          </Link>
          <Link href="/#faq" className={styles.navLink}>
            Preguntas Frecuentes
          </Link>
          <Link href="/docs" className={styles.navLink}>
            Documentación
          </Link>
          <Link href="/contact" className={styles.navLink}>
            Contacto
          </Link>
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
          
          {loading ? (
            <div className={styles.authPlaceholder} />
          ) : user ? (
            <div className={styles.userProfileContainer} onClick={(e) => e.stopPropagation()}>
              <button 
                className={styles.avatarButton} 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {profile?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={profile.photoURL} 
                    alt="Avatar" 
                    className={styles.userAvatar} 
                  />
                ) : (
                  <div className={styles.userAvatarFallback}>
                    {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`${styles.avatarArrow} ${isDropdownOpen ? styles.avatarArrowOpen : ''}`}>▼</span>
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownUserName}>{profile?.displayName || 'Usuario'}</span>
                    <span className={styles.dropdownUserPlan}>
                      Plan: {profile?.subscription.tier || 'Free'}
                    </span>
                  </div>
                  
                  <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    📊 Generador Pro
                  </Link>

                  <Link href="/profile" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    👤 Mi Cuenta
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link href="/admin" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                      🛡️ Administración
                    </Link>
                  )}

                  <button 
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                    }}
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button 
                className={styles.loginButton} 
                onClick={() => setIsAuthModalOpen(true)}
              >
                Iniciar Sesión
              </button>
              <button 
                className={styles.signupButton} 
                onClick={() => setIsAuthModalOpen(true)}
              >
                Pruébalo Gratis
              </button>
            </>
          )}

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
          <Link href="/#features" className={styles.mobileNavLink} onClick={handleLinkClick}>
            Características
          </Link>
          <Link href="/#pricing" className={styles.mobileNavLink} onClick={handleLinkClick}>
            Precios
          </Link>
          <Link href="/#faq" className={styles.mobileNavLink} onClick={handleLinkClick}>
            Preguntas Frecuentes
          </Link>
          <Link href="/docs" className={styles.mobileNavLink} onClick={handleLinkClick}>
            Documentación
          </Link>
          <Link href="/contact" className={styles.mobileNavLink} onClick={handleLinkClick}>
            Contacto
          </Link>
          
          {loading ? (
            <div className={styles.mobileAuthPlaceholder} />
          ) : user ? (
            <div className={styles.mobileUserInfo}>
              <div className={styles.mobileUserHeader}>
                {profile?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoURL} alt="Avatar" className={styles.mobileUserAvatar} />
                ) : (
                  <div className={styles.userAvatarFallback}>
                    {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.mobileUserDetail}>
                  <span className={styles.mobileUserName}>{profile?.displayName || 'Usuario'}</span>
                  <span className={styles.mobileUserPlan}>Plan: {profile?.subscription.tier || 'Free'}</span>
                </div>
              </div>
              
              <Link href="/dashboard" className={styles.mobileDropdownItem} onClick={handleLinkClick}>
                📊 Generador Pro
              </Link>

              <Link href="/profile" className={styles.mobileDropdownItem} onClick={handleLinkClick}>
                👤 Mi Cuenta
              </Link>

              {profile?.role === 'admin' && (
                <Link href="/admin" className={styles.mobileDropdownItem} onClick={handleLinkClick}>
                  🛡️ Administración
                </Link>
              )}

              <button 
                className={`${styles.mobileDropdownItem} ${styles.logoutItem}`}
                onClick={() => {
                  logout();
                  handleLinkClick();
                }}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          ) : (
            <>
              <button 
                className={styles.mobileLoginButton} 
                onClick={() => {
                  setIsAuthModalOpen(true);
                  handleLinkClick();
                }}
              >
                Iniciar Sesión
              </button>
              <button 
                className={styles.mobileSignupButton} 
                onClick={() => {
                  setIsAuthModalOpen(true);
                  handleLinkClick();
                }}
              >
                Pruébalo Gratis
              </button>
            </>
          )}

          <div className={styles.mobileActionButtons}>
            <button 
              className={styles.mobileThemeToggle}
              onClick={handleThemeToggle}
              aria-label={getThemeText()}
            >
              <span className={styles.themeIcon}>{getThemeIcon()}</span>
              {getThemeText()}
            </button>

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