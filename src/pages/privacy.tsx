import React from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import styles from '@/styles/Legal.module.css';

export default function PrivacyPage() {
  const currentDate = '16 de julio de 2026';

  return (
    <div className={styles.container}>
      <Head>
        <title>Política de Privacidad | izicode</title>
        <meta name="description" content="Política de Privacidad e Información sobre el Tratamiento de Datos del Generador de Códigos de Barras EAN-13 izicode." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>Política de Privacidad</h1>
          <p className={styles.subtitle}>Última actualización: {currentDate}</p>
        </div>

        <div className={styles.legalCard}>
          <div className={styles.content}>
            <p>
              En <strong>izicode</strong>, nos tomamos muy en serio la privacidad y seguridad de sus datos. Esta Política de Privacidad describe el tipo de información que recopilamos, cómo la utilizamos y las medidas de seguridad que implementamos para proteger sus datos personales al usar nuestra aplicación.
            </p>

            <div className={styles.divider}></div>

            <h2>1. Información que Recopilamos</h2>
            <p>
              Recopilamos información para proporcionar mejores servicios a todos nuestros usuarios. Las categorías de datos que recopilamos incluyen:
            </p>
            <ul>
              <li><strong>Datos de Identificación del Usuario:</strong> Al registrarse voluntariamente, recopilamos su dirección de correo electrónico, nombre y foto de perfil provista por su cuenta de Google u otro método de inicio de sesión.</li>
              <li><strong>Datos de Configuración y Códigos:</strong> Almacenamos la información de los productos y los códigos de barras EAN-13 generados por usted (incluyendo texto, precios, monedas y lotes completos) para que pueda acceder a ellos desde cualquier dispositivo.</li>
              <li><strong>Datos Técnicos y de Navegación:</strong> Recopilamos información sobre el dispositivo utilizado, navegador, dirección IP de forma anónima y datos de diagnóstico de rendimiento.</li>
            </ul>

            <h2>2. Uso de la Información</h2>
            <p>
              Los datos que recopilamos se utilizan exclusivamente para los siguientes fines:
            </p>
            <ul>
              <li>Proporcionar, operar y mantener la funcionalidad de izicode.</li>
              <li>Permitirle guardar, organizar e importar sus lotes de códigos de barras.</li>
              <li>Personalizar su experiencia de usuario (por ejemplo, guardar la preferencia de tema oscuro/claro y configuración de moneda predeterminada).</li>
              <li>Enviar notificaciones críticas sobre el estado de su cuenta, transacciones de planes Pro y actualizaciones importantes de servicio.</li>
              <li>Mejorar el rendimiento del sitio web y corregir errores técnicos de la aplicación.</li>
            </ul>

            <h2>3. Seguridad de los Datos e Infraestructura</h2>
            <p>
              La seguridad de su información es nuestra prioridad. Por ello, delegamos el procesamiento y almacenamiento de datos en la infraestructura de nube líder de Google Firebase:
            </p>
            <ul>
              <li><strong>Firebase Authentication:</strong> Todas las contraseñas, credenciales y flujos de inicio de sesión están cifrados y gestionados directamente por los servidores seguros de Google. Nunca almacenamos contraseñas en texto plano.</li>
              <li><strong>Cloud Firestore:</strong> Las bases de datos que contienen sus códigos y perfiles están protegidas por Reglas de Seguridad de Firestore de nivel empresarial, asegurando que solo usted pueda leer o escribir sus datos personales.</li>
              <li><strong>Protocolo de Transferencia Seguro:</strong> Todo el tráfico de datos entre su navegador y nuestra plataforma se realiza bajo el cifrado SSL/HTTPS.</li>
            </ul>

            <h2>4. Uso de Cookies</h2>
            <p>
              Utilizamos cookies esenciales y tecnologías de almacenamiento local (Local Storage/Session Storage) para:
            </p>
            <ul>
              <li>Mantener activa su sesión de usuario de forma segura.</li>
              <li>Recordar sus preferencias de interfaz, como el tema visual (Claro/Oscuro).</li>
              <li>Monitorear el rendimiento global y recopilar estadísticas agregadas de uso con herramientas analíticas que no identifican de forma personal al usuario.</li>
            </ul>
            <p>
              Usted puede deshabilitar el uso de cookies a través de la configuración de su navegador; sin embargo, tenga en cuenta que algunas funcionalidades críticas de inicio de sesión o personalización dejarán de funcionar de manera óptima.
            </p>

            <h2>5. Derechos del Usuario (Derechos ARCO)</h2>
            <p>
              Usted tiene pleno control sobre su información personal. Respetamos sus derechos de:
            </p>
            <ul>
              <li><strong>Acceso:</strong> Solicitar conocer qué datos personales tenemos de usted en nuestras bases de datos.</li>
              <li><strong>Rectificación:</strong> Modificar su nombre de perfil o datos incorrectos en cualquier momento.</li>
              <li><strong>Cancelación y Supresión:</strong> Eliminar permanentemente su cuenta y todos los datos asociados. Puede hacerlo directamente desde su perfil de usuario seleccionando "Eliminar cuenta", lo cual purgará de forma inmediata sus registros de Firebase Auth y Firestore sin posibilidad de recuperación.</li>
            </ul>

            <h2>6. Compartición de Datos con Terceros</h2>
            <p>
              izicode tiene una política de tolerancia cero respecto a la venta de datos. <strong>No vendemos, comercializamos, alquilamos ni transferimos sus datos personales a terceros</strong> con fines publicitarios o comerciales bajo ninguna circunstancia.
            </p>

            <h2>7. Cambios en esta Política de Privacidad</h2>
            <p>
              Podemos actualizar nuestra Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página y actualizando la fecha de última modificación. Se aconseja revisar esta página periódicamente para detectar cualquier cambio.
            </p>

            <h2>8. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta Política de Privacidad o el tratamiento de sus datos personales, por favor póngase en contacto a través de nuestro soporte técnico oficial vía WhatsApp.
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <AuthModal />
    </div>
  );
}
