---
name: estilo-y-tono
description: Voz, redacción y diseño visual del sitio de Luis Salas, Asesor Financiero (Costa Rica). Úselo antes de escribir o cambiar cualquier texto visible (páginas, artículos del blog, mensajes de error, textos del plan de negocios o del análisis) o de diseñar una sección, tarjeta o componente nuevo.
---

# Estilo y tono

## Quién habla y a quién

- Habla **Luis Salas**, asesor financiero independiente con más de 15 años en banca, unos 10 como ejecutivo de crédito. Su ventaja es que **conoce cómo decide un banco**.
- Le habla a **personas y pymes de Costa Rica** que no son expertas en finanzas: dueños de negocios, asalariados que buscan crédito y emprendedores.
- El tono es **cercano, profesional y honesto**: como un banquero de confianza que explica sin vender humo.

## Reglas de redacción

1. **Siempre "usted"**, nunca "tú" ni "vos". Use imperativos de usted: "Revise", "Calcule", "Escríbame".
2. **Español de Costa Rica**: pyme, CCSS, Hacienda, MEIC, SINPE Móvil, cargas sociales, aguinaldo, planilla, crédito hipotecario, ejecutivo de crédito. Evite regionalismos de otros países ("plata", "chamba", "computador").
3. **Frases cortas y concretas.** Una idea por oración. Si un término técnico es necesario, explíquelo en la misma frase: "la razón corriente (cuánto activo de corto plazo tiene por cada colón que debe a corto plazo)".
4. **Primero lo que le sirve al lector**, después el detalle. Los resultados para el cliente van en una o dos frases.
5. **Honestidad.** No prometa aprobaciones de crédito, tasas ni ahorros garantizados. Los resultados de las calculadoras y del análisis son **orientativos**: dígalo en una nota al pie (clase `note`), como las que ya existen.
6. **Sin presión de venta**: nada de "¡Última oportunidad!", mayúsculas sostenidas ni signos de exclamación repetidos. El llamado a la acción es una invitación: "Diagnóstico gratuito", "Escríbame por WhatsApp".
7. **Títulos de sección** cortos y terminados en punto: "Haga sus números.", "Su empresa, en orden.", "Guía de tarifas.". La línea de arriba (`eyebrow`) da el contexto: "Para pymes", "Solo para usted".
8. **Botones** con verbo y resultado: "Registrar mi pyme", "Ver plan de negocios", "Exportar a Excel", "Verificar requisitos". "Más información" se acepta en las tarjetas de inicio que llevan a la página de cada servicio. Nunca "Clic aquí" ni "Enviar" a secas.
9. **Mensajes de error** en lenguaje humano y con la salida: "La contraseña no coincide. Escríbala de nuevo." Nunca muestre códigos técnicos de Firebase al usuario.

## Formato de números y fechas

- Montos en colones con el símbolo pegado y espacio como separador de miles: **₡1 500 000**. En JavaScript use `toLocaleString("es-CR")`. Dólares: **$4 000**.
- Decimales con coma: **10,83 %**, **1,25 veces**.
- Porcentajes con espacio antes del signo: **13 %**.
- Fechas: "22 de octubre de 2026", o la forma corta de `toLocaleDateString("es-CR")`.
- Rangos con guion largo y espacios: **₡40 000 – ₡75 000**.

## Diseño visual

Diseño propio, limpio y tipográfico: bloques a todo el ancho, títulos grandes, mucho espacio
y botones tipo píldora. **No use marcas, logotipos, imágenes ni textos de terceros** (ni de Apple
ni de bancos): el estilo puede inspirarse en sitios limpios, pero el contenido y los recursos son propios.

- **Colores**: use solo las variables de `:root` en `css/styles.css`: `--text`, `--muted`, `--bg`, `--bg-alt`, `--line`, `--blue` (acción principal), `--link`, `--green` (bien), `--amber` (atención y `eyebrow-accent`), y los oscuros `--dark*`. Para un color nuevo, agregue una variable; no escriba colores sueltos. Excepción conocida: el rojo de alerta está escrito directo en `.semaforo.alerta`, `.diag-puntaje.alerta` y `.diag-hallazgo.alerta`; si toca esos estilos, páselo a una variable `--red`. La paleta de los gráficos del plan está validada para personas con daltonismo: no la cambie sin revisarla.
- **Semáforo**: verde = sano o fortaleza, ámbar = atención, rojo = alerta o riesgo. Acompañe siempre el color con texto ("Sano", "Atención", "Alerta"): el color solo no basta.
- **Tipografía**: la del sistema (`--font`, `--font-display`), sin fuentes externas. Cifras destacadas con `font-variant-numeric: tabular-nums`.
- **Componentes existentes** (reutilícelos antes de crear otros): `tile` / `tile-grid` (bloques de inicio), `section` + `section-head` + `eyebrow` + `section-title` + `section-sub`, `cards` / `card` / `card-tag`, `btn`, `btn-outline`, `btn-small`, `tool` + `tool-form` + `tool-result` (calculadoras), `result-main` / `result-list`, `callout`, `note`, `table-wrap` + `ind-table`, `prose` (artículos).
- **Esquinas**: `--radius` (18 px) y `--radius-lg` (28 px). Sin sombras fuertes.
- **Solo tema claro** (`color-scheme: light`).
- **Celular primero**: todo debe verse bien a 375 px sin desplazamiento horizontal. Rejillas con `minmax(0, 1fr)`; las tablas anchas van dentro de `table-wrap`.
- **Animación**: la aparición suave al desplazarse (`reveal`) es opcional y nunca debe ocultar contenido si el JavaScript falla.

## Accesibilidad

- Cada campo con su `<label>`; ayudas con `field-hint`.
- Resultados que cambian solos dentro de un contenedor con `aria-live="polite"`.
- Contraste suficiente: el texto gris (`--muted`) solo para textos secundarios.
- Los enlaces externos llevan `target="_blank" rel="noopener"`.

## Datos de contacto

Luis Salas · Asesor financiero · teléfono y WhatsApp **7012-3241** (+506) · luis1988salas@hotmail.com.
En el código, el objeto `CONTACTO` de `js/main.js`. Sin fotografía por ahora.
