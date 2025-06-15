export interface BarcodeState {
  barcode: string;
  showBarcode: boolean;
  error: string;
  quantity: number;
  generatedBarcodes: string[];
  showPDFPreview: boolean;
}

export interface BarcodeContextType extends BarcodeState {
  setBarcode: (barcode: string) => void;
  setShowBarcode: (show: boolean) => void;
  setError: (error: string) => void;
  setQuantity: (quantity: number) => void;
  setShowPDFPreview: (show: boolean) => void;
  validateAndGenerateBarcode: (code: string) => void;
  resetBarcode: () => void;
  generateMultipleBarcodes: () => void;
  generatePDF: () => Promise<void>;
} 