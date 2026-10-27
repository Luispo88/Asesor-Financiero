---
name: probar-sitio
description: Cómo probar el sitio de Luis Salas, Asesor Financiero, en el navegador con Firebase simulado antes de subir cambios. Úselo después de cualquier cambio en páginas, estilos o JavaScript, y antes de cada commit.
---

# Probar el sitio

```bash
node herramientas/pruebas/probar.mjs
```

Levanta un servidor local, abre Chromium con Playwright y simula Firebase con los
archivos de `herramientas/pruebas/mock/` (no toca la base de datos real). Termina con
`N de N pruebas pasaron.` y código 0; si algo falla, lista las pruebas y termina con código 1.
**No suba cambios con pruebas fallidas.**

## Qué revisa

1. Todas las páginas públicas en computadora (1440 px) y celular (375 px): sin errores de JavaScript y sin desborde horizontal.
2. Calculadoras de la página de inicio (cuota, capacidad, cargas sociales, impuesto).
3. Registro de un cliente, área de clientes, plan de negocios (agregar productos, cálculos, guardado y recarga) y que el cliente no entre al panel ni vea el análisis del asesor.
4. Análisis financiero de una empresa sana y una en riesgo, sin valores rotos (`null`, `NaN`, `[object …]`), y el plan en solo lectura para el asesor.
5. Panel del asesor: conteos, salud financiera y orden, exportación a Excel, guía de tarifas y vista de celular.
6. Seguridad: revisión del código (inyección de HTML, enlaces externos, scripts de terceros, claves privadas, reglas de Firestore, páginas privadas sin indexar) y ataques simulados con datos maliciosos en el panel, el plan y la exportación (vea el skill **seguridad**).

## Al agregar una función

Agregue una prueba en `probar.mjs` con `revisar(condición, "mensaje")` en la sección que
corresponda. Compruebe que la prueba falla si rompe la función a propósito, y luego deshaga ese cambio.

## Cómo funciona la simulación de Firebase

- `mock/auth.js`: usuarios en `localStorage.mockUsers` y sesión en `localStorage.mockAuth`.
- `mock/firestore.js`: cada documento se guarda como `localStorage["doc:<colección>/<id>"]`. `getDocs` solo responde a la cuenta del asesor con correo verificado, como las reglas reales.
- La función `sembrar()` de `probar.mjs` prepara usuarios, sesión y documentos antes de abrir una página.

## Entorno

- Usa Playwright instalado localmente o de forma global (`npm root -g`), y el Chromium de `/opt/pw-browsers/chromium` si existe. No ejecute `playwright install` en las sesiones en la nube.
- Para revisar un cambio visual, tome capturas con Playwright en un archivo temporal fuera del repositorio. Si la página usa animaciones de aparición (`.reveal`), inyecte `.reveal{opacity:1!important;transform:none!important}` antes de la captura.
