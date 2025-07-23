/**
 * Formatea precios según la localización del usuario detectando automáticamente
 * la región y moneda correspondiente.
 * 
 * @param price - El precio a formatear
 * @param customCurrency - Código de moneda personalizado opcional (ej: "USD", "EUR")
 * @returns String con el precio formateado con el símbolo de moneda apropiado
 */
export const formatPrice = (price: number, customCurrency?: string): string => {
	try {
		// Detectar la localización del navegador
		const userLocale = navigator.language || navigator.languages?.[0] || 'es-ES';
		
		// Usar moneda personalizada si se proporciona, sino detectar automáticamente
		let currency = customCurrency;
		
		if (!currency) {
			// Usar la nueva detección mejorada de región
			const regionCode = getRegionCode();
			
			// Mapeo de regiones a monedas más comunes
			const currencyMap: { [key: string]: string } = {
				// América del Norte
				'US': 'USD',    // Estados Unidos
				'CA': 'CAD',    // Canadá
				'MX': 'MXN',    // México
				
				// América Central y Caribe
				'GT': 'GTQ',    // Guatemala
				'HN': 'HNL',    // Honduras
				'SV': 'USD',    // El Salvador (usa USD)
				'NI': 'NIO',    // Nicaragua
				'CR': 'CRC',    // Costa Rica
				'PA': 'PAB',    // Panamá
				'CU': 'CUP',    // Cuba
				'DO': 'DOP',    // República Dominicana
				'PR': 'USD',    // Puerto Rico (usa USD)
				
				// América del Sur
				'AR': 'ARS',    // Argentina
				'BO': 'BOB',    // Bolivia
				'BR': 'BRL',    // Brasil
				'CL': 'CLP',    // Chile
				'CO': 'COP',    // Colombia
				'EC': 'USD',    // Ecuador (usa USD)
				'GY': 'GYD',    // Guyana
				'PY': 'PYG',    // Paraguay
				'PE': 'PEN',    // Perú
				'SR': 'SRD',    // Surinam
				'UY': 'UYU',    // Uruguay
				'VE': 'VES',    // Venezuela
				
				// Europa
				'ES': 'EUR',    // España
				'PT': 'EUR',    // Portugal
				'FR': 'EUR',    // Francia
				'DE': 'EUR',    // Alemania
				'IT': 'EUR',    // Italia
				'GB': 'GBP',    // Reino Unido
				'CH': 'CHF',    // Suiza
				'NO': 'NOK',    // Noruega
				'SE': 'SEK',    // Suecia
				'DK': 'DKK',    // Dinamarca
				'PL': 'PLN',    // Polonia
				'CZ': 'CZK',    // República Checa
				'HU': 'HUF',    // Hungría
				'RO': 'RON',    // Rumania
				'BG': 'BGN',    // Bulgaria
				'HR': 'EUR',    // Croacia
				'RS': 'RSD',    // Serbia
				'RU': 'RUB',    // Rusia
				'UA': 'UAH',    // Ucrania
				
				// Asia
				'JP': 'JPY',    // Japón
				'CN': 'CNY',    // China
				'KR': 'KRW',    // Corea del Sur
				'IN': 'INR',    // India
				'TH': 'THB',    // Tailandia
				'VN': 'VND',    // Vietnam
				'PH': 'PHP',    // Filipinas
				'ID': 'IDR',    // Indonesia
				'MY': 'MYR',    // Malasia
				'SG': 'SGD',    // Singapur
				'HK': 'HKD',    // Hong Kong
				'TW': 'TWD',    // Taiwán
				
				// Oceanía
				'AU': 'AUD',    // Australia
				'NZ': 'NZD',    // Nueva Zelanda
				
				// África
				'ZA': 'ZAR',    // Sudáfrica
				'EG': 'EGP',    // Egipto
				'NG': 'NGN',    // Nigeria
				'KE': 'KES',    // Kenia
				'MA': 'MAD',    // Marruecos
				'TN': 'TND',    // Túnez
				
				// Oriente Medio
				'AE': 'AED',    // Emiratos Árabes Unidos
				'SA': 'SAR',    // Arabia Saudí
				'IL': 'ILS',    // Israel
				'TR': 'TRY',    // Turquía
				'IR': 'IRR',    // Irán
			};
			
			// Obtener la moneda basada en la región, por defecto EUR
			currency = currencyMap[regionCode] || 'EUR';
		}
		
		// Formatear el precio con la moneda apropiada
		return new Intl.NumberFormat(userLocale, {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);
		
	} catch (error) {
		// Fallback en caso de error: formato español con EUR
		console.warn('Error formateando precio, usando formato por defecto:', error);
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: customCurrency || 'EUR',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);
	}
};

