---
name: analisis-financiero
description: Cómo funciona y cómo modificar el análisis financiero por reglas del plan de negocios (js/analisis.js), su puntaje de salud financiera de 0 a 100 y los textos para el cliente y el asesor. Úselo antes de agregar, quitar o ajustar un indicador, un rango de referencia, una recomendación o el puntaje, o cuando el usuario pregunte por qué una empresa obtuvo cierto resultado.
---

# Análisis financiero del plan de negocios

Es un análisis **por reglas, sin inteligencia artificial**: mismos datos, mismo resultado.
El usuario (el asesor) lo pidió así a propósito. No lo reemplace por llamadas a un modelo de lenguaje.

**Decisión del usuario (octubre de 2026):** se mantienen las reglas. Se evaluó usar IA y se dejó
para más adelante. Si se retoma, será solo como **apoyo para el asesor**, nunca hacia el cliente
ni para calcular el puntaje: un botón "Generar borrador con IA" que redacte sobre los resultados
ya calculados por las reglas y que el asesor revise antes de enviar. Antes hace falta que el
usuario acepte el plan de pago de Firebase (servidor para proteger la clave de la IA) y que se
agregue al registro el consentimiento para enviar datos a un proveedor de IA (Ley 8968).
No lo implemente sin que el usuario lo pida.

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

## Referencias por actividad

El cliente elige su actividad en la sección "Previsión de ventas" (`general.sector`); el modelo la
lleva en `M.sector` y `analizar()` toma los rangos de `SECTORES` en `js/analisis.js`. Sin
actividad, u "Otra actividad", se usa `general` (la tabla de abajo). El resultado incluye
`A.sector` (`id`, `nombre`, rangos, `nota`, `indicado`); el diagnóstico del cliente dice con qué se
comparó y el análisis del asesor muestra la tabla "Referencias usadas".

| Actividad | Margen bruto | Margen op. | Margen neto | Razón corriente | Prueba ácida | Días cobro | Días inventario | Ciclo | Planilla (atención) |
|---|---|---|---|---|---|---|---|---|---|
| General | 30 % | 10 / 3 % | 8 / 2 % | 1,5 / 1 | 1 / 0,7 | 45 / 90 | 60 / 120 | 60 / 120 | > 40 % |
| Comercio | 25 % | 5 / 1,5 % | 4 / 1 % | 1,5 / 1 | 0,5 / 0,3 | 30 / 60 | 60 / 120 | 45 / 90 | > 20 % |
| Restaurantes | 60 % | 8 / 3 % | 6 / 2 % | 1 / 0,7 | 0,7 / 0,4 | 10 / 30 | 10 / 20 | 10 / 30 | > 38 % |
| Servicios | 50 % | 15 / 5 % | 10 / 3 % | 1,5 / 1 | 1,2 / 0,8 | 45 / 90 | 30 / 60 | 45 / 90 | > 55 % |
| Manufactura | 30 % | 8 / 3 % | 6 / 2 % | 1,5 / 1,1 | 0,8 / 0,5 | 60 / 90 | 90 / 150 | 90 / 150 | > 35 % |
| Construcción | 20 % | 6 / 2 % | 4 / 1,5 % | 1,3 / 1 | 1 / 0,7 | 60 / 90 | 45 / 90 | 60 / 120 | > 40 % |
| Agropecuario | 25 % | 8 / 2 % | 5 / 1 % | 1,5 / 1,1 | 0,8 / 0,5 | 45 / 90 | 120 / 240 | 120 / 240 | > 40 % |

Cada par es sano / alerta. Margen bruto: el valor es el mínimo para "fortaleza"; por debajo es
atención, y alerta solo si es negativo. Endeudamiento, cobertura de intereses, DSCR, flujo,
crecimiento, concentración y estacionalidad usan **los mismos rangos para todas las actividades**.

Fuentes de los rangos por actividad: Crestmont Capital y BizMiner (2026, referencias para pequeñas
empresas), Damodaran (NYU Stern, enero de 2026, márgenes de empresas que cotizan en EE. UU., como
techo) y OnRamp Funds (2026, rotación de inventario), ajustados a la escala de una pyme. No hay una
tabla oficial de razones por sector para pymes de Costa Rica: si el usuario aporta datos locales
(su experiencia de crédito, SUGEF, cámaras empresariales), prefiéralos. Para una actividad nueva,
agréguela a `SECTORES` con su `nota` y la prueba de `probar.mjs` (espera 8 opciones en el
selector) debe actualizarse.

## Rangos de referencia generales

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

Fuentes, anotadas en el encabezado de `js/analisis.js`: Corporate Finance Institute (*Financial Ratios Definitive Guide*), CFA Institute (ciclo de conversión de efectivo), práctica bancaria para el DSCR de 1,25 y la meta de inflación del BCCR (3 % ± 1). Para cambiar un rango (general o de una actividad), propóngalo citando una fuente reconocida y confírmelo con el usuario antes de aplicarlo.

## Cómo agregar o cambiar una regla

1. Ubique el área en `analizar()` (bloques marcados `// ----- <Área>`).
2. Use el modelo `M`. Si necesita un dato nuevo, calcúlelo en `calcular()` de `plan.js` y agréguelo al modelo, no al análisis.
3. Escriba los dos textos: **cliente** (breve, sencillo, en "usted", sin jerga; vea el skill **estilo-y-tono**) y **asesor** (cálculo, referencia, interpretación). Agregue 1 o 2 preguntas útiles para la reunión.
4. Reutilice una recomendación de `RECOMENDACIONES` o cree una nueva con sus dos versiones, `cliente` y `asesor`.
5. Revise los números a mano con un caso de ejemplo. Los planes `SANA` (puntaje 100, Sólida; 91 evaluado como restaurante) y `RIESGO` (28, En riesgo) de `herramientas/pruebas/probar.mjs` sirven de referencia: si un cambio mueve esos puntajes, explique por qué.
6. Corra las pruebas (skill **probar-sitio**) y agregue una que cubra la regla nueva.

## Límites

- Toda la lógica está en JavaScript público: cualquiera puede leer las reglas. Está bien para reglas de análisis; no ponga ahí nada confidencial.
- El análisis **orienta, no dictamina**: los textos para el cliente no deben sonar a decisión de crédito ni a garantía.
