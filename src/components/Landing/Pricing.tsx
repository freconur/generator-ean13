import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Landing.module.css';
import { useLimits } from '../../hooks/useLimits';

export default function Pricing() {
  const { user, setIsAuthModalOpen } = useAuth();
  const { limits } = useLimits();
  const [isAnnual, setIsAnnual] = useState(false);

  // Enlaces de pago de Stripe (Reemplazar con enlaces reales de producción)
  const STRIPE_PRO_MONTHLY_LINK = 'https://buy.stripe.com/test_6oE01K905e94b2E4gg';
  const STRIPE_PRO_YEARLY_LINK = 'https://buy.stripe.com/test_8wY4i013z2etb2E4gg';

  const handleProPlan = () => {
    if (!user) {
      // Si el usuario no está logeado, abrimos el modal de login
      setIsAuthModalOpen(true);
    } else {
      // Si está logeado, lo enviamos al enlace de pago de Stripe correspondiente
      // Pasamos su email en la URL si Stripe lo soporta, o simplemente redirigimos
      const stripeLink = isAnnual ? STRIPE_PRO_YEARLY_LINK : STRIPE_PRO_MONTHLY_LINK;
      const paymentUrl = new URL(stripeLink);
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
          Genera etiquetas de forma gratuita o accede a la automatización masiva, carga desde Excel y mayor almacenamiento en la nube con nuestro Plan Pro.
        </p>

        {/* Toggle de Facturación */}
        <div className={styles.toggleContainer}>
          <span 
            className={`${styles.toggleLabel} ${!isAnnual ? styles.activeLabel : ''}`}
            onClick={() => setIsAnnual(false)}
          >
            Mensual
          </span>
          <button 
            className={`${styles.toggleSwitch} ${isAnnual ? styles.toggleSwitchActive : ''}`} 
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Alternar facturación mensual y anual"
          >
            <span className={styles.toggleSlider} />
          </button>
          <span 
            className={`${styles.toggleLabel} ${isAnnual ? styles.activeLabel : ''}`}
            onClick={() => setIsAnnual(true)}
          >
            Anual <span className={styles.discountBadge}>-20%</span>
          </span>
        </div>
      </div>

      <div className={styles.pricingGrid}>
        {/* Plan Gratis */}
        <div className={styles.pricingCard}>
          <h3 className={styles.planName}>Gratis</h3>
          <div key={isAnnual ? 'free-annual' : 'free-monthly'} className={styles.priceAnimation}>
            <div className={styles.planPrice}>
              $0 <span className={styles.planPeriod}>/ siempre gratis</span>
            </div>
            <div className={styles.planExplanation}>
              Acceso básico y herramientas esenciales
            </div>
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
          <div key={isAnnual ? 'pro-annual' : 'pro-monthly'} className={styles.priceAnimation}>
            <div className={styles.planPrice}>
              {isAnnual ? '$4' : '$5'} <span className={styles.planPeriod}>/ mes</span>
            </div>
            <div className={styles.planExplanation}>
              {isAnnual ? 'Facturado anualmente: $48 / año' : 'Facturado mensualmente: $5 / mes'}
            </div>
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
            {isAnnual ? 'Suscribirse al Plan Pro Anual ($48 / año)' : 'Suscribirse al Plan Pro Mensual ($5 / mes)'}
          </button>
        </div>
      </div>
    </section>
  );
}
