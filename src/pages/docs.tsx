import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import styles from '@/styles/Docs.module.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('conceptos-basicos');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Referencias de las secciones para el Intersection Observer
  const sectionRefs = {
    'conceptos-basicos': useRef<HTMLElement>(null),
    'control-digit': useRef<HTMLElement>(null),
    'guia-impresion': useRef<HTMLElement>(null),
    'soporte-faqs': useRef<HTMLElement>(null),
  };

  const sidebarItems: SidebarItem[] = [
    { id: 'conceptos-basicos', label: 'Conceptos Básicos', icon: '📖' },
    { id: 'control-digit', label: 'Dígito de Control', icon: '🧮' },
    { id: 'guia-impresion', label: 'Guía de Impresión', icon: '🖨️' },
    { id: 'soporte-faqs', label: 'Preguntas Frecuentes', icon: '❓' },
  ];

  const faqs: FaqItem[] = [
    {
      question: '¿Por qué mi escáner de código de barras no lee el código generado?',
      answer: (
        <>
          <p>
            Esto suele deberse a tres factores principales:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
            <li><strong>Distorsión por escala:</strong> Si al imprimir se seleccionó &quot;Ajustar a la página&quot;, el ancho relativo de las barras cambia y el escáner no podrá descodificarlo. Asegúrate de imprimir a escala 100%.</li>
            <li><strong>Bajo contraste o resolución:</strong> Las barras deben ser completamente negras y el fondo blanco puro. Las impresiones borrosas o con tintas desgastadas fallarán en la lectura.</li>
            <li><strong>Dígito de control inválido:</strong> Si ingresaste un código manualmente sin calcular el dígito de control correcto. izicode corrige automáticamente este dígito para evitar que generes códigos defectuosos.</li>
          </ul>
        </>
      ),
    },
    {
      question: '¿Puedo usar estos códigos EAN-13 para vender mis productos en grandes tiendas o supermercados?',
      answer: (
        <>
          <p>
            <strong>Sí y no, dependiendo de la cadena de distribución:</strong>
          </p>
          <p>
            Para vender productos de forma legal y oficial en grandes cadenas minoristas internacionales (como Walmart, Carrefour, etc.), debes registrar tu empresa en <strong>GS1</strong> (la organización global reguladora) y adquirir tu propio prefijo de empresa.
          </p>
          <p>
            Una vez que tengas tus números oficiales asignados por GS1, puedes utilizar <strong>izicode</strong> para generar los códigos de barras e imprimirlos con total confianza.
          </p>
          <p>
            Si los códigos son para uso interno (inventario local, control de almacén, tiendas propias o puntos de venta pequeños que no exigen registro GS1), puedes inventar tus códigos (usualmente comenzando con prefijos de uso privado como el 200 al 299) sin coste alguno.
          </p>
        </>
      ),
    },
    {
      question: '¿Cómo funciona la generación de códigos en lote con Excel?',
      answer: (
        <>
          <p>
            izicode permite a los usuarios con plan <strong>Pro</strong> importar un archivo Excel (.xlsx o .csv) para generar cientos de códigos EAN-13 en cuestión de segundos.
          </p>
          <p>
            Solo debes estructurar tu documento con las columnas necesarias (como Código, Nombre de Producto, y Precio) e importarlo desde la interfaz principal de trabajo. La plataforma procesará el lote, autocalculará los dígitos de control erróneos y te permitirá descargar todas las etiquetas listas en un único archivo PDF optimizado para impresión.
          </p>
        </>
      ),
    },
    {
      question: '¿Qué hace izicode si ingreso un código de barras de 12 dígitos o con dígito de control incorrecto?',
      answer: (
        <>
          <p>
            Nuestra aplicación cuenta con un validador matemático inteligente integrado:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
            <li>Si introduces <strong>12 dígitos</strong>: el sistema asume que te falta el dígito de control, calcula automáticamente el dígito número 13 y genera el código válido completo.</li>
            <li>Si introduces <strong>13 dígitos</strong> pero el último es erróneo: izicode te avisará y reemplazará automáticamente el dígito incorrecto por el valor matemático real para evitar que imprimas etiquetas inservibles.</li>
          </ul>
        </>
      ),
    },
    {
      question: '¿Qué tipo de impresora y papel son recomendables para las etiquetas de códigos de barras?',
      answer: (
        <>
          <p>
            Para un resultado profesional y duradero, recomendamos utilizar una <strong>impresora térmica directa o de transferencia térmica</strong> (marcas como Zebra, TSC o Xprinter) con papel autoadhesivo térmico.
          </p>
          <p>
            Esto garantiza que el calor del cabezal defina barras nítidas sin derramar tinta. Si utilizas una impresora láser u de inyección de tinta convencional, asegúrate de utilizar papel adhesivo especial para etiquetas (como hojas A4 precortadas) y configurar la calidad de impresión al máximo.
          </p>
        </>
      ),
    },
  ];

  // Configuración del Intersection Observer para el menú lateral
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px', // Activa la sección que está en el tercio superior de la pantalla
      threshold: 0,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const ref = sectionRefs[id as keyof typeof sectionRefs];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Actualizar el hash de la URL de forma sutil
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Documentación y Guía de Impresión | izicode</title>
        <meta name="description" content="Guía detallada sobre códigos de barras EAN-13, configuración de impresión a tamaño real y resolución de problemas técnicos con izicode." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.mainContent}>
        {/* Sidebar de navegación */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Contenido</div>
          <nav className={styles.sidebarNav}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`${styles.sidebarLink} ${activeSection === item.id ? styles.activeLink : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Contenido principal */}
        <div className={styles.contentArea}>
          <div className={styles.header}>
            <h1 className={styles.title}>Documentación Oficial</h1>
            <p className={styles.subtitle}>Aprende a generar, validar e imprimir tus códigos de barras EAN-13 sin errores.</p>
          </div>

          {/* Sección 1: Conceptos Básicos */}
          <section id="conceptos-basicos" ref={sectionRefs['conceptos-basicos']} className={styles.section}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>📖</div>
                <h2 className={styles.sectionTitle}>Conceptos Básicos de EAN-13</h2>
              </div>
              <div className={styles.content}>
                <p>
                  El código <strong>EAN-13</strong> (European Article Number, renombrado ahora como International Article Number) es el estándar de identificación de productos más utilizado en comercios minoristas de todo el mundo.
                </p>
                <p>
                  Consta de <strong>13 dígitos numéricos</strong> representados por una secuencia de barras y espacios negros sobre un fondo blanco que pueden ser interpretados rápidamente por escáneres ópticos o láseres.
                </p>

                <h3>Estructura del Código</h3>
                <p>
                  Los 13 dígitos de un código de barras EAN-13 no se eligen al azar. Están estructurados minuciosamente de la siguiente manera:
                </p>
                <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
                  <li><strong>Prefijo de País (Dígitos 1-3):</strong> Identifican la sucursal de GS1 en donde se registró la empresa (por ejemplo, 84 representa a GS1 España, 750 a GS1 México, 770 a GS1 Colombia, etc.).</li>
                  <li><strong>Código de Empresa (Dígitos 4-7 u 8):</strong> Código numérico asignado por GS1 a la empresa propietaria de la marca.</li>
                  <li><strong>Código de Producto (Dígitos 8-12 o 9-12):</strong> Código asignado libremente por el fabricante para identificar un artículo específico.</li>
                  <li><strong>Dígito de Control (Dígito 13):</strong> Último número que se calcula matemáticamente a partir de los primeros 12 dígitos para garantizar la integridad y validez del escaneo.</li>
                </ul>

                <div className={styles.barcodeVisualizer}>
                  {/* Representación visual básica del código EAN-13 */}
                  <svg width="200" height="90" viewBox="0 0 200 90" fill="currentColor">
                    <rect x="0" y="0" width="200" height="90" fill="#ffffff" />
                    {/* Barras protectoras inicio */}
                    <rect x="15" y="10" width="2" height="70" fill="#000000" />
                    <rect x="19" y="10" width="2" height="70" fill="#000000" />
                    {/* Primer bloque de dígitos */}
                    <rect x="25" y="10" width="3" height="60" fill="#000000" />
                    <rect x="32" y="10" width="1" height="60" fill="#000000" />
                    <rect x="36" y="10" width="4" height="60" fill="#000000" />
                    <rect x="44" y="10" width="2" height="60" fill="#000000" />
                    <rect x="49" y="10" width="1" height="60" fill="#000000" />
                    <rect x="54" y="10" width="3" height="60" fill="#000000" />
                    <rect x="60" y="10" width="2" height="60" fill="#000000" />
                    <rect x="66" y="10" width="4" height="60" fill="#000000" />
                    <rect x="74" y="10" width="1" height="60" fill="#000000" />
                    <rect x="78" y="10" width="2" height="60" fill="#000000" />
                    <rect x="85" y="10" width="3" height="60" fill="#000000" />
                    <rect x="91" y="10" width="1" height="60" fill="#000000" />
                    {/* Barras protectoras centrales */}
                    <rect x="96" y="10" width="2" height="70" fill="#000000" />
                    <rect x="100" y="10" width="2" height="70" fill="#000000" />
                    {/* Segundo bloque de dígitos */}
                    <rect x="106" y="10" width="4" height="60" fill="#000000" />
                    <rect x="114" y="10" width="1" height="60" fill="#000000" />
                    <rect x="118" y="10" width="2" height="60" fill="#000000" />
                    <rect x="124" y="10" width="3" height="60" fill="#000000" />
                    <rect x="130" y="10" width="1" height="60" fill="#000000" />
                    <rect x="134" y="10" width="4" height="60" fill="#000000" />
                    <rect x="142" y="10" width="2" height="60" fill="#000000" />
                    <rect x="147" y="10" width="1" height="60" fill="#000000" />
                    <rect x="152" y="10" width="3" height="60" fill="#000000" />
                    <rect x="158" y="10" width="2" height="60" fill="#000000" />
                    <rect x="164" y="10" width="4" height="60" fill="#000000" />
                    <rect x="172" y="10" width="1" height="60" fill="#000000" />
                    {/* Barras protectoras final */}
                    <rect x="177" y="10" width="2" height="70" fill="#000000" />
                    <rect x="181" y="10" width="2" height="70" fill="#000000" />
                    {/* Texto del EAN-13 */}
                    <text x="5" y="82" fontFamily="var(--font-body)" fontSize="10" fill="#000000" fontWeight="600">8</text>
                    <text x="35" y="82" fontFamily="var(--font-body)" fontSize="10" fill="#000000" letterSpacing="3" fontWeight="600">412345</text>
                    <text x="115" y="82" fontFamily="var(--font-body)" fontSize="10" fill="#000000" letterSpacing="3" fontWeight="600">678905</text>
                  </svg>
                  <span className={styles.barcodeCaption}>
                    Estructura visual de barras de un código EAN-13 standard
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Sección 2: Dígito de Control */}
          <section id="control-digit" ref={sectionRefs['control-digit']} className={styles.section}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>🧮</div>
                <h2 className={styles.sectionTitle}>El Dígito de Control (Dígito 13)</h2>
              </div>
              <div className={styles.content}>
                <p>
                  El décimo tercer dígito es un valor calculado matemáticamente mediante un algoritmo de ponderación modular. Su único propósito es verificar que los 12 números previos hayan sido leídos correctamente por el lector óptico, evitando errores en cobros y registros de stock.
                </p>

                <h3>Algoritmo de Cálculo Paso a Paso</h3>
                <p>
                  Tomemos como ejemplo los primeros 12 dígitos del código de barras: <strong>841234567890</strong>. El algoritmo calcula el último dígito mediante el siguiente proceso:
                </p>

                <div className={styles.controlDigitBox}>
                  <ol className={styles.stepsList}>
                    <li className={styles.stepItem}>
                      <span className={styles.stepNumber}>1</span>
                      <div className={styles.stepContent}>
                        <strong>Sumar las posiciones impares</strong>
                        <span>Se suman los dígitos ubicados en las posiciones 1, 3, 5, 7, 9 y 11:</span>
                        <div className={styles.mathDemo}>
                          8 + 1 + 3 + 5 + 7 + 9 = <strong>33</strong>
                        </div>
                      </div>
                    </li>
                    <li className={styles.stepItem}>
                      <span className={styles.stepNumber}>2</span>
                      <div className={styles.stepContent}>
                        <strong>Sumar las posiciones pares y multiplicar por 3</strong>
                        <span>Se suman los dígitos ubicados en las posiciones 2, 4, 6, 8, 10 y 12, y el resultado se multiplica por 3:</span>
                        <div className={styles.mathDemo}>
                          (4 + 2 + 4 + 6 + 8 + 0) = 24 <br />
                          24 × 3 = <strong>72</strong>
                        </div>
                      </div>
                    </li>
                    <li className={styles.stepItem}>
                      <span className={styles.stepNumber}>3</span>
                      <div className={styles.stepContent}>
                        <strong>Sumar ambos resultados</strong>
                        <span>Se suma el total de las posiciones impares y el total ponderado de las posiciones pares:</span>
                        <div className={styles.mathDemo}>
                          33 + 72 = <strong>105</strong>
                        </div>
                      </div>
                    </li>
                    <li className={styles.stepItem}>
                      <span className={styles.stepNumber}>4</span>
                      <div className={styles.stepContent}>
                        <strong>Calcular la diferencia al siguiente múltiplo de 10</strong>
                        <span>El dígito de control es el número que debe sumarse al total anterior para alcanzar el múltiplo de 10 más cercano (superior o igual):</span>
                        <div className={styles.mathDemo}>
                          El siguiente múltiplo de 10 después de 105 es <strong>110</strong>.<br />
                          Diferencia: 110 - 105 = <strong>5</strong>.
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          * Si la suma final da un número redondo terminado en 0 (ej. 100), el dígito de control es <strong>0</strong>.
                        </span>
                      </div>
                    </li>
                  </ol>
                </div>

                <p>
                  Por lo tanto, el código de barras EAN-13 completo e internacionalmente válido para este producto es: <strong>8412345678905</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Sección 3: Guía de Impresión */}
          <section id="guia-impresion" ref={sectionRefs['guia-impresion']} className={styles.section}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>🖨️</div>
                <h2 className={styles.sectionTitle}>Guía de Impresión para Códigos EAN-13</h2>
              </div>
              <div className={styles.content}>
                <p>
                  Imprimir códigos de barras requiere precisión quirúrgica. Un error microscópico en el grosor de una línea o la separación entre ellas (causado por un escalado digital inapropiado) hará que los escáneres láser no puedan leer tu etiqueta.
                </p>

                <div className={styles.printGrid}>
                  <div className={styles.printCard}>
                    <div className={styles.printCardHeader}>
                      <div className={styles.printCardIcon}>⚖️</div>
                      <h4 className={styles.printCardTitle}>Escala al 100% (Requisito Clave)</h4>
                    </div>
                    <p className={styles.printCardContent}>
                      Al abrir el cuadro de diálogo de impresión en Chrome, Safari o Acrobat Reader, asegúrate de que la opción de escala esté configurada en <strong>&quot;Tamaño Real&quot;</strong> o <strong>&quot;100%&quot;</strong>. Nunca utilices &quot;Ajustar a la página&quot; o &quot;Reducir al área de impresión&quot;, ya que deforma las proporciones de las barras.
                    </p>
                  </div>

                  <div className={styles.printCard}>
                    <div className={styles.printCardHeader}>
                      <div className={styles.printCardIcon}>📐</div>
                      <h4 className={styles.printCardTitle}>Zonas de Silencio (Márgenes)</h4>
                    </div>
                    <p className={styles.printCardContent}>
                      Todo código de barras necesita un espacio vacío (blanco) a la izquierda y derecha. Estos márgenes laterales evitan que el lector óptico confunda texto, bordes del papel o imágenes externas con el código. No superpongas información cerca del código.
                    </p>
                  </div>

                  <div className={styles.printCard}>
                    <div className={styles.printCardHeader}>
                      <div className={styles.printCardIcon}>⚙️</div>
                      <h4 className={styles.printCardTitle}>Ajuste Térmico y Dithering</h4>
                    </div>
                    <p className={styles.printCardContent}>
                      En impresoras térmicas (Zebra, TSC, etc.), desactiva la opción de <strong>&quot;Tramado&quot; (Dithering)</strong> en la configuración avanzada del controlador. El tramado intenta simular grises usando pequeños puntos difusos, lo que emborrona los bordes de las barras negras. Debes imprimir a color plano sólido negro.
                    </p>
                  </div>
                </div>

                <div className={styles.printWarning}>
                  <p>
                    ⚠️ <strong>¡Importante!</strong> Si vas a imprimir tus etiquetas usando planchas precortadas en impresoras de inyección de tinta, realiza una prueba primero en papel estándar, colócala a contraluz con la hoja de etiquetas para asegurar la perfecta alineación y, tras imprimir, verifica la lectura usando tu smartphone o un lector manual.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Sección 4: FAQs */}
          <section id="soporte-faqs" ref={sectionRefs['soporte-faqs']} className={styles.section}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>❓</div>
                <h2 className={styles.sectionTitle}>Preguntas Frecuentes y Soporte</h2>
              </div>
              <div className={styles.content}>
                <p>
                  Encuentra soluciones inmediatas a las dudas técnicas más comunes respecto a la generación de códigos con izicode.
                </p>

                <div className={styles.faqContainer}>
                  {faqs.map((faq, index) => (
                    <div 
                      key={index} 
                      className={`${styles.faqItem} ${openFaqIndex === index ? styles.faqActive : ''}`}
                    >
                      <button 
                        className={styles.faqQuestionButton}
                        onClick={() => toggleFaq(index)}
                        aria-expanded={openFaqIndex === index}
                      >
                        <span>{faq.question}</span>
                        <span className={styles.faqIcon}>▼</span>
                      </button>
                      <div className={styles.faqAnswer}>
                        {faq.answer}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.divider}></div>

                <div className={styles.helpCta}>
                  <h3 className={styles.helpCtaTitle}>¿Sigues con dudas o necesitas soporte premium?</h3>
                  <p className={styles.helpCtaDesc}>
                    Nuestro equipo técnico de soporte oficial en español está listo para ayudarte con la configuración de tus impresoras térmicas, integración de bases de datos o licenciamiento GS1.
                  </p>
                  <a 
                    href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20pregunta%20sobre%20izicode%20y%20su%20guia%20de%20impresion" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.helpCtaButton}
                  >
                    💬 Contactar con Soporte vía WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <AuthModal />
    </div>
  );
}
