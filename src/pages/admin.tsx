import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import layoutStyles from '../styles/Sidebar.module.css';
import adminStyles from '../styles/Admin.module.css';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useLimits } from '../hooks/useLimits';
import { UserProfile } from '../types/user';

interface AdminUserProfile extends UserProfile {
  id: string;
}

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'simulator' | 'limits' | 'memberships' | 'users'>('simulator');

  // Estados del simulador financiero y técnico
  const [clientsCount, setClientsCount] = useState<number>(300);
  const [batchesPerClient, setBatchesPerClient] = useState<number>(20);
  const [codesPerBatch, setCodesPerBatch] = useState<number>(1000);
  const [dailyActivity, setDailyActivity] = useState<number>(30);
  const [price, setPrice] = useState<number>(4.99);
  const [pricingModel, setPricingModel] = useState<'monthly' | 'lifetime'>('monthly');

  // Estados para la gestión de límites del SaaS en Firestore
  const { limits, loading: loadingLimits } = useLimits();
  const [guestMaxCodes, setGuestMaxCodes] = useState<number>(3);
  const [freeMaxBatches, setFreeMaxBatches] = useState<number>(5);
  const [freeMaxCodes, setFreeMaxCodes] = useState<number>(30);
  const [proMaxBatches, setProMaxBatches] = useState<number>(20);
  const [proMaxCodes, setProMaxCodes] = useState<number>(1000);
  const [whatsappNumber, setWhatsappNumber] = useState<string>('51999999999');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (limits) {
      setGuestMaxCodes(limits.guest?.maxCodesPerBatch ?? 3);
      setFreeMaxBatches(limits.free?.maxBatches ?? 5);
      setFreeMaxCodes(limits.free?.maxCodesPerBatch ?? 30);
      setProMaxBatches(limits.pro?.maxBatches ?? 20);
      setProMaxCodes(limits.pro?.maxCodesPerBatch ?? 1000);
      setWhatsappNumber(limits.whatsappNumber ?? '51999999999');
    }
  }, [limits]);

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const limitsDocRef = doc(db, 'system', 'limits');
      await setDoc(limitsDocRef, {
        guest: {
          maxCodesPerBatch: guestMaxCodes
        },
        free: {
          maxCodesPerBatch: freeMaxCodes,
          maxBatches: freeMaxBatches
        },
        pro: {
          maxCodesPerBatch: proMaxCodes,
          maxBatches: proMaxBatches
        },
        whatsappNumber: whatsappNumber
      });
      alert('Límites actualizados con éxito en la base de datos.');
    } catch (error) {
      console.error('Error al guardar límites en Firestore:', error);
      alert('Hubo un error al guardar los límites. Verifica tus permisos de administrador.');
    } finally {
      setIsSaving(false);
    }
  };

  // Estados para la gestión manual de membresías
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<AdminUserProfile | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // Estados y efectos para la tabla de usuarios registrados
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [isLoadingUsersList, setIsLoadingUsersList] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'memberships' || activeTab === 'users') {
      const fetchUsers = async () => {
        setIsLoadingUsersList(true);
        try {
          const usersRef = collection(db, 'users');
          const querySnapshot = await getDocs(usersRef);
          const list: AdminUserProfile[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as UserProfile),
          }));
          setUsersList(list);
        } catch (error) {
          console.error('Error al cargar la lista de usuarios:', error);
        } finally {
          setIsLoadingUsersList(false);
        }
      };
      fetchUsers();
    }
  }, [activeTab]);

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString();
    }
    try {
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) return 'N/A';
      return parsedDate.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getStartDate = (user: AdminUserProfile) => {
    if (user.subscription?.updatedAt) {
      return formatDate(user.subscription.updatedAt);
    }
    if (user.createdAt) {
      return formatDate(user.createdAt);
    }
    return 'N/A';
  };

  const getExpirationDate = (user: AdminUserProfile) => {
    if (user.subscription?.expiresAt) {
      const expires = user.subscription.expiresAt;
      if (typeof expires === 'number') {
        const ms = expires < 9999999999 ? expires * 1000 : expires;
        return new Date(ms).toLocaleDateString();
      }
      return formatDate(expires);
    }
    return 'Indefinido';
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingUser(true);
    setSearchError('');
    setSearchedUser(null);

    try {
      const q = searchQuery.trim();
      
      // 1. Intentar buscar por UID primero (si tiene formato común de Firebase UID de 28 caracteres)
      if (q.length === 28 && !q.includes('@')) {
        const userDocRef = doc(db, 'users', q);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setSearchedUser({ id: userDoc.id, ...userDoc.data() } as AdminUserProfile);
          setIsSearchingUser(false);
          return;
        }
      }

      // 2. Si no es UID o no se encontró, buscar por Email
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', q.toLowerCase()));
      const querySnapshot = await getDocs(emailQuery);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setSearchedUser({ id: userDoc.id, ...userDoc.data() } as AdminUserProfile);
      } else {
        // Por si acaso, buscar de nuevo como UID
        const userDocRef = doc(db, 'users', q);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setSearchedUser({ id: userDoc.id, ...userDoc.data() } as AdminUserProfile);
        } else {
          setSearchError('No se encontró ningún usuario con ese Email o UID.');
        }
      }
    } catch (error) {
      console.error('Error buscando usuario:', error);
      setSearchError('Error al realizar la búsqueda. Asegúrate de tener conexión.');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleUpdateSubscription = async (newTier: 'free' | 'pro', newStatus: 'active' | 'inactive') => {
    if (!searchedUser) return;
    setIsUpdatingSub(true);
    try {
      const userDocRef = doc(db, 'users', searchedUser.id);
      
      const updatedSub = {
        tier: newTier,
        status: newStatus,
        provider: 'manual',
        expiresAt: newTier === 'pro' ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userDocRef, {
        subscription: updatedSub
      });

      // Actualizar el estado local searchedUser
      setSearchedUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subscription: {
            ...prev.subscription,
            ...updatedSub
          }
        };
      });

      // Actualizar de inmediato el estado local usersList
      setUsersList((prevList) =>
        prevList.map((u) =>
          u.id === searchedUser.id
            ? {
                ...u,
                subscription: {
                  ...u.subscription,
                  ...updatedSub
                }
              }
            : u
        )
      );

      alert(`Plan del usuario actualizado a ${newTier.toUpperCase()} (${newStatus}) con éxito.`);
    } catch (error) {
      console.error('Error al actualizar membresía:', error);
      alert('Error al actualizar la membresía del usuario.');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // === CÁLCULOS TÉCNICOS Y ECONÓMICOS ===

  // 1. Volumen de documentos en Firestore
  const totalUsersDocs = clientsCount;
  const totalBatchesDocs = clientsCount * batchesPerClient;
  const totalItemsDocs = clientsCount * batchesPerClient * codesPerBatch;
  const totalDocs = totalUsersDocs + totalBatchesDocs + totalItemsDocs;

  // 2. Almacenamiento total (Fórmulas oficiales de Firestore)
  const userDocBytes = 732;
  const batchDocBytes = 570;
  const itemDocBytes = 619;
  const totalBytes = (totalUsersDocs * userDocBytes) + (totalBatchesDocs * batchDocBytes) + (totalItemsDocs * itemDocBytes);
  const totalGiB = totalBytes / (1024 * 1024 * 1024);

  // Costo mensual almacenamiento (1 GiB gratis, resto a $0.108/GiB)
  const billableStorageGiB = Math.max(0, totalGiB - 1);
  const storageCost = billableStorageGiB * 0.108;

  // 3. Operaciones de lectura y escritura
  const activeUsersDaily = Math.ceil(clientsCount * (dailyActivity / 100));

  // Escrituras diarias: 1 lote nuevo (1 + codesPerBatch writes) + 50 ediciones
  const writesPerUserDaily = 1 + codesPerBatch + 50;
  const totalWritesDaily = activeUsersDaily * writesPerUserDaily;

  // Lecturas diarias: 5 lookups de batches (5 * batchesPerClient) + 4 lecturas de lote completo (4 * codesPerBatch) + 10 reads de perfil
  const readsPerUserDaily = (5 * batchesPerClient) + (4 * codesPerBatch) + 10;
  const totalReadsDaily = activeUsersDaily * readsPerUserDaily;

  // Costo mensual de lecturas (50,000 gratis/día, $0.06 por 100k extra)
  const billableReadsDaily = Math.max(0, totalReadsDaily - 50000);
  const monthlyReadsCost = (billableReadsDaily / 100000) * 0.06 * 30;

  // Costo mensual de escrituras (20,000 gratis/día, $0.18 por 100k extra)
  const billableWritesDaily = Math.max(0, totalWritesDaily - 20000);
  const monthlyWritesCost = (billableWritesDaily / 100000) * 0.18 * 30;

  // Costo total acumulado de base de datos
  const totalFirestoreCost = storageCost + monthlyReadsCost + monthlyWritesCost;

  // 4. Ingresos y pasarela (Comisión Stripe: 3.4% + $0.30 USD)
  const stripeFeePerClient = (price * 0.034) + 0.30;
  const netIncomePerClient = Math.max(0, price - stripeFeePerClient);

  let grossRevenue = 0;
  let netRevenue = 0;
  let margin = 0;

  if (pricingModel === 'monthly') {
    grossRevenue = clientsCount * price; // Ingresos brutos mensuales (MRR)
    netRevenue = clientsCount * netIncomePerClient; // Ingresos netos mensuales
    margin = netRevenue - totalFirestoreCost;
  } else {
    grossRevenue = clientsCount * price; // Ingreso bruto de pago único (LTD)
    netRevenue = clientsCount * netIncomePerClient; // Ingreso neto de pago único
    margin = 0 - totalFirestoreCost; // MRR recurrente negativo (sin ingresos mensuales)
  }

  // Años de supervivencia de caja con LTD
  const ltdSurvivalYears = pricingModel === 'lifetime' && totalFirestoreCost > 0
    ? netRevenue / (totalFirestoreCost * 12)
    : null;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Head>
        <title>Administración - Calculadora SaaS</title>
        <meta name="description" content="Simulador de costos y rentabilidad para el administrador." />
      </Head>

      <div className={layoutStyles.appLayout}>
        {/* Barra lateral izquierda unificada */}
        <Sidebar />

        {/* Contenedor principal */}
        <div className={layoutStyles.contentContainer}>
          <main className={adminStyles.adminContainer}>
            
            {/* Cabecera */}
            <div className={adminStyles.titleSection}>
              <h1 className={adminStyles.title}>🛡️ Panel de Control del Administrador</h1>
              <p className={adminStyles.subtitle}>
                Bienvenido, {profile?.displayName}. Gestiona límites en caliente, membresías manuales y simula la viabilidad de precios de izicode.
              </p>
            </div>

            {/* Selector de Pestañas (Tabs) */}
            <div className={adminStyles.tabsContainer}>
              <button 
                onClick={() => setActiveTab('simulator')} 
                className={`${adminStyles.tabButton} ${activeTab === 'simulator' ? adminStyles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
                Calculadora SaaS
              </button>
              <button 
                onClick={() => setActiveTab('limits')} 
                className={`${adminStyles.tabButton} ${activeTab === 'limits' ? adminStyles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Límites del SaaS
              </button>
              <button 
                onClick={() => setActiveTab('memberships')} 
                className={`${adminStyles.tabButton} ${activeTab === 'memberships' ? adminStyles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Gestión de Membresías
              </button>
              <button 
                onClick={() => setActiveTab('users')} 
                className={`${adminStyles.tabButton} ${activeTab === 'users' ? adminStyles.tabButtonActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Tabla de Usuarios Registrados
              </button>
            </div>

            {/* Grid principal */}
            {activeTab === 'simulator' && (
              <div className={adminStyles.dashboardGrid}>
              
              {/* Panel de Controles (Inputs) */}
              <div className={adminStyles.card}>
                <h3 className={adminStyles.cardTitle}>⚙️ Variables de Simulación</h3>
                
                {/* Clientes Pro */}
                <div className={adminStyles.formGroup}>
                  <div className={adminStyles.labelRow}>
                    <span className={adminStyles.label}>Clientes Pro Activos:</span>
                    <span className={adminStyles.valueBadge}>{clientsCount} usuarios</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="1000"
                    step="5"
                    value={clientsCount}
                    onChange={(e) => setClientsCount(parseInt(e.target.value))}
                    className={adminStyles.slider}
                  />
                </div>

                {/* Lotes por cliente */}
                <div className={adminStyles.formGroup}>
                  <div className={adminStyles.labelRow}>
                    <span className={adminStyles.label}>Máximo de Lotes por Cliente:</span>
                    <span className={adminStyles.valueBadge}>{batchesPerClient} lotes</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={batchesPerClient}
                    onChange={(e) => setBatchesPerClient(parseInt(e.target.value))}
                    className={adminStyles.slider}
                  />
                </div>

                {/* Códigos por lote */}
                <div className={adminStyles.formGroup}>
                  <div className={adminStyles.labelRow}>
                    <span className={adminStyles.label}>Códigos de Barra por Lote:</span>
                    <span className={adminStyles.valueBadge}>{codesPerBatch} códigos</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={codesPerBatch}
                    onChange={(e) => setCodesPerBatch(parseInt(e.target.value))}
                    className={adminStyles.slider}
                  />
                </div>

                {/* Tasa de actividad */}
                <div className={adminStyles.formGroup}>
                  <div className={adminStyles.labelRow}>
                    <span className={adminStyles.label}>Tasa de Actividad Diaria (%):</span>
                    <span className={adminStyles.valueBadge}>{dailyActivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={dailyActivity}
                    onChange={(e) => setDailyActivity(parseInt(e.target.value))}
                    className={adminStyles.slider}
                  />
                </div>

                {/* Modelo de Cobro */}
                <div className={adminStyles.formGroup}>
                  <span className={adminStyles.label}>Modelo de Cobro:</span>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value as 'monthly' | 'lifetime')}
                    className={adminStyles.select}
                    style={{ marginTop: '8px' }}
                  >
                    <option value="monthly">Suscripción Mensual (MRR)</option>
                    <option value="lifetime">Pago Único de por Vida (LTD)</option>
                  </select>
                </div>

                {/* Precio */}
                <div className={adminStyles.formGroup}>
                  <div className={adminStyles.labelRow}>
                    <span className={adminStyles.label}>Precio del Plan Pro ($ USD):</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="199"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className={adminStyles.inputNumber}
                  />
                </div>

              </div>

              {/* Panel de Resultados (Métricas) */}
              <div className={adminStyles.card}>
                <h3 className={adminStyles.cardTitle}>📈 Proyección y Costos de Servidor</h3>
                
                {/* Métricas de Datos */}
                <div className={adminStyles.metricsGrid}>
                  <div className={adminStyles.metricBox}>
                    <span className={adminStyles.metricLabel}>Total de Documentos</span>
                    <span className={adminStyles.metricValue}>{totalDocs.toLocaleString()}</span>
                  </div>
                  <div className={adminStyles.metricBox}>
                    <span className={adminStyles.metricLabel}>Espacio Firestore</span>
                    <span className={adminStyles.metricValue}>{totalGiB >= 1 ? `${totalGiB.toFixed(2)} GiB` : `${(totalGiB * 1024).toFixed(1)} MB`}</span>
                  </div>
                  <div className={adminStyles.metricBox}>
                    <span className={adminStyles.metricLabel}>Lecturas Diarias</span>
                    <span className={adminStyles.metricValue}>{totalReadsDaily.toLocaleString()}</span>
                  </div>
                  <div className={adminStyles.metricBox}>
                    <span className={adminStyles.metricLabel}>Escrituras Diarias</span>
                    <span className={adminStyles.metricValue}>{totalWritesDaily.toLocaleString()}</span>
                  </div>
                </div>

                {/* Desglose de Gastos en Firestore */}
                <h4 style={{ margin: '24px 0 12px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Desglose de Costo Firestore (Mensual):
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Almacenamiento:</span>
                    <span style={{ fontWeight: 600 }}>${storageCost.toFixed(3)} USD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lecturas en exceso:</span>
                    <span style={{ fontWeight: 600 }}>${monthlyReadsCost.toFixed(2)} USD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Escrituras en exceso:</span>
                    <span style={{ fontWeight: 600 }}>${monthlyWritesCost.toFixed(2)} USD</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
                    <span>Costo Mensual de Base de Datos:</span>
                    <span style={{ color: '#ef4444' }}>${totalFirestoreCost.toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Caja Destacada de Rentabilidad */}
                {pricingModel === 'monthly' ? (
                  <div className={adminStyles.highlightBox}>
                    <span className={adminStyles.highlightTitle}>Ingresos Recurrentes Netos (MRR)</span>
                    <span className={adminStyles.highlightValue}>${margin.toFixed(2)} USD/mes</span>
                    <span className={adminStyles.highlightDesc}>
                      Tus ingresos mensuales de ${grossRevenue.toFixed(2)} USD brutos (${netRevenue.toFixed(2)} USD netos después de la comisión de Stripe) cubren tus costos de base de datos de ${totalFirestoreCost.toFixed(2)} USD, dejando un margen operativo positivo de {((margin / netRevenue) * 100 || 0).toFixed(1)}%.
                    </span>
                  </div>
                ) : (
                  <div className={`${adminStyles.highlightBox} ${margin < 0 ? adminStyles.highlightBoxDanger : ''}`}>
                    <span className={adminStyles.highlightTitle}>Caja Inicial y Supervivencia (LTD)</span>
                    <span className={`${adminStyles.highlightValue} ${margin < 0 ? adminStyles.highlightValueDanger : ''}`}>
                      ${netRevenue.toFixed(2)} USD
                    </span>
                    <span className={adminStyles.highlightDesc}>
                      {totalFirestoreCost > 0 ? (
                        <>
                          El cobro único generará ${grossRevenue.toFixed(2)} USD brutos (${netRevenue.toFixed(2)} USD netos). Con un costo mensual recurrente de base de datos de ${totalFirestoreCost.toFixed(2)} USD, tu caja de lanzamiento durará aproximadamente <strong>{ltdSurvivalYears?.toFixed(1)} años</strong> antes de empezar a perder dinero, asumiendo 0 ventas nuevas y 0 costos de soporte.
                        </>
                      ) : (
                        <>
                          Tu cobro único neto es de ${netRevenue.toFixed(2)} USD. Dado que tus operaciones no exceden la capa gratuita de Firestore, no tienes costos recurrentes y el margen de supervivencia es indefinido.
                        </>
                      )}
                    </span>
                  </div>
                )}

              </div>
            </div>
            )}

            {/* Gestor de Límites Reales del SaaS */}
            {activeTab === 'limits' && (
              <div className={adminStyles.card + ' ' + adminStyles.limitsCard} style={{ marginTop: 0 }}>
                <h3 className={adminStyles.cardTitle}>🔑 Ajuste de Límites Reales del SaaS</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '24px' }}>
                Modifica y guarda los límites que restringen las acciones de los usuarios en tiempo real en la base de datos de producción.
              </p>
              
              {loadingLimits ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  Cargando límites configurados desde Firestore...
                </div>
              ) : (
                <form onSubmit={handleSaveLimits}>
                  <div className={adminStyles.limitsGrid}>
                    
                    {/* Sección Invitados */}
                    <div className={adminStyles.limitPlanSection}>
                      <h4 className={adminStyles.limitPlanTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Planes Invitados (Guest)
                      </h4>
                      <div className={adminStyles.formGroup}>
                        <label htmlFor="guestMaxCodes" className={adminStyles.label}>Códigos por lote:</label>
                        <input
                          id="guestMaxCodes"
                          type="number"
                          min="1"
                          max="10"
                          value={guestMaxCodes}
                          onChange={(e) => setGuestMaxCodes(parseInt(e.target.value) || 0)}
                          className={adminStyles.inputNumber}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>

                    {/* Sección Gratis */}
                    <div className={adminStyles.limitPlanSection}>
                      <h4 className={adminStyles.limitPlanTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Plan Free (Gratis)
                      </h4>
                      <div className={adminStyles.formGroup} style={{ marginBottom: '16px' }}>
                        <label htmlFor="freeMaxBatches" className={adminStyles.label}>Lotes máximos:</label>
                        <input
                          id="freeMaxBatches"
                          type="number"
                          min="1"
                          max="20"
                          value={freeMaxBatches}
                          onChange={(e) => setFreeMaxBatches(parseInt(e.target.value) || 0)}
                          className={adminStyles.inputNumber}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                      <div className={adminStyles.formGroup}>
                        <label htmlFor="freeMaxCodes" className={adminStyles.label}>Códigos por lote:</label>
                        <input
                          id="freeMaxCodes"
                          type="number"
                          min="1"
                          max="100"
                          value={freeMaxCodes}
                          onChange={(e) => setFreeMaxCodes(parseInt(e.target.value) || 0)}
                          className={adminStyles.inputNumber}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>

                    {/* Sección Pro */}
                    <div className={adminStyles.limitPlanSection}>
                      <h4 className={adminStyles.limitPlanTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        Plan Pro (Premium)
                      </h4>
                      <div className={adminStyles.formGroup} style={{ marginBottom: '16px' }}>
                        <label htmlFor="proMaxBatches" className={adminStyles.label}>Lotes máximos:</label>
                        <input
                          id="proMaxBatches"
                          type="number"
                          min="1"
                          max="100"
                          value={proMaxBatches}
                          onChange={(e) => setProMaxBatches(parseInt(e.target.value) || 0)}
                          className={adminStyles.inputNumber}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                      <div className={adminStyles.formGroup}>
                        <label htmlFor="proMaxCodes" className={adminStyles.label}>Códigos por lote:</label>
                        <input
                          id="proMaxCodes"
                          type="number"
                          min="10"
                          max="5000"
                          value={proMaxCodes}
                          onChange={(e) => setProMaxCodes(parseInt(e.target.value) || 0)}
                          className={adminStyles.inputNumber}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Sección Configuración de Soporte */}
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', marginBottom: '24px' }}>
                    <h4 className={adminStyles.limitPlanTitle} style={{ marginBottom: '16px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#25D366', marginRight: '8px' }}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      Soporte de WhatsApp Vinculado
                    </h4>
                    <div className={adminStyles.formGroup} style={{ maxWidth: '400px' }}>
                      <label htmlFor="whatsappNumberInput" className={adminStyles.label}>Número de WhatsApp de soporte:</label>
                      <input
                        id="whatsappNumberInput"
                        type="text"
                        placeholder="Ej. 51999999999"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className={adminStyles.inputNumber}
                        style={{ marginTop: '8px' }}
                      />
                      <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Introduce el número completo, incluyendo el código de país, sin espacios, guiones ni el símbolo +.
                      </small>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={adminStyles.btnSave}
                  >
                    {isSaving ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}>
                          <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                        </svg>
                        <span>Guardando límites...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        <span>Guardar Configuración de Límites</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
            )}

            {/* Gestión de Membresías Manuales */}
            {activeTab === 'memberships' && (
              <div className={adminStyles.card} style={{ marginTop: 0 }}>
                <h3 className={adminStyles.cardTitle}>👤 Gestión de Membresías Manuales</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '24px' }}>
                  Busca un usuario por su Email o UID de Firebase para cambiar su membresía (activar Plan Pro o degradar a Plan Free).
                </p>
              
                <form onSubmit={handleSearchUser} className={adminStyles.userSearchBox}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Escribe el Email del usuario o su UID..."
                    className={adminStyles.inputNumber}
                    style={{ flex: 1 }}
                    disabled={isSearchingUser || isUpdatingSub}
                  />
                  <button
                    type="submit"
                    disabled={isSearchingUser || isUpdatingSub || !searchQuery.trim()}
                    className={adminStyles.btnSave}
                    style={{ margin: 0, padding: '10px 20px', height: '42px' }}
                  >
                    {isSearchingUser ? 'Buscando...' : 'Buscar Usuario'}
                  </button>
                </form>

                {searchError && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '12px' }}>
                    {searchError}
                  </p>
                )}

                {searchedUser && (
                  <div className={adminStyles.searchResultCard}>
                    <div className={adminStyles.resultHeader}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>
                          {searchedUser.displayName || 'Usuario sin nombre'}
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                          Email: <strong>{searchedUser.email}</strong> | UID: <code>{searchedUser.id}</code>
                        </p>
                      </div>
                      <span 
                        className={adminStyles.valueBadge}
                        style={{ 
                          background: searchedUser.subscription?.tier === 'pro' && searchedUser.subscription?.status === 'active' 
                            ? 'rgba(16, 185, 129, 0.1)' 
                            : 'rgba(100, 116, 139, 0.1)',
                          color: searchedUser.subscription?.tier === 'pro' && searchedUser.subscription?.status === 'active'
                            ? '#10b981'
                            : 'var(--text-secondary)'
                        }}
                      >
                        {searchedUser.subscription?.tier?.toUpperCase()} ({searchedUser.subscription?.status})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <div>
                        Rol en la plataforma: <strong style={{ color: 'var(--text-color)' }}>{searchedUser.role}</strong>
                      </div>
                      <div>
                        Fecha de registro: <span style={{ color: 'var(--text-muted)' }}>{searchedUser.createdAt ? formatDate(searchedUser.createdAt) : 'No disponible'}</span>
                      </div>
                    </div>

                    <div className={adminStyles.actionButtons}>
                      <button
                        type="button"
                        disabled={isUpdatingSub || (searchedUser.subscription?.tier === 'pro' && searchedUser.subscription?.status === 'active')}
                        onClick={() => handleUpdateSubscription('pro', 'active')}
                        className={adminStyles.btnUpgrade}
                      >
                        Activar Plan PRO
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingSub || (searchedUser.subscription?.tier === 'free' && searchedUser.subscription?.status === 'inactive')}
                        onClick={() => handleUpdateSubscription('free', 'inactive')}
                        className={adminStyles.btnDowngrade}
                      >
                        Degradar a FREE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nueva pestaña: Tabla de Usuarios Registrados */}
            {activeTab === 'users' && (
              <div className={adminStyles.card} style={{ marginTop: 0 }}>
                <h3 className={adminStyles.cardTitle} style={{ marginBottom: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Usuarios Registrados ({usersList.length})
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Lista completa de usuarios registrados en el sistema. Haz clic en "Seleccionar" para gestionar su membresía.
                </p>

                {isLoadingUsersList ? (
                  <div className={adminStyles.tableLoading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                    </svg>
                    <span>Cargando lista de usuarios...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className={adminStyles.tableEmpty}>
                    No hay usuarios registrados en el sistema.
                  </div>
                ) : (
                  <div className={adminStyles.tableContainer}>
                    <table className={adminStyles.table}>
                      <thead className={adminStyles.tableHeader}>
                        <tr>
                          <th>Usuario / Email</th>
                          <th>Plan / Membresía</th>
                          <th>Estado</th>
                          <th>Fecha Inicio</th>
                          <th>Fecha Fin / Expiración</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((user) => (
                          <tr key={user.id} className={adminStyles.tableRow}>
                            <td className={adminStyles.tableCell}>
                              <div className={adminStyles.userMeta}>
                                <span className={adminStyles.userName}>{user.displayName || 'Usuario sin nombre'}</span>
                                <span className={adminStyles.userEmail}>{user.email || 'Sin Email'}</span>
                              </div>
                            </td>
                            <td className={adminStyles.tableCell}>
                              <span className={`${adminStyles.badgePlan} ${user.subscription?.tier === 'pro' ? adminStyles.badgePlanPro : adminStyles.badgePlanFree}`}>
                                {user.subscription?.tier || 'free'}
                              </span>
                            </td>
                            <td className={adminStyles.tableCell}>
                              <span className={`${adminStyles.badgeStatus} ${user.subscription?.status === 'active' ? adminStyles.badgeStatusActive : adminStyles.badgeStatusInactive}`}>
                                {user.subscription?.status || 'inactive'}
                              </span>
                            </td>
                            <td className={adminStyles.tableCell}>
                              {getStartDate(user)}
                            </td>
                            <td className={adminStyles.tableCell}>
                              {getExpirationDate(user)}
                            </td>
                            <td className={adminStyles.tableCell}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery(user.email || '');
                                  setSearchedUser(user);
                                  setActiveTab('memberships');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={adminStyles.btnSelect}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
