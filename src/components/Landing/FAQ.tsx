import { useState } from 'react';
import styles from '../../styles/Landing.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: '¿Cómo generar códigos de barras EAN-13 gratis para MercadoLibre y Amazon?',
    answer: 'Con izicode puedes generar códigos de barras EAN-13 online de forma 100% gratuita y sin registros obligatorios. Solo ingresa los 12 dígitos de tu producto y el sistema calculará al instante el dígito verificador matemático. Podrás descargar un archivo PDF listo para imprimir que cumple estrictamente con los estándares y tamaños exigidos en los centros de almacenamiento y distribución de Mercado Libre y Amazon.',
  },
  {
    question: '¿Por qué mi lector o escáner no lee los códigos de barras de mis productos?',
    answer: 'La causa principal es un error matemático en el dígito de control o una distorsión al momento de imprimir. izicode soluciona esto garantizando que todos los códigos EAN-13 generados pasen por una validación matemática estricta en tiempo real. Al imprimir tu PDF, asegúrate de seleccionar "Tamaño real" (100% de escala) en tu impresora para que las barras mantengan la nitidez exacta que los lectores de barra necesitan.',
  },
  {
    question: '¿Cómo imprimir etiquetas EAN-13 en hojas autoadhesivas tamaño A4?',
    answer: 'Nuestra plataforma te permite exportar tus etiquetas en plantillas PDF optimizadas para hojas autoadhesivas tamaño A4 multi-columna o en formato de rollo continuo para impresoras térmicas de etiquetas. Para que queden perfectamente alineadas, descarga el archivo PDF y en los ajustes de impresión elige "Tamaño real" en lugar de "Ajustar al papel". Esto garantiza una alineación milimétrica y sin fallas.',
  },
  {
    question: '¿Qué beneficios ofrece el Plan Pro de por vida de izicode por $9?',
    answer: 'El Plan Pro (pago único de $9 para acceso de por vida) desbloquea funciones premium de automatización masiva. Te permite importar listas completas de productos desde archivos Excel o CSV en segundos, almacenar un historial ilimitado de lotes en la nube para reimprimirlos cuando quieras, añadir descripciones del producto y precios de góndola sobre el código, y personalizar el tamaño y color de las etiquetas.',
  },
  {
    question: '¿Es posible guardar mis listas de códigos de barras en la nube para reimprimirlos?',
    answer: '¡Por supuesto! izicode cuenta con almacenamiento seguro en la nube. En el plan gratuito puedes guardar hasta 3 lotes activos temporalmente. Si actualizas al Plan Pro de por vida, tendrás un historial ilimitado de lotes guardados de forma segura, permitiéndote acceder, editar, añadir nuevos productos o reimprimir tus plantillas de etiquetas al instante desde cualquier computadora o dispositivo móvil.',
  }
];

export default function FAQ() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const toggleFAQ = (idx: number) => {
    setActiveIdx(prevIdx => prevIdx === idx ? null : idx);
  };

  return (
    <section className={styles.section} id="faq">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Preguntas Frecuentes</h2>
        <p className={styles.sectionSubtitle}>
          ¿Tienes dudas sobre cómo imprimir, generar o validar tus etiquetas? Aquí respondemos las más comunes.
        </p>
      </div>

      <div className={styles.faqContainer}>
        {faqs.map((faq, idx) => {
          const isOpen = activeIdx === idx;
          return (
            <div
              key={idx}
              className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFAQ(idx)}
                aria-expanded={isOpen}
              >
                {faq.question}
              </button>
              <div className={`${styles.faqAnswerContainer} ${isOpen ? styles.faqAnswerExpanded : ''}`}>
                <div className={styles.faqAnswerContent}>
                  <div className={styles.faqAnswer}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
