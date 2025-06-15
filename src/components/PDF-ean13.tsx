import React, { useState, useEffect } from 'react';
import { Page, Text, View, Document, pdf, PDFViewer, Image, Styles } from '@react-pdf/renderer';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import styles from '../styles/PDF-ean13.module.css';

// Interfaz que define la estructura de un elemento de código de barras
interface BarcodeItem {
	code: string;        // El código EAN-13
	quantity: number;    // Cantidad de repeticiones
	isValid: boolean;    // Estado de validez del código
	isDuplicate?: boolean; // Indica si el código está duplicado
}

// Interfaz para la configuración del código de barras
interface BarcodeSettings {
	width: number;      // Ancho de las líneas del código
	height: number;     // Altura del código de barras
	fontSize: number;   // Tamaño de la fuente del número
}

// Props del componente
interface Props {
	barcodes: BarcodeItem[] // Array de códigos de barras a imprimir
}

// Función para formatear fechas en formato español
const formatDate = (timestamp: any) => {
	if (!timestamp) return '-';
	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
		width: 55,
		height: 25,
		marginRight: 2,
		marginBottom: 5
	},
	barcodeImage: {
		width: '100%',
		height: '100%'
	}
} as const;

// Componente que define la estructura del documento PDF
const MyDocument: React.FC<Props & { settings: BarcodeSettings }> = ({ barcodes, settings }) => (
	<Document>
		<Page size="A4" style={pdfStyles.page}>
			<View style={pdfStyles.container}>
				{/* <Text style={pdfStyles.title}>
					Códigos de Barras EAN-13
				</Text> */}
				<View style={{
					...pdfStyles.barcodeGroup,
					gap: 2
				}}>
					{barcodes.map((barcode: BarcodeItem) => (
						Array.from({ length: barcode.quantity }).map((_, index) => (
							<View 
								key={`${barcode.code}-${index}`} 
								style={{
									...pdfStyles.barcodeItem,
									width: settings.width * 20,
									height: settings.height * 0.5,
								}}
							>
								<Image
									source={`data:image/png;base64,${barcode.code}`}
									style={pdfStyles.barcodeImage}
								/>
							</View>
						))
					))}
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
export const PdfImprimir: React.FC<Props> = ({ barcodes }) => {
	const [showPreview, setShowPreview] = useState(false);
	const [barcodeImages, setBarcodeImages] = useState<{ [key: string]: string }>({});
	const [barcodeSettings, setBarcodeSettings] = useState<BarcodeSettings>({
		width: 3,
		height: 50,
		fontSize: 14
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
							displayValue: true,
							fontSize: barcodeSettings.fontSize,
							margin: 0,
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
					displayValue: true,
					fontSize: barcodeSettings.fontSize,
					margin: 0
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

	const handleSettingsChange = (setting: keyof BarcodeSettings, value: number) => {
		setBarcodeSettings(prev => ({
			...prev,
			[setting]: value
		}));
	};

	const handleDownload = async () => {
		try {
			setIsGenerating(true);
			const blob = await pdf(
				<MyDocument 
					barcodes={barcodes.map(barcode => ({
						...barcode,
						code: barcodeImages[barcode.code] || ''
					}))} 
					settings={barcodeSettings}
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
					<label htmlFor="height">Altura:</label>
					<input
						type="range"
						id="height"
						min="50"
						max="200"
						step="10"
						value={barcodeSettings.height}
						onChange={(e) => handleSettingsChange('height', parseInt(e.target.value))}
					/>
					<span>{barcodeSettings.height}</span>
				</div>
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
			</div>

			<div className={styles.previewSection}>
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
			</div>

			<div className={styles.buttonGroup}>
				<button
					onClick={handleDownload}
					className={styles.downloadButton}
					disabled={barcodes.length === 0 || isGenerating}
				>
					{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}
				</button>
			</div>
		</div>
	);
}