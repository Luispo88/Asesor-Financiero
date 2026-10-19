# Asesor Financiero — Página inicial

Sitio web estático para un servicio de asesoría financiera independiente en Costa Rica, dirigido a personas físicas y pymes.

## Contenido

- **Servicios para personas**: capacidad de crédito, reestructuración de deudas, crédito hipotecario, comparación de ofertas y plan financiero.
- **Servicios para pymes**: gestión de financiamiento (incluido el SBD), condición PYME ante el MEIC, CFO externo, reestructuración de pasivos y diagnóstico financiero.
- **Ruta PYME MEIC**: los pasos de formalización hasta el registro en el SIEC, según la Ley 8262.
- **Calculadoras**:
  - Cuota de crédito (sistema francés), en colones o dólares.
  - Capacidad de endeudamiento: cuánto se puede pedir según el ingreso y las deudas actuales.
  - Verificador de la condición PYME (al menos 2 de 3 requisitos: CCSS, Hacienda, INS).
- **Contacto**: un formulario que abre WhatsApp con el mensaje ya escrito (no necesita servidor).

## Estructura

```
index.html      Página principal
css/styles.css  Estilos (incluye modo oscuro y diseño responsivo)
js/main.js      Calculadoras, menú móvil, pestañas y formulario de contacto
```

## Qué personalizar antes de publicar

1. En `index.html`, reemplace todos los textos entre `[corchetes]`: nombre, teléfono, correo, zona de atención y foto.
2. En `js/main.js`, actualice el objeto `CONTACTO` con su número de WhatsApp (por ejemplo, `50688887777`) y su correo.
3. Revise los textos legales del pie de página y de las preguntas frecuentes con su asesor legal.

## Ver la página localmente

Abra `index.html` en el navegador, o levante un servidor local:

```bash
python3 -m http.server 8000
# luego abra http://localhost:8000
```

## Publicar

Es un sitio estático, así que se puede publicar gratis en GitHub Pages, Netlify o Cloudflare Pages, y después conectarle un dominio propio (por ejemplo, `.cr` o `.com`).

> La información sobre trámites (MEIC, Hacienda, CCSS, INS) es orientativa y puede cambiar. Verifíquela periódicamente con las instituciones oficiales.
