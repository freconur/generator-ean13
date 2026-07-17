'use client';

import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Landing.module.css';

export default function Hero() {
  const { user } = useAuth();

  const handleScrollToGenerator = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('generator');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.heroSection}>
      {/* Decorative barcode stripes */}
      <div className={styles.heroDecoration} aria-hidden="true" />

      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Genera y Valida Códigos de Barras <span className={styles.heroTitleAccent}>EAN-13</span> para tus Productos
        </h1>

        <p className={styles.heroSubtitle}>
          La forma más rápida de crear, validar y descargar etiquetas EAN-13 listas para imprimir. Evita devoluciones y optimiza tu stock en MercadoLibre, Amazon o tu tienda física. Sin registros.
        </p>

        <div className={styles.heroActions}>
          <a
            href="#generator"
            className={styles.heroCTA}
            onClick={handleScrollToGenerator}
          >
            Crear Etiquetas Gratis ↓
          </a>

          {user && (
            <a href="/dashboard" className={styles.heroSecondaryCTA}>
              Ir al Dashboard →
            </a>
          )}
        </div>

        <div className={styles.heroBadges}>
          <span className={styles.heroBadge}>✓ 100% Gratis y Sin Registros</span>
          <span className={styles.heroBadge}>✓ Descarga en PDF (A4 y Térmico)</span>
          <span className={styles.heroBadge}>✓ Garantía de Escaneo Sin Errores</span>
        </div>
      </div>
    </section>
  );
}
