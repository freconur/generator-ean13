import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Page, Text, View, Document, pdf, PDFViewer, Image, Styles, BlobProvider } from '@react-pdf/renderer';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import bwipjs from 'bwip-js';
import styles from '../styles/PDF-ean13.module.css';
import { formatPrice, formatPriceSymbolOnly } from '../utils/formatPrice';
import { getSampleCodeForFormat, validateBarcode } from '../utils/barcodeValidators';

// Interfaz que define la estructura de un elemento de código de barras
interface BarcodeItem {
	code: string;        // El código EAN-13
	quantity: number;    // Cantidad de repeticiones
	isValid: boolean;    // Estado de validez del código
	isDuplicate?: boolean; // Indica si el código está duplicado
	description?: string; // Descripción del producto
	price?: number;      // Precio del producto
	hasDescription: boolean; // Flag para indicar si se habilitó descripción
	hasPrice: boolean; // Flag para indicar si se habilitó precio
}

// Interfaz para la configuración del código de barras
export interface BarcodeSettings {
	width: number;      // Ancho de las líneas del código
	height: number;     // Altura del código de barras
	fontSize: number;   // Tamaño de la fuente del número
	marginHorizontal: number; // Margen horizontal entre códigos (permite decimales)
	marginVertical: number;   // Margen vertical entre códigos (permite decimales)
	showNumber: boolean;  // Mostrar o ocultar el número del código de barras
	generalSpacing: number; // Espaciado general que afecta ambos márgenes
	containerHeight: number; // Altura mínima del contenedor (independiente del código de barras)
	textMargin: number; // Margen entre el código de barras y el número
	descAlign?: 'left' | 'center' | 'right'; // Alineación del texto de la descripción
	descFontSize?: number; // Tamaño de la fuente de la descripción
}

// Props del componente
export interface Props {
	barcodes: BarcodeItem[] // Array de códigos de barras a imprimir
	enableDescription?: boolean; // Flag para mostrar descripción
	enablePrice?: boolean; // Flag para mostrar precio
	showPDFPreview?: boolean; // Estado de la vista previa controlado externamente
	onTogglePDFPreview?: (show: boolean) => void; // Función para controlar la vista previa
	customCurrency?: string; // Moneda personalizada opcional
	barcodeSettings: BarcodeSettings;
	setBarcodeSettings: React.Dispatch<React.SetStateAction<BarcodeSettings>>;
	barcodeFormat?: string;
}

// Función para formatear fechas en formato español
const formatDate = (timestamp: Date | number): string => {
	if (!timestamp) return '-';
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	return date.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
};

// Estilos para el documento PDF
const pdfStyles = {
	page: {
		padding: 10
	},
	container: {
		flexDirection: 'column' as const,
		gap: 10
	},
	title: {
		fontSize: 20,
		marginBottom: 20,
		textAlign: 'center' as const
	},
	barcodeGroup: {
		display: 'flex',
		flexDirection: 'row' as const,
		flexWrap: 'wrap' as const,
		alignContent: 'flex-start' as const,
		gap: 5
	},
	barcodeItem: {
		width: 120,
		height: 'auto',
		marginRight: 0, // Se aplicará dinámicamente según contenido
		marginBottom: 0, // Se aplicará dinámicamente según contenido
		display: 'flex',
		flexDirection: 'column' as const,
		alignItems: 'center',
		padding: 2, // Padding reducido para mayor compactación
	},
	barcodeImage: {
		width: '95%', // Ocupa más del contenedor
		marginVertical: 1 // Margen vertical mínimo
	},
	description: {
		width: '100%',
		fontSize: 9,
		textAlign: 'center' as const,
		marginBottom: 4,
		color: '#333333',
		maxLines: 2,
		lineHeight: 1.3
	},
	price: {
		fontSize: 10,
		textAlign: 'center' as const,
		marginTop: 4,
		color: '#000000',
		fontWeight: 'bold'
	}
} as const;

// Interfaz extendida para incluir la imagen del código de barras
interface BarcodeItemWithImage extends BarcodeItem {
	imageBase64: string; // La imagen base64 del código de barras
}

