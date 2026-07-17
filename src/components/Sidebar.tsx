import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useLimits } from '../hooks/useLimits';
import styles from '../styles/Sidebar.module.css';
import { deleteItemsSubcollection } from './BarcodeGeneratorWorkspace';
import CreateBatchModal from './CreateBatchModal';
import DeleteConfirmModal from './DeleteConfirmModal';

/**
 * Componente Sidebar principal
 * Se utiliza en las páginas privadas (dashboard, profile) para proporcionar
 * navegación unificada, acceso a las listas de reproducción (lotes) y datos de usuario.
 * Soporta modo colapsado (plegable) para maximizar el área de trabajo en pantallas de PC.
 */
export default function Sidebar() {
  const { user, profile, logout } = useAuth();
  const { limits } = useLimits();
  const isPro = profile?.subscription?.tier === 'pro' &&
                profile?.subscription?.status === 'active' &&
                (!profile?.subscription?.expiresAt ||
                 Date.now() < (profile.subscription.expiresAt < 99999999999 ? profile.subscription.expiresAt * 1000 : profile.subscription.expiresAt));
  const router = useRouter();
  const { pathname, query: routerQuery } = router;
  
  const [batches, setBatches] = useState<any[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDeleteId, setBatchToDeleteId] = useState('');
  const [batchToDeleteName, setBatchToDeleteName] = useState('');

  // Cargar preferencia de colapsado desde localStorage al montar
  useEffect(() => {
    const savedCollapseState = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(savedCollapseState);
    document.documentElement.style.setProperty('--sidebar-width', savedCollapseState ? '70px' : '280px');
  }, []);

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileOpen(false);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Escuchar lotes en tiempo real desde Firestore
  useEffect(() => {
    if (!user) {
      setBatches([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'batches'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedBatches: any[] = [];
      snapshot.forEach((doc) => {
        loadedBatches.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setBatches(loadedBatches);
    }, (error) => {
      console.error("Error loading batches in Sidebar:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Alternar el colapso del sidebar en escritorio
  const toggleCollapse = () => {
    const newCollapseState = !isCollapsed;
    setIsCollapsed(newCollapseState);
    localStorage.setItem('sidebar_collapsed', String(newCollapseState));
    document.documentElement.style.setProperty('--sidebar-width', newCollapseState ? '70px' : '280px');
  };

  // Manejar creación de un nuevo lote vacío (abre el modal)
  const handleCreateNewBatch = () => {
    if (!user) {
      alert("Por favor inicia sesión para crear un lote.");
      return;
    }
    setIsCreateModalOpen(true);
  };

  // Confirmar creación de nuevo lote desde el modal
  const handleConfirmCreateBatch = async (batchName: string) => {
    if (!user) return;
    const maxBatches = isPro ? limits.pro.maxBatches : limits.free.maxBatches;
    if (batches.length >= maxBatches) {
      alert(`Has alcanzado el límite máximo de lotes permitidos para tu plan (${maxBatches} lotes). ${isPro ? '' : 'Actualiza a Pro para tener hasta 20 lotes.'}`);
      return;
    }
    try {
      const newDocRef = doc(collection(db, 'users', user.uid, 'batches'));
      const newBatchData = {
        id: newDocRef.id,
        name: batchName,
        totalCount: 0,
        enableDescription: false,
        enablePrice: false,
        customCurrency: null,
        createdAt: serverTimestamp()
      };
      
      await setDoc(newDocRef, newBatchData);
      
      // Redireccionar al nuevo lote en el dashboard
      router.push(`/dashboard?batch=${newDocRef.id}`);
    } catch (error) {
      console.error("Error al crear un nuevo lote vacío:", error);
      alert("No se pudo crear el lote vacío en la nube.");
    }
  };

  // Preparar eliminación de lote abriendo el modal
  const handleDeleteBatch = (e: React.MouseEvent, batchId: string, batchName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchToDeleteId(batchId);
    setBatchToDeleteName(batchName);
    setIsDeleteModalOpen(true);
  };

  // Ejecutar eliminación real del lote
  const executeDeleteBatch = async () => {
    if (!user || !batchToDeleteId) return;

    try {
      // 1. Borrar todos los documentos de la subcolección 'items'
      await deleteItemsSubcollection(user.uid, batchToDeleteId);

      // 2. Borrar el lote
      await deleteDoc(doc(db, 'users', user.uid, 'batches', batchToDeleteId));
      if (routerQuery.batch === batchToDeleteId) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Error deleting batch from sidebar:", error);
      alert("Hubo un error al eliminar el lote.");
    }
  };

  const isGeneradorActive = pathname === '/dashboard';
  const isCuentaActive = pathname === '/profile';
  const isCreatorActive = pathname === '/creator';
  const isScannerActive = pathname === '/scanner';

  return (
    <>
      {/* Botón flotante para móvil (Hamburguesa) */}
      <button 
        className={styles.mobileToggle} 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isMobileOpen ? '×' : '☰'}
      </button>

      {/* Backdrop overlay para móvil */}
      {isMobileOpen && (
        <div 
          className={styles.backdrop} 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Botón colapsar (Solo visible en Desktop) */}
        <button 
          className={styles.collapseToggle} 
          onClick={toggleCollapse}
          title={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          {isCollapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>

        {/* Brand Logo */}
        <div className={styles.brand}>
          <span className={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5v14M21 5v14" strokeWidth="2.5" />
              <path d="M7 5v14M15 5v14" strokeWidth="1.5" />
              <path d="M11 5v14" strokeWidth="3.5" />
            </svg>
          </span>
          {!isCollapsed && <span className={styles.logoText}>izicode</span>}
        </div>

        {/* Enlaces de navegación principales */}
        <nav className={styles.navSection}>
          <Link 
            href="/dashboard" 
            className={`${styles.navLink} ${isGeneradorActive ? styles.navLinkActive : ''}`}
            title={isPro ? 'Generador Pro' : 'Generador Free'}
          >
            <span className={styles.linkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            {!isCollapsed && <span>{isPro ? 'Generador Pro' : 'Generador Free'}</span>}
          </Link>
          <Link 
            href="/creator" 
            className={`${styles.navLink} ${isCreatorActive ? styles.navLinkActive : ''}`}
            title="Asistente GS1"
          >
            <span className={styles.linkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </span>
            {!isCollapsed && <span>Asistente GS1</span>}
          </Link>
          <Link 
            href="/scanner" 
            className={`${styles.navLink} ${isScannerActive ? styles.navLinkActive : ''}`}
            title="Escáner"
          >
            <span className={styles.linkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M7 9v6m3-6v6m4-6v6m3-6v6" />
              </svg>
            </span>
            {!isCollapsed && <span>Escáner</span>}
          </Link>
          <Link 
            href="/profile" 
            className={`${styles.navLink} ${isCuentaActive ? styles.navLinkActive : ''}`}
            title="Mi Cuenta"
          >
            <span className={styles.linkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            {!isCollapsed && <span>Mi Cuenta</span>}
          </Link>
          {profile?.role === 'admin' && (
            <Link 
              href="/admin" 
              className={`${styles.navLink} ${pathname === '/admin' ? styles.navLinkActive : ''}`}
              title="Administración"
            >
              <span className={styles.linkIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              {!isCollapsed && <span>Administración</span>}
            </Link>
          )}
        </nav>

        {/* Sección de Playlists/Lotes (Spotify-like) */}
        {!isCollapsed ? (
          <div className={styles.playlistSection}>
            <div className={styles.playlistHeader}>
              <h4>Mis Lotes (Playlists)</h4>
              <button 
                onClick={handleCreateNewBatch} 
                className={styles.newBtn} 
                title="Crear nuevo lote vacío"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {batches.length === 0 ? (
              <div className={styles.welcomeText}>
                Aún no tienes listas. Crea tus códigos y guárdalos para verlos aquí.
              </div>
            ) : (
              <div className={styles.playlistList}>
                {batches.map((b, index) => {
                  const isActive = routerQuery.batch === b.id && isGeneradorActive;
                  const isBatchLimitExceeded = !isPro && index >= limits.free.maxBatches;
                  return (
                    <Link
                      key={b.id}
                      href={`/dashboard?batch=${b.id}`}
                      className={`${styles.playlistItem} ${isActive ? styles.playlistItemActive : ''} ${isBatchLimitExceeded ? styles.playlistItemExceeded : ''}`}
                    >
                      <span className={styles.playlistName}>
                        {isBatchLimitExceeded && (
                          <span 
                            style={{ marginRight: '6px', color: '#f59e0b', fontSize: '0.85rem' }} 
                            title="Lote en modo Solo Lectura: Has alcanzado el límite de 5 lotes de tu plan gratuito."
                          >
                            🔒
                          </span>
                        )}
                        {b.name}
                      </span>
                      <span className={styles.playlistCount}>
                        {b.totalCount ?? b.barcodes?.length ?? 0}
                      </span>
                      <button
                        onClick={(e) => handleDeleteBatch(e, b.id, b.name)}
                        className={styles.deleteBtn}
                        title="Eliminar lote permanentemente"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* En modo colapsado, mostramos un acceso directo visual rápido a los lotes */
          <div className={styles.collapsedPlaylistSection} title="Tienes lotes guardados">
            <span className={styles.linkIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </span>
          </div>
        )}

        {/* Footer del Sidebar con datos de usuario */}
        <div className={`${styles.footer} ${isCollapsed ? styles.footerCollapsed : ''}`}>
          {profile?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={profile.photoURL} 
              alt="Avatar" 
              className={styles.avatar} 
            />
          ) : (
            <div className={styles.avatarFallback}>
              {(profile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          
          {!isCollapsed ? (
            <>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{profile?.displayName || 'Usuario'}</span>
                <span className={styles.userEmail}>{profile?.email || user?.email}</span>
              </div>
              <button 
                onClick={logout} 
                className={styles.logoutBtn} 
                title="Cerrar sesión"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <button 
              onClick={logout} 
              className={styles.logoutBtn} 
              title="Cerrar sesión"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      <CreateBatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleConfirmCreateBatch}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDeleteBatch}
        batchName={batchToDeleteName}
      />
    </>
  );
}
