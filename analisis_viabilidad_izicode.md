# Análisis de Viabilidad y Costos en Producción: izicode (Firestore & Firebase Auth)

Este documento presenta una evaluación detallada de la viabilidad técnica, estimación de costos, análisis de latencia/concurrencia y recomendaciones de optimización para el proyecto **izicode**, asumiendo una carga de **1,000 usuarios activos concurrentes/mensuales** sobre la base de datos principal de Cloud Firestore y Firebase Auth.

---

## 1. Límites Técnicos de Lectura y Escritura en Firestore

Firestore es una base de datos NoSQL escalable y totalmente administrada, pero tiene límites operativos específicos que deben tenerse en cuenta al diseñar la arquitectura:

*   **Límites de Escritura por Base de Datos:**
    *   **Límite Global:** Admite un máximo de 10,000 operaciones de escritura por segundo (escrituras, actualizaciones y eliminaciones). 1,000 usuarios activos no generarán ráfagas que superen este límite, lo que garantiza la viabilidad global.
    *   **Límite por Documento:** La tasa máxima recomendada de escrituras en un solo documento es de **1 operación por segundo**. Puesto que el modelo de datos de izicode almacena la información estructurada bajo rutas individuales por usuario (`users/{userId}/batches/{batchId}/items/{itemId}`), no existe contención de escrituras entre múltiples usuarios en el mismo documento.
*   **Límites de Operaciones por Lote (Batches):**
    *   La API `writeBatch` de Firestore permite realizar operaciones atómicas con un límite máximo de **500 operaciones por commit**.
    *   **Evaluación del Código:** En las funciones `saveItemsSubcollection` y `deleteItemsSubcollection` (definidas en `src/components/BarcodeGeneratorWorkspace.tsx`), el código maneja este límite de manera correcta dividiendo los arreglos en fragmentos (chunks) de 500 ítems mediante bucles que incrementan en 500 (`i += 500`) y procesando commits independientes por cada fragmento.
*   **Límites de Tamaño de Documento:**
    *   El tamaño máximo de un documento de Firestore es de **1 MiB** (1,048,576 bytes).
    *   **Evaluación del Código:** Izicode almacena cada código de barras como un documento individual en la subcolección `items` de cada lote. Esto evita que el documento del lote (`batch`) crezca indefinidamente y exceda el límite de 1 MiB. Sin embargo, guardar un lote Pro de 1,000 códigos implica la creación de 1,000 documentos independientes, lo cual incrementa notablemente las operaciones de escritura/lectura y repercute en los costos.

---

## 2. Costos Estimados Mensuales (Uso Promedio)

Para estimar los costos mensuales, asumimos las tarifas oficiales de Firestore en la multi-región de EE. UU. (por ejemplo, `us-central1` o `nam5`) en el plan de pago por uso (Blaze):
*   **Lecturas:** $0.06 por cada 100,000 operaciones ($0.60 por millón).
*   **Escrituras:** $0.18 por cada 100,000 operaciones ($1.80 por millón).
*   **Almacenamiento:** $0.18 por GiB al mes.
*   **Cuota gratuita diaria (Free Tier):** 50,000 lecturas/día (~1.5M/mes), 20,000 escrituras/día (~600k/mes) y 1 GiB de almacenamiento.

### Escenario A: Plan Free
*   **Límites por usuario:** 5 lotes, 30 códigos por lote.
*   **Uso estimado por usuario activo/mes:** Crea 5 lotes de 30 códigos una vez al mes y visualiza (lee) sus lotes 5 veces al mes.
*   **Cálculo de Operaciones Mensuales por Usuario:**
    *   *Escrituras (Creación de lotes):* 5 lotes $\times$ (1 doc lote + 30 docs ítems) = **155 escrituras**.
    *   *Lecturas (Reglas de seguridad y visualización):*
        *   Crear lote evalúa la regla `isValidBatch` mediante un `get()` al documento del usuario: 5 lotes $\times$ 1 lectura = 5 lecturas.
        *   Cada visualización lee el lote y la subcolección de ítems: 5 visualizaciones $\times$ 5 lotes $\times$ (1 doc lote + 30 docs ítems) = 775 lecturas.
        *   Total lecturas: **780 lecturas**.
