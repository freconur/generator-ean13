import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function Success() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Head>
        <title>¡Pago Exitoso! - EAN-13 Generator Pro</title>
        <meta name="description" content="Gracias por adquirir el plan Pro" />
      </Head>

      <Navbar />

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        background: 'var(--background-color)'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '48px 32px',
          maxWidth: '550px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Animated Success Checkmark Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            fontSize: '2.5rem',
            color: 'var(--success-color)'
          }}>
            ✓
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '12px',
            color: 'var(--text-color)'
          }}>
            ¡Gracias por tu compra!
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginBottom: '32px',
            lineHeight: 1.6
          }}>
            Tu suscripción a <strong>EAN-13 Generator Pro</strong> se ha procesado correctamente. 
            {user ? ` Hemos activado los privilegios Pro en tu cuenta: ${user.email}.` : ''}
          </p>

          <div style={{
            background: 'var(--background-secondary)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '32px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-color)'
            }}>
              🚀 Siguientes pasos:
            </h3>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.8
            }}>
              <li>Ve al panel principal de la aplicación.</li>
              <li>Sube tus listas CSV o Excel desde el nuevo importador masivo.</li>
              <li>Añade descripciones o precios ilimitados en tus etiquetas.</li>
              <li>Si tu cuenta Pro no se activa automáticamente en 2 minutos, haz clic en el botón de ayuda abajo.</li>
            </ol>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <Link
              href="/"
              style={{
                display: 'block',
                padding: '14px 24px',
                background: 'var(--primary-color)',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              Ir al Generador Pro
            </Link>

            <a
              href="https://wa.me/51999999999?text=Hola,%20acabo%20de%20adquirir%20el%20plan%20Pro%20de%20EAN-13%20Generator"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '12px 24px',
                background: '#25D366',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
              }}
            >
              💬 Soporte por WhatsApp
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
