// Cuentas de clientes: registro, inicio de sesión, Área de clientes y Panel del asesor (Firebase).
import { firebaseConfig, firebaseConfigurado, CORREOS_ASESOR } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const PAGINA_CLIENTES = "../clientes/index.html";
const PAGINA_CUENTA = "../cuenta/index.html";
const PAGINA_PANEL = "../panel/index.html";

const esAsesor = (usuario) => CORREOS_ASESOR.includes((usuario?.email || "").toLowerCase());

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
  ["area-cargando", "panel-estado", "plan-estado"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
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
  if (document.getElementById("panel-contenido")) paginaPanel(sesion, auth, db, fs);
  if (document.getElementById("plan-app")) {
    const { iniciarPlan } = await import("./plan.js");
    iniciarPlan({ sesion, auth, db, fs, esAsesor });
  }
}

function paginaCuenta(sesion, auth, db, fs) {
  let registrando = false;
  auth.onAuthStateChanged(sesion, (usuario) => {
    if (usuario && !registrando) location.replace(esAsesor(usuario) ? PAGINA_PANEL : PAGINA_CLIENTES);
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
    document.querySelectorAll("[data-solo-asesor]").forEach((el) => (el.hidden = !esAsesor(usuario)));
    document.getElementById("area-espera").hidden = true;
    document.getElementById("area-contenido").hidden = false;
  });

  document.getElementById("btn-salir").addEventListener("click", async () => {
    await auth.signOut(sesion);
    location.replace(PAGINA_CUENTA);
  });
}