/**
 * Obtiene el símbolo de la moneda para la región actual del usuario
 * sin formatear un precio específico.
 * 
 * @param customCurrency - Código de moneda personalizado opcional
 * @returns String con el símbolo de moneda (ej: "$", "€", "£")
 */
export const getCurrencySymbol = (customCurrency?: string): string => {
	try {
		const samplePrice = formatPrice(1, customCurrency);
		// Extraer solo el símbolo eliminando números y espacios
		return samplePrice.replace(/[\d\s.,]/g, '').trim();
	} catch (error) {
		return '€'; // Fallback
	}
};

/**
 * Lista de monedas comunes para el selector
 */
export const commonCurrencies = [
	{ code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
	{ code: 'EUR', name: 'Euro', symbol: '€' },
	{ code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
	{ code: 'JPY', name: 'Yen Japonés', symbol: '¥' },
	{ code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$' },
	{ code: 'AUD', name: 'Dólar Australiano', symbol: 'A$' },
	{ code: 'CHF', name: 'Franco Suizo', symbol: 'CHF' },
	{ code: 'CNY', name: 'Yuan Chino', symbol: '¥' },
	{ code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
	{ code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
	{ code: 'ARS', name: 'Peso Argentino', symbol: '$' },
	{ code: 'COP', name: 'Peso Colombiano', symbol: '$' },
	{ code: 'CLP', name: 'Peso Chileno', symbol: '$' },
	{ code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
	{ code: 'UYU', name: 'Peso Uruguayo', symbol: '$U' },
	{ code: 'KRW', name: 'Won Surcoreano', symbol: '₩' },
	{ code: 'INR', name: 'Rupia India', symbol: '₹' },
	{ code: 'RUB', name: 'Rublo Ruso', symbol: '₽' },
	{ code: 'NOK', name: 'Corona Noruega', symbol: 'kr' },
	{ code: 'SEK', name: 'Corona Sueca', symbol: 'kr' },
	{ code: 'DKK', name: 'Corona Danesa', symbol: 'kr' },
	{ code: 'PLN', name: 'Zloty Polaco', symbol: 'zł' },
	{ code: 'CZK', name: 'Corona Checa', symbol: 'Kč' },
	{ code: 'HUF', name: 'Forint Húngaro', symbol: 'Ft' },
	{ code: 'TRY', name: 'Lira Turca', symbol: '₺' },
	{ code: 'ZAR', name: 'Rand Sudafricano', symbol: 'R' },
	{ code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$' },
	{ code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$' },
	{ code: 'NZD', name: 'Dólar Neozelandés', symbol: 'NZ$' },
	{ code: 'THB', name: 'Baht Tailandés', symbol: '฿' },
];

/**
 * Obtiene el código de moneda para la región actual del usuario
 * 
 * @returns String con el código de moneda (ej: "USD", "EUR", "GBP")
 */
export const getCurrencyCode = (): string => {
	try {
		const regionCode = getRegionCode();
		
		const currencyMap: { [key: string]: string } = {
			'US': 'USD', 'CA': 'CAD', 'MX': 'MXN', 'GT': 'GTQ', 'HN': 'HNL',
			'SV': 'USD', 'NI': 'NIO', 'CR': 'CRC', 'PA': 'PAB', 'CU': 'CUP',
			'DO': 'DOP', 'PR': 'USD', 'AR': 'ARS', 'BO': 'BOB', 'BR': 'BRL',
			'CL': 'CLP', 'CO': 'COP', 'EC': 'USD', 'GY': 'GYD', 'PY': 'PYG',
			'PE': 'PEN', 'SR': 'SRD', 'UY': 'UYU', 'VE': 'VES', 'ES': 'EUR',
			'PT': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'GB': 'GBP',
			'CH': 'CHF', 'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK', 'PL': 'PLN',
			'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN', 'HR': 'EUR',
			'RS': 'RSD', 'RU': 'RUB', 'UA': 'UAH', 'JP': 'JPY', 'CN': 'CNY',
			'KR': 'KRW', 'IN': 'INR', 'TH': 'THB', 'VN': 'VND', 'PH': 'PHP',
			'ID': 'IDR', 'MY': 'MYR', 'SG': 'SGD', 'HK': 'HKD', 'TW': 'TWD',
			'AU': 'AUD', 'NZ': 'NZD', 'ZA': 'ZAR', 'EG': 'EGP', 'NG': 'NGN',
			'KE': 'KES', 'MA': 'MAD', 'TN': 'TND', 'AE': 'AED', 'SA': 'SAR',
			'IL': 'ILS', 'TR': 'TRY', 'IR': 'IRR'
		};
		
		const currency = currencyMap[regionCode] || 'EUR';
		console.log(`💰 Moneda detectada: ${currency} para región ${regionCode}`);
		return currency;
	} catch (error) {
		console.warn('Error detectando código de moneda:', error);
		return 'EUR';
	}
}; 

/**
 * Formatea precios mostrando solo el símbolo de la moneda sin el código
 * Ideal para PDFs y espacios reducidos
 * 
 * @param price - El precio a formatear
 * @param customCurrency - Código de moneda personalizado opcional
 * @returns String con el precio formateado solo con símbolo (ej: "S/ 15.99" en lugar de "PEN 15.99")
 */
export const formatPriceSymbolOnly = (price: number, customCurrency?: string): string => {
	try {
		// Detectar la localización del navegador
		const userLocale = navigator.language || navigator.languages?.[0] || 'es-ES';
		
		// Usar moneda personalizada si se proporciona, sino detectar automáticamente
		let currency = customCurrency;
		
		if (!currency) {
			// Usar la nueva detección mejorada de región
			const regionCode = getRegionCode();
			
			const currencyMap: { [key: string]: string } = {
				'US': 'USD', 'CA': 'CAD', 'MX': 'MXN', 'GT': 'GTQ', 'HN': 'HNL',
				'SV': 'USD', 'NI': 'NIO', 'CR': 'CRC', 'PA': 'PAB', 'CU': 'CUP',
				'DO': 'DOP', 'PR': 'USD', 'AR': 'ARS', 'BO': 'BOB', 'BR': 'BRL',
				'CL': 'CLP', 'CO': 'COP', 'EC': 'USD', 'GY': 'GYD', 'PY': 'PYG',
				'PE': 'PEN', 'SR': 'SRD', 'UY': 'UYU', 'VE': 'VES', 'ES': 'EUR',
				'PT': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'GB': 'GBP',
				'CH': 'CHF', 'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK', 'PL': 'PLN',
				'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN', 'HR': 'EUR',
				'RS': 'RSD', 'RU': 'RUB', 'UA': 'UAH', 'JP': 'JPY', 'CN': 'CNY',
				'KR': 'KRW', 'IN': 'INR', 'TH': 'THB', 'VN': 'VND', 'PH': 'PHP',
				'ID': 'IDR', 'MY': 'MYR', 'SG': 'SGD', 'HK': 'HKD', 'TW': 'TWD',
				'AU': 'AUD', 'NZ': 'NZD', 'ZA': 'ZAR', 'EG': 'EGP', 'NG': 'NGN',
				'KE': 'KES', 'MA': 'MAD', 'TN': 'TND', 'AE': 'AED', 'SA': 'SAR',
				'IL': 'ILS', 'TR': 'TRY', 'IR': 'IRR'
			};
			currency = currencyMap[regionCode] || 'EUR';
		}

		// Mapeo personalizado de símbolos de moneda para mayor precisión
		const customSymbols: { [key: string]: string } = {
			'PEN': 'S/', // Sol peruano
			'ARS': '$', // Peso argentino
			'COP': '$', // Peso colombiano
			'CLP': '$', // Peso chileno
			'MXN': '$', // Peso mexicano
			'USD': '$', // Dólar estadounidense
			'CAD': 'C$', // Dólar canadiense
			'AUD': 'A$', // Dólar australiano
			'BRL': 'R$', // Real brasileño
			'UYU': '$U', // Peso uruguayo
			'EUR': '€', // Euro
			'GBP': '£', // Libra esterlina
			'JPY': '¥', // Yen japonés
			'CNY': '¥', // Yuan chino
			'KRW': '₩', // Won surcoreano
			'INR': '₹', // Rupia india
			'RUB': '₽', // Rublo ruso
			'TRY': '₺', // Lira turca
			'ZAR': 'R', // Rand sudafricano
			'CHF': 'CHF', // Franco suizo
			'NOK': 'kr', // Corona noruega
			'SEK': 'kr', // Corona sueca
			'DKK': 'kr', // Corona danesa
			'PLN': 'zł', // Zloty polaco
			'CZK': 'Kč', // Corona checa
			'HUF': 'Ft', // Forint húngaro
			'THB': '฿', // Baht tailandés
			'SGD': 'S$', // Dólar de Singapur
			'HKD': 'HK$', // Dólar de Hong Kong
			'NZD': 'NZ$', // Dólar neozelandés
		};

		// Usar símbolo personalizado si existe, sino usar Intl.NumberFormat
		const customSymbol = customSymbols[currency];
		
		if (customSymbol) {
			// Formatear el número con el locale pero extraer solo la parte numérica
			const numberFormatted = new Intl.NumberFormat(userLocale, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(price);
			
			return `${customSymbol} ${numberFormatted}`;
		}

		// Fallback: usar el formateo estándar y extraer símbolo
		const formatted = new Intl.NumberFormat(userLocale, {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);

		// Si no hay símbolo personalizado, usar el resultado de Intl
		return formatted;
		
	} catch (error) {
		// Fallback simple en caso de error
		console.warn('Error formateando precio con símbolo, usando formato por defecto:', error);
		return `€ ${price.toFixed(2)}`;
	}
}; 

/**
 * Función de debug para mostrar información de localización
 * Ayuda a diagnosticar problemas de detección
 */
export const getLocalizationDebugInfo = () => {
	const userLocale = navigator.language || navigator.languages?.[0] || 'es-ES';
	const allLanguages = navigator.languages ? Array.from(navigator.languages) : [];
	const regionCode = userLocale.split('-')[1] || 'ES';
	
	return {
		primaryLocale: userLocale,
		allLanguages: allLanguages,
		extractedRegion: regionCode,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		detectedCurrency: getCurrencyCode()
	};
};

/**
 * Detección mejorada de región que considera múltiples factores
 */
const getRegionCode = (): string => {
	try {
		// Método 1: Zona horaria como indicador principal para América
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		
		// Mapeo específico de zonas horarias a países
		const timezoneToCountry: { [key: string]: string } = {
			// Perú
			'America/Lima': 'PE',
			
			// Argentina
			'America/Argentina/Buenos_Aires': 'AR',
			'America/Argentina/Catamarca': 'AR',
			'America/Argentina/Cordoba': 'AR',
			'America/Argentina/Jujuy': 'AR',
			'America/Argentina/La_Rioja': 'AR',
			'America/Argentina/Mendoza': 'AR',
			'America/Argentina/Rio_Gallegos': 'AR',
			'America/Argentina/Salta': 'AR',
			'America/Argentina/San_Juan': 'AR',
			'America/Argentina/San_Luis': 'AR',
			'America/Argentina/Tucuman': 'AR',
			'America/Argentina/Ushuaia': 'AR',
			
			// Colombia
			'America/Bogota': 'CO',
			
			// Chile
			'America/Santiago': 'CL',
			'Pacific/Easter': 'CL',
			
			// México
			'America/Mexico_City': 'MX',
			'America/Cancun': 'MX',
			'America/Merida': 'MX',
			'America/Monterrey': 'MX',
			'America/Matamoros': 'MX',
			'America/Mazatlan': 'MX',
			'America/Chihuahua': 'MX',
			'America/Hermosillo': 'MX',
			'America/Tijuana': 'MX',
			
			// Brasil
			'America/Sao_Paulo': 'BR',
			'America/Rio_Branco': 'BR',
			'America/Fortaleza': 'BR',
			'America/Recife': 'BR',
			'America/Araguaina': 'BR',
			'America/Maceio': 'BR',
			'America/Bahia': 'BR',
			'America/Belem': 'BR',
			'America/Campo_Grande': 'BR',
			'America/Cuiaba': 'BR',
			'America/Manaus': 'BR',
			'America/Porto_Velho': 'BR',
			'America/Boa_Vista': 'BR',
			
			// Uruguay
			'America/Montevideo': 'UY',
			
			// Venezuela
			'America/Caracas': 'VE',
			
			// Bolivia
			'America/La_Paz': 'BO',
			
			// Paraguay
			'America/Asuncion': 'PY',
			
			// Ecuador
			'America/Guayaquil': 'EC',
			'Pacific/Galapagos': 'EC',
			
			// Estados Unidos
			'America/New_York': 'US',
			'America/Los_Angeles': 'US',
			'America/Chicago': 'US',
			'America/Denver': 'US',
			'America/Phoenix': 'US',
			'America/Anchorage': 'US',
			'Pacific/Honolulu': 'US',
			
			// España
			'Europe/Madrid': 'ES',
			'Atlantic/Canary': 'ES',
			
			// Otros países importantes
			'Europe/London': 'GB',
			'Europe/Paris': 'FR',
			'Europe/Berlin': 'DE',
			'Europe/Rome': 'IT',
			'Europe/Zurich': 'CH',
			'Asia/Tokyo': 'JP',
			'Asia/Shanghai': 'CN',
			'Asia/Seoul': 'KR',
			'Asia/Kolkata': 'IN',
			'Australia/Sydney': 'AU',
			'Australia/Melbourne': 'AU',
			'Pacific/Auckland': 'NZ',
		};
		
		// Buscar por zona horaria específica
		if (timezoneToCountry[timeZone]) {
			console.log(`🌍 País detectado por zona horaria: ${timezoneToCountry[timeZone]} (${timeZone})`);
			return timezoneToCountry[timeZone];
		}
		
		// Método 2: Análisis de todos los idiomas configurados
		const allLanguages = navigator.languages ? Array.from(navigator.languages) : [];
		
		for (const lang of allLanguages) {
			const region = lang.split('-')[1];
			if (region && region.length === 2) {
				console.log(`🗣️ Región detectada por idioma: ${region} (${lang})`);
				return region.toUpperCase();
			}
		}
		
		// Método 3: Análisis del idioma principal
		const userLocale = navigator.language || 'es-ES';
		const regionFromPrimary = userLocale.split('-')[1];
		
		if (regionFromPrimary && regionFromPrimary.length === 2) {
			console.log(`📍 Región detectada por idioma principal: ${regionFromPrimary} (${userLocale})`);
			return regionFromPrimary.toUpperCase();
		}
		
		// Método 4: Detección por patrón de idioma sin región
		const langCode = userLocale.split('-')[0];
		if (langCode === 'es') {
			// Para español sin región específica, usar zona horaria para determinar país
			if (timeZone.includes('America/')) {
				// Si la zona horaria es de América, probablemente es un país latinoamericano
				// Por defecto asumir México como el más común
				console.log(`🌎 Español de América detectado, usando MX por defecto`);
				return 'MX';
			}
			console.log(`🇪🇸 Español de Europa detectado, usando ES`);
			return 'ES';
		}
		
		// Fallback
		console.log(`❓ No se pudo detectar región, usando ES por defecto`);
		return 'ES';
		
	} catch (error) {
		console.warn('Error en detección de región:', error);
		return 'ES';
	}
}; 