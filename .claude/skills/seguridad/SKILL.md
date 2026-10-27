---
name: seguridad
description: Seguridad del sitio de Luis Salas, Asesor Financiero - cuentas de clientes, datos financieros en Firebase, reglas de Firestore, protección contra inyección de código y la Ley 8968 de protección de datos de Costa Rica. Úselo antes de tocar el registro, el inicio de sesión, el área de clientes, el plan de negocios, el panel del asesor, firestore.rules, la exportación a Excel o cualquier código que muestre datos escritos por usuarios, y cuando el usuario pregunte por seguridad.
---

# Seguridad

El sitio guarda **datos personales y estados financieros de pymes**. Un error de seguridad aquí
expone información confidencial de los clientes del asesor y su reputación profesional.

## Cómo está protegido hoy

| Riesgo | Protección | Dónde |
|---|---|---|
| Un cliente lee datos de otro | Reglas de Firestore: cada quien solo su `usuarios/{uid}` y `planes/{uid}` | `firestore.rules` |
| Alguien se hace pasar por el asesor | `esAsesor()` exige el correo del asesor **y** `email_verified == true` | `firestore.rules`, `CORREOS_ASESOR` en `js/firebase-config.js` |
| Borrado de información | `allow delete: if false` en perfiles y planes | `firestore.rules` |
| Notas privadas del asesor | `seguimiento/{uid}` solo lo lee y escribe el asesor | `firestore.rules` |
| Inyección de código (XSS) en el panel o el plan | Todo dato de usuario se pone con `textContent` o con el ayudante `h()`; nunca `innerHTML` | `js/auth.js`, `js/plan.js` |
| Fórmulas maliciosas en la exportación a Excel | Los valores que empiezan con `= + - @` se exportan con `'` delante | `exportar()` en `js/auth.js` |
| Páginas privadas en buscadores | `<meta name="robots" content="noindex">` | `page(..., privada=True)` en `herramientas/construir.py` |
| Enlaces externos que manipulan la pestaña | `rel="noopener"` en todo `target="_blank"` | HTML y `js/` |
| Código de terceros alterado | Solo se carga el SDK de Firebase de `www.gstatic.com`, con versión fija (`10.12.2`) | `SDK` en `js/auth.js` |

**Lo que NO protege la interfaz:** las páginas privadas (`clientes/`, `panel/`) son HTML público:
la sesión solo oculta el contenido. **La protección real de los datos está en las reglas de
Firestore.** Nunca ponga datos de clientes, contraseñas ni información confidencial en el HTML,
el JavaScript ni el repositorio (que es público).

## Reglas al escribir código

1. **Datos de usuarios siempre como texto.** Prohibido `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` y `setTimeout` con texto. Use `textContent`, `h()` de `plan.js` o `el()` de `auth.js`. Las pruebas lo revisan.
2. **Toda colección nueva de Firestore necesita su regla** antes de usarse: cerrada por defecto, cada usuario solo lo suyo, el asesor con `esAsesor()`. Nunca `allow read, write: if true` ni `if request.auth != null` a secas, que dejaría todo abierto a cualquier persona con una cuenta.
3. **Cambios en `firestore.rules`:** explíquele al usuario qué cambia y pídale que las publique en la consola de Firebase (**Firestore Database → Reglas → Publicar**). El archivo del repositorio no se aplica solo.
4. **Exportaciones** (CSV, Excel): neutralice fórmulas como hace `exportar()`.
5. **Enlaces externos**: `target="_blank"` siempre con `rel="noopener"`.
6. **Scripts externos**: no agregue librerías de otros sitios. Si fuera indispensable, use una versión fija y explíquele al usuario el riesgo.
7. **Claves**: la `apiKey` web de Firebase en `js/firebase-config.js` es **pública por diseño**: no es un secreto, la seguridad la dan las reglas. Pero nunca suba una cuenta de servicio, una clave privada ni una clave de API de pago (por ejemplo, de IA): esas requieren un servidor.
8. **Mensajes de error**: en español y sin detalles técnicos ni datos internos (mapa de errores en `js/auth.js`).
9. **Datos mínimos**: no pida al cliente más datos personales de los necesarios (cédula, cuentas bancarias, contraseñas de terceros: nunca).

## Cómo verificarlo

- `node herramientas/pruebas/probar.mjs` incluye la sección **Seguridad**: revisión del código (inyección, enlaces, scripts externos, claves, reglas, páginas privadas) y ataques simulados (un cliente registra un nombre con código malicioso y una fórmula de Excel; el panel, el plan y la exportación deben mostrarlos como texto).
- Para revisar las reglas **reales** publicadas, use la API REST de Firebase (`identitytoolkit.googleapis.com` y `firestore.googleapis.com`) con cuentas de prueba temporales: un cliente no debe leer el perfil de otro ni `seguimiento`, y nadie debe poder borrar. Borre las cuentas y documentos de prueba al terminar y avísele al usuario.
- Antes de cambios grandes en cuentas, panel o reglas, ejecute también la revisión integrada `/security-review`.

## Ley 8968 (protección de datos personales, Costa Rica)

- El registro pide **consentimiento** (casilla obligatoria) y explica para qué se usan los datos. Si cambia el uso (por ejemplo, enviar datos a un proveedor de IA o a terceros), hay que actualizar el texto y pedir consentimiento de nuevo.
- El cliente tiene derecho a acceder, corregir y pedir la eliminación de sus datos: como las reglas impiden borrar desde el sitio, el asesor lo hace desde la consola de Firebase (Authentication y Firestore) cuando el cliente lo solicite.
- Si hay una filtración o un acceso indebido: cambie la contraseña del asesor, revise **Authentication → Users** y los documentos en Firestore, corrija la regla, y avísele a los clientes afectados.

## Recomendaciones pendientes (requieren decisión o acción del usuario en la consola)

Proponga estas mejoras cuando el usuario trabaje en seguridad; no las dé por hechas.

1. **Verificación en dos pasos** en la cuenta de Google que administra Firebase y en GitHub.
2. **Firebase App Check** (con reCAPTCHA) para que solo el sitio pueda usar el proyecto de Firebase.
3. **Protección contra enumeración de correos** en Authentication → Configuración (evita que alguien averigüe qué correos están registrados).
4. **Validar tamaño y campos en las reglas** (por ejemplo, que `planes/{uid}.json` sea texto de menos de 500 000 caracteres y que `usuarios/{uid}` solo tenga los campos esperados).
5. **Política de seguridad de contenido (CSP)** en las páginas privadas, limitando scripts a `self` y `www.gstatic.com` y conexiones a `*.googleapis.com`. Debe probarse con el Firebase real antes de publicarse, porque una CSP mal escrita deja a los clientes sin poder entrar.
6. **Alertas de presupuesto** en Google Cloud, por si alguien abusa del proyecto.
