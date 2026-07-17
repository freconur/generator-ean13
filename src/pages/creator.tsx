import React from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import GS1Creator from '../components/GS1Creator';
import styles from '../styles/Sidebar.module.css';

/**
 * Página del Asistente de Creación de Códigos GS1 EAN-13
 */
export default function CreatorPage() {
  return (
    <ProtectedRoute>
      <Head>
        <title>Asistente GS1 - izicode</title>
        <meta name="description" content="Crea tus propios códigos EAN-13 oficiales bajo las pautas de GS1." />
      </Head>

      <div className={styles.appLayout}>
        {/* Barra lateral izquierda unificada */}
        <Sidebar />

        {/* Contenedor principal */}
        <div className={styles.contentContainer}>
          <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <GS1Creator />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
