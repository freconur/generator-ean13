# Reglas del Proyecto (UGEL - EVA)

Este archivo contiene decisiones de diseño, comportamiento y validaciones obligatorias para el portal de gestión de evaluaciones. Cualquier agente que trabaje en esta base de datos debe cumplir con estas especificaciones.

---

## 1. Crear y Modificar Preguntas (Modal)
* **Autofocus**: Al abrir el modal de creación de preguntas, el foco (`autofocus`) debe iniciarse automáticamente en el área de texto (`textarea`) del texto de la pregunta.
* **Atajos de Teclado**:
  * **Enter**: Debe guardar la pregunta, siempre y cuando todos los campos obligatorios (pregunta, alternativas, respuesta correcta) estén llenos.
  * **Escape**: Debe cerrar el modal de forma segura.
* **Información del Número de Pregunta**: El modal de creación debe mostrar de forma dinámica qué número de pregunta sería (ej. *"Pregunta N° 5"* si ya hay 4 preguntas guardadas) basándose en `preguntasRespuestas.length + 1`.
* **Evitar Envío Múltiple**: Los botones de guardar deben implementar un indicador de carga (`isSaving`) y quedar deshabilitados tras el primer clic para evitar registros duplicados por clics accidentales.
* **Puntaje Opcional**: El campo de puntaje en el modal de creación/edición de la pregunta no debe ser obligatorio.

---

## 2. Validaciones al Activar la Evaluación
Antes de activar una evaluación (cambiar `evaluacion.active` de `false` a `true`), se deben cumplir obligatoriamente las siguientes condiciones (solo aplicable a evaluaciones de tipo estudiante, `tipoDeEvaluacion === "1"`):
1. **Configuración previa**: Debe existir la configuración de rangos de nivel y puntaje en `evaluacion.nivelYPuntaje`.
2. **Existencia de preguntas**: Debe haber al menos una pregunta registrada en la evaluación.
3. **Puntuación mínima**: Cada una de las preguntas debe tener asignado un puntaje igual o mayor a 1 (`puntaje >= 1`). No se permiten puntajes de 0, menores a 0, vacíos o indefinidos.
4. **Suma total exacta**: La suma de los puntajes de todas las preguntas de la evaluación debe coincidir exactamente con el valor máximo del nivel más alto configurado en la evaluación (por ejemplo, el valor `max` del nivel "Satisfactorio", que suele ser 20).

Si alguna validación falla, se debe abortar la activación y mostrar una alerta descriptiva al usuario.

---

## 3. Comportamiento cuando la Evaluación está Activa
Cuando `evaluacion.active === true`, el sistema entra en modo de protección para garantizar la integridad de los resultados:
* Se muestra un banner de advertencia informando el estado bloqueado de la evaluación.
* Se ocultan los controles de creación, edición, eliminación y reordenamiento de preguntas.
* Los inputs de puntajes individuales pasan a modo de solo lectura (Badge de texto).
* El botón para cambiar de vista ("Vista Detallada" / "Vista Compacta") sigue visible, pero las funciones de arrastrar (`draggable`) y los controles de reordenación quedan lógicamente bloqueados y el indicador de arrastre (`MdDragIndicator`) se oculta.
* El título de la evaluación en la cabecera se muestra en mayúsculas (`.toUpperCase()`).
