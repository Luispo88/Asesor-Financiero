---
name: analisis-financiero
description: Cómo funciona y cómo modificar el análisis financiero por reglas del plan de negocios (js/analisis.js), su puntaje de salud financiera de 0 a 100 y los textos para el cliente y el asesor. Úselo antes de agregar, quitar o ajustar un indicador, un rango de referencia, una recomendación o el puntaje, o cuando el usuario pregunte por qué una empresa obtuvo cierto resultado.
---

# Análisis financiero del plan de negocios

Es un análisis **por reglas, sin inteligencia artificial**: mismos datos, mismo resultado.
El usuario (el asesor) lo pidió así a propósito. No lo reemplace por llamadas a un modelo de lenguaje.

## Flujo de datos

1. `js/plan.js` → `calcular()` arma el **modelo** `M` con los datos del cliente: `M.anos[0..2]` con `ventas`, `res` (estado de resultados), `bal` (balance) y `flujo`; además `M.financiero`, `M.cualitativo` (FODA, KPI, mercado, competencia, mercadeo), y los ayudantes `M.fmt`, `M.simbolo`, `M.mes`, `M.ano`. Los resultados clave se guardan en `M.clave`.
2. `js/analisis.js` → `analizar(M)` devuelve `{ puntaje, calificacion, areas, hallazgos, recomendaciones, fortalezas, mejoras, preguntas, usaResultados, sinFinancieros }`.
3. Se muestra en tres lugares:
   - **Cliente**: sección "Diagnóstico" del plan (`pintarDiagnosticoCliente` en `plan.js`). Breve: puntaje, fortalezas, puntos por mejorar y recomendaciones cortas.
   - **Asesor**: sección "Análisis del asesor" (`pintarAnalisisAsesor`), solo con `VER_ANALISIS`. Completo: cada hallazgo con valor, explicación técnica, preguntas para la reunión y recomendaciones detalladas.
   - **Panel del asesor**: `diagnosticoDePlan(doc)` (exportada de `plan.js`) calcula el puntaje de cada cliente para la columna "Salud financiera", el conteo "en riesgo" y la exportación.

## Estructura de un hallazgo

```js
agregar({
  area: "liquidez",            // una de AREAS
  id: "razonCorriente",        // único
  estado: nivel(rc, 1.5, 1),   // "fortaleza" | "atencion" | "alerta"
  valor: veces(rc),            // texto ya formateado: pct(), veces(), dias(), M.fmt()
  titulo: "Razón corriente",
  cliente: "Una o dos frases sencillas, en usted.",
  asesor: "Cálculo, referencia usada, interpretación y qué revisar.",
  preguntas: ["Pregunta para guiar la conversación con el cliente"],
  soloAsesor: false,           // true: el cliente no lo ve (p. ej., inconsistencias)
}, ["liquidez", "cobro"]);     // claves de RECOMENDACIONES que activa si no es fortaleza
```

- `nivel(v, sano, alerta, mayorEsMejor = true)` clasifica un valor contra dos umbrales.
- Si falta un dato, **no agregue el hallazgo**: un indicador sin datos no debe contar como alerta. Proteja cada cálculo con `ok()` y `div()` (que devuelve `NaN` si el divisor es cero).
- Nunca deje que `null`, `undefined`, `NaN` u objetos lleguen al texto: las pruebas lo revisan.

## Puntaje de salud financiera

- Cada hallazgo vale: fortaleza **100**, atención **55**, alerta **15** (`PESO_ESTADO`).
- El puntaje de un área es el promedio de sus hallazgos (fortaleza ≥ 75, atención ≥ 45, alerta < 45).
- El puntaje general es el promedio **ponderado** de las áreas con datos: ventas 15, rentabilidad 25, liquidez 20, endeudamiento 15, eficiencia 10, flujo 15. **Consistencia y estrategia pesan 0**: se informan, pero no bajan el puntaje.
- Calificación: **Sólida** ≥ 75, **Estable** ≥ 55, **Requiere atención** ≥ 35, **En riesgo** < 35 (el panel cuenta "en riesgo" con el mismo corte). Sin áreas con datos: "Sin datos suficientes".
- Si cambia pesos o cortes, el puntaje de todos los clientes cambia en el panel: avísele al usuario antes.

