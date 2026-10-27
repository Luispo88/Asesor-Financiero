---
name: cifras-costa-rica
description: Cifras legales y de mercado de Costa Rica usadas en el sitio (impuesto sobre la renta, cargas sociales de la CCSS, IVA, salarios mínimos, requisitos PYME del MEIC, tarifas de referencia) y dónde están en el código. Úselo al actualizar las cifras de un año nuevo o cuando el usuario pregunte si una cifra está vigente.
---

# Cifras de Costa Rica

Cambian por ley o por decreto, casi siempre cada año. **Verifíquelas siempre en la fuente
oficial antes de cambiarlas** y, si no puede confirmar una cifra, pregúntele al usuario
en lugar de suponerla. Después de actualizar, cambie la fecha de esta tabla y use el
skill **probar-sitio** (la prueba de la guía de tarifas espera IVA del 13 % y una tarifa de ₡25 000).

| Cifra | Valor en el sitio | Revisado | Dónde está | Fuente oficial |
|---|---|---|---|---|
| Tramos del impuesto sobre la renta al salario (mensual) | **Período 2026** (Decreto 45333-H, La Gaceta 229 del 5 de diciembre de 2025): exento hasta ₡918 000; 10 % hasta ₡1 347 000; 15 % hasta ₡2 364 000; 20 % hasta ₡4 727 000; 25 % sobre el exceso. No se aplican los créditos fiscales por hijos o cónyuge. Referencia: en 2025 eran ₡922 000 / ₡1 352 000 / ₡2 373 000 / ₡4 745 000 (Decreto 44772-H). Los de 2027 se publican hacia diciembre de 2026. | oct. 2026 | `js/main.js`, constante `RENTA_SALARIO` (cambie también `periodo`) | Ministerio de Hacienda, La Gaceta |
| Cargas sociales del trabajador | 10,83 % = SEM 5,50 % + IVM 4,33 % + Banco Popular 1,00 % | 2025 | `index.html`, campo `cargas` de la calculadora de capacidad y su texto de ayuda | CCSS |
| Impuesto sobre la renta de personas jurídicas | 30 % general; tarifas reducidas para pymes con ingresos brutos bajo el límite de Hacienda | 2025 | `js/plan.js` (texto de ayuda de `resultados.tasaRenta` y valor por omisión) | Hacienda |
| IVA de servicios profesionales | 13 % | 2026 | `js/tarifas.js` (`IVA`), textos de `tarifas_seccion()` en `herramientas/construir.py` | Hacienda |
| Hora profesional mínima, Colegio de Contadores Privados | ₡28 681 + IVA | oct. 2026 | `js/tarifas.js` (aviso) y `tarifas_seccion()` | Colegio de Contadores Privados |
| Salario mínimo de licenciado universitario | ₡796 921 al mes (Decreto 45303-MTSS) | 2026 | `tarifas_seccion()` | MTSS |
| Rangos de precios por servicio | Tabla `TARIFAS` | oct. 2026 | `herramientas/construir.py` | Análisis propio; validar con el usuario |
| Condición PYME | Ley 8262: cumplir al menos 2 de 3 requisitos (CCSS, Hacienda, INS); registro en SIEC | 2025 | Páginas de servicio y blog en `herramientas/construir.py`, `index.html` | MEIC (pyme.go.cr) |
| Cobertura del servicio de la deuda (DSCR) mínima | 1,25 veces | criterio bancario | `js/analisis.js` | Práctica bancaria; no es una norma legal |
| Meta de inflación del BCCR | 3 % ± 1 punto | 2025 | `js/analisis.js` | Banco Central de Costa Rica |

## Al cambiar una cifra

1. Busque todas sus apariciones con `grep` (por ejemplo `918000`, `10.83` y `10,83`, `28681` y `28 681`): una cifra puede estar en el código y también en un texto.
2. Las páginas generadas se cambian en `herramientas/construir.py` y luego se regeneran (skill **construir-sitio**).
3. Actualice la columna "Revisado" de esta tabla.
