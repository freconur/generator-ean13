import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSubscription?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireSubscription,
}) => {
  const { user, profile, loading, setIsAuthModalOpen } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirigir al inicio y abrir el modal de inicio de sesión
        router.push('/');
        setIsAuthModalOpen(true);
      } else if (profile) {
        // Verificar roles permitidos
        if (allowedRoles && !allowedRoles.includes(profile.role)) {
          router.push('/unauthorized');
        }
        // Verificar requerimiento de suscripción activa
        else if (requireSubscription && profile.subscription.status !== 'active') {
          router.push('/unauthorized');
        }
      }
    }
  }, [user, profile, loading, allowedRoles, requireSubscription, router, setIsAuthModalOpen]);

  // Pantalla de carga premium con spinner y fondo degradado
  if (loading || !user || !profile || (allowedRoles && !allowedRoles.includes(profile.role)) || (requireSubscription && profile.subscription.status !== 'active')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, transparent 40%, #3b82f6)',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{
          fontSize: '18px',
          fontWeight: 500,
          letterSpacing: '0.05em',
          background: 'linear-gradient(to right, #93c5fd, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Verificando credenciales...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