// --- Panel del asesor ---
const ESTADOS = ["Nuevo", "Contactado", "En diagnóstico", "Cliente activo", "No interesado"];
const fechaCorta = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", year: "numeric" });
const normalizar = (t) => (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function paginaPanel(sesion, auth, db, fs) {
  const estado = document.getElementById("panel-estado");
  const verificar = document.getElementById("panel-verificar");
  const filas = document.getElementById("panel-filas");
  const buscar = document.getElementById("panel-buscar");
  const filtro = document.getElementById("panel-filtro");
  const ordenar = document.getElementById("panel-orden");
  const puntajeDe = (c) => c.salud?.analisis?.puntaje ?? null;
  const guardado = document.getElementById("panel-guardado");
  let clientes = [];

  auth.onAuthStateChanged(sesion, (usuario) => {
    if (!usuario) {
      location.replace(PAGINA_CUENTA);
      return;
    }
    if (!esAsesor(usuario)) {
      estado.textContent = "Esta sección es solo para el asesor.";
      return;
    }
    if (!usuario.emailVerified) {
      estado.textContent = `Para proteger la información de sus clientes, confirme su correo ${usuario.email}. Revise su bandeja de entrada y la carpeta de correo no deseado.`;
      verificar.hidden = false;
      return;
    }
    cargar();
  });

  document.getElementById("btn-reenviar").addEventListener("click", async () => {
    try {
      await auth.sendEmailVerification(sesion.currentUser);
      mostrar("Le enviamos un nuevo correo de verificación.", "ok");
    } catch (err) {
      mostrar(traducir(err), "warn");
    }
  });

  document.getElementById("btn-ya-verifique").addEventListener("click", async () => {
    await sesion.currentUser.reload();
    if (!sesion.currentUser.emailVerified) {
      mostrar("Su correo todavía no aparece como verificado. Abra el enlace del correo y vuelva a intentarlo.", "warn");
      return;
    }
    await sesion.currentUser.getIdToken(true);
    verificar.hidden = true;
    mostrar("");
    cargar();
  });

  async function cargar() {
    estado.textContent = "Cargando clientes…";
    try {
      const [usuarios, seguimiento] = await Promise.all([
        fs.getDocs(fs.collection(db, "usuarios")),
        fs.getDocs(fs.collection(db, "seguimiento")),
      ]);
      const notas = {};
      seguimiento.forEach((d) => (notas[d.id] = d.data()));
      // Salud financiera: se analiza el plan de negocios de cada cliente con el mismo motor del plan.
      const salud = {};
      try {
        const [{ diagnosticoDePlan }, planes] = await Promise.all([import("./plan.js"), fs.getDocs(fs.collection(db, "planes"))]);
        planes.forEach((d) => (salud[d.id] = diagnosticoDePlan(d.data())));
      } catch {
        // Si no se pueden leer los planes, el panel funciona igual sin la columna de salud.
      }
      clientes = [];
      usuarios.forEach((d) => {
        const u = d.data();
        if (CORREOS_ASESOR.includes((u.correo || "").toLowerCase())) return; // la cuenta del asesor no es un cliente
        clientes.push({
          uid: d.id,
          nombre: u.nombre || "",
          empresa: u.empresa || "",
          telefono: u.telefono || "",
          sector: u.sector || "",
          correo: u.correo || "",
          creado: u.creado?.toDate ? u.creado.toDate() : null,
          estado: notas[d.id]?.estado || "Nuevo",
          notas: notas[d.id]?.notas || "",
          salud: salud[d.id] || { tienePlan: false, analisis: null, actualizado: null },
        });
      });
      clientes.sort((a, b) => (b.creado || 0) - (a.creado || 0));
    } catch (err) {
      estado.textContent = err?.code === "permission-denied"
        ? "Firestore rechazó la lectura. Publique las reglas actualizadas de firestore.rules en la consola de Firebase."
        : "No se pudieron cargar los clientes. Recargue la página.";
      return;
    }
    document.getElementById("panel-espera").hidden = true;
    document.getElementById("panel-contenido").hidden = false;
    pintarResumen();
    pintarTabla();
  }

  function pintarResumen() {
    const hace30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const set = (id, v) => (document.getElementById(id).textContent = v.toLocaleString("es-CR"));
    set("stat-total", clientes.length);
    set("stat-30", clientes.filter((c) => c.creado && c.creado.getTime() >= hace30).length);
    set("stat-nuevos", clientes.filter((c) => c.estado === "Nuevo").length);
    set("stat-activos", clientes.filter((c) => c.estado === "Cliente activo").length);
    set("stat-riesgo", clientes.filter((c) => puntajeDe(c) != null && puntajeDe(c) < 35).length);
  }

  function pintarTabla() {
    const texto = normalizar(buscar.value);
    const estadoFiltro = filtro.value;
    const visibles = clientes.filter((c) =>
      (!estadoFiltro || c.estado === estadoFiltro) &&
      (!texto || normalizar([c.nombre, c.empresa, c.correo, c.sector, c.telefono].join(" ")).includes(texto)));
    const orden = ordenar.value;
    const pj = (c) => puntajeDe(c) ?? Infinity;
    if (orden === "puntaje") visibles.sort((a, b) => pj(a) - pj(b));
    else if (orden === "actualizado") visibles.sort((a, b) => (b.salud.actualizado || 0) - (a.salud.actualizado || 0));
    else visibles.sort((a, b) => (b.creado || 0) - (a.creado || 0));
    filas.replaceChildren(...visibles.map(fila));
    document.getElementById("panel-vacio").hidden = visibles.length > 0;
    document.getElementById("panel-vacio").textContent = clientes.length
      ? "Ningún cliente coincide con la búsqueda."
      : "Aún no hay clientes registrados.";
  }

  // Los datos vienen de los clientes: se insertan siempre como texto, nunca como HTML.
  function fila(c) {
    const tr = document.createElement("tr");
    const celda = (...hijos) => {
      const td = document.createElement("td");
      td.append(...hijos);
      tr.append(td);
      return td;
    };
    const el = (tag, texto, clase) => {
      const e = document.createElement(tag);
      if (texto) e.textContent = texto;
      if (clase) e.className = clase;
      return e;
    };

    celda(c.creado ? fechaCorta.format(c.creado) : "—").className = "panel-fecha";
    const verPlan = el("a", "Ver plan de negocios", "panel-plan");
    verPlan.href = `../clientes/plan.html?cliente=${encodeURIComponent(c.uid)}`;
    celda(el("strong", c.nombre || "Sin nombre"), document.createElement("br"), el("span", c.empresa, "muted-small"), document.createElement("br"), verPlan);
    celda(c.sector || "—");

    // Salud financiera según su plan de negocios.
    const A = c.salud.analisis;
    if (A && A.puntaje != null) {
      const p = A.puntaje, clase = p >= 75 ? "sano" : p >= 35 ? "atencion" : "alerta";
      const alertas = A.hallazgos.filter((x) => x.estado === "alerta");
      const td = celda(
        el("span", `${p}/100 · ${A.calificacion}`, `semaforo ${clase}`), document.createElement("br"),
        el("span", alertas.length ? `${alertas.length} alerta${alertas.length > 1 ? "s" : ""}: ${alertas.slice(0, 2).map((x) => x.titulo.toLowerCase()).join("; ")}` : "Sin alertas", "muted-small"));
      td.className = "panel-salud";
    } else {
      celda(el("span", c.salud.tienePlan ? "Plan con pocos datos" : "Sin plan", "muted-small")).className = "panel-salud";
    }
    celda(c.salud.actualizado ? fechaCorta.format(c.salud.actualizado) : "—").className = "panel-fecha";

    const contacto = [];
    const digitos = c.telefono.replace(/\D/g, "");
    if (digitos) {
      const wa = el("a", c.telefono);
      wa.href = `https://wa.me/${digitos.length === 8 ? "506" + digitos : digitos}`;
      wa.target = "_blank";
      wa.rel = "noopener";
      contacto.push(wa, document.createElement("br"));
    }
    if (c.correo) {
      const mail = el("a", c.correo, "muted-small");
      mail.href = `mailto:${c.correo}`;
      contacto.push(mail);
    }
    celda(...contacto);

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Estado de ${c.nombre}`);
    ESTADOS.forEach((e) => select.append(new Option(e, e, false, e === c.estado)));
    select.addEventListener("change", () => guardar(c, { estado: select.value }));
    celda(select);

    const notas = document.createElement("textarea");
    notas.rows = 2;
    notas.value = c.notas;
    notas.placeholder = "Notas privadas";
    notas.setAttribute("aria-label", `Notas sobre ${c.nombre}`);
    notas.addEventListener("change", () => guardar(c, { notas: notas.value }));
    celda(notas);
    return tr;
  }

  async function guardar(cliente, campos) {
    try {
      await fs.setDoc(fs.doc(db, "seguimiento", cliente.uid), { ...campos, actualizado: fs.serverTimestamp() }, { merge: true });
      Object.assign(cliente, campos);
      pintarResumen();
      avisar("Guardado", "ok");
    } catch {
      avisar("No se pudo guardar. Revise su conexión.", "warn");
    }
  }

  let temporizador;
  function avisar(texto, tipo) {
    guardado.textContent = texto;
    guardado.className = `panel-toast visible ${tipo}`;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => (guardado.className = "panel-toast"), 2200);
  }

  // Exporta a CSV con punto y coma, que Excel en español abre en columnas.
  function exportar() {
    // Un texto que empieza con =, +, - o @ se antepone con ' para que Excel no lo ejecute como fórmula.
    const campo = (v) => {
      let t = (v ?? "").toString();
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const encabezado = ["Fecha de registro", "Nombre", "Empresa", "Sector", "Teléfono", "Correo", "Estado", "Notas", "Puntaje de salud financiera", "Calificación", "Alertas", "Plan actualizado"];
    const lineas = clientes.map((c) => [
      c.creado ? c.creado.toLocaleDateString("es-CR") : "",
      c.nombre, c.empresa, c.sector, c.telefono, c.correo, c.estado, c.notas,
      puntajeDe(c) ?? "", c.salud.analisis?.calificacion || (c.salud.tienePlan ? "Pocos datos" : "Sin plan"),
      c.salud.analisis ? c.salud.analisis.hallazgos.filter((x) => x.estado === "alerta").length : "",
      c.salud.actualizado ? c.salud.actualizado.toLocaleDateString("es-CR") : "",
    ].map(campo).join(";"));
    const csv = "\ufeff" + [encabezado.map(campo).join(";"), ...lineas].join("\r\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  buscar.addEventListener("input", pintarTabla);
  filtro.addEventListener("change", pintarTabla);
  ordenar.addEventListener("change", pintarTabla);
  document.getElementById("btn-exportar").addEventListener("click", exportar);
  document.getElementById("btn-actualizar").addEventListener("click", cargar);
  document.getElementById("btn-salir").addEventListener("click", async () => {
    await auth.signOut(sesion);
    location.replace(PAGINA_CUENTA);
  });
}
