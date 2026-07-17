export interface BarcodeBatchItem {
  code: string;
  quantity: number;
  isValid: boolean;
  description?: string;
  price?: number;
  hasDescription: boolean;
  hasPrice: boolean;
}

export interface BarcodeBatch {
  id: string;
  name: string;
  barcodes: BarcodeBatchItem[];
  enableDescription: boolean;
  enablePrice: boolean;
  customCurrency: string | null;
  createdAt: any; // Firestore serverTimestamp
}
