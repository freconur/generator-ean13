import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarcodeReaderModal from '../BarcodeReaderModal';
import { Html5Qrcode } from 'html5-qrcode';

// Mock de html5-qrcode
jest.mock('html5-qrcode', () => {
  const mockHtml5Qrcode = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isScanning: false,
  };
  return {
    Html5Qrcode: jest.fn().mockImplementation(() => mockHtml5Qrcode),
  };
});

// Mock del objeto window.AudioContext
const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: {
    setValueAtTime: jest.fn(),
  },
  type: 'sine',
};
const mockGainNode = {
  connect: jest.fn(),
  gain: {
    setValueAtTime: jest.fn(),
  },
};
const mockAudioContext = {
  createOscillator: () => mockOscillator,
  createGain: () => mockGainNode,
  destination: {},
  currentTime: 0,
};
(window as any).AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

describe('BarcodeReaderModal - Tap to Focus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Html5Qrcode.getCameras as any) = jest.fn().mockResolvedValue([
      { id: '1', label: 'Cámara Trasera' },
      { id: '2', label: 'Cámara Frontal' },
    ]);
  });

  it('renders modal when open and sets camera options', async () => {
    await act(async () => {
      render(
        <BarcodeReaderModal
          isOpen={true}
          onClose={jest.fn()}
          onScanSuccess={jest.fn()}
        />
      );
    });

    expect(screen.getByText(/Escáner de Códigos EAN-13/i)).toBeInTheDocument();
    expect(screen.getByText(/Seleccionar Cámara/i)).toBeInTheDocument();
  });

  it('handles click in scannerViewport, shows focus ring and disappears after 800ms', async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <BarcodeReaderModal
          isOpen={true}
          onClose={jest.fn()}
          onScanSuccess={jest.fn()}
        />
      );
    });

    // Encontrar el scannerViewport
    const viewport = screen.getByTestId('scanner-viewport');
    expect(viewport).toBeInTheDocument();

    // El aro de enfoque no debería estar activo al inicio
    expect(screen.queryByTestId('focus-ring')).not.toBeInTheDocument();

    // Simular click en las coordenadas (100, 150)
    await act(async () => {
      fireEvent.click(viewport, {
        clientX: 100,
        clientY: 150,
      });
    });

    // Debería mostrar el aro de enfoque
    const focusRing = screen.getByTestId('focus-ring');
    expect(focusRing).toBeInTheDocument();

    // Avanzar el tiempo 800ms
    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    // Debería desaparecer el aro de enfoque
    expect(screen.queryByTestId('focus-ring')).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
