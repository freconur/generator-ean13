import Head from 'next/head';
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import Features from '@/components/Landing/Features';
import Pricing from '@/components/Landing/Pricing';
import FAQ from '@/components/Landing/FAQ';
import Hero from '@/components/Landing/Hero';
import BarcodeGeneratorWorkspace from '@/components/BarcodeGeneratorWorkspace';
import { useAuth } from '@/context/AuthContext';

/**
 * Componente principal de la aplicación
 * Muestra la landing page y renderiza el espacio de trabajo modular del generador
 */
export default function Home() {
  const [fadeIn, setFadeIn] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    // Activar el efecto de fade después de que el componente se monte
    setFadeIn(true);
  }, []);

  return (
    <div className={`${styles.container} ${fadeIn ? styles.fadeIn : ''}`}>
      <Head>
        <title>Generador de Códigos de Barras EAN-13 Gratis y Online | izicode</title>
        <meta name="description" content="Genera, valida y descarga códigos de barras EAN-13 gratis y online. Exporta en PDF listo para imprimir en MercadoLibre y Amazon. ¡Pruébalo ahora!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <Hero />

      {!loading && !user && (
        <main className={styles.main} id="generator">
          <h2 className={styles.title} style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Generador EAN-13
          </h2>

          {/* Espacio de trabajo modular e independiente (básico para visitantes) */}
          <BarcodeGeneratorWorkspace isDashboard={false} />
        </main>
      )}

      {/* Secciones de Marketing (Landing Page de la Aplicación) */}
      <Features />
      <Pricing />
      <FAQ />

      <Footer />
      <AuthModal />
    </div>
  );
}