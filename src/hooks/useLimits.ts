import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface PlanLimits {
  maxCodesPerBatch: number;
  maxBatches?: number;
}

export interface SaasLimits {
  guest: PlanLimits;
  free: Required<PlanLimits>;
  pro: Required<PlanLimits>;
  whatsappNumber: string;
}

export const DEFAULT_LIMITS: SaasLimits = {
  guest: { maxCodesPerBatch: 3 },
  free: { maxCodesPerBatch: 30, maxBatches: 5 },
  pro: { maxCodesPerBatch: 1000, maxBatches: 20 },
  whatsappNumber: '51999999999'
};

export function useLimits() {
  const [limits, setLimits] = useState<SaasLimits>(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const limitsDocRef = doc(db, 'system', 'limits');
    const unsubscribe = onSnapshot(limitsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Mezclar con valores por defecto para asegurar robustez
        setLimits({
          guest: {
            maxCodesPerBatch: data.guest?.maxCodesPerBatch ?? DEFAULT_LIMITS.guest.maxCodesPerBatch
          },
          free: {
            maxCodesPerBatch: data.free?.maxCodesPerBatch ?? DEFAULT_LIMITS.free.maxCodesPerBatch,
            maxBatches: data.free?.maxBatches ?? DEFAULT_LIMITS.free.maxBatches
          },
          pro: {
            maxCodesPerBatch: data.pro?.maxCodesPerBatch ?? DEFAULT_LIMITS.pro.maxCodesPerBatch,
            maxBatches: data.pro?.maxBatches ?? DEFAULT_LIMITS.pro.maxBatches
          },
          whatsappNumber: data.whatsappNumber ?? DEFAULT_LIMITS.whatsappNumber
        });
      }
      setLoading(false);
    }, (error) => {
      console.warn("Could not load limits from Firestore, using defaults:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { limits, loading };
}
