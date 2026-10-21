// Cuentas de clientes: registro, inicio de sesión y acceso al Área de clientes (Firebase).
import { firebaseConfig, firebaseConfigurado } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const PAGINA_CLIENTES = "../clientes/index.html";
const PAGINA_CUENTA = "../cuenta/index.html";

const ERRORES = {
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicie sesión o recupere su contraseña.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/weak-password": "La contraseña es muy débil. Use al menos 8 caracteres.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos. Espere unos minutos e intente de nuevo.",
  "auth/network-request-failed": "No hay conexión. Revise su internet e intente de nuevo.",
  "auth/user-disabled": "Esta cuenta está deshabilitada. Escríbame por WhatsApp.",
  "auth/unauthorized-domain": "Este sitio aún no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
  "auth/operation-not-allowed": "El acceso con correo y contraseña no está habilitado en Firebase (Authentication → Método de acceso).",
};
const traducir = (e) => ERRORES[e?.code] || "No se pudo completar la operación. Intente de nuevo.";

const mensaje = document.getElementById("auth-mensaje");
function mostrar(texto, tipo = "") {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.className = `tool-message ${tipo}`;
}

// Abre la pestaña "Crear cuenta" cuando se llega con ?modo=registro.
if (new URLSearchParams(location.search).get("modo") === "registro") {
  document.getElementById("tab-registro")?.click();
}

if (firebaseConfigurado) {
  iniciar().catch(() => mostrar("No se pudo cargar el acceso de clientes. Recargue la página.", "warn"));
} else {
  document.querySelectorAll("[data-auth-pendiente]").forEach((el) => (el.hidden = false));
  document.querySelectorAll("#form-ingresar, #form-registro").forEach((form) => {
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
  });
  const cargando = document.getElementById("area-cargando");
  if (cargando) cargando.hidden = true;
}

async function iniciar() {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const sesion = auth.getAuth(app);
  sesion.languageCode = "es";
  const db = fs.getFirestore(app);

  if (document.getElementById("form-ingresar")) paginaCuenta(sesion, auth, db, fs);
  if (document.getElementById("area-contenido")) paginaClientes(sesion, auth, db, fs);
}

function paginaCuenta(sesion, auth, db, fs) {
  let registrando = false;
  auth.onAuthStateChanged(sesion, (usuario) => {
    if (usuario && !registrando) location.replace(PAGINA_CLIENTES);
  });

  const ingresar = document.getElementById("form-ingresar");
  ingresar.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ingresar.checkValidity()) return ingresar.reportValidity();
    const { correo, clave } = Object.fromEntries(new FormData(ingresar));
    mostrar("Iniciando sesión…");
    try {
      await auth.signInWithEmailAndPassword(sesion, correo.trim(), clave);
    } catch (err) {
      mostrar(traducir(err), "warn");
    }
  });

  document.getElementById("btn-olvido").addEventListener("click", async () => {
    const correo = ingresar.elements.correo.value.trim();
    if (!correo) {
      mostrar("Escriba su correo en el campo de arriba y vuelva a pulsar «¿Olvidó su contraseña?».", "warn");
      ingresar.elements.correo.focus();
      return;
    }
    try {
      await auth.sendPasswordResetEmail(sesion, correo);
      mostrar("Si existe una cuenta con ese correo, le enviamos un enlace para crear una nueva contraseña.", "ok");
    } catch (err) {
      mostrar(traducir(err), "warn");
    }
  });

  const registro = document.getElementById("form-registro");
  registro.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!registro.checkValidity()) return registro.reportValidity();
    const d = Object.fromEntries(new FormData(registro));
    if (d.clave !== d.clave2) {
      mostrar("Las contraseñas no coinciden.", "warn");
      return;
    }
    registrando = true;
    mostrar("Creando su cuenta…");
    try {
      const { user } = await auth.createUserWithEmailAndPassword(sesion, d.correo.trim(), d.clave);
      await auth.updateProfile(user, { displayName: d.nombre.trim() });
      // El perfil queda en Firestore (colección "usuarios") para que el asesor vea el registro.
      await fs.setDoc(fs.doc(db, "usuarios", user.uid), {
        nombre: d.nombre.trim(),
        empresa: d.empresa.trim(),
        telefono: d.telefono.trim(),
        sector: d.sector.trim(),
        correo: user.email,
        consentimientoLey8968: true,
        creado: fs.serverTimestamp(),
      }).catch(() => {});
      await auth.sendEmailVerification(user).catch(() => {});
      location.replace(PAGINA_CLIENTES);
    } catch (err) {
      registrando = false;
      mostrar(traducir(err), "warn");
    }
  });
}

function paginaClientes(sesion, auth, db, fs) {
  auth.onAuthStateChanged(sesion, async (usuario) => {
    if (!usuario) {
      location.replace(PAGINA_CUENTA);
      return;
    }
    let perfil = {};
    try {
      const snap = await fs.getDoc(fs.doc(db, "usuarios", usuario.uid));
      if (snap.exists()) perfil = snap.data();
    } catch {
      // Sin perfil guardado se usa el nombre de la cuenta.
    }
    const nombre = (perfil.nombre || usuario.displayName || "cliente").split(" ")[0];
    document.querySelectorAll("[data-usuario-nombre]").forEach((el) => (el.textContent = nombre));
    document.querySelectorAll("[data-usuario-empresa]").forEach((el) => (el.textContent = perfil.empresa || usuario.email));
    document.getElementById("area-espera").hidden = true;
    document.getElementById("area-contenido").hidden = false;
  });

  document.getElementById("btn-salir").addEventListener("click", async () => {
    await auth.signOut(sesion);
    location.replace(PAGINA_CUENTA);
  });
}
