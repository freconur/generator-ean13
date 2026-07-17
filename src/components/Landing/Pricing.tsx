import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Landing.module.css';
import { useLimits } from '../../hooks/useLimits';

export default function Pricing() {
  const { user, setIsAuthModalOpen } = useAuth();
  const { limits } = useLimits();

  // Enlace de pago de Stripe (Reemplazar con enlace real de producción)
  const STRIPE_PRO_PAYMENT_LINK = 'https://buy.stripe.com/test_6oE01K905e94b2E4gg';

  const handleProPlan = () => {
    if (!user) {
      // Si el usuario no está logeado, abrimos el modal de login
      setIsAuthModalOpen(true);
    } else {
      // Si está logeado, lo enviamos al enlace de pago de Stripe
      // Pasamos su email en la URL si Stripe lo soporta, o simplemente redirigimos
      const paymentUrl = new URL(STRIPE_PRO_PAYMENT_LINK);
      paymentUrl.searchParams.append('prefilled_email', user.email || '');
      paymentUrl.searchParams.append('client_reference_id', user.uid);
      window.location.href = paymentUrl.toString();
    }
  };

  const handleFreePlan = () => {
    // Hace scroll automático al generador
    const generatorElement = document.getElementById('generator');
    if (generatorElement) {
      generatorElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.section} id="pricing">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Planes sencillos para tu negocio</h2>
        <p className={styles.sectionSubtitle}>
          Genera etiquetas de forma gratuita o accede a la automatización masiva, carga desde Excel y mayor almacenamiento en la nube con nuestro Plan Pro de por vida.
        </p>
      </div>

      <div className={styles.pricingGrid}>
        {/* Plan Gratis */}
        <div className={styles.pricingCard}>
          <h3 className={styles.planName}>Gratis</h3>
          <div className={styles.planPrice}>
            $0 <span className={styles.planPeriod}>/ siempre gratis</span>
          </div>
          <ul className={styles.planFeatures}>
            <li>
              <span className={styles.featureCheck}>✓</span> Generación EAN-13 ilimitada
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Hasta {limits.free.maxCodesPerBatch} códigos por lote
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Hasta {limits.free.maxBatches} lotes guardados en la nube
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Validación y control de errores al instante
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Exportación a PDF en A4 y Térmico
            </li>
            <li style={{ textDecoration: 'line-through', opacity: 0.6 }}>
              <span>✗</span> Importación masiva desde Excel/CSV
            </li>
            <li style={{ textDecoration: 'line-through', opacity: 0.6 }}>
              <span>✗</span> Auto-generador de códigos correlativos
            </li>
          </ul>
          <button 
            className={`${styles.pricingButton} ${styles.btnOutline}`}
            onClick={handleFreePlan}
          >
            Comenzar Gratis
          </button>
        </div>

        {/* Plan Pro */}
        <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
          <div className={styles.popularBadge}>Recomendado</div>
          <h3 className={styles.planName}>Pro</h3>
          <div className={styles.planPrice}>
            $9 <span className={styles.planPeriod}>/ pago único</span>
          </div>
          <ul className={styles.planFeatures}>
            <li>
              <span className={styles.featureCheck}>✓</span> Todo el plan Gratis incluido
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Hasta {limits.pro.maxCodesPerBatch.toLocaleString()} códigos por lote
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Hasta {limits.pro.maxBatches} lotes guardados en la nube
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Importación masiva desde Excel o CSV (Ahorra horas)
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Auto-generador de códigos correlativos
            </li>
            <li>
              <span className={styles.featureCheck}>✓</span> Soporte VIP prioritario por WhatsApp
            </li>
          </ul>
          <button 
            className={`${styles.pricingButton} ${styles.btnSolid}`}
            onClick={handleProPlan}
          >
            Adquirir Plan Pro por $9 (Acceso de por Vida)
          </button>
        </div>
      </div>
    </section>
  );
}
