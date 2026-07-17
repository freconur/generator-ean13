import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import styles from '@/styles/Legal.module.css';

export default function TermsPage() {
  const currentDate = '16 de julio de 2026';

  return (
    <div className={styles.container}>
      <Head>
        <title>Términos de Servicio | izicode</title>
        <meta name="description" content="Términos de Servicio y Condiciones de Uso del Generador de Códigos de Barras EAN-13 izicode." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>Términos de Servicio</h1>
          <p className={styles.subtitle}>Última actualización: {currentDate}</p>
        </div>

        <div className={styles.legalCard}>
          <div className={styles.content}>
            <p>
              Bienvenido a <strong>izicode</strong>. Al acceder o utilizar nuestra aplicación web y servicios de generación de códigos de barras EAN-13, usted acepta cumplir y estar sujeto a los siguientes Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, por favor, no utilice nuestros servicios.
            </p>

            <div className={styles.divider}></div>

            <h2>1. Aceptación de los Términos</h2>
            <p>
              Estos Términos de Servicio constituyen un acuerdo legal vinculante entre usted (ya sea de forma personal o en representación de una entidad) e izicode, en relación con su acceso y uso del sitio web y la aplicación. Al registrarse o utilizar el generador, usted confirma que ha leído, comprendido y aceptado estos términos en su totalidad.
            </p>

            <h2>2. Registro y Seguridad de la Cuenta</h2>
            <p>
              Para acceder a ciertas funcionalidades de la plataforma, como la persistencia de datos, la gestión de lotes o la suscripción a planes avanzados, es necesario registrarse e iniciar sesión utilizando Firebase Authentication (a través de correo electrónico o proveedores externos autorizados).
            </p>
            <ul>
              <li>Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Debe proporcionar información verídica, exacta y actualizada durante el registro.</li>
              <li>Notificará de inmediato a izicode sobre cualquier uso no autorizado de su cuenta o cualquier otra violación de seguridad.</li>
              <li>izicode no será responsable por ninguna pérdida o daño resultante del incumplimiento de estas obligaciones de seguridad.</li>
            </ul>

            <h2>3. Generación de Códigos de Barras y Responsabilidad Limitada</h2>
            <p>
              izicode ofrece herramientas para generar y validar códigos de barras bajo el estándar EAN-13 y estructuras GS1. Aunque implementamos rigurosos algoritmos de cálculo de dígito verificador y validación estructural para asegurar que los códigos generados sean técnicamente correctos, la responsabilidad final de su uso recae exclusivamente en el usuario.
            </p>
            
            <div className={styles.alertBox}>
              <p>
                <strong>⚠️ AVISO IMPORTANTE DE IMPRESIÓN:</strong> Antes de realizar cualquier impresión masiva, empaquetado o distribución comercial de productos con los códigos de barras generados en izicode, <strong>es obligatorio que el usuario realice pruebas de lectura y escaneo físico</strong> con dispositivos reales y verifique la validez de los códigos ante su respectiva cadena de distribución o minorista.
              </p>
            </div>
            
            <p>
              izicode no asume ninguna responsabilidad, directa o indirecta, por pérdidas comerciales, costos de re-etiquetado, rechazos de inventario en tiendas minoristas o cualquier otro perjuicio financiero derivado de códigos de barras ilegibles, mal impresos, duplicados o rechazados por terceros.
            </p>

            <h2>4. Planes de Suscripción y Políticas de Pago</h2>
            <p>
              izicode ofrece diferentes niveles de acceso a sus servicios:
            </p>
            <ul>
              <li><strong>Plan Free (Gratuito):</strong> Permite la generación individual y descargas básicas con límites de volumen diario y funciones limitadas de almacenamiento.</li>
              <li><strong>Plan Pro / Enterprise (De Pago):</strong> Ofrece funciones avanzadas como la generación masiva por lotes, importación desde archivos Excel, personalización visual avanzada y almacenamiento en la nube en Firestore.</li>
            </ul>
            <p>
              Las tarifas se facturan por adelantado de forma periódica (mensual o anual) según el plan seleccionado. Nos reservamos el derecho de modificar las tarifas de suscripción previa notificación con 30 días de antelación. Las suscripciones Pro se pueden cancelar en cualquier momento desde la configuración del perfil, manteniendo los beneficios activos hasta el final del periodo de facturación en curso.
            </p>

            <h2>5. Límites de Uso y Uso Aceptable</h2>
            <p>
              Usted se compromete a no utilizar la plataforma para:
            </p>
            <ul>
              <li>Intentar realizar ingeniería inversa de la plataforma o extraer código fuente.</li>
              <li>Hacer un uso abusivo o automatizado no autorizado (como el raspado de datos o scraping) de la API o la aplicación que pueda saturar los servidores de Firebase.</li>
              <li>Generar códigos de barras con contenidos falsos o engañosos que infrinjan los derechos de propiedad intelectual de terceros o las normativas de GS1.</li>
            </ul>

            <h2>6. Propiedad Intelectual</h2>
            <p>
              El diseño de la interfaz, el software, las plantillas visuales, el logo, la marca y todo el contenido nativo expuesto en izicode pertenecen a sus creadores y están protegidos por leyes de derechos de autor y propiedad intelectual.
            </p>
            <p>
              Sin embargo, los datos de los productos proporcionados por el usuario y los códigos de barras de salida generados (imágenes SVG, archivos PNG, PDFs de etiquetas) son de propiedad exclusiva del usuario.
            </p>

            <h2>7. Modificaciones a los Términos</h2>
            <p>
              Nos reservamos el derecho de actualizar estos Términos de Servicio en cualquier momento. Le notificaremos sobre cambios sustanciales publicando una alerta en el sitio web o enviándole un correo electrónico. El uso continuado de la aplicación tras la publicación de los cambios constituye su aceptación tácita de los nuevos términos.
            </p>

            <h2>8. Contacto</h2>
            <p>
              Si tiene dudas o consultas sobre estos Términos de Servicio, puede ponerse en contacto con nuestro equipo de soporte técnico a través del canal oficial de WhatsApp provisto en el pie de página de la aplicación.
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <AuthModal />
    </div>
  );
}
