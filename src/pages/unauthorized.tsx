import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Unauthorized() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg-color, #ffffff)',
      color: 'var(--text-color, #1a1a1a)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <Head>
        <title>Acceso No Autorizado - EAN-13 SaaS</title>
        <meta name="description" content="No tienes permisos para acceder a esta página." />
      </Head>

      <Navbar />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '72px',
          marginBottom: '20px',
          animation: 'bounce 2s infinite'
        }}>
          🚫
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Acceso Restringido
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#64748b',
          maxWidth: '500px',
          lineHeight: 1.6,
          marginBottom: '32px'
        }}>
          Lo sentimos, no tienes los permisos o el nivel de suscripción necesario para acceder a esta sección de la plataforma.
        </p>

        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            Ir al Inicio
          </Link>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
