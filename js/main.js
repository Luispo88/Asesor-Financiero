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
// Para asalariados, el ingreso se toma bruto y se rebajan las cargas sociales del trabajador
// (CCSS: SEM 5,50 % + IVM 4,33 % + Banco Popular 1,00 %) y el impuesto al salario,
// igual que el salario líquido que analiza el banco.

// Tramos mensuales del impuesto sobre la renta al salario, en colones. Hacienda los
// actualiza cada año por decreto: al cambiar, edite solo esta tabla.
const RENTA_SALARIO = {
  periodo: "2025",
  tramos: [
    { hasta: 918000, tasa: 0 },
    { hasta: 1347000, tasa: 0.10 },
    { hasta: 2364000, tasa: 0.15 },
    { hasta: 4727000, tasa: 0.20 },
    { hasta: Infinity, tasa: 0.25 },
  ],
};

// Impuesto progresivo: cada tramo paga su tasa solo sobre la parte del salario que cae en él.
function impuestoSalario(bruto) {
  let impuesto = 0;
  let desde = 0;
  for (const { hasta, tasa } of RENTA_SALARIO.tramos) {
    if (bruto <= desde) break;
    impuesto += (Math.min(bruto, hasta) - desde) * tasa;
    desde = hasta;
  }
  return impuesto;
}

function describirTramos() {
  const f = (n) => formatters.CRC.format(n);
  const t = RENTA_SALARIO.tramos;
  const partes = [`exento hasta ${f(t[0].hasta)}`];
  for (let i = 1; i < t.length; i++) {
    const pct = `${Math.round(t[i].tasa * 100)} %`;
    partes.push(Number.isFinite(t[i].hasta) ? `${pct} hasta ${f(t[i].hasta)}` : `${pct} sobre el exceso`);
  }
  return `Tramos mensuales ${RENTA_SALARIO.periodo}: ${partes.join("; ")}.`;
}
const formCap = document.getElementById("form-capacidad");
function calcularCapacidad() {
  const moneda = formCap.elements.moneda.value;
  const asalariado = formCap.elements.tipo.value === "asalariado";
  const ingreso = readNumber(formCap, "ingreso");
  const cargasPct = asalariado ? readNumber(formCap, "cargas") : 0;
  // Los tramos están en colones; para un salario en dólares no se aplica el impuesto.
  const conRenta = asalariado && moneda === "CRC" && formCap.elements.renta.checked;
  const deudas = readNumber(formCap, "deudas");
  const limiteA = readNumber(formCap, "limiteMin");
  const limiteB = readNumber(formCap, "limiteMax");
  const tasa = readNumber(formCap, "tasa");
  const plazo = Math.round(readNumber(formCap, "plazo"));
  const mensaje = document.getElementById("cap-mensaje");
  const meter = document.getElementById("cap-meter");
  const mark = document.getElementById("cap-meter-mark");
  const set = (id, texto) => (document.getElementById(id).textContent = texto);

  document.getElementById("cap-ingreso-label").textContent = asalariado ? "Salario bruto mensual" : "Ingreso neto mensual";
  document.getElementById("cap-cargas-field").hidden = !asalariado;
  document.getElementById("cap-cargas-row").hidden = !asalariado;
  document.getElementById("cap-renta-field").hidden = !asalariado;
  document.getElementById("cap-renta-row").hidden = !asalariado;
  document.getElementById("cap-renta-hint").textContent = moneda === "CRC"
    ? describirTramos()
    : "Los tramos del impuesto están en colones: con un salario en dólares no se aplica en este cálculo.";

  const valido = ingreso > 0 && cargasPct >= 0 && cargasPct < 100 && deudas >= 0 &&
    limiteA > 0 && limiteB > 0 && tasa >= 0 && plazo >= 1;
  if (!valido) {
    ["cap-monto-min", "cap-monto-max", "cap-cargas", "cap-renta", "cap-neto", "cap-cuota", "cap-actual"].forEach((id) => set(id, "—"));
    mensaje.textContent = "Complete los datos para calcular.";
    mensaje.className = "tool-message";
    meter.style.width = "0";
    return;
  }

  const minimo = Math.min(limiteA, limiteB);
  const maximo = Math.max(limiteA, limiteB);
  const cargas = ingreso * (cargasPct / 100);
  const renta = conRenta ? impuestoSalario(ingreso) : 0;
  const neto = ingreso - cargas - renta;
  const actualPct = (deudas / neto) * 100;
  const cuotaMin = Math.max(0, neto * (minimo / 100) - deudas);
  const cuotaMax = Math.max(0, neto * (maximo / 100) - deudas);

  set("cap-min-label", `Con ${minimo} %`);
  set("cap-max-label", `Con ${maximo} %`);
  set("cap-monto-min", formatMoney(montoDesdeCuota(cuotaMin, tasa, plazo), moneda));
  set("cap-monto-max", formatMoney(montoDesdeCuota(cuotaMax, tasa, plazo), moneda));
  set("cap-cargas", formatMoney(cargas, moneda));
  set("cap-renta", asalariado && !conRenta ? "No aplicado" : formatMoney(renta, moneda));
  set("cap-neto", formatMoney(neto, moneda));
  set("cap-cuota", minimo === maximo
    ? formatMoney(cuotaMax, moneda)
    : `${formatMoney(cuotaMin, moneda)} – ${formatMoney(cuotaMax, moneda)}`);
  set("cap-actual", `${actualPct.toLocaleString("es-CR", { maximumFractionDigits: 1 })} % del ingreso neto`);
  set("cap-meter-max", `${maximo} %`);

  meter.style.width = `${Math.min(100, (actualPct / maximo) * 100)}%`;
  meter.classList.toggle("warn", actualPct >= minimo);
  mark.style.left = `${(minimo / maximo) * 100}%`;

  if (cuotaMax === 0) {
    mensaje.textContent = `Sus deudas actuales ya alcanzan o superan el ${maximo} % de su ingreso neto. Una reestructuración podría liberar capacidad de pago.`;
    mensaje.className = "tool-message warn";
  } else if (actualPct >= minimo) {
    mensaje.textContent = `Su endeudamiento ya está dentro del rango de ${minimo} % a ${maximo} %. Algunas entidades podrían no aprobar más crédito; conviene revisar sus deudas primero.`;
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

// Enlaces que abren una calculadora concreta.
document.querySelectorAll("[data-open-tab]").forEach((a) => {
  a.addEventListener("click", () => {
    const tab = document.getElementById(a.dataset.openTab);
    if (tab) selectTab(tab);
  });
});

// --- Carrusel horizontal ---
const scroller = document.getElementById("ruta-scroller");
if (scroller) {
  const botones = document.querySelectorAll("[data-scroll]");
  const actualizar = () => {
    const max = scroller.scrollWidth - scroller.clientWidth - 2;
    botones.forEach((b) => {
      b.disabled = b.dataset.scroll === "-1" ? scroller.scrollLeft <= 2 : scroller.scrollLeft >= max;
    });
  };
  botones.forEach((b) => {
    b.addEventListener("click", () => {
      const paso = scroller.firstElementChild.getBoundingClientRect().width + 20;
      scroller.scrollBy({ left: paso * Number(b.dataset.scroll), behavior: "smooth" });
    });
  });
  scroller.addEventListener("scroll", actualizar, { passive: true });
  window.addEventListener("resize", actualizar);
  actualizar();
}

// --- Aparición suave al hacer scroll ---
const revelables = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  revelables.forEach((el) => observer.observe(el));
} else {
  revelables.forEach((el) => el.classList.add("visible"));
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