## Rangos de referencia actuales

| Área | Indicador | Fortaleza | Alerta |
|---|---|---|---|
| Ventas | Crecimiento anual promedio | ≥ inflación + 2 pts (5 %) | < 0 %; > 60 % es "atención" por ambicioso |
| Ventas | Concentración en el producto principal | ≤ 50 % | > 70 % |
| Ventas | Estacionalidad (coef. de variación mensual) | — | > 35 % es "atención" |
| Rentabilidad | Margen bruto | ≥ 30 % y sin caer > 3 pts | < 0 % |
| Rentabilidad | Margen operativo | ≥ 10 % | < 3 % |
| Rentabilidad | Margen neto | ≥ 8 % | < 2 % |
| Rentabilidad | Margen de seguridad sobre el punto de equilibrio | ≥ 25 % | < 10 % |
| Rentabilidad | ROE / ROA | ≥ 15 % / ≥ 5 % | < 5 % / < 2 % |
| Rentabilidad | Producto con margen unitario | — | < 0 alerta; < 20 % atención |
| Liquidez | Razón corriente | ≥ 1,5 | < 1 |
| Liquidez | Prueba ácida | ≥ 1 | < 0,7 |
| Liquidez | Efectivo / pasivo corriente | — | < 0,2 es "atención" |
| Endeudamiento | Pasivo / activo | ≤ 50 % | > 70 %; patrimonio negativo = alerta |
| Endeudamiento | Deuda / patrimonio | ≤ 1 | > 2 |
| Endeudamiento | Cobertura de intereses (EBIT / intereses) | ≥ 3 | < 1,5 |
| Endeudamiento | DSCR = EBITDA / (intereses + porción corriente + préstamos de corto plazo) | ≥ 1,25 | < 1 |
| Eficiencia | Días de cobro / de inventario | ≤ 45 / ≤ 60 | > 90 / > 120 |
| Eficiencia | Ciclo de conversión de efectivo | ≤ 60 días | > 120 días |
| Eficiencia | Planilla / ventas | — | > 40 % es "atención" |
| Flujo | Efectivo final negativo, flujo operativo negativo | — | alerta |
| Flujo | Financiamiento mayor que el flujo operativo | — | atención |

Fuentes, anotadas en el encabezado de `js/analisis.js`: Corporate Finance Institute (*Financial Ratios Definitive Guide*), CFA Institute (ciclo de conversión de efectivo), práctica bancaria para el DSCR de 1,25 y la meta de inflación del BCCR (3 % ± 1). Son **rangos generales**: un comercio, un restaurante, un servicio y una industria tienen márgenes y ciclos distintos. Si el usuario pide ajustes por sector, propóngalos citando una fuente reconocida y confírmelos con él antes de cambiarlos.

## Cómo agregar o cambiar una regla

1. Ubique el área en `analizar()` (bloques marcados `// ----- <Área>`).
2. Use el modelo `M`. Si necesita un dato nuevo, calcúlelo en `calcular()` de `plan.js` y agréguelo al modelo, no al análisis.
3. Escriba los dos textos: **cliente** (breve, sencillo, en "usted", sin jerga; vea el skill **estilo-y-tono**) y **asesor** (cálculo, referencia, interpretación). Agregue 1 o 2 preguntas útiles para la reunión.
4. Reutilice una recomendación de `RECOMENDACIONES` o cree una nueva con sus dos versiones, `cliente` y `asesor`.
5. Revise los números a mano con un caso de ejemplo. Los planes `SANA` (puntaje 100, Sólida) y `RIESGO` (28, En riesgo) de `herramientas/pruebas/probar.mjs` sirven de referencia: si un cambio mueve esos puntajes, explique por qué.
6. Corra las pruebas (skill **probar-sitio**) y agregue una que cubra la regla nueva.

## Límites

- Toda la lógica está en JavaScript público: cualquiera puede leer las reglas. Está bien para reglas de análisis; no ponga ahí nada confidencial.
- El análisis **orienta, no dictamina**: los textos para el cliente no deben sonar a decisión de crédito ni a garantía.