*   **Cálculo de 1,000 Usuarios Activos:**
    *   **Lecturas Totales:** $780 \times 1,000 = 780,000$ lecturas/mes.
    *   **Escrituras Totales:** $155 \times 1,000 = 155,000$ escrituras/mes.
    *   **Almacenamiento:** $150 \text{ KB/usuario} \times 1,000 = 150 \text{ MB}$ (despreciable).
    *   **Costo Mensual:** **$0.00 USD** (Completamente cubierto por la cuota gratuita de Firebase). Costo bruto aproximado: $0.75 USD.

### Escenario B: Plan Pro
*   **Límites por usuario:** 20 lotes, 1,000 códigos por lote.
*   **Uso estimado por usuario activo/mes:** Crea 20 lotes de 1,000 códigos una vez al mes y visualiza sus lotes 5 veces al mes.
*   **Cálculo de Operaciones Mensuales por Usuario:**
    *   *Escrituras (Creación de lotes):* 20 lotes $\times$ (1 doc lote + 1,000 docs ítems) = **20,020 escrituras**.
    *   *Lecturas (Reglas y visualización):*
        *   Crear lote evalúa regla: 20 lotes $\times$ 1 lectura = 20 lecturas.
        *   Visualizaciones: 5 visualizaciones $\times$ 20 lotes $\times$ (1 doc lote + 1,000 docs ítems) = 100,100 lecturas.
        *   Total lecturas: **100,120 lecturas**.
*   **Cálculo de 1,000 Usuarios Activos:**
    *   **Lecturas Totales:** $100,120 \times 1,000 = 100,120,000$ lecturas/mes.
    *   **Escrituras Totales:** $20,020 \times 1,000 = 20,020,000$ escrituras/mes.
    *   **Almacenamiento:** $\approx 4 \text{ MB/usuario} \times 1,000 = 4 \text{ GB}$ totales.
    *   **Costo Mensual Bruto (Descontando Free Tier):**
        *   Lecturas cobrables: $98.62 \text{ millones} \times \$0.60 = \$59.17 \text{ USD}$.
        *   Escrituras cobrables: $19.42 \text{ millones} \times \$1.80 = \$34.96 \text{ USD}$.
        *   Almacenamiento cobrable: $3 \text{ GB} \times \$0.18 = \$0.54 \text{ USD}$.
    *   **Costo Mensual Pro Total:** **$\approx$ $94.67 USD**.

> [!WARNING]
> **Riesgo de actualización recursiva:** Si los usuarios Pro actualizan o sobrescriben constantemente sus lotes de 1,000 códigos en lugar de guardarlos una sola vez, la función `saveItemsSubcollection` realizará primero un `delete` de los 1,000 ítems (lo que cuesta 1,000 lecturas adicionales para listarlos y 1,000 escrituras para eliminarlos), seguido de la inserción de los nuevos 1,000 ítems.
> Si cada usuario actualiza sus lotes de manera regular 5 veces al mes, las escrituras totales subirían a **60,000,000** y las lecturas a **200,000,000**, elevando el costo mensual a aproximadamente **$220.00 USD - $450.00 USD**.

---

## 3. Latencia y Concurrencia

*   **Concurrencia:**
    *   **Firebase Auth** gestiona la autenticación a través de tokens JWT de forma totalmente distribuida, por lo que 1,000 usuarios activos concurrentes no presentan ninguna degradación en tiempos de respuesta de autenticación.
    *   Como el modelo está aislado por ID de usuario (`users/{userId}`), Firestore escala horizontalmente de forma automática. No hay bloqueos transaccionales ni contenciones de recursos compartidos entre distintos usuarios.
*   **Latencia en Operaciones Individuales:**
    *   Las lecturas y escrituras individuales de documentos tienen una latencia estándar de **10 a 50 ms**.
