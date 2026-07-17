import styles from '../../styles/Landing.module.css';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: '/features/validation.jpg',
    title: 'Garantía de Escaneo Sin Errores',
    description: 'Verificamos al instante el dígito verificador matemático de cada código EAN-13. Evita que tus etiquetas sean rechazadas por lectores o almacenes.',
  },
  {
    icon: '/features/cloud.jpg',
    title: 'Tus Lotes Siempre a la Mano',
    description: 'Guarda tus listas de códigos de barras en la nube de forma segura. Reimprime tus etiquetas al instante desde cualquier lugar, sin volver a digitar.',
  },
  {
    icon: '/features/print.jpg',
    title: 'Impresión Profesional a tu Medida',
    description: 'Exporta tus códigos en plantillas optimizadas para hojas autoadhesivas A4 multi-columna o impresoras térmicas de rollo. Ahorra en papel adhesivo.',
  },
  {
    icon: '/features/label.jpg',
    title: 'Etiquetas Completas para Góndola',
    description: 'Personaliza tus etiquetas añadiendo el nombre del producto y el precio directamente sobre el código de barras. Facilita la venta y el control en tienda.',
  },
  {
    icon: '/features/currency.jpg',
    title: 'Precios en tu Moneda Local',
    description: 'Olvídate de configuraciones difíciles. Detectamos tu ubicación geográfica para formar los precios automáticamente según tu divisa nacional.',
  },
  {
    icon: '/features/frictionless.jpg',
    title: 'Uso Inmediato y Sin Complicaciones',
    description: 'Sin registros obligatorios ni formularios largos. Entra, genera tus códigos EAN-13 y descárgalos en menos de 1 minuto.',
  }
];

export default function Features() {
  return (
    <div className={styles.featuresWrapper} id="features">
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Todo lo que necesitas para tu inventario</h2>
          <p className={styles.sectionSubtitle}>
            Diseñado especialmente para pequeños comercios, tiendas minoristas, almacenes y vendedores de MercadoLibre o Amazon.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={featureCardClass(idx)}>
              <div className={styles.featureIconContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={feature.icon} 
                  alt={feature.title} 
                  className={styles.featureIconImage} 
                />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Pequeño helper para clases CSS del grid
function featureCardClass(idx: number) {
  return styles.featureCard;
}