// Componente que define la estructura del documento PDF
const MyDocument: React.FC<{
	barcodes: BarcodeItemWithImage[],
	settings: BarcodeSettings,
	enableDescription?: boolean,
	enablePrice?: boolean,
	customCurrency?: string,
	barcodeFormat?: string
}> = ({ barcodes, settings, customCurrency, barcodeFormat = 'EAN13' }) => {
	// Clasificar los códigos en simples (sin datos a imprimir) y ricos (con descripción o precio a imprimir)
	const simpleBarcodes = barcodes.filter(item => !item.hasDescription && !item.hasPrice);
	const richBarcodes = barcodes.filter(item => item.hasDescription || item.hasPrice);

	// Función helper para renderizar un item de código de barras
	const renderBarcodeItem = (barcode: BarcodeItemWithImage, isRichList: boolean = false) => {
		const hasDescription = barcode.hasDescription && barcode.description;
		const hasPrice = barcode.hasPrice && barcode.price !== undefined && (barcode.price !== null && !isNaN(barcode.price));

		const adjustedMarginVertical = settings.marginVertical;
		const adjustedMarginHorizontal = settings.marginHorizontal;
		
		const is2D = barcodeFormat === 'QR' || barcodeFormat === 'DATAMATRIX';
		const adjustedWidth = is2D ? (settings.width * 20) : (settings.width * 30);
		const imgHeight = is2D ? (adjustedWidth * 0.8) : (settings.height * 0.3);

		return Array.from({ length: barcode.quantity }).map((_, index) => (
			<View
				key={`${barcode.code}-${index}`}
				wrap={false}
				style={{
					...pdfStyles.barcodeItem,
					width: adjustedWidth,
					marginBottom: adjustedMarginVertical,
					marginRight: adjustedMarginHorizontal,
				}}
			>
				{/* Descripción arriba del código de barras - con espaciador si no tiene para mantener alineación vertical */}
				{hasDescription ? (
					<Text style={{
						...pdfStyles.description,
						fontSize: settings.descFontSize || 10,
						textAlign: (settings.descAlign || 'center') as any
					}}>
						{barcode.description}
					</Text>
				) : (
					isRichList ? (
						<View style={{
							height: (settings.descFontSize || 10) * 1.3,
							marginBottom: 4
						}} />
					) : null
				)}

				{/* Código de barras */}
				<Image
					source={`data:image/png;base64,${barcode.imageBase64}`}
					style={{
						...pdfStyles.barcodeImage,
						height: imgHeight,
						objectFit: 'contain',
						flexShrink: 0
					}}
				/>

				{/* Precio abajo del código de barras - solo si tiene contenido */}
				{hasPrice && barcode.price !== undefined && (
					<Text style={pdfStyles.price}>
						{formatPriceSymbolOnly(barcode.price, customCurrency)}
					</Text>
				)}
			</View>
		));
	};

	return (
		<Document>
			<Page size="A4" style={pdfStyles.page}>
				<View style={pdfStyles.container}>
					{/* Grupo de códigos simples (sin descripción ni precio) */}
					{simpleBarcodes.length > 0 && (
						<View style={{
							...pdfStyles.barcodeGroup,
							gap: 0,
							marginBottom: richBarcodes.length > 0 ? settings.marginVertical : 0
						}}>
							{simpleBarcodes.flatMap(barcode => renderBarcodeItem(barcode, false))}
						</View>
					)}

					{/* Grupo de códigos con descripción/precio (con salto de línea implícito) */}
					{richBarcodes.length > 0 && (
						<View style={{
							...pdfStyles.barcodeGroup,
							gap: 0
						}}>
							{richBarcodes.flatMap(barcode => renderBarcodeItem(barcode, true))}
						</View>
					)}
				</View>
			</Page>
		</Document>
	);
};

// Componente para renderizar una página del PDF en un Canvas de forma nativa e interactiva
const PDFPageCanvas: React.FC<{ pdf: any, pageNumber: number }> = ({ pdf, pageNumber }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		let active = true;
		const renderPage = async () => {
			try {
				const page = await pdf.getPage(pageNumber);
				const viewport = page.getViewport({ scale: 1.5 }); // Escala 1.5 para alta definición

				if (!active) return;
				const canvas = canvasRef.current;
				if (!canvas) return;
				const context = canvas.getContext('2d');
				if (!context) return;

				canvas.width = viewport.width;
				canvas.height = viewport.height;

				const renderContext = {
					canvasContext: context,
					viewport: viewport
				};
				await page.render(renderContext).promise;
			} catch (error) {
				console.error(`Error rendering page ${pageNumber}:`, error);
			}
		};

		renderPage();
		return () => {
			active = false;
		};
	}, [pdf, pageNumber]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				width: '100%',
				maxWidth: '100%',
				height: 'auto',
				boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
				borderRadius: '6px',
				marginBottom: '24px',
				background: '#ffffff',
				border: '1px solid #cbd5e1'
			}}
		/>
	);
};

// Componente principal para el visor de PDF personalizado por Canvas
const PDFCanvasViewer: React.FC<{ blob: Blob }> = ({ blob }) => {
	const [pdfDoc, setPdfDoc] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);

	// Cargar el script de PDF.js de forma dinámica en el cliente
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const checkLoaded = () => {
			if ((window as any).pdfjsLib) {
				setPdfjsLoaded(true);
				return true;
			}
			return false;
		};

		if (checkLoaded()) return;

		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
		script.async = true;
		script.onload = () => {
			const pdfjs = (window as any).pdfjsLib;
			if (pdfjs) {
				pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
				setPdfjsLoaded(true);
			}
		};
		document.head.appendChild(script);
	}, []);

	// Cargar el documento PDF usando PDF.js cuando el blob o la librería estén listos
	useEffect(() => {
		if (!pdfjsLoaded || !blob) return;

		let active = true;
		setLoading(true);

		const loadPDF = async () => {
			try {
				const arrayBuffer = await blob.arrayBuffer();
				const pdfjs = (window as any).pdfjsLib;
				if (!pdfjs) return;

				const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
				const pdf = await loadingTask.promise;
				if (active) {
					setPdfDoc(pdf);
					setLoading(false);
				}
			} catch (error) {
				console.error('Error al cargar PDF con PDF.js:', error);
				if (active) {
					setLoading(false);
				}
			}
		};

		loadPDF();

		return () => {
			active = false;
		};
	}, [blob, pdfjsLoaded]);

	if (loading || !pdfDoc) {
		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100%',
				minHeight: '400px',
				color: '#64748b',
				gap: '12px'
			}}>
				<div style={{
					width: '32px',
					height: '32px',
					border: '3px solid var(--border-color)',
					borderTopColor: 'var(--primary-color)',
					borderRadius: '50%',
					animation: 'spin 1s linear infinite'
				}} />
				<span>Cargando vista previa...</span>
				<style>{`
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				`}</style>
			</div>
		);
	}

	return (
		<div className={styles.canvasViewerContainer}>
			{Array.from({ length: pdfDoc.numPages }).map((_, i) => (
				<PDFPageCanvas key={i} pdf={pdfDoc} pageNumber={i + 1} />
			))}
		</div>
	);
};

