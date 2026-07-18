import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock React PDF Renderer
jest.mock('@react-pdf/renderer', () => {
  return {
    Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
    Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
    Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
    View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
    Image: () => <img data-testid="pdf-image" alt="barcode" />,
    pdf: () => ({
      toBlob: jest.fn().mockResolvedValue(new Blob())
    }),
    BlobProvider: ({ children }: any) => children({ blob: new Blob(), loading: false, error: null }),
    PDFViewer: ({ children }: any) => <div data-testid="pdf-viewer">{children}</div>
  };
});

// Mock jsbarcode and html2canvas
jest.mock('jsbarcode', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());

import { PdfImprimir } from '../PDF-ean13';

describe('Pruebas de Bottom Sheet en PdfImprimir', () => {
  const defaultProps = {
    barcodes: [
      { code: '7501031301829', quantity: 2, isValid: true, hasDescription: true, description: 'Test Product', hasPrice: true, price: 10.99 }
    ],
    enableDescription: true,
    enablePrice: true,
    showPDFPreview: false,
    onTogglePDFPreview: jest.fn(),
    customCurrency: 'MXN',
    barcodeSettings: {
      width: 3,
      height: 110,
      fontSize: 24,
      marginHorizontal: 0,
      marginVertical: 0,
      showNumber: true,
      generalSpacing: 1,
      containerHeight: 60,
      textMargin: 2,
      descAlign: 'center' as const,
      descFontSize: 10
    },
    setBarcodeSettings: jest.fn()
  };

  it('debe renderizar el botón flotante, el overlay y la estructura del panel de ajustes', () => {
    render(<PdfImprimir {...defaultProps} />);

    // Verificar botón flotante
    const floatingBtn = screen.getByLabelText('Ajustes de código de barras');
    expect(floatingBtn).toBeInTheDocument();

    // Verificar botón de cerrar del bottom sheet
    const closeBtn = screen.getByLabelText('Cerrar ajustes');
    expect(closeBtn).toBeInTheDocument();

    // Verificar el tirador táctil
    const container = screen.getByText('Ajustes del codigo de barra').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('debe abrir y cerrar el bottom sheet al interactuar con el botón flotante, botón cerrar y overlay', () => {
    render(<PdfImprimir {...defaultProps} />);

    const floatingBtn = screen.getByLabelText('Ajustes de código de barras');
    const closeBtn = screen.getByLabelText('Cerrar ajustes');
    
    // El contenedor de ajustes tiene el text "Ajustes del codigo de barra"
    const settingsPanel = screen.getByText('Ajustes del codigo de barra').parentElement;
    expect(settingsPanel).not.toHaveClass('settingsContainerOpen');

    // Clic en el botón flotante para abrir
    fireEvent.click(floatingBtn);
    expect(settingsPanel).toHaveClass('settingsContainerOpen');

    // Clic en el botón de cerrar para cerrar
    fireEvent.click(closeBtn);
    expect(settingsPanel).not.toHaveClass('settingsContainerOpen');

    // Volver a abrir
    fireEvent.click(floatingBtn);
    expect(settingsPanel).toHaveClass('settingsContainerOpen');

    // Clic en el overlay para cerrar (el overlay es el elemento con aria-label o clase bottomSheetOverlay)
    // El overlay es el primer div dentro de la clase container
    const overlay = settingsPanel?.parentElement?.querySelector('.bottomSheetOverlay');
    expect(overlay).toBeInTheDocument();
    
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(settingsPanel).not.toHaveClass('settingsContainerOpen');
  });
});
