// Datos de contacto usados por los enlaces y el formulario.
const CONTACTO = {
  whatsapp: "50670123241", // Código de país + número, sin espacios ni signos.
  email: "luis1988salas@hotmail.com",
};

const formatters = {
  CRC: new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("es-CR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
};

function formatMoney(value, moneda) {
  return Number.isFinite(value) ? formatters[moneda].format(value) : "—";
}

function readNumber(form, name) {
  const value = parseFloat(form.elements[name].value);
  return Number.isFinite(value) && value >= 0 ? value : NaN;
}

// Cuota nivelada (sistema francés).
function cuotaNivelada(monto, tasaAnual, meses) {
  const i = tasaAnual / 100 / 12;
  if (i === 0) return monto / meses;
  return (monto * i) / (1 - Math.pow(1 + i, -meses));
}

// Monto que se puede financiar con una cuota dada (valor presente de la anualidad).
function montoDesdeCuota(cuota, tasaAnual, meses) {
  const i = tasaAnual / 100 / 12;
  if (i === 0) return cuota * meses;
  return (cuota * (1 - Math.pow(1 + i, -meses))) / i;
}

function whatsappUrl(texto) {
  const base = `https://wa.me/${CONTACTO.whatsapp}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

// --- Menú móvil ---
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("menu");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

// --- Pestañas de herramientas ---
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(tab) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// --- Calculadora de cuota ---
const formCuota = document.getElementById("form-cuota");
function calcularCuota() {
  const moneda = formCuota.elements.moneda.value;
  const monto = readNumber(formCuota, "monto");
  const tasa = readNumber(formCuota, "tasa");
  const plazo = Math.round(readNumber(formCuota, "plazo"));
  const valido = monto > 0 && tasa >= 0 && plazo >= 1;
  const cuota = valido ? cuotaNivelada(monto, tasa, plazo) : NaN;
  const total = cuota * plazo;
  document.getElementById("cuota-mensual").textContent = formatMoney(cuota, moneda);
  document.getElementById("cuota-intereses").textContent = formatMoney(total - monto, moneda);
  document.getElementById("cuota-total").textContent = formatMoney(total, moneda);
}
if (formCuota) {
  formCuota.addEventListener("input", calcularCuota);
  calcularCuota();
}

// --- Capacidad de endeudamiento ---
const formCap = document.getElementById("form-capacidad");
function calcularCapacidad() {
  const moneda = formCap.elements.moneda.value;
  const ingreso = readNumber(formCap, "ingreso");
  const deudas = readNumber(formCap, "deudas");
  const limite = readNumber(formCap, "limite");
  const tasa = readNumber(formCap, "tasa");
  const plazo = Math.round(readNumber(formCap, "plazo"));
  const mensaje = document.getElementById("cap-mensaje");
  const meter = document.getElementById("cap-meter");

  if (!(ingreso > 0) || !(deudas >= 0) || !(limite > 0) || !(tasa >= 0) || !(plazo >= 1)) {
    ["cap-monto", "cap-cuota", "cap-actual"].forEach((id) => (document.getElementById(id).textContent = "—"));
    mensaje.textContent = "Complete los datos para calcular.";
    mensaje.className = "tool-message";
    meter.style.width = "0";
    return;
  }

  const actualPct = (deudas / ingreso) * 100;
  const cuotaDisponible = Math.max(0, ingreso * (limite / 100) - deudas);
  const monto = montoDesdeCuota(cuotaDisponible, tasa, plazo);

  document.getElementById("cap-monto").textContent = formatMoney(monto, moneda);
  document.getElementById("cap-cuota").textContent = formatMoney(cuotaDisponible, moneda);
  document.getElementById("cap-actual").textContent = `${actualPct.toFixed(1)} % del ingreso`;

  meter.style.width = `${Math.min(100, (actualPct / limite) * 100)}%`;
  meter.classList.toggle("warn", actualPct >= limite * 0.8);

  if (cuotaDisponible === 0) {
    mensaje.textContent = "Sus deudas actuales ya alcanzan el límite. Una reestructuración podría liberar capacidad de pago.";
    mensaje.className = "tool-message warn";
  } else if (actualPct >= limite * 0.8) {
    mensaje.textContent = "Su margen es reducido. Conviene revisar sus deudas antes de solicitar un nuevo crédito.";
    mensaje.className = "tool-message warn";
  } else {
    mensaje.textContent = "Tiene margen para un nuevo crédito. Le ayudamos a conseguir las mejores condiciones.";
    mensaje.className = "tool-message ok";
  }
}
if (formCap) {
  formCap.addEventListener("input", calcularCapacidad);
  calcularCapacidad();
}

// --- Verificador PYME (Ley 8262: al menos 2 de 3 requisitos) ---
const formPyme = document.getElementById("form-pyme");
const REQUISITOS = { ccss: "CCSS", hacienda: "Hacienda", ins: "póliza del INS" };
function verificarPyme() {
  const faltantes = Object.keys(REQUISITOS).filter((k) => !formPyme.elements[k].checked);
  const cumplidos = 3 - faltantes.length;
  const mensaje = document.getElementById("pyme-mensaje");
  document.getElementById("pyme-count").textContent = `${cumplidos} de 3`;

  if (cumplidos >= 2) {
    mensaje.textContent = faltantes.length
      ? `Cumple el mínimo para solicitar la condición PYME en el SIEC del MEIC. Le recomendamos regularizar también: ${REQUISITOS[faltantes[0]]}.`
      : "Cumple los tres requisitos. Está listo para registrarse en el SIEC del MEIC.";
    mensaje.className = "tool-message ok";
  } else {
    const lista = faltantes.map((k) => REQUISITOS[k]).join(", ");
    mensaje.textContent = `Aún no cumple el mínimo de dos requisitos. Pendiente: ${lista}. Le guiamos en la formalización.`;
    mensaje.className = "tool-message warn";
  }
}
if (formPyme) {
  formPyme.addEventListener("change", verificarPyme);
  verificarPyme();
}

// --- Contacto ---
// Un enlace con data-mensaje abre WhatsApp con ese texto ya escrito.
document.querySelectorAll("[data-whatsapp-link]").forEach((a) => {
  a.href = whatsappUrl(a.dataset.mensaje);
  a.target = "_blank";
  a.rel = "noopener";
});
document.querySelectorAll("[data-email-link]").forEach((a) => {
  a.href = `mailto:${CONTACTO.email}`;
});

const formContacto = document.getElementById("form-contacto");
if (formContacto) {
  formContacto.addEventListener("submit", (e) => {
    e.preventDefault();
    const estado = document.getElementById("form-mensaje");
    if (!formContacto.checkValidity()) {
      formContacto.reportValidity();
      return;
    }
    const d = Object.fromEntries(new FormData(formContacto));
    const texto = [
      "Hola Luis, solicito un diagnóstico gratuito.",
      `Nombre: ${d.nombre}`,
      `Teléfono: ${d.telefono}`,
      `Soy: ${d.tipo}`,
      `Me interesa: ${d.interes}`,
      d.mensaje ? `Mensaje: ${d.mensaje}` : "",
    ].filter(Boolean).join("\n");
    window.open(whatsappUrl(texto), "_blank", "noopener");
    estado.textContent = "Se abrió WhatsApp con su mensaje listo para enviar.";
  });
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
