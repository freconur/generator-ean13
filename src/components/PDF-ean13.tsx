import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Page, Text, View, Document, pdf, PDFViewer, Image, Styles, BlobProvider } from '@react-pdf/renderer';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import styles from '../styles/PDF-ean13.module.css';
import { formatPrice, formatPriceSymbolOnly } from '../utils/formatPrice';

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
const MyDocument: React.FC<{ barcodes: BarcodeItemWithImage[], settings: BarcodeSettings, enableDescription?: boolean, enablePrice?: boolean, customCurrency?: string }> = ({ barcodes, settings, customCurrency }) => {
	// Clasificar los códigos en simples (sin datos a imprimir) y ricos (con descripción o precio a imprimir)
	const simpleBarcodes = barcodes.filter(item => !item.hasDescription && !item.hasPrice);
	const richBarcodes = barcodes.filter(item => item.hasDescription || item.hasPrice);

	// Función helper para renderizar un item de código de barras
	const renderBarcodeItem = (barcode: BarcodeItemWithImage, isRichList: boolean = false) => {
		const hasDescription = barcode.hasDescription && barcode.description;
		const hasPrice = barcode.hasPrice && barcode.price !== undefined && (barcode.price !== null && !isNaN(barcode.price));

		const adjustedMarginVertical = settings.marginVertical;
		const adjustedMarginHorizontal = settings.marginHorizontal;
		const adjustedWidth = settings.width * 30;

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
						height: settings.height * 0.3,
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
	setBarcodeSettings
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

	// Efecto para generar las imágenes de los códigos de barras
	useEffect(() => {
		const generateBarcodeImages = async () => {
			setIsGenerating(true);
			const images: { [key: string]: string } = {};

			try {
				for (const barcode of barcodes) {
					if (!images[barcode.code]) {
						const canvas = document.createElement('canvas');
						const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

						JsBarcode(svg, barcode.code, {
							format: 'EAN13',
							width: barcodeSettings.width,
							height: barcodeSettings.height,
							displayValue: barcodeSettings.showNumber, // Usar el nuevo estado
							fontSize: barcodeSettings.fontSize,
							margin: 0,
							textMargin: barcodeSettings.textMargin, // Margen entre código y número
							background: '#ffffff',
							lineColor: '#000000',
							valid: () => true
						});

						// Ajustar el espacio del primer dígito para acercarlo a las barras
						try {
							const textElements = svg.querySelectorAll('text');
							if (textElements && textElements.length > 0) {
								const firstText = textElements[0];
								const currentX = parseFloat(firstText.getAttribute('x') || '0');
								// Desplazamiento proporcional al ancho de línea (width)
								const shift = barcodeSettings.width * 4;
								firstText.setAttribute('x', (currentX + shift).toString());
							}
						} catch (e) {
							console.warn('Error al ajustar el primer dígito EAN-13:', e);
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
	}, [barcodes, barcodeSettings]);

	// Efecto para generar la vista previa del código de barras
	useEffect(() => {
		const generatePreview = () => {
			try {
				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				const exampleCode = '4006381333931';

				if (!isValidEAN13(exampleCode)) {
					throw new Error('Código EAN-13 inválido');
				}

				JsBarcode(svg, exampleCode, {
					format: 'EAN13',
					width: barcodeSettings.width,
					height: barcodeSettings.height,
					displayValue: barcodeSettings.showNumber, // Usar el nuevo estado
					fontSize: barcodeSettings.fontSize,
					margin: 0,
					textMargin: barcodeSettings.textMargin // Margen entre código y número
				});

				// Ajustar el espacio del primer dígito para acercarlo a las barras en la vista previa del componente
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
			} catch (error) {
				setPreviewError('Error al generar la vista previa');
				setPreviewImage('');
			}
		};

		generatePreview();
	}, [barcodeSettings]);

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
			descFontSize: 10
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

			{/* Botón flotante de ajustes visible solo en móviles */}
			<button
				type="button"
				className={styles.floatingSettingsBtn}
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

			<div className={`${styles.settingsContainer} ${isBottomSheetOpen ? styles.settingsContainerOpen : ''}`}>
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