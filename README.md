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
- **Plan de negocios** (`clientes/plan.html`): basado en la plantilla de plan de negocio en Excel. 14 secciones: previsión de ventas a 3 años (productos ilimitados, unidades por mes, costo y precio, con gráficos), plan financiero, balance de situación con razones financieras, flujo de caja, estado de resultados, visión general, problemas y soluciones, oferta, calendario y métricas, resumen ejecutivo, mercadeo y ventas, mercado objetivo, FODA y competencia. En todas las secciones el cliente puede agregar y quitar elementos: productos, cuentas del balance, flujo y resultados, fuentes y usos de financiamiento, actividades, hitos, indicadores, factores FODA, segmentos, características, competidores y apartados de texto. Los cálculos son automáticos, se guarda solo en la cuenta del cliente (colección `planes`, como texto JSON en el campo `json`), se puede imprimir o guardar en PDF, y el asesor lo abre en solo lectura desde el panel.
- **Análisis financiero automático** (`js/analisis.js`): motor de reglas (sin IA) que analiza el plan en 8 áreas (ventas y crecimiento, rentabilidad, liquidez, endeudamiento y solvencia, eficiencia y capital de trabajo, flujo de caja, consistencia de la información y estrategia). Calcula razones financieras, punto de equilibrio, margen de seguridad, ciclo de conversión de efectivo, cobertura del servicio de deuda, concentración y estacionalidad de ventas, y asigna un puntaje de salud financiera. El cliente ve un **Diagnóstico financiero** breve (puntaje, 3 fortalezas, 3 mejoras, 3 recomendaciones); el asesor ve el **Análisis del asesor** completo (resumen ejecutivo, datos clave, puntaje por área, hallazgos con referencias, recomendaciones detalladas, preguntas para la reunión e información faltante). Rangos de referencia: CFI, CFA Institute, práctica bancaria (cobertura de deuda de 1,25) y meta de inflación del BCCR. Los rangos de márgenes, liquidez y días de capital de trabajo se ajustan a la **actividad** que el cliente elige en su plan (comercio, restaurantes, servicios, manufactura, construcción, agropecuario u otra).
- **Panel del asesor** (`panel/`): solo para la cuenta del asesor con correo verificado. Lista de clientes registrados con búsqueda, filtro por estado, estadísticas, **puntaje de salud financiera** de cada cliente (calculado con su plan de negocios, con alertas principales y fecha del último cambio, y orden por menor salud), estado y notas privadas de seguimiento, contacto directo por WhatsApp o correo y exportación a Excel. Incluye una **guía de tarifas** (`js/tarifas.js`) que calcula la tarifa mínima por hora según la meta de ingreso, los costos y las horas cobrables, y el precio de cada servicio con esa tarifa.
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
js/plan.js        Plan de negocios: secciones, cálculos, gráficos y guardado
js/analisis.js    Análisis financiero: reglas, rangos de referencia y recomendaciones
js/tarifas.js     Guía de tarifas del Panel del asesor
herramientas/     Generador de páginas (construir.py) y pruebas en el navegador (pruebas/)
.claude/skills/   Instrucciones para Claude: construir, probar, cifras de Costa Rica, estilo, análisis financiero y seguridad
cuenta/           Página de acceso: iniciar sesión y crear cuenta
clientes/         Área de clientes (requiere sesión)
panel/            Panel del asesor (solo la cuenta del asesor)
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

**Ver a las personas registradas:** en el **Panel del asesor** (`panel/`), o en la consola de Firebase: **Authentication → Users** y **Firestore Database → usuarios**.

**Panel del asesor:** solo entra la cuenta cuyo correo está en `CORREOS_ASESOR` (`js/firebase-config.js`) y en la función `esAsesor()` de `firestore.rules`, y únicamente con el correo verificado. Para cambiar o agregar un correo de asesor, actualice ambos lugares y vuelva a publicar las reglas en Firebase. El estado y las notas de cada cliente se guardan en la colección `seguimiento`, que los clientes no pueden leer.

**Sobre la privacidad del contenido:** el inicio de sesión controla quién entra al Área de clientes, pero el texto de esa página está en el sitio público, de modo que alguien con conocimientos técnicos podría leerlo. Es adecuado para contenido educativo. Los datos de cada cliente (su perfil) sí quedan protegidos por las reglas de Firestore. Cuando los clientes compartan información financiera propia, debe guardarse en Firestore, nunca en las páginas.

## Modificar y probar el sitio

Las páginas de `servicios/`, `blog/`, `cuenta/`, `clientes/` y `panel/`, y `sitemap.xml`, se generan con `herramientas/construir.py`: cambie el texto ahí y regenere. `index.html` se edita a mano.

```bash
python3 herramientas/construir.py     # regenera las páginas
node herramientas/pruebas/probar.mjs  # pruebas en el navegador (requiere Playwright)
```

Las pruebas usan un Firebase simulado y no tocan la base de datos real. Claude sigue estas mismas instrucciones gracias a los skills de `.claude/skills/`.

## Agregar un artículo al blog

1. Agregue el artículo a la lista `ARTICULOS` de `herramientas/construir.py` (título, descripción y contenido), siguiendo los que ya existen.
2. Regenere con `python3 herramientas/construir.py`: se crean la página y su tarjeta en `blog/index.html`, y se actualiza el sitemap.
3. Si quiere, agregue una tarjeta en la sección "Del blog" de `index.html`.

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