*   **Latencia Crítica en el Plan Pro:**
    *   En el plan Pro, guardar un lote de 1,000 códigos requiere invocar secuencialmente dos operaciones `writeBatch.commit()` de 500 ítems cada una. Cada transacción de lote en Firestore puede demorar entre **1.5 y 3 segundos** en confirmarse.
    *   Si el usuario edita o sobrescribe un lote que ya tenía 1,000 códigos, la aplicación primero ejecuta `getDocs` (~200 ms), luego realiza 2 operaciones de eliminación en lote (3-6 segundos totales) y finalmente realiza 2 operaciones de inserción en lote (3-6 segundos totales).
    *   La latencia percibida por el usuario para completar el guardado de un lote Pro existente asciende a **entre 6 y 12 segundos**. Si la interfaz gráfica no maneja un estado de carga claro e ininterrumpido, esto generará una mala experiencia de usuario.

---

## 4. Conclusiones y Recomendaciones de Optimización

El proyecto **izicode** es totalmente viable para soportar 1,000 usuarios activos utilizando Firestore y Firebase Auth. Los costos de infraestructura son sumamente razonables en relación con el ingreso potencial de 1,000 suscripciones Pro. Sin embargo, el diseño de la base de datos presenta ineficiencias de rendimiento y costos que se intensificarán a mayor escala.

### Recomendación 1: Almacenar los Códigos como un Array en el Documento del Lote
En lugar de crear subdocumentos para cada código en `users/{userId}/batches/{batchId}/items/{itemId}`, almacene la lista completa de códigos de barras como un arreglo de objetos (mapas) directamente en un campo del documento del lote (`users/{userId}/batches/{batchId}`).

*   **Viabilidad técnica:** Firestore permite documentos de hasta 1 MiB. Un arreglo de 1,000 ítems estructurados como `{ code: "1234567890123", quantity: 1, isValid: true, ... }` pesa aproximadamente entre 150 KB y 250 KB en JSON, lo cual cabe holgadamente en el límite de 1 MiB.
*   **Impacto de Costos en Plan Pro:**
    *   Guardar un lote completo requeriría **1 sola escritura** en lugar de 1,001 escrituras.
    *   Leer un lote completo requeriría **1 sola lectura** en lugar de 1,001 lecturas.
    *   El costo mensual de Firestore para los 1,000 usuarios Pro caería de **$94.67 USD** a menos de **$2.00 USD** totales.
*   **Impacto de Latencia:**
    *   Guardar o actualizar un lote completo tomaría **10-50 ms** en lugar de 6-12 segundos, eliminando los molestos retrasos del cliente.

### Recomendación 2: Utilizar Custom Claims para Límites de Suscripción en Reglas de Seguridad
Actualmente, las reglas de Firestore (como `isValidBatch` en `firestore.rules`) utilizan `get(/databases/$(database)/documents/users/$(userId))` para consultar el nivel de suscripción y validar los límites. Esto genera una lectura facturable adicional por cada creación o actualización de lote.

*   **Optimización:** Al procesar un pago o actualizar la suscripción, asigne el tipo de plan (`tier: 'pro' | 'free'`) a los metadatos de autenticación del usuario mediante **Firebase Auth Custom Claims** (`admin.auth().setCustomUserClaims(...)`).
*   **Resultado:** En las reglas de Firestore, reemplace la validación con:
    ```javascript
    let tier = request.auth.token.tier; // Lee directamente del JWT del cliente
    ```
    Esto reduce el costo y elimina por completo la latencia de la lectura cruzada en la base de datos durante cada validación de escritura.

### Recomendación 3: Implementar un Algoritmo de Diffing en el Cliente
Si se mantiene el modelo de subcolecciones para los ítems por necesidades específicas del negocio (como consultas complejas por código), modifique `saveItemsSubcollection` para que no elimine y recree todos los ítems.
*   **Optimización:** Compare localmente los ítems actuales con los ya almacenados. Genere un lote de escrituras (`writeBatch`) únicamente para los elementos nuevos, modificados o eliminados.
*   **Resultado:** Esto reducirá las operaciones de escritura y lectura en más del 80% en ediciones menores, mejorando drásticamente la latencia y reduciendo significativamente la factura de Firebase.

### Recomendación 4: Habilitar la Persistencia sin Conexión (Offline Cache)
Configure Firestore con persistencia local habilitada en el frontend (`enableIndexedDbPersistence`).
*   **Resultado:** Las lecturas recurrentes de lotes ya consultados se resolverán desde la caché del navegador de forma instantánea (0 ms) sin incurrir en lecturas facturables adicionales, mejorando el rendimiento y limitando la facturación.
