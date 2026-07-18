import React from 'react';
import '@testing-library/jest-dom';

// 1. Mocks de Firebase y dependencias de PDF al inicio absoluto para evitar SyntaxErrors de ES Modules en Jest
jest.mock('@react-pdf/renderer', () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: () => ({}) },
  BlobProvider: () => null,
  PDFViewer: () => null,
  Font: { register: jest.fn() }
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {}
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn()
}));

jest.mock('../../utils/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {}
}));

// Mock del router de Next.js
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      replace: jest.fn()
    };
  }
}));

// Mock del lector de cámara
jest.mock('../BarcodeReaderModal', () => {
  return function MockBarcodeReaderModal({ isOpen, onScanSuccess, onClose }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-barcode-reader">
        <button onClick={() => onScanSuccess('7501031301829')}>Simular Escaneo Válido</button>
        <button onClick={() => onScanSuccess('9999999999999')}>Simular Escaneo Inválido</button>
        <button onClick={onClose}>Cerrar Lector</button>
      </div>
    );
  };
});

// Mocks de hooks del contexto
jest.mock('../../context/AuthContext');
jest.mock('../../hooks/useLimits');

// 2. Importaciones de componentes
import { render, screen, fireEvent } from '@testing-library/react';
import BarcodeForm from '../BarcodeForm';
import { useAuth } from '../../context/AuthContext';
import { useLimits } from '../../hooks/useLimits';
import { updateDoc } from 'firebase/firestore';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLimits = useLimits as jest.MockedFunction<typeof useLimits>;
const mockUpdateDoc = updateDoc as unknown as jest.Mock;

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('Pruebas de Límites SaaS en BarcodeForm', () => {
  const defaultProps = {
    barcodes: [],
    setBarcodes: jest.fn(),
    enableDescription: false,
    setEnableDescription: jest.fn(),
    enablePrice: false,
    setEnablePrice: jest.fn(),
    showPDFPreview: false,
    setShowPDFPreview: jest.fn(),
    barcodeSettings: {
      width: 1.5,
      height: 50,
      fontSize: 10,
      marginHorizontal: 10,
      marginVertical: 10,
      showNumber: true,
      generalSpacing: 10,
      containerHeight: 120,
      textMargin: 5
    } as any,
    onImportCSV: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLimits.mockReturnValue({
      limits: {
        guest: { maxCodesPerBatch: 3, maxBatches: 1 },
        free: { maxCodesPerBatch: 30, maxBatches: 5 },
        pro: { maxCodesPerBatch: 1000, maxBatches: 20 },
        whatsappNumber: '51999999999'
      },
      loading: false
    });
  });

  it('debe bloquear la inserción de más de 3 códigos si el usuario es Invitado (Guest)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    const barcodesWithThreeItems = [
      { code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false },
      { code: '9780201379624', quantity: 1, isValid: true, hasDescription: false, hasPrice: false },
      { code: '7750123456781', quantity: 1, isValid: true, hasDescription: false, hasPrice: false }
    ];

    const mockSetBarcodes = jest.fn();

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={barcodesWithThreeItems} 
        setBarcodes={mockSetBarcodes}
      />
    );

    const input = screen.getByPlaceholderText('Ingrese el código EAN-13');
    fireEvent.change(input, { target: { value: '7501031301829' } });

    const validateBtn = screen.getByText('Validar Código');
    fireEvent.click(validateBtn);

    expect(screen.getByText(/Límite de invitado alcanzado/i)).toBeInTheDocument();
    expect(mockSetBarcodes).not.toHaveBeenCalled();
  });

  it('debe bloquear la inserción de más de 30 códigos si el usuario tiene plan Free', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'free_user' },
      profile: { role: 'user', subscription: { tier: 'free', status: 'inactive' } },
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    const barcodesWith30Items = Array.from({ length: 30 }, (_, i) => ({
      code: '7501031301829',
      quantity: 1,
      isValid: true,
      hasDescription: false,
      hasPrice: false
    }));

    const mockSetBarcodes = jest.fn();

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={barcodesWith30Items} 
        setBarcodes={mockSetBarcodes}
      />
    );

    const input = screen.getByPlaceholderText('Ingrese el código EAN-13');
    fireEvent.change(input, { target: { value: '7501031301829' } });

    const validateBtn = screen.getByText('Validar Código');
    fireEvent.click(validateBtn);

    expect(screen.getByText(/Límite del plan alcanzado/i)).toBeInTheDocument();
    expect(mockSetBarcodes).not.toHaveBeenCalled();
  });

  it('debe entrar en modo solo lectura (isReadOnly) y deshabilitar inputs si el lote supera el límite del plan actual', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'free_user' },
      profile: { role: 'user', subscription: { tier: 'free', status: 'inactive' } },
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    // Creamos una lista de 31 códigos (supera el límite de 30 para plan Free)
    const barcodesOverLimit = Array.from({ length: 31 }, (_, i) => ({
      code: '7501031301829',
      quantity: 1,
      isValid: true,
      hasDescription: false,
      hasPrice: false,
      print: true
    }));

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={barcodesOverLimit} 
        setBarcodes={jest.fn()}
      />
    );

    // El input de EAN debe estar deshabilitado
    const input = screen.getByPlaceholderText('Ingrese el código EAN-13');
    expect(input).toBeDisabled();

    // El botón de validar debe estar deshabilitado
    const validateBtn = screen.getByText('Validar Código');
    expect(validateBtn).toBeDisabled();

    // El banner de advertencia de solo lectura debe estar visible
    expect(screen.getByText(/Lote en modo Solo Lectura/i)).toBeInTheDocument();
  });

  it('debe entrar en modo solo lectura (isReadOnly) y mostrar banner de exceso de lotes si isBatchExceeded es true', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'free_user' },
      profile: { role: 'user', subscription: { tier: 'free', status: 'inactive' } },
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={[]} 
        setBarcodes={jest.fn()}
        isBatchExceeded={true}
        userBatchesCount={6}
      />
    );

    // El input de EAN debe estar deshabilitado
    const input = screen.getByPlaceholderText('Ingrese el código EAN-13');
    expect(input).toBeDisabled();

    // El banner de advertencia de exceso de lotes debe estar visible con el texto correspondiente
    expect(screen.getByText(/supera el límite de 5 lotes permitidos/i)).toBeInTheDocument();
  });

  it('debe marcar print = true y abrir modal de config rápida al escanear un código que ya existe', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'free_user' },
      profile: { role: 'user', subscription: { tier: 'free', status: 'inactive' } },
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    const barcodes = [
      { code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: false }
    ];

    const mockSetBarcodes = jest.fn();

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={barcodes} 
        setBarcodes={mockSetBarcodes}
      />
    );

    // 1. Abrimos el lector por cámara haciendo clic en el disparador
    const scanTriggerBtn = screen.getByTitle('Escanear Código por Cámara');
    fireEvent.click(scanTriggerBtn);

    // 2. Comprobamos que el lector está en el DOM
    expect(screen.getByTestId('mock-barcode-reader')).toBeInTheDocument();

    // 3. Simulamos escaneo de un código ya existente ('7501031301829')
    const scanBtn = screen.getByText('Simular Escaneo Válido');
    fireEvent.click(scanBtn);

    // 4. Se debe haber llamado a setBarcodes para marcar print = true
    expect(mockSetBarcodes).toHaveBeenCalled();

    // 5. El modal de configuración rápida (Producto Seleccionado) debe abrirse
    expect(screen.getByText('Producto Seleccionado')).toBeInTheDocument();
  });

  it('debe abrir modal de adición rápida al escanear un código que no existe', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'free_user' },
      profile: { role: 'user', subscription: { tier: 'free', status: 'inactive' } },
      setIsAuthModalOpen: jest.fn(),
      loading: false
    } as any);

    render(
      <BarcodeForm 
        {...defaultProps as any} 
        barcodes={[]} 
        setBarcodes={jest.fn()}
      />
    );

    // 1. Abrimos el lector
    const scanTriggerBtn = screen.getByTitle('Escanear Código por Cámara');
    fireEvent.click(scanTriggerBtn);

    // 2. Simulamos escaneo de un código que no existe en el lote ('7501031301829')
    const scanBtn = screen.getByText('Simular Escaneo Válido');
    fireEvent.click(scanBtn);

    // 3. El modal de adición rápida (Producto no Registrado) debe abrirse
    expect(screen.getByText('Producto no Registrado')).toBeInTheDocument();
    expect(screen.getByText(/no está en este lote/i)).toBeInTheDocument();
  });

  describe('Master Checkboxes for Description and Price', () => {
    it('debe renderizar las casillas master de descripción y precio en la cabecera y reaccionar al cambio de estado local', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: '1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true },
        { id: '2', code: '9780201379624', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true }
      ];

      const mockSetBarcodes = jest.fn();

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={mockSetBarcodes}
        />
      );

      const masterDescCheckbox = screen.getByTitle('Seleccionar / Deseleccionar descripción para todos');
      const masterPriceCheckbox = screen.getByTitle('Seleccionar / Deseleccionar precio para todos');

      expect(masterDescCheckbox).toBeInTheDocument();
      expect(masterPriceCheckbox).toBeInTheDocument();

      expect(masterDescCheckbox).not.toBeDisabled();
      expect(masterPriceCheckbox).not.toBeDisabled();

      fireEvent.click(masterDescCheckbox);
      expect(mockSetBarcodes).toHaveBeenCalled();
      const descCallback = mockSetBarcodes.mock.calls[0][0];
      const updatedDescBarcodes = descCallback(barcodes);
      expect(updatedDescBarcodes.every((item: any) => item.hasDescription === true)).toBe(true);

      fireEvent.click(masterPriceCheckbox);
      expect(mockSetBarcodes).toHaveBeenCalled();
      const priceCallback = mockSetBarcodes.mock.calls[1][0];
      const updatedPriceBarcodes = priceCallback(barcodes);
      expect(updatedPriceBarcodes.every((item: any) => item.hasPrice === true)).toBe(true);
    });

    it('debe respetar isReadOnly deshabilitando las casillas master de descripción y precio', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: '1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true }
      ];

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={jest.fn()}
          isBatchExceeded={true}
        />
      );

      const masterDescCheckbox = screen.getByTitle('Seleccionar / Deseleccionar descripción para todos');
      const masterPriceCheckbox = screen.getByTitle('Seleccionar / Deseleccionar precio para todos');

      expect(masterDescCheckbox).toBeDisabled();
      expect(masterPriceCheckbox).toBeDisabled();
    });

    it('debe sincronizar en caliente con Firestore en lote activo si el usuario está logueado', async () => {
      const mockUser = { uid: 'test_user_id' };
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: { role: 'user', subscription: { tier: 'pro', status: 'active' } },
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: 'item_1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true },
        { id: 'item_2', code: '9780201379624', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true }
      ];

      mockUpdateDoc.mockClear();

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={jest.fn()}
          loadedBatchId="batch_123"
        />
      );

      const masterDescCheckbox = screen.getByTitle('Seleccionar / Deseleccionar descripción para todos');
      fireEvent.click(masterDescCheckbox);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Smart Accordion and Responsive Mobile Card rendering', () => {
    it('debe expandir la lista por defecto y colapsar/expandir al hacer clic en el botón del acordeón', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: 'item_1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true }
      ];

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={jest.fn()}
        />
      );

      // Verificamos que el botón del acordeón existe
      const toggleBtn = screen.getByTitle('Colapsar lista');
      expect(toggleBtn).toBeInTheDocument();

      // Al hacer clic, se debe colapsar y el título del botón cambia a "Expandir lista"
      fireEvent.click(toggleBtn);
      expect(screen.getByTitle('Expandir lista')).toBeInTheDocument();

      // Al hacer clic de nuevo, se debe expandir y volver a "Colapsar lista"
      fireEvent.click(screen.getByTitle('Expandir lista'));
      expect(screen.getByTitle('Colapsar lista')).toBeInTheDocument();
    });

    it('debe forzar la expansión de la lista automáticamente al recibir un escaneo exitoso', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: 'item_1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: false }
      ];

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={jest.fn()}
        />
      );

      // Colapsamos la lista primero
      const toggleBtn = screen.getByTitle('Colapsar lista');
      fireEvent.click(toggleBtn);
      expect(screen.getByTitle('Expandir lista')).toBeInTheDocument();

      // Abrimos el lector y simulamos un escaneo exitoso
      const scanTriggerBtn = screen.getByTitle('Escanear Código por Cámara');
      fireEvent.click(scanTriggerBtn);

      const scanBtn = screen.getByText('Simular Escaneo Válido');
      fireEvent.click(scanBtn);

      // El acordeón debe haberse forzado a expandirse de nuevo
      expect(screen.getByTitle('Colapsar lista')).toBeInTheDocument();
    });

    it('debe alternar la expansión de los detalles de la fila al hacer clic en la flecha', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        setIsAuthModalOpen: jest.fn(),
        loading: false
      } as any);

      const barcodes = [
        { id: 'item_1', code: '7501031301829', quantity: 1, isValid: true, hasDescription: false, hasPrice: false, print: true }
      ];

      render(
        <BarcodeForm 
          {...defaultProps as any} 
          barcodes={barcodes} 
          setBarcodes={jest.fn()}
        />
      );

      // El panel de detalles NO debe estar presente inicialmente
      expect(screen.queryByTitle('Eliminar código')).not.toBeInTheDocument();

      // Buscamos el botón de la flecha ("Ver detalles")
      const arrowBtn = screen.getByTitle('Ver detalles');
      expect(arrowBtn).toBeInTheDocument();

      // Hacemos clic para expandir
      fireEvent.click(arrowBtn);

      // Ahora el panel de detalles (que contiene el botón Eliminar con título "Eliminar código") debe estar en el DOM
      expect(screen.getByTitle('Eliminar código')).toBeInTheDocument();

      // Hacemos clic de nuevo para colapsar
      fireEvent.click(arrowBtn);

      // El panel de detalles ya no debe estar
      expect(screen.queryByTitle('Eliminar código')).not.toBeInTheDocument();
    });
  });
});
