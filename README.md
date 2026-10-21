# Luis Salas — Asesor Financiero

Sitio web estático de asesoría financiera independiente en Costa Rica, dirigido a personas físicas y pymes.

Diseño limpio y tipográfico: navegación translúcida, bloques de pantalla completa que alternan fondos claros y oscuros, titulares grandes, botones tipo píldora y animaciones suaves al hacer scroll.

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
- **Cuentas de clientes** (`cuenta/` y `clientes/`): registro con correo y contraseña, inicio de sesión y recuperación de contraseña. Con la sesión iniciada se entra al **Área de clientes**, con la introducción al funcionamiento del CFO externo, la revisión de la información financiera, una calculadora de indicadores y los próximos pasos.
- **Blog** (`blog/`): tres artículos iniciales.
  - ¿Por qué el banco rechazó su crédito?
  - Cómo obtener la condición PYME ante el MEIC, paso a paso
  - ¿Crédito en colones o en dólares?

## Estructura

```
index.html        Página principal
servicios/        Índice de servicios y una página por servicio
blog/             Índice del blog y artículos
css/styles.css    Estilos (diseño responsivo para escritorio y celular)
js/main.js        Calculadoras, menú móvil, pestañas y contacto por WhatsApp
js/auth.js        Registro, inicio de sesión y acceso al Área de clientes (Firebase)
js/firebase-config.js  Datos del proyecto de Firebase (se completan al configurarlo)
js/indicadores.js Indicadores financieros del Área de clientes
cuenta/           Página de acceso: iniciar sesión y crear cuenta
clientes/         Área de clientes (requiere sesión)
firestore.rules   Reglas de seguridad de la base de datos de clientes
.nojekyll         Indica a GitHub Pages que publique los archivos tal cual
sitemap.xml       Lista de páginas para Google Search Console
```

## Datos de contacto

- Teléfono / WhatsApp: +506 7012-3241
- Correo: luis1988salas@hotmail.com

Si cambian, actualice el objeto `CONTACTO` en `js/main.js` y los textos visibles en las páginas (busque `7012-3241` y `luis1988salas`).

## Configurar las cuentas de clientes (Firebase)

Las cuentas usan Firebase Authentication y Firestore, de Google. El plan gratuito (Spark) es suficiente para empezar.

1. Entre a [console.firebase.google.com](https://console.firebase.google.com) con su cuenta de Google y pulse **Crear un proyecto** (por ejemplo, `asesor-financiero`). Puede desactivar Google Analytics.
2. En **Authentication → Comenzar → Método de acceso**, habilite **Correo electrónico/contraseña**.
3. Dentro de **Authentication**, abra la pestaña superior **Configuración** (*Settings*); en el menú de la izquierda de esa pestaña elija **Dominios autorizados** (*Authorized domains*), pulse **Agregar dominio** y escriba `luispo88.github.io` (sin `https://` ni `/Asesor-Financiero`).
4. En **Firestore Database → Crear base de datos**, elija modo de producción y una ubicación (por ejemplo, `us-central1`). En la pestaña **Reglas**, pegue el contenido de `firestore.rules` y pulse **Publicar**.
5. En **Configuración del proyecto (ícono de engranaje) → Tus apps**, agregue una app **Web** (`</>`). Copie los valores de `firebaseConfig` en `js/firebase-config.js`.

Mientras `js/firebase-config.js` esté vacío, las páginas de acceso muestran un aviso y el formulario queda deshabilitado.

**Ver a las personas registradas:** en **Authentication → Users** (correos y fechas) y en **Firestore Database → usuarios** (nombre, empresa, teléfono y sector).

**Sobre la privacidad del contenido:** el inicio de sesión controla quién entra al Área de clientes, pero el texto de esa página está en el sitio público, de modo que alguien con conocimientos técnicos podría leerlo. Es adecuado para contenido educativo. Los datos de cada cliente (su perfil) sí quedan protegidos por las reglas de Firestore. Cuando los clientes compartan información financiera propia, debe guardarse en Firestore, nunca en las páginas.

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

El repositorio es público, así que GitHub Pages es gratuito.

1. En GitHub, abra el repositorio y vaya a **Settings → Pages**.
2. En **Build and deployment → Source**, elija **Deploy from a branch**.
3. En **Branch**, seleccione `claude/financial-advisor-market-tools-nnvdb1` (la rama principal del repositorio) y la carpeta **/ (root)**. Pulse **Save**.
4. En uno o dos minutos el sitio estará en **https://luispo88.github.io/Asesor-Financiero/**. Cada cambio que se suba a esa rama se publica solo.

Las páginas ya incluyen la dirección pública (etiquetas `canonical` y Open Graph), para que Google las indexe correctamente y para que el enlace muestre título y descripción al compartirlo por WhatsApp o redes sociales.

### Aparecer en Google

1. Entre a [Google Search Console](https://search.google.com/search-console) y agregue la propiedad con prefijo de URL `https://luispo88.github.io/Asesor-Financiero/`.
2. Verifique la propiedad (el método de etiqueta HTML es el más sencillo: se agrega una línea en el `<head>` de `index.html`).
3. En **Sitemaps**, envíe `https://luispo88.github.io/Asesor-Financiero/sitemap.xml`.

Si más adelante conecta un dominio propio, cambie la dirección `https://luispo88.github.io/Asesor-Financiero/` por la nueva en las páginas y en `sitemap.xml`.

### Dominio propio (opcional)

Compre un dominio (por ejemplo, `luissalas.cr` en NIC Costa Rica, o un `.com`), escríbalo en **Settings → Pages → Custom domain** y configure los registros DNS que indica GitHub. Active **Enforce HTTPS**.

> La información sobre trámites (MEIC, Hacienda, CCSS, INS) es orientativa y puede cambiar. Verifíquela periódicamente con las instituciones oficiales.
