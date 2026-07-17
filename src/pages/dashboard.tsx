import React from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import BarcodeGeneratorWorkspace from '../components/BarcodeGeneratorWorkspace';
import styles from '../styles/Sidebar.module.css';

/**
 * Panel de control privado del usuario (Dashboard)
 * Muestra el espacio de trabajo premium del generador de códigos de barras EAN-13
 */
export default function Dashboard() {
  return (
    <ProtectedRoute>
      <Head>
        <title>Mi Panel de Control - EAN-13 SaaS</title>
        <meta name="description" content="Gestiona tu cuenta y accede a tus códigos de barras." />
      </Head>

      <div className={styles.appLayout}>
        {/* Barra lateral izquierda unificada */}
        <Sidebar />

        {/* Contenedor principal desplazado para no solapar la barra lateral */}
        <div className={styles.contentContainer}>
          <main className={styles.mainContent}>
            {/* Espacio de Trabajo Premium del Generador */}
            <div className={styles.workspaceCard}>
              <BarcodeGeneratorWorkspace isDashboard={true} />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
