import React from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import styles from '../styles/Sidebar.module.css';

/**
 * Página de perfil y gestión de cuenta del usuario
 * Muestra información del usuario, detalles de su plan de suscripción y pasarela de Stripe
 * Reemplaza todos los estilos inline por clases modulares de CSS
 */
export default function ProfilePage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute>
      <Head>
        <title>Mi Cuenta - EAN-13 SaaS</title>
        <meta name="description" content="Gestiona tu perfil y tu suscripción del generador EAN-13." />
      </Head>

      <div className={styles.appLayout}>
        {/* Barra lateral izquierda unificada */}
        <Sidebar />

        {/* Contenedor principal desplazado para no solapar la barra lateral */}
        <div className={styles.contentContainer}>
          <main className={styles.profileMain}>
            {/* Cabecera de Cuenta */}
            <div className={styles.headerContainer}>
              <div>
                <h1 className={styles.headerTitle}>
                  Mi Cuenta 👤
                </h1>
                <p className={styles.headerSubtitle}>
                  Administra tus datos personales y tu suscripción.
                </p>
              </div>
            </div>

            {/* Grid de Configuración (Tarjetas una al lado de la otra) */}
            <div className={styles.settingsGrid}>
              
              {/* Tarjeta Perfil */}
              <div className={styles.card}>
                <div>
                  <h3 className={styles.cardTitle}>
                    👤 Información de Perfil
                  </h3>
                  <div className={styles.profileInfo}>
                    {profile?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={profile.photoURL} 
                        alt="Avatar" 
                        className={styles.avatarBig} 
                      />
                    ) : (
                      <div className={styles.avatarBigFallback}>
                        👤
                      </div>
                    )}
                    <div className={styles.profileDetails}>
                      <div className={styles.profileDisplayName}>{profile?.displayName}</div>
                      <div className={styles.profileEmail}>{profile?.email}</div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.cardRow}>
                  <span className={styles.cardRowLabel}>Rol del Sistema:</span>
                  <strong className={styles.roleValue}>{profile?.role}</strong>
                </div>
              </div>

              {/* Tarjeta Suscripción */}
              <div className={styles.card}>
                <div>
                  <h3 className={styles.cardTitle}>
                    💳 Suscripción & Plan
                  </h3>
                  
                  <div className={styles.cardRowNoBorder}>
                    <span className={styles.cardRowLabel}>Plan Actual:</span>
                    <span className={`${styles.planBadge} ${
                      profile?.subscription.tier === 'pro' ? styles.planBadgePro : styles.planBadgeFree
                    }`}>
                      {profile?.subscription.tier}
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardRowLabel}>Estado:</span>
                    <strong className={`${styles.statusValue} ${
                      profile?.subscription.status === 'active' ? styles.statusActive : styles.statusInactive
                    }`}>
                      {profile?.subscription.status === 'active' ? 'Activo' : 'Inactivo (Free)'}
                    </strong>
                  </div>
                </div>

                <div className={styles.stripeContainer}>
                  {profile?.subscription.tier !== 'pro' ? (
                    <button
                      onClick={() => alert('¡Próximamente integración con pasarela de pagos Stripe!')}
                      className={styles.stripeButton}
                    >
                      🚀 Subir a Plan Pro (Stripe)
                    </button>
                  ) : (
                    <div className={styles.proBadge}>
                      ✨ Tienes acceso ilimitado a todas las funciones
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
