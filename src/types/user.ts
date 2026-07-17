export type UserRole = 'user' | 'admin';

export interface UserSubscription {
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  tier: 'free' | 'pro' | 'enterprise';
  priceId: string | null;
  expiresAt: number | null;
  updatedAt?: string | null;
  provider?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  subscription: UserSubscription;
  createdAt: any; // Firestore Timestamp
}