// Función para validar códigos EAN-13
const isValidEAN13 = (code: string): boolean => {
	if (!/^\d{13}$/.test(code)) return false;

	const digits = code.split('').map(Number);
	const checkDigit = digits.pop();

	const sum = digits.reduce((acc, digit, index) => {
		return acc + (index % 2 === 0 ? digit : digit * 3);
	}, 0);

	const calculatedCheck = (10 - (sum % 10)) % 10;
	return calculatedCheck === checkDigit;
};

// Componente principal que maneja la generación y visualización del PDF
export const PdfImprimir: React.FC<Props> = ({
	barcodes,
	enableDescription = false,
	enablePrice = false,
	showPDFPreview: externalShowPDFPreview = false,
	onTogglePDFPreview,
	customCurrency,
	barcodeSettings,
	setBarcodeSettings,
	barcodeFormat = 'EAN13'
}) => {
	const [showPreview, setShowPreview] = useState(false);
	const [internalShowPDFPreview, setInternalShowPDFPreview] = useState(false);

	// Usar la prop externa si está disponible, sino usar el estado interno
	const showPDFPreview = onTogglePDFPreview ? externalShowPDFPreview : internalShowPDFPreview;
	const setShowPDFPreview = onTogglePDFPreview || setInternalShowPDFPreview;
	const [barcodeImages, setBarcodeImages] = useState<{ [key: string]: string }>({});
	const [previewImage, setPreviewImage] = useState<string>('');
	const [previewError, setPreviewError] = useState<string>('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
	const [activePreset, setActivePreset] = useState<string>('RETAIL_A4_30');

	const applyPreset = (presetKey: string) => {
		setActivePreset(presetKey);
		switch (presetKey) {
			case 'CODE128_SHIPPING_4X6':
				setBarcodeSettings({
					width: 4.0,
					height: 200,
					fontSize: 20,
					marginHorizontal: 15,
					marginVertical: 20,
					showNumber: true,
					generalSpacing: 2,
					containerHeight: 180,
					textMargin: 4,
					descAlign: 'left',
					descFontSize: 14
				});
				break;
			case 'CODE128_WAREHOUSE_4X3':
				setBarcodeSettings({
					width: 3.5,
					height: 150,
					fontSize: 18,
					marginHorizontal: 10,
					marginVertical: 15,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 130,
					textMargin: 3,
					descAlign: 'center',
					descFontSize: 12
				});
				break;
			case 'CODE128_A4_8PERPAGE':
				setBarcodeSettings({
					width: 3.2,
					height: 130,
					fontSize: 16,
					marginHorizontal: 8,
					marginVertical: 12,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 110,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 11
				});
				break;
			case 'CODE39_INVENTORY_70X36':
				setBarcodeSettings({
					width: 3.2,
					height: 130,
					fontSize: 18,
					marginHorizontal: 5,
					marginVertical: 8,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 90,
					textMargin: 3,
					descAlign: 'center',
					descFontSize: 11
				});
				break;
			case 'CODE39_A4_21':
				setBarcodeSettings({
					width: 3.0,
					height: 110,
					fontSize: 16,
					marginHorizontal: 4,
					marginVertical: 6,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 75,
					textMargin: 2,
					descAlign: 'left',
					descFontSize: 10
				});
				break;
			case 'CODE39_COMPONENT_50X25':
				setBarcodeSettings({
					width: 2.5,
					height: 90,
					fontSize: 14,
					marginHorizontal: 2,
					marginVertical: 4,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 60,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 9
				});
				break;
			case 'ITF_CARTON_150X50':
				setBarcodeSettings({
					width: 4.5,
					height: 200,
					fontSize: 22,
					marginHorizontal: 15,
					marginVertical: 20,
					showNumber: true,
					generalSpacing: 2,
					containerHeight: 160,
					textMargin: 5,
					descAlign: 'center',
					descFontSize: 14
				});
				break;
			case 'ITF_BOX_100X50':
				setBarcodeSettings({
					width: 3.8,
					height: 150,
					fontSize: 18,
					marginHorizontal: 10,
					marginVertical: 12,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 120,
					textMargin: 4,
					descAlign: 'left',
					descFontSize: 12
				});
				break;
			case 'CODABAR_LIBRARY_70X30':
				setBarcodeSettings({
					width: 3.0,
					height: 100,
					fontSize: 18,
					marginHorizontal: 4,
					marginVertical: 6,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 70,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 10
				});
				break;
			case 'CODABAR_BLOOD_50X20':
				setBarcodeSettings({
					width: 2.2,
					height: 80,
					fontSize: 14,
					marginHorizontal: 2,
					marginVertical: 3,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 50,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 8
				});
				break;
			case 'QR_STICKER_50X50':
				setBarcodeSettings({
					width: 2.5,
					height: 120,
					fontSize: 12,
					marginHorizontal: 8,
					marginVertical: 8,
					showNumber: false,
					generalSpacing: 1,
					containerHeight: 100,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 11
				});
				break;
			case 'QR_PRODUCT_35X35':
				setBarcodeSettings({
					width: 1.8,
					height: 80,
					fontSize: 10,
					marginHorizontal: 4,
					marginVertical: 4,
					showNumber: false,
					generalSpacing: 1,
					containerHeight: 70,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 9
				});
				break;
			case 'DATAMATRIX_PART_40X40':
				setBarcodeSettings({
					width: 2.0,
					height: 90,
					fontSize: 11,
					marginHorizontal: 5,
					marginVertical: 5,
					showNumber: false,
					generalSpacing: 1,
					containerHeight: 80,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 10
				});
				break;
			case 'DATAMATRIX_PHARMA_25X25':
				setBarcodeSettings({
					width: 1.4,
					height: 60,
					fontSize: 8,
					marginHorizontal: 2,
					marginVertical: 2,
					showNumber: false,
					generalSpacing: 1,
					containerHeight: 50,
					textMargin: 1,
					descAlign: 'center',
					descFontSize: 8
				});
				break;
			case 'RETAIL_MICRO_65':
				setBarcodeSettings({
					width: 2.0,
					height: 75,
					fontSize: 16,
					marginHorizontal: 2,
					marginVertical: 2,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 45,
					textMargin: 1,
					descAlign: 'center',
					descFontSize: 8
				});
				break;
			case 'RETAIL_A4_30':
				setBarcodeSettings({
					width: 3,
					height: 110,
					fontSize: 24,
					marginHorizontal: 0,
					marginVertical: 0,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 60,
					textMargin: 2,
					descAlign: 'center',
					descFontSize: 10
				});
				break;
			case 'RETAIL_A4_24':
				setBarcodeSettings({
					width: 3.5,
					height: 130,
					fontSize: 24,
					marginHorizontal: 4,
					marginVertical: 6,
					showNumber: true,
					generalSpacing: 1,
					containerHeight: 80,
					textMargin: 3,
					descAlign: 'center',
					descFontSize: 12
				});
				break;
			default:
				break;
		}
	};

	useEffect(() => {
		switch (barcodeFormat) {
			case 'CODE128':
				applyPreset('CODE128_WAREHOUSE_4X3');
				break;
			case 'CODE39':
				applyPreset('CODE39_INVENTORY_70X36');
				break;
			case 'ITF':
				applyPreset('ITF_BOX_100X50');
				break;
			case 'CODABAR':
				applyPreset('CODABAR_LIBRARY_70X30');
				break;
			case 'QR':
				applyPreset('QR_STICKER_50X50');
				break;
			case 'DATAMATRIX':
				applyPreset('DATAMATRIX_PART_40X40');
				break;
			case 'EAN8':
				applyPreset('RETAIL_MICRO_65');
				break;
			case 'EAN13':
			case 'UPC':
			default:
				applyPreset('RETAIL_A4_30');
				break;
		}
	}, [barcodeFormat]);

	// Estados debounced para evitar regenerar el PDF en cada pulsación de tecla o cambio de slider
	const [debouncedBarcodes, setDebouncedBarcodes] = useState(barcodes);
	const [debouncedBarcodeSettings, setDebouncedBarcodeSettings] = useState(barcodeSettings);
	const [debouncedEnableDescription, setDebouncedEnableDescription] = useState(enableDescription);
	const [debouncedEnablePrice, setDebouncedEnablePrice] = useState(enablePrice);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedBarcodes(barcodes);
		}, 600);
		return () => clearTimeout(timer);
	}, [barcodes]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedBarcodeSettings(barcodeSettings);
		}, 600);
		return () => clearTimeout(timer);
	}, [barcodeSettings]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedEnableDescription(enableDescription);
		}, 600);
		return () => clearTimeout(timer);
	}, [enableDescription]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedEnablePrice(enablePrice);
		}, 600);
		return () => clearTimeout(timer);
	}, [enablePrice]);


	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	useEffect(() => {
		if (isBottomSheetOpen) {
			document.body.classList.add('bottom-sheet-open');
		} else {
			document.body.classList.remove('bottom-sheet-open');
		}
		return () => {
			document.body.classList.remove('bottom-sheet-open');
		};
	}, [isBottomSheetOpen]);

	// Efecto para generar las imágenes de los códigos de barras
	useEffect(() => {
		const generateBarcodeImages = async () => {
			setIsGenerating(true);
			const images: { [key: string]: string } = {};

			try {
				for (const barcode of barcodes) {
					if (!images[barcode.code]) {
						if (barcodeFormat === 'QR' || barcodeFormat === 'DATAMATRIX') {
							const bcid = barcodeFormat === 'QR' ? 'qrcode' : 'datamatrix';
							const canvasTmp = document.createElement('canvas');
							await new Promise<void>((resolve, reject) => {
								try {
									bwipjs.toCanvas(canvasTmp, {
										bcid: bcid,
										text: barcode.code,
										scale: 4,
										includetext: false,
									});
									const pngData = canvasTmp.toDataURL('image/png', 1.0);
									images[barcode.code] = pngData.split(',')[1];
									resolve();
								} catch (err) {
									console.error('Error generando 2D con bwip-js:', err);
									reject(err);
								}
							});
						} else {
							const canvas = document.createElement('canvas');
							const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

							JsBarcode(svg, barcode.code, {
								format: barcodeFormat === 'UPC' ? 'UPC' : barcodeFormat,
								width: barcodeSettings.width,
								height: barcodeSettings.height,
								displayValue: barcodeSettings.showNumber,
								fontSize: barcodeSettings.fontSize,
								margin: 0,
								textMargin: barcodeSettings.textMargin,
								background: '#ffffff',
								lineColor: '#000000',
								valid: () => true
							});

							if (barcodeFormat === 'EAN13') {
								try {
									const textElements = svg.querySelectorAll('text');
									if (textElements && textElements.length > 0) {
										const firstText = textElements[0];
										const currentX = parseFloat(firstText.getAttribute('x') || '0');
										const shift = barcodeSettings.width * 4;
										firstText.setAttribute('x', (currentX + shift).toString());
									}
								} catch (e) {
									console.warn('Error al ajustar el primer dígito EAN-13:', e);
								}
							}

							document.body.appendChild(svg);
							const svgData = new XMLSerializer().serializeToString(svg);
							const img = document.createElement('img');
							img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

							await new Promise((resolve) => {
								img.onload = async () => {
									canvas.width = img.width * 2;
									canvas.height = img.height * 2;
									const ctx = canvas.getContext('2d');
									ctx!.imageSmoothingEnabled = true;
									ctx!.imageSmoothingQuality = 'high';
									ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

									const pngData = canvas.toDataURL('image/png', 1.0);
									images[barcode.code] = pngData.split(',')[1];

									document.body.removeChild(svg);
									resolve(null);
								};
							});
						}
					}
				}

				setBarcodeImages(images);
			} catch (error) {
				console.error('Error generando códigos de barras:', error);
				setPreviewError('Error al generar los códigos de barras');
			} finally {
				setIsGenerating(false);
			}
		};

		if (barcodes.length > 0) {
			generateBarcodeImages();
		}
	}, [barcodes, barcodeSettings, barcodeFormat]);

	// Efecto para generar la vista previa del código de barras
	useEffect(() => {
		const generatePreview = async () => {
			try {
				const exampleCode = getSampleCodeForFormat(barcodeFormat);

				if (barcodeFormat === 'QR' || barcodeFormat === 'DATAMATRIX') {
					const bcid = barcodeFormat === 'QR' ? 'qrcode' : 'datamatrix';
					const canvasTmp = document.createElement('canvas');
					await new Promise<void>((resolve, reject) => {
						try {
							bwipjs.toCanvas(canvasTmp, {
								bcid: bcid,
								text: exampleCode,
								scale: 4,
								includetext: false,
							});
							const pngData = canvasTmp.toDataURL('image/png');
							setPreviewImage(pngData);
							setPreviewError('');
							resolve();
						} catch (err) {
							console.error('Error generando vista previa 2D con bwip-js:', err);
							reject(err);
						}
					});
				} else {
					const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

					JsBarcode(svg, exampleCode, {
						format: barcodeFormat === 'UPC' ? 'UPC' : barcodeFormat,
						width: barcodeSettings.width,
						height: barcodeSettings.height,
						displayValue: barcodeSettings.showNumber,
						fontSize: barcodeSettings.fontSize,
						margin: 0,
						textMargin: barcodeSettings.textMargin
					});

					if (barcodeFormat === 'EAN13') {
						try {
							const textElements = svg.querySelectorAll('text');
							if (textElements && textElements.length > 0) {
								const firstText = textElements[0];
								const currentX = parseFloat(firstText.getAttribute('x') || '0');
								const shift = barcodeSettings.width * 4;
								firstText.setAttribute('x', (currentX + shift).toString());
							}
						} catch (e) {
							console.warn('Error al ajustar el primer dígito EAN-13 en vista previa:', e);
						}
					}

					const svgData = new XMLSerializer().serializeToString(svg);
					const img = document.createElement('img');
					img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

					img.onload = () => {
						const canvas = document.createElement('canvas');
						canvas.width = img.width;
						canvas.height = img.height;
						const ctx = canvas.getContext('2d');
						ctx?.drawImage(img, 0, 0);

						const pngData = canvas.toDataURL('image/png');
						setPreviewImage(pngData);
						setPreviewError('');
					};
				}
			} catch (error) {
				setPreviewError('Error al generar la vista previa');
				setPreviewImage('');
			}
		};

		generatePreview();
	}, [barcodeSettings, barcodeFormat]);

	const handleSettingsChange = <K extends keyof BarcodeSettings>(setting: K, value: BarcodeSettings[K]) => {
		setBarcodeSettings(prev => ({
			...prev,
			[setting]: value
		}));
	};

	const handleResetSettings = () => {
		setBarcodeSettings({
			width: 3,
			height: 110,
			fontSize: 24,
			marginHorizontal: 0,
			marginVertical: 0,
			showNumber: true,
			generalSpacing: 1,
			containerHeight: 60,
			textMargin: 2,
			descAlign: 'center',
			descFontSize: 6
		});
	};

	const handleDownload = async () => {
		try {
			setIsGenerating(true);

			// Debug: ver qué datos están llegando
			const barcodesWithImages = barcodes.map(barcode => ({
				...barcode,
				imageBase64: barcodeImages[barcode.code] || ''
			}));
			console.log('Datos para PDF:', barcodesWithImages);

			const blob = await pdf(
				<MyDocument
					barcodes={barcodesWithImages}
					settings={barcodeSettings}
					enableDescription={enableDescription}
					enablePrice={enablePrice}
					customCurrency={customCurrency}
					barcodeFormat={barcodeFormat}
				/>
			).toBlob();

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `codigos_barras_${new Date().toISOString().split('T')[0]}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error al generar el PDF:', error);
			setPreviewError('Error al generar el PDF');
		} finally {
			setIsGenerating(false);
		}
	};

	const getPercent = (value: number, min: number, max: number) => {
		return ((value - min) / (max - min)) * 100;
	};

	return (
		<div className={styles.container}>
			{/* Overlay oscuro semi-translúcido para el Bottom Sheet en móviles */}
			<div
				className={`${styles.bottomSheetOverlay} ${isBottomSheetOpen ? styles.bottomSheetOverlayVisible : ''}`}
				onClick={() => setIsBottomSheetOpen(false)}
			/>

			{!isBottomSheetOpen && (
				<button
					type="button"
					className={styles.floatingSettingsBtn}
					id="floating-settings-btn"
					onClick={() => setIsBottomSheetOpen(prev => !prev)}
					aria-label="Ajustes de código de barras"
				>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="4" y1="21" x2="4" y2="14" />
						<line x1="4" y1="10" x2="4" y2="3" />
						<line x1="12" y1="21" x2="12" y2="12" />
						<line x1="12" y1="8" x2="12" y2="3" />
						<line x1="20" y1="21" x2="20" y2="16" />
						<line x1="20" y1="12" x2="20" y2="3" />
						<line x1="1" y1="14" x2="7" y2="14" />
						<line x1="9" y1="8" x2="15" y2="8" />
						<line x1="17" y1="16" x2="23" y2="16" />
					</svg>
				</button>
			)}

			<div className={`${styles.settingsContainer} ${isBottomSheetOpen ? styles.settingsContainerOpen : ''}`} id="pdf-settings-panel">
				{/* Tirador táctil y botón de cerrar para móviles */}
				<div className={styles.bottomSheetDragHandle} />
				<button
					type="button"
					className={styles.closeBottomSheetBtn}
					onClick={() => setIsBottomSheetOpen(false)}
					aria-label="Cerrar ajustes"
				>
					×
				</button>

				<h1>Ajustes del codigo de barra</h1>

				<div className={styles.buttonGroup} style={{ marginTop: 0, marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', width: '100%' }}>
					<button
						onClick={handleDownload}
						className={styles.previewButton}
						disabled={barcodes.length === 0 || isGenerating}
						style={{ flex: 1, padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600 }}
					>
						{isGenerating ? 'Generando...' : 'Descargar PDF'}
					</button>
					<button
						onClick={handleResetSettings}
						className={styles.resetButton}
					>
						Restablecer
					</button>
				</div>

				{/* Plantillas / Presets de Impresión */}
				<div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--background-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
					<div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<line x1="3" y1="9" x2="21" y2="9" />
							<line x1="9" y1="21" x2="9" y2="9" />
						</svg>
						<span>Plantillas Rápidas ({barcodeFormat})</span>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
						{barcodeFormat === 'CODE128' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('CODE128_SHIPPING_4X6')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE128_SHIPPING_4X6' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE128_SHIPPING_4X6' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE128_SHIPPING_4X6' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📦 Envío E-commerce (4x6" / 100x150mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Térmica</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('CODE128_WAREHOUSE_4X3')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE128_WAREHOUSE_4X3' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE128_WAREHOUSE_4X3' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE128_WAREHOUSE_4X3' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🏷️ Rotulado Almacén (100x75mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Térmica / Hoja</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('CODE128_A4_8PERPAGE')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE128_A4_8PERPAGE' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE128_A4_8PERPAGE' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE128_A4_8PERPAGE' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📄 Hoja A4 Logística (8 por hoja)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>A4 Adhesivo</span>
								</button>
							</>
						)}

						{barcodeFormat === 'CODE39' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('CODE39_INVENTORY_70X36')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE39_INVENTORY_70X36' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE39_INVENTORY_70X36' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE39_INVENTORY_70X36' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🏭 Placa Inventario (70x36mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Activos Fijos</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('CODE39_A4_21')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE39_A4_21' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE39_A4_21' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE39_A4_21' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📄 Avery 21 por Hoja A4</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>A4 Standard</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('CODE39_COMPONENT_50X25')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODE39_COMPONENT_50X25' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODE39_COMPONENT_50X25' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODE39_COMPONENT_50X25' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📦 Rotulado Componente (50x25mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Compacto</span>
								</button>
							</>
						)}

						{barcodeFormat === 'ITF' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('ITF_CARTON_150X50')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'ITF_CARTON_150X50' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'ITF_CARTON_150X50' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'ITF_CARTON_150X50' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📦 Faja Caja Máster (150x50mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Cartón Cajas</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('ITF_BOX_100X50')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'ITF_BOX_100X50' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'ITF_BOX_100X50' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'ITF_BOX_100X50' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🏷️ Etiqueta Embalaje (100x50mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Distribución</span>
								</button>
							</>
						)}

						{barcodeFormat === 'CODABAR' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('CODABAR_LIBRARY_70X30')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODABAR_LIBRARY_70X30' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODABAR_LIBRARY_70X30' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODABAR_LIBRARY_70X30' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📚 Ficha Biblioteca (70x30mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Libros / Archivo</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('CODABAR_BLOOD_50X20')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'CODABAR_BLOOD_50X20' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'CODABAR_BLOOD_50X20' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'CODABAR_BLOOD_50X20' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🩸 Tubo de Ensayo (50x20mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Laboratorio</span>
								</button>
							</>
						)}

						{barcodeFormat === 'QR' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('QR_STICKER_50X50')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'QR_STICKER_50X50' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'QR_STICKER_50X50' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'QR_STICKER_50X50' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📱 Sticker Mediano (50x50mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Mesas / Redes</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('QR_PRODUCT_35X35')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'QR_PRODUCT_35X35' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'QR_PRODUCT_35X35' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'QR_PRODUCT_35X35' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🏷️ Sticker Producto (35x35mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>35 por Hoja</span>
								</button>
							</>
						)}

						{barcodeFormat === 'DATAMATRIX' && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('DATAMATRIX_PART_40X40')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'DATAMATRIX_PART_40X40' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'DATAMATRIX_PART_40X40' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'DATAMATRIX_PART_40X40' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>⚙️ Marcado Componente (40x40mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>Industrial</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('DATAMATRIX_PHARMA_25X25')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'DATAMATRIX_PHARMA_25X25' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'DATAMATRIX_PHARMA_25X25' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'DATAMATRIX_PHARMA_25X25' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>💊 Micro-Etiqueta Farma (25x25mm)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>70 por Hoja</span>
								</button>
							</>
						)}

						{(barcodeFormat === 'EAN13' || barcodeFormat === 'EAN8' || barcodeFormat === 'UPC') && (
							<>
								<button
									type="button"
									onClick={() => applyPreset('RETAIL_A4_30')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'RETAIL_A4_30' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'RETAIL_A4_30' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'RETAIL_A4_30' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>🏷️ Avery 30 por Hoja A4 (Góndola)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>A4 Standard</span>
								</button>
								<button
									type="button"
									onClick={() => applyPreset('RETAIL_A4_24')}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										padding: '8px 10px',
										borderRadius: '6px',
										border: '1px solid var(--border-color, #e2e8f0)',
										backgroundColor: activePreset === 'RETAIL_A4_24' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
										color: activePreset === 'RETAIL_A4_24' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
										fontSize: '12px',
										fontWeight: activePreset === 'RETAIL_A4_24' ? 600 : 500,
										cursor: 'pointer',
										textAlign: 'left'
									}}
								>
									<span>📄 Avery 24 por Hoja A4 (Detallado)</span>
									<span style={{ fontSize: '10px', opacity: 0.7 }}>A4 Grande</span>
								</button>
								{barcodeFormat === 'EAN8' && (
									<button
										type="button"
										onClick={() => applyPreset('RETAIL_MICRO_65')}
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											padding: '8px 10px',
											borderRadius: '6px',
											border: '1px solid var(--border-color, #e2e8f0)',
											backgroundColor: activePreset === 'RETAIL_MICRO_65' ? 'rgba(79, 70, 229, 0.12)' : 'var(--card-bg, #ffffff)',
											color: activePreset === 'RETAIL_MICRO_65' ? 'var(--primary-color, #4f46e5)' : 'var(--text-color, #1e293b)',
											fontSize: '12px',
											fontWeight: activePreset === 'RETAIL_MICRO_65' ? 600 : 500,
											cursor: 'pointer',
											textAlign: 'left'
										}}
									>
										<span>🔬 Avery 65 por Hoja A4 (Micro)</span>
										<span style={{ fontSize: '10px', opacity: 0.7 }}>A4 Pequeño</span>
									</button>
								)}
							</>
						)}
					</div>
				</div>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="fontSize">Tamaño de los números:</label>
						<span>{barcodeSettings.fontSize}</span>
					</div>
					<input
						type="range"
						id="fontSize"
						min="8"
						max="24"
						step="1"
						value={barcodeSettings.fontSize}
						onChange={(e) => handleSettingsChange('fontSize', parseInt(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.fontSize, 8, 24)}%` } as React.CSSProperties}
					/>
				</div>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="width">Ancho del código:</label>
						<span>{barcodeSettings.width} (~{(barcodeSettings.width * 28.5 * (2.54 / 72)).toFixed(1)} cm)</span>
					</div>
					<input
						type="range"
						id="width"
						min="1"
						max="5"
						step="0.1"
						value={barcodeSettings.width}
						onChange={(e) => handleSettingsChange('width', parseFloat(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.width, 1, 5)}%` } as React.CSSProperties}
					/>
				</div>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="height">Altura del código:</label>
						<span>{barcodeSettings.height} (~{(barcodeSettings.height * 0.3 * (2.54 / 72)).toFixed(1)} cm)</span>
					</div>
					<input
						type="range"
						id="height"
						min="15"
						max="300"
						step="1"
						value={barcodeSettings.height}
						onChange={(e) => handleSettingsChange('height', parseInt(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.height, 15, 300)}%` } as React.CSSProperties}
					/>
				</div>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="marginVertical">Espaciado vertical:</label>
						<span>{barcodeSettings.marginVertical} (~{(barcodeSettings.marginVertical * (2.54 / 72)).toFixed(1)} cm)</span>
					</div>
					<input
						type="range"
						id="marginVertical"
						min="0"
						max="40"
						step="1"
						value={barcodeSettings.marginVertical}
						onChange={(e) => handleSettingsChange('marginVertical', parseInt(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.marginVertical, 0, 40)}%` } as React.CSSProperties}
					/>
				</div>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="marginHorizontal">Espaciado horizontal:</label>
						<span>{barcodeSettings.marginHorizontal} (~{(barcodeSettings.marginHorizontal * (2.54 / 72)).toFixed(1)} cm)</span>
					</div>
					<input
						type="range"
						id="marginHorizontal"
						min="0"
						max="40"
						step="1"
						value={barcodeSettings.marginHorizontal}
						onChange={(e) => handleSettingsChange('marginHorizontal', parseInt(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.marginHorizontal, 0, 40)}%` } as React.CSSProperties}
					/>
				</div>

				<hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.25rem 0' }} />
				<h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-color)', fontWeight: 600 }}>Descripción del producto</h3>

				<div className={styles.settingGroup}>
					<div className={styles.sliderHeader}>
						<label htmlFor="descFontSize">Tamaño de letra:</label>
						<span>{barcodeSettings.descFontSize || 10}</span>
					</div>
					<input
						type="range"
						id="descFontSize"
						min="6"
						max="18"
						step="1"
						value={barcodeSettings.descFontSize || 10}
						onChange={(e) => handleSettingsChange('descFontSize', parseInt(e.target.value))}
						style={{ '--value-percent': `${getPercent(barcodeSettings.descFontSize || 10, 6, 18)}%` } as React.CSSProperties}
					/>
				</div>

				<div className={styles.settingGroup}>
					<label>Alineación del texto:</label>
					<div className={styles.alignmentControl} role="radiogroup" aria-label="Alineación del texto">
						<button
							type="button"
							className={`${styles.alignBtn} ${barcodeSettings.descAlign === 'left' ? styles.alignBtnActive : ''}`}
							onClick={() => handleSettingsChange('descAlign', 'left')}
							aria-label="Alinear a la izquierda"
							title="Izquierda"
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="17" y1="10" x2="3" y2="10" />
								<line x1="21" y1="6" x2="3" y2="6" />
								<line x1="21" y1="14" x2="3" y2="14" />
								<line x1="17" y1="18" x2="3" y2="18" />
							</svg>
						</button>
						<button
							type="button"
							className={`${styles.alignBtn} ${(barcodeSettings.descAlign || 'center') === 'center' ? styles.alignBtnActive : ''}`}
							onClick={() => handleSettingsChange('descAlign', 'center')}
							aria-label="Centrar texto"
							title="Centrado"
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="10" x2="6" y2="10" />
								<line x1="21" y1="6" x2="3" y2="6" />
								<line x1="21" y1="14" x2="3" y2="14" />
								<line x1="18" y1="18" x2="6" y2="18" />
							</svg>
						</button>
						<button
							type="button"
							className={`${styles.alignBtn} ${barcodeSettings.descAlign === 'right' ? styles.alignBtnActive : ''}`}
							onClick={() => handleSettingsChange('descAlign', 'right')}
							aria-label="Alinear a la derecha"
							title="Derecha"
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="21" y1="10" x2="7" y2="10" />
								<line x1="21" y1="6" x2="3" y2="6" />
								<line x1="21" y1="14" x2="3" y2="14" />
								<line x1="21" y1="18" x2="7" y2="18" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Vista previa del PDF en tiempo real (Portal) */}
			{mounted && showPDFPreview && debouncedBarcodes.length > 0 && Object.keys(barcodeImages).length > 0 ? (
				createPortal(
					<div className={styles.pdfPreviewSection}>

						<div className={styles.pdfViewerContainer} style={{ height: '100%' }}>
							<BlobProvider
								key={`${debouncedBarcodes.map(b => `${b.code}-${b.quantity}-${b.description || ''}-${b.price || 0}-${b.hasDescription}-${b.hasPrice}`).join('_')}_${JSON.stringify(debouncedBarcodeSettings)}`}
								document={
									<MyDocument
										barcodes={debouncedBarcodes.map(barcode => ({
											...barcode,
											imageBase64: barcodeImages[barcode.code] || ''
										}))}
										settings={debouncedBarcodeSettings}
										enableDescription={debouncedEnableDescription}
										enablePrice={debouncedEnablePrice}
										customCurrency={customCurrency}
										barcodeFormat={barcodeFormat}
									/>
								}
							>
								{({ blob, loading, error }) => {
									if (loading) {
										return (
											<div style={{
												display: 'flex',
												flexDirection: 'column',
												alignItems: 'center',
												justifyContent: 'center',
												height: '100%',
												minHeight: '400px',
												color: '#64748b',
												gap: '12px'
											}}>
												<div style={{
													width: '32px',
													height: '32px',
													border: '3px solid var(--border-color)',
													borderTopColor: 'var(--primary-color)',
													borderRadius: '50%',
													animation: 'spin 1s linear infinite'
												}} />
												<span>Generando PDF...</span>
												<style>{`
													@keyframes spin {
														0% { transform: rotate(0deg); }
														100% { transform: rotate(360deg); }
													}
												`}</style>
											</div>
										);
									}
									if (error) {
										return <div style={{ padding: '20px', color: '#ef4444' }}>Error: {error.message}</div>;
									}
									if (!blob) return null;
									return <PDFCanvasViewer blob={blob} />;
								}}
							</BlobProvider>
						</div>
						<p className={styles.previewNote}>
							Vista previa en tiempo real del documento PDF. Los cambios en la configuración se reflejan automáticamente.
						</p>
					</div>,
					document.getElementById('pdf-preview-portal-container') || document.body
				)
			) : null}
		</div>
	);
}