import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase solo una vez en el cliente
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Configurar persistencia explícitamente en LocalStorage si estamos en el cliente
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error al configurar la persistencia de Firebase Auth:', error);
  });
}

// Inicializar Firestore con persistencia offline robusta (multioestaña)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, 'izicode');

const googleProvider = new GoogleAuthProvider();

// Configurar parámetros personalizados para el proveedor de Google si es necesario
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Inicializar Analytics solo si es cliente y es soportado
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Inicializar Firebase App Check del lado del cliente
if (typeof window !== 'undefined') {
  // Habilitar token de depuración en desarrollo local (localhost)
  if (process.env.NODE_ENV === 'development') {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    console.warn('⚠️ App Check no inicializado: Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY en el entorno.');
  }
}

export { app, auth, db, googleProvider, analytics };
