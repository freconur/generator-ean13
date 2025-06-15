# Generador de Códigos de Barras EAN-13

Este proyecto es una aplicación web desarrollada con Next.js que permite generar y validar códigos de barras EAN-13, con la capacidad de imprimirlos en formato PDF.

## Características Principales

- Validación de códigos EAN-13
- Generación de códigos de barras visuales
- Gestión de múltiples códigos con cantidades personalizables
- Exportación a PDF con configuración personalizable
- Interfaz de usuario intuitiva y responsive
- Detección de códigos duplicados
- Vista previa de códigos de barras

## Requisitos Previos

- Node.js (versión 14 o superior)
- npm o yarn

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
```

2. Navega al directorio del proyecto:
```bash
cd ean13
```

3. Instala las dependencias:
```bash
npm install
# o
yarn install
```

## Ejecución del Proyecto

Para iniciar el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:3000`

## Uso

1. Ingresa un código EAN-13 de 13 dígitos en el campo de entrada
2. Especifica la cantidad deseada
3. Haz clic en "Validar Código"
4. El código se agregará a la lista si es válido
5. Puedes ajustar las cantidades en la tabla
6. Utiliza el botón "Descargar PDF" para exportar los códigos

## Configuración del PDF

El generador de PDF permite ajustar:
- Ancho de línea del código de barras
- Altura del código
- Tamaño del texto

## Tecnologías Utilizadas

- Next.js
- React
- TypeScript
- @react-pdf/renderer
- JsBarcode
- html2canvas

## Estructura del Proyecto

```
src/
  ├── components/
  │   └── PDF-ean13.tsx
  ├── pages/
  │   └── index.tsx
  ├── styles/
  │   ├── Home.module.css
  │   └── PDF-ean13.module.css
  └── utils/
      └── ean13Generator.ts
```

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz un Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

[Tu Nombre] - [Tu Email]

Link del Proyecto: [URL_DEL_REPOSITORIO]
