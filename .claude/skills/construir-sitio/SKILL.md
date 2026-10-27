---
name: construir-sitio
description: Cómo modificar y regenerar las páginas del sitio de Luis Salas, Asesor Financiero. Úselo antes de cambiar cualquier página HTML, texto, servicio, artículo del blog, el área de clientes, el plan de negocios o el panel del asesor.
---

# Construir el sitio

Sitio estático (HTML, CSS y JavaScript sin dependencias) publicado con GitHub Pages
desde la raíz del repositorio. No hay paso de compilación de JavaScript ni de CSS.

## Qué se genera y qué se edita a mano

| Archivo | Cómo se cambia |
|---|---|
| `index.html` | **A mano.** No lo genera nada. |
| `servicios/`, `blog/`, `cuenta/`, `clientes/`, `panel/`, `sitemap.xml` | **Generados** por `herramientas/construir.py`. Nunca los edite directamente: el cambio se pierde en la próxima generación. |
| `css/styles.css`, `js/*.js` | A mano. |

Después de cambiar `herramientas/construir.py`, regenere desde la raíz:

```bash
python3 herramientas/construir.py
```

Debe imprimir `ok`. Revise con `git diff --stat` que solo cambiaron las páginas esperadas.

## Dónde está cada cosa en `herramientas/construir.py`

- `header()` / `footer()` / `page()`: encabezado, pie y plantilla común de las páginas internas. El menú también está repetido en `index.html`: si cambia el menú, cambie ambos.
- `SERVICIOS` + `servicio_page()`: una página por servicio. Al agregar uno, agregue también su tarjeta en `index.html` y en `servicios_index()`.
- `ARTICULOS` + `articulo_page()`: artículos del blog.
- `cuenta_page()`, `clientes_page()`, `plan_page()`, `panel_page()`: páginas privadas (`privada=True`, sin indexar). `TARIFAS` y `tarifas_seccion()` forman la guía de tarifas del panel.
- `SITE`: dirección pública, usada en el sitemap y en las etiquetas canónicas.

## JavaScript

- `js/main.js`: menú, calculadoras públicas (cuota, capacidad de endeudamiento, PYME), enlaces de WhatsApp (`CONTACTO`).
- `js/firebase-config.js`: configuración de Firebase y `CORREOS_ASESOR`.
- `js/auth.js`: cuentas, área de clientes y panel del asesor.
- `js/plan.js`: plan de negocios (secciones, cálculos, guardado como texto JSON en `planes/{uid}`).
- `js/analisis.js`: análisis financiero por reglas y puntaje de salud.
- `js/indicadores.js`, `js/tarifas.js`: calculadoras del área de clientes y del panel.

## Reglas del proyecto

- Textos en español de Costa Rica, tratando al lector de **usted**, claros y sin tecnicismos innecesarios.
- Diseño propio, limpio y minimalista: no use marcas, logotipos ni recursos de terceros.
- Datos de los clientes: siempre como texto (`textContent`), nunca como HTML.
- Firestore no admite listas dentro de listas: por eso el plan se guarda como texto JSON.
- Las páginas privadas son HTML público protegido solo por la sesión: no ponga en ellas nada confidencial. La protección real de los datos está en `firestore.rules`; si cambia una regla, el asesor debe publicarla en la consola de Firebase.
- Para que un elemento oculto no aparezca se usa el atributo `hidden` (hay una regla global `[hidden]{display:none !important}`).
- Rejillas: use `minmax(0, 1fr)` en lugar de `1fr` para que nada se desborde en el celular.

Antes de subir cualquier cambio, use el skill **probar-sitio**.
