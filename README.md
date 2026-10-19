# Luis Salas — Asesor Financiero

Sitio web estático de asesoría financiera independiente en Costa Rica, dirigido a personas físicas y pymes.

## Contenido

- **Servicios para personas**: capacidad de crédito, reestructuración de deudas, crédito hipotecario, comparación de ofertas y plan financiero.
- **Servicios para pymes**: gestión de financiamiento (incluido el SBD), condición PYME ante el MEIC, CFO externo, reestructuración de pasivos y diagnóstico financiero.
- **Ruta PYME MEIC**: los pasos de formalización hasta el registro en el SIEC, según la Ley 8262.
- **Calculadoras**:
  - Cuota de crédito (sistema francés), en colones o dólares.
  - Capacidad de endeudamiento: cuánto se puede pedir según el ingreso y las deudas actuales.
  - Verificador de la condición PYME (al menos 2 de 3 requisitos: CCSS, Hacienda, INS).
- **Contacto**: un formulario que abre WhatsApp con el mensaje ya escrito (no necesita servidor).

- **Páginas de servicios** (`servicios/`): capacidad de crédito, consolidación de deudas, crédito hipotecario, financiamiento para pymes, condición PYME ante el MEIC y CFO externo. Cada una tiene un botón de WhatsApp con un mensaje ya escrito para ese servicio.
- **Blog** (`blog/`): tres artículos iniciales.
  - ¿Por qué el banco rechazó su crédito?
  - Cómo obtener la condición PYME ante el MEIC, paso a paso
  - ¿Crédito en colones o en dólares?

## Estructura

```
index.html        Página principal
servicios/        Índice de servicios y una página por servicio
blog/             Índice del blog y artículos
css/styles.css    Estilos (incluye modo oscuro y diseño responsivo)
js/main.js        Calculadoras, menú móvil, pestañas y contacto por WhatsApp
.nojekyll         Indica a GitHub Pages que publique los archivos tal cual
```

## Datos de contacto

- Teléfono / WhatsApp: +506 7012-3241
- Correo: luis1988salas@hotmail.com

Si cambian, actualice el objeto `CONTACTO` en `js/main.js` y los textos visibles en las páginas (busque `7012-3241` y `luis1988salas`).

## Agregar un artículo al blog

1. Copie uno de los archivos de `blog/` con un nombre nuevo (por ejemplo, `blog/mi-articulo.html`).
2. Cambie el título, la descripción y el contenido dentro de `<article class="prose">`.
3. Agregue una tarjeta con el enlace en `blog/index.html` (y, si quiere, en la sección "Del blog" de `index.html`).

Revise los textos legales del pie de página y de las preguntas frecuentes con su asesor legal.

## Ver la página localmente

Abra `index.html` en el navegador, o levante un servidor local:

```bash
python3 -m http.server 8000
# luego abra http://localhost:8000
```

## Publicar en GitHub Pages

1. En GitHub, abra el repositorio y vaya a **Settings → Pages**.
2. En **Build and deployment**, elija **Source: Deploy from a branch**.
3. Seleccione la rama donde está el sitio (por ejemplo, `main`, o `claude/financial-advisor-market-tools-nnvdb1` mientras no se haya fusionado) y la carpeta **/ (root)**. Pulse **Save**.
4. En uno o dos minutos el sitio estará en `https://luispo88.github.io/Asesor-Financiero/`.

GitHub Pages es gratuito para repositorios públicos. Si el repositorio es privado, necesita un plan de pago de GitHub, o puede publicarlo gratis en Netlify o Cloudflare Pages.

### Dominio propio (opcional)

Compre un dominio (por ejemplo, `luissalas.cr` en NIC Costa Rica, o un `.com`), escríbalo en **Settings → Pages → Custom domain** y configure los registros DNS que indica GitHub. Active **Enforce HTTPS**.

> La información sobre trámites (MEIC, Hacienda, CCSS, INS) es orientativa y puede cambiar. Verifíquela periódicamente con las instituciones oficiales.
