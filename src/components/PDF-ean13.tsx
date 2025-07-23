import React, { useState, useEffect } from 'react';
import { Page, Text, View, Document, pdf, PDFViewer, Image, Styles } from '@react-pdf/renderer';
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
interface BarcodeSettings {
	width: number;      // Ancho de las líneas del código
	height: number;     // Altura del código de barras
	fontSize: number;   // Tamaño de la fuente del número
	marginHorizontal: number; // Margen horizontal entre códigos (permite decimales)
	marginVertical: number;   // Margen vertical entre códigos (permite decimales)
	showNumber: boolean;  // Mostrar o ocultar el número del código de barras
	generalSpacing: number; // Espaciado general que afecta ambos márgenes
	containerHeight: number; // Altura mínima del contenedor (independiente del código de barras)
	textMargin: number; // Margen entre el código de barras y el número
}

// Props del componente
interface Props {
	barcodes: BarcodeItem[] // Array de códigos de barras a imprimir
	enableDescription?: boolean; // Flag para mostrar descripción
	enablePrice?: boolean; // Flag para mostrar precio
	showPDFPreview?: boolean; // Estado de la vista previa controlado externamente
	onTogglePDFPreview?: (show: boolean) => void; // Función para controlar la vista previa
	customCurrency?: string; // Moneda personalizada opcional
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
const MyDocument: React.FC<{ barcodes: BarcodeItemWithImage[], settings: BarcodeSettings, enableDescription?: boolean, enablePrice?: boolean, customCurrency?: string }> = ({ barcodes, settings, enableDescription = false, enablePrice = false, customCurrency }) => (
	<Document>
		<Page size="A4" style={pdfStyles.page}>
			<View style={pdfStyles.container}>
				{/* <Text style={pdfStyles.title}>
					Códigos de Barras EAN-13
				</Text> */}
				<View style={{
					...pdfStyles.barcodeGroup,
					gap: 0 // Sin gap, cada elemento maneja su propio espaciado
				}}>
					{barcodes.map((barcode: BarcodeItemWithImage) => {
						// Calcular altura dinámica basada en lo que se mostrará para este item específico
						const hasDescription = barcode.hasDescription && barcode.description;
						const hasPrice = barcode.hasPrice && barcode.price !== undefined && (barcode.price !== null && !isNaN(barcode.price));
						
						// Altura base del contenedor independiente de la altura del código de barras
						// La altura del código se maneja por separado en pdfStyles.barcodeImage
						let minHeight = settings.containerHeight; // Usar la altura configurada para el contenedor
						
						// Agregar altura para descripción si está habilitada y tiene contenido
						if (hasDescription) {
							minHeight += 25; // Espacio para descripción
						}
						
						// Agregar altura para precio si está habilitado y tiene contenido
						if (hasPrice) {
							minHeight += 20; // Espacio para precio
						}
						
						// Usar los valores configurados por el usuario multiplicados por el espaciado general
						// Si generalSpacing es 0, usar los valores originales divididos por 2 para evitar espacios nulos
						const spacingMultiplier = settings.generalSpacing === 0 ? 0.1 : settings.generalSpacing;
						const adjustedMarginVertical = settings.marginVertical * spacingMultiplier;
						const adjustedMarginHorizontal = settings.marginHorizontal * spacingMultiplier;
						
						// Ajustar ancho para códigos más compactos cuando no hay descripción ni precio
						const adjustedWidth = (!hasDescription && !hasPrice) 
							? settings.width * 20 // Muy estrecho para máxima compactación
							: settings.width * 30;

						return Array.from({ length: barcode.quantity }).map((_, index) => (
							<View 
								key={`${barcode.code}-${index}`} 
								style={{
									...pdfStyles.barcodeItem,
									width: adjustedWidth,
									minHeight: minHeight,
									marginBottom: adjustedMarginVertical,
									marginRight: adjustedMarginHorizontal,
								}}
							>
								{/* Descripción arriba del código de barras - solo si está habilitada y tiene contenido */}
								{hasDescription && (
									<Text style={pdfStyles.description}>
										{barcode.description}
									</Text>
								)}
								
								{/* Código de barras */}
								<Image
									source={`data:image/png;base64,${barcode.imageBase64}`}
									style={{
										...pdfStyles.barcodeImage,
										height: settings.height // Usar la altura configurada por el usuario
									}}
								/>
								
								{/* Precio abajo del código de barras - solo si está habilitado y tiene contenido */}
								{hasPrice && barcode.price !== undefined && (
									<Text style={pdfStyles.price}>
										{formatPriceSymbolOnly(barcode.price, customCurrency)}
									</Text>
								)}
							</View>
						))
					})}
				</View>
			</View>
		</Page>
	</Document>
);

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
	customCurrency
}) => {
	const [showPreview, setShowPreview] = useState(false);
	const [internalShowPDFPreview, setInternalShowPDFPreview] = useState(false);
	
	// Usar la prop externa si está disponible, sino usar el estado interno
	const showPDFPreview = onTogglePDFPreview ? externalShowPDFPreview : internalShowPDFPreview;
	const setShowPDFPreview = onTogglePDFPreview || setInternalShowPDFPreview;
	const [barcodeImages, setBarcodeImages] = useState<{ [key: string]: string }>({});
	const [barcodeSettings, setBarcodeSettings] = useState<BarcodeSettings>({
		width: 3,
		height: 50,
		fontSize: 14,
		marginHorizontal: 0.5,
		marginVertical: 1,
		showNumber: true,
		generalSpacing: 1, // Nuevo estado para el espaciado general
		containerHeight: 60, // Nueva propiedad para la altura del contenedor
		textMargin: 2 // Margen entre el código de barras y el número
	});
	const [previewImage, setPreviewImage] = useState<string>('');
	const [previewError, setPreviewError] = useState<string>('');
	const [isGenerating, setIsGenerating] = useState(false);

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

	const handleSettingsChange = (setting: keyof BarcodeSettings, value: number | boolean) => {
		setBarcodeSettings(prev => ({
			...prev,
			[setting]: value
		}));
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

	return (
		<div className={styles.container}>
			<div className={styles.settingsContainer}>
				<h1>Ajustes del codigo de barra</h1>
				
				{/* Sección de ajustes básicos */}
				<div className={styles.settingGroup}>
					<label htmlFor="width">Ancho de línea:</label>
					<input
						type="range"
						id="width"
						min="1"
						max="5"
						step="0.5"
						value={barcodeSettings.width}
						onChange={(e) => handleSettingsChange('width', parseFloat(e.target.value))}
					/>
					<span>{barcodeSettings.width}</span>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="altura">Altura del código de barras:</label>
					<input
						type="range"
						id="altura"
						min="10"
						max="200"
						step="5"
						value={barcodeSettings.height}
						onChange={(e) => handleSettingsChange('height', parseInt(e.target.value))}
					/>
					<span>{barcodeSettings.height}</span>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="containerHeight">📏 Altura del contenedor:</label>
					<input
						type="range"
						id="containerHeight"
						min="30"
						max="150"
						step="5"
						value={barcodeSettings.containerHeight}
						onChange={(e) => handleSettingsChange('containerHeight', parseInt(e.target.value))}
					/>
					<span>{barcodeSettings.containerHeight}</span>
				</div>
				<p style={{ fontSize: '11px', color: '#666', margin: '5px 0 15px 0', fontStyle: 'italic' }}>
					💡 La altura del contenedor controla el espaciado vertical independientemente del código de barras.
				</p>
				<div className={styles.settingGroup}>
					<label htmlFor="fontSize">Tamaño de texto:</label>
					<input
						type="range"
						id="fontSize"
						min="8"
						max="24"
						step="1"
						value={barcodeSettings.fontSize}
						onChange={(e) => handleSettingsChange('fontSize', parseInt(e.target.value))}
					/>
					<span>{barcodeSettings.fontSize}</span>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="showNumber">Mostrar número del código:</label>
					<input
						type="checkbox"
						id="showNumber"
						checked={barcodeSettings.showNumber}
						onChange={(e) => handleSettingsChange('showNumber', e.target.checked)}
					/>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="textMargin">📏 Distancia entre código e imagen:</label>
					<input
						type="range"
						id="textMargin"
						min="0"
						max="10"
						step="0.5"
						value={barcodeSettings.textMargin}
						onChange={(e) => handleSettingsChange('textMargin', parseFloat(e.target.value))}
						disabled={!barcodeSettings.showNumber}
					/>
					<span>{barcodeSettings.textMargin}</span>
				</div>
				<p style={{ fontSize: '11px', color: '#666', margin: '5px 0 15px 0', fontStyle: 'italic' }}>
					💡 Controla qué tan cerca está el número del código de la imagen. Solo funciona cuando el número está visible.
				</p>

				{/* Sección de ajustes de espaciado */}
				<hr style={{ margin: '20px 0', border: '1px solid #ddd' }} />
				<h3 style={{ marginBottom: '10px', color: '#333' }}>⚙️ Control de Espaciado</h3>
				<p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
					El espaciado general actúa como multiplicador de las separaciones individuales. 
					Útil para ajustar todo el espaciado proporcionalmente.
				</p>
				<div className={styles.settingGroup}>
					<label htmlFor="generalSpacing">📏 Espaciado general (multiplicador):</label>
					<input
						type="range"
						id="generalSpacing"
						min="0"
						max="5"
						step="0.1"
						value={barcodeSettings.generalSpacing}
						onChange={(e) => handleSettingsChange('generalSpacing', parseFloat(e.target.value))}
					/>
					<span>{barcodeSettings.generalSpacing.toFixed(1)}</span>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="marginHorizontal">↔️ Separación horizontal entre códigos:</label>
					<input
						type="range"
						id="marginHorizontal"
						min="0"
						max="5"
						step="0.1"
						value={barcodeSettings.marginHorizontal}
						onChange={(e) => handleSettingsChange('marginHorizontal', parseFloat(e.target.value))}
					/>
					<span>{barcodeSettings.marginHorizontal.toFixed(1)} 
						→ <strong>{(barcodeSettings.marginHorizontal * (barcodeSettings.generalSpacing === 0 ? 0.1 : barcodeSettings.generalSpacing)).toFixed(1)}</strong>
					</span>
				</div>
				<div className={styles.settingGroup}>
					<label htmlFor="marginVertical">↕️ Separación vertical entre filas:</label>
					<input
						type="range"
						id="marginVertical"
						min="0"
						max="5"
						step="0.1"
						value={barcodeSettings.marginVertical}
						onChange={(e) => handleSettingsChange('marginVertical', parseFloat(e.target.value))}
					/>
					<span>{barcodeSettings.marginVertical.toFixed(1)} 
						→ <strong>{(barcodeSettings.marginVertical * (barcodeSettings.generalSpacing === 0 ? 0.1 : barcodeSettings.generalSpacing)).toFixed(1)}</strong>
					</span>
				</div>
				<p style={{ fontSize: '11px', color: '#888', marginTop: '10px', fontStyle: 'italic' }}>
					💡 Los valores en <strong>negrita</strong> muestran el espaciado final aplicado en el PDF.
				</p>
			</div>

			{/* <div className={styles.previewSection}>
				<h3>Vista Previa</h3>
				<div className={styles.previewContainer}>
					{isGenerating ? (
						<div className={styles.previewLoading}>
							Generando vista previa...
						</div>
					) : previewError ? (
						<div className={styles.previewError}>
							{previewError}
						</div>
					) : previewImage ? (
						<img 
							src={previewImage} 
							alt="Vista previa del código de barras" 
							className={styles.previewImage}
						/>
					) : (
						<div className={styles.previewLoading}>
							Cargando vista previa...
						</div>
					)}
				</div>
				<p className={styles.previewNote}>
					Esta es una vista previa de cómo se verá el código de barras con los ajustes actuales.
				</p>
			</div> */}

			<div className={styles.buttonGroup}>
				<button
					onClick={() => setShowPDFPreview(!showPDFPreview)}
					className={styles.previewButton}
					disabled={barcodes.length === 0 || isGenerating}
				>
					{showPDFPreview ? 'Ocultar Vista Previa PDF' : 'Mostrar Vista Previa PDF'}
				</button>
				<button
					onClick={handleDownload}
					className={styles.downloadButton}
					disabled={barcodes.length === 0 || isGenerating}
				>
					{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}
				</button>
			</div>

			{/* Vista previa del PDF en tiempo real */}
			{showPDFPreview && barcodes.length > 0 && Object.keys(barcodeImages).length > 0 && (
				<div className={styles.pdfPreviewSection}>
					<h3>Vista Previa del PDF</h3>
					<div className={styles.pdfViewerContainer}>
						<PDFViewer 
							style={{ width: '100%', height: '600px' }}
							showToolbar={true}
						>
							<MyDocument 
								barcodes={barcodes.map(barcode => ({
									...barcode,
									imageBase64: barcodeImages[barcode.code] || ''
								}))} 
								settings={barcodeSettings}
								enableDescription={enableDescription}
								enablePrice={enablePrice}
								customCurrency={customCurrency}
							/>
						</PDFViewer>
					</div>
					<p className={styles.previewNote}>
						Vista previa en tiempo real del documento PDF. Los cambios en la configuración se reflejan automáticamente.
					</p>
				</div>
			)}
		</div>
	);
}