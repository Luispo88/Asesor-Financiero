// Plan de negocios del Área de clientes: entradas, cálculos y gráficos de las 14 secciones,
// guardados en Firestore (planes/{uid}). El asesor puede abrir el plan de un cliente en solo lectura.
// Todas las listas (productos, cuentas, filas, segmentos, apartados) admiten agregar elementos.
// El análisis financiero (analisis.js) produce un diagnóstico breve para el cliente y un análisis
// completo que solo ve el asesor.
import { analizar } from "./analisis.js";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MIN_PRODUCTOS = 5;
const ANOS = [0, 1, 2];
// Paleta categórica validada (orden fijo; el color sigue al producto, no a su posición).
// Más allá de 8 productos, el resto se agrupa en "Otros" en el gráfico.
const COLORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const COLOR_OTROS = "#8e8e93";

// ---------------------------------------------------------------- Utilidades

function h(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...hijos.flat().filter((x) => x != null && x !== false));
  return e;
}

let datos = {};
let SOLO_LECTURA = false;
let VER_ANALISIS = false; // sección "Análisis del asesor" (solo la cuenta del asesor)
let alCambiarDatos = () => {};

const leer = (ruta) => ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), datos);
const num = (ruta) => Number(leer(ruta)) || 0;
function escribir(ruta, valor) {
  const ks = ruta.split(".");
  let o = datos;
  ks.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  });
  o[ks.at(-1)] = valor;
}
// Devuelve la lista guardada en la ruta (creándola si no existe), con al menos `minimo` posiciones.
function lista(ruta, minimo = 0) {
  let a = leer(ruta);
  if (!Array.isArray(a)) {
    a = a && typeof a === "object" ? Object.values(a) : [];
    escribir(ruta, a);
  }
  while (a.length < minimo) a.push(null);
  return a;
}
const largo = (ruta, minimo) => Math.max(minimo, (Array.isArray(leer(ruta)) ? leer(ruta).length : 0));

const moneda = () => (leer("general.moneda") === "USD" ? "USD" : "CRC");
const fmtMoneda = (v) => new Intl.NumberFormat("es-CR", {
  style: "currency", currency: moneda(), maximumFractionDigits: moneda() === "USD" ? 2 : 0,
}).format(v);
const fmtNum = (v) => v.toLocaleString("es-CR", { maximumFractionDigits: 0 });
const fmtPct = (v) => (Number.isFinite(v) ? `${(v * 100).toLocaleString("es-CR", { maximumFractionDigits: 1 })} %` : "—");
const fmtRazon = (v) => (Number.isFinite(v) ? v.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
const fmtCompacto = (v) => new Intl.NumberFormat("es-CR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const div = (a, b) => (b ? a / b : NaN);
const sumar = (arr) => arr.reduce((a, b) => a + b, 0);

function inicio() {
  const v = leer("general.inicio");
  const [a, m] = /^\d{4}-\d{2}$/.test(v || "") ? v.split("-").map(Number) : [new Date().getFullYear(), 1];
  return { ano: a, mes: m - 1 };
}
function etiquetaMes(ano, m) {
  const { ano: a0, mes: m0 } = inicio();
  const d = new Date(a0, m0 + ano * 12 + m, 1);
  return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}
const etiquetaAno = (y) => `Año ${y + 1} · ${inicio().ano + y}`;

// Productos: tantos como el cliente haya agregado (mínimo 5).
function nProductos() {
  let n = largo("ventas.productos", MIN_PRODUCTOS);
  ANOS.forEach((y) => ["unidades", "costo", "precio"].forEach((k) => (n = Math.max(n, largo(`ventas.anos.${y}.${k}`, 0)))));
  return n;
}
const nombreProducto = (p) => (leer(`ventas.productos.${p}`) || "").trim() || `Producto ${p + 1}`;

// Campos enlazados a una ruta de datos.
const campoNum = (ruta, props = {}) => h("input", { type: "number", step: "any", inputmode: "decimal", "data-ruta": ruta, "data-tipo": "num", ...props });
const campoTexto = (ruta, props = {}) => h("input", { type: "text", "data-ruta": ruta, ...props });
const campoArea = (ruta, props = {}) => h("textarea", { rows: 5, "data-ruta": ruta, ...props });
const salida = (clave, clase = "num") => h("span", { "data-salida": clave, class: clase, text: "—" });

// Botones para agregar y quitar elementos (ocultos en solo lectura).
const botonAgregar = (texto, accion) => (SOLO_LECTURA ? null : h("button", { type: "button", class: "plan-add", onclick: accion, text: `+ ${texto}` }));
const botonQuitar = (que, accion) => (SOLO_LECTURA ? null : h("button", { type: "button", class: "plan-quitar", title: `Quitar ${que}`, "aria-label": `Quitar ${que}`, onclick: accion, text: "×" }));
function agregarA(ruta, minimo, nuevo, idSeccion) {
  lista(ruta, minimo).push(nuevo);
  cambioEstructura(idSeccion);
}
function quitarDe(ruta, i, idSeccion) {
  const a = lista(ruta);
  if (tieneDatos(a[i]) && !confirm("¿Quitar esta fila? Se borrarán los datos que tiene.")) return;
  a.splice(i, 1);
  cambioEstructura(idSeccion);
}

// ---------------------------------------------------------------- Secciones

const SECCIONES = [];
const visibles = () => SECCIONES.filter((s) => !s.soloAsesor || VER_ANALISIS);
const seccion = (id, grupo, titulo, ayuda, raices, construir) => SECCIONES.push({ id, grupo, titulo, ayuda, raices, construir });

const encabezadoAnual = (titulo = "Concepto") => h("thead", {}, h("tr", {}, h("th", { text: titulo }), ANOS.map((y) => h("th", { class: "num", "data-ano": y, text: etiquetaAno(y) }))));
const filaGrupo = (texto) => h("tr", { class: "fila-grupo" }, h("th", { colspan: 4, text: texto }));
const filaTotal = (clave, etiqueta, clase = "fila-total") => h("tr", { class: clase },
  h("th", { scope: "row", text: etiqueta }), ANOS.map((y) => h("td", {}, salida(`${clave}.${y}`))));
function filaAnual(base, clave, etiqueta, opciones = {}) {
  return h("tr", {},
    h("th", { scope: "row", text: etiqueta }),
    ANOS.map((y) => h("td", {}, opciones.soloPrimerAno && y > 0
      ? salida(`${base}.${clave}.${y}`)
      : campoNum(`${base}.${clave}.${y}`, { "aria-label": `${etiqueta}, ${etiquetaAno(y)}` }))));
}
// Cuentas que agrega el cliente dentro de un grupo: nombre + 3 años, con botón para quitarlas.
function filasExtra(base, idSeccion, textoBoton) {
  const n = largo(base, 0);
  return [
    ...Array.from({ length: n }, (_, i) => h("tr", { class: "fila-extra" },
      h("th", { scope: "row" }, h("div", { class: "extra-nombre" },
        campoTexto(`${base}.${i}.nombre`, { placeholder: "Nombre de la cuenta", "aria-label": "Nombre de la cuenta" }),
        botonQuitar("cuenta", () => quitarDe(base, i, idSeccion)))),
      ANOS.map((y) => h("td", {}, campoNum(`${base}.${i}.v.${y}`, { "aria-label": `Cuenta agregada ${i + 1}, ${etiquetaAno(y)}` }))))),
    SOLO_LECTURA ? null : h("tr", { class: "fila-agregar" }, h("td", { colspan: 4 }, botonAgregar(textoBoton, () => agregarA(base, 0, { nombre: "", v: [null, null, null] }, idSeccion)))),
  ];
}
const sumaExtras = (base, y) => {
  const a = leer(base);
  return Array.isArray(a) ? a.reduce((t, _, i) => t + num(`${base}.${i}.v.${y}`), 0) : 0;
};

// Tabla de filas libres (calendario, competidores, financiamiento) con agregar y quitar.
function tablaFilas(base, columnas, minimo, idSeccion, textoBoton) {
  const n = largo(base, minimo);
  return h("div", { class: "table-wrap" }, h("table", { class: "plan-table plan-filas" },
    h("thead", {}, h("tr", {}, columnas.map(([, t, tipo]) => h("th", { class: tipo === "num" ? "num" : null, text: t })), SOLO_LECTURA ? null : h("th", { class: "col-quitar" }))),
    h("tbody", {}, Array.from({ length: n }, (_, i) => h("tr", {},
      columnas.map(([k, t, tipo]) => h("td", {},
        tipo === "fecha" ? h("input", { type: "date", "data-ruta": `${base}.${i}.${k}`, "aria-label": `${t} ${i + 1}` })
          : tipo === "num" ? campoNum(`${base}.${i}.${k}`, { "aria-label": `${t} ${i + 1}` })
            : campoTexto(`${base}.${i}.${k}`, { "aria-label": `${t} ${i + 1}` }))),
      SOLO_LECTURA ? null : h("td", { class: "col-quitar" }, botonQuitar("fila", () => quitarDe(base, i, idSeccion)))))),
    SOLO_LECTURA ? null : h("tfoot", {}, h("tr", { class: "fila-agregar" }, h("td", { colspan: columnas.length + 1 },
      botonAgregar(textoBoton, () => agregarA(base, n, {}, idSeccion)))))));
}

// 1. Previsión de ventas a 3 años
seccion("ventas", "Números", "Previsión de ventas a 3 años",
  "Escriba sus productos o servicios (puede agregar todos los que necesite), las unidades que espera vender cada mes, y su costo y precio por unidad. Los totales, la utilidad bruta y los gráficos se calculan solos.",
  ["ventas"], () => {
    const n = nProductos();
    const productos = h("div", { class: "plan-grid-5" },
      Array.from({ length: n }, (_, p) => h("label", { class: "producto-campo" }, h("span", { class: "producto-titulo" }, `Producto o servicio ${p + 1}`,
        n > 1 ? botonQuitar(`producto ${p + 1}`, () => quitarProducto(p)) : null),
      campoTexto(`ventas.productos.${p}`, { placeholder: `Producto ${p + 1}` }))));

    const tabs = h("div", { class: "segmented plan-anos", role: "tablist", "aria-label": "Año de la previsión" },
      ANOS.map((y) => h("button", {
        type: "button", role: "tab", "data-ano-ventas": y, "aria-selected": y === estado.anoVentas ? "true" : "false", text: `Año ${y + 1}`,
        onclick: () => {
          estado.anoVentas = y;
          document.querySelectorAll("[data-ano-ventas]").forEach((x) => x.setAttribute("aria-selected", Number(x.dataset.anoVentas) === y ? "true" : "false"));
          document.querySelectorAll("[data-panel-ano]").forEach((pn) => (pn.hidden = Number(pn.dataset.panelAno) !== y));
          pintarGraficos();
        },
      })));

    const anos = ANOS.map((y) => h("div", { class: "plan-ano", "data-panel-ano": y, hidden: y !== estado.anoVentas },
      h("h4", { text: "Unidades vendidas por mes" }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table plan-meses" },
        h("thead", {}, h("tr", {}, h("th", { text: "Producto" }),
          Array.from({ length: 12 }, (_, m) => h("th", { class: "num", "data-mes": `${y}.${m}`, text: etiquetaMes(y, m) })),
          h("th", { class: "num", text: "Total" }))),
        h("tbody", {}, Array.from({ length: n }, (_, p) => h("tr", {},
          h("th", { scope: "row" }, h("span", { "data-nombre-producto": p })),
          Array.from({ length: 12 }, (_, m) => h("td", {}, campoNum(`ventas.anos.${y}.unidades.${p}.${m}`, { min: 0, "aria-label": `Unidades ${m + 1}, producto ${p + 1}` }))),
          h("td", {}, salida(`v.${y}.unidades.${p}`))))),
        h("tfoot", {}, h("tr", { class: "fila-total" }, h("th", { text: "Total" }),
          Array.from({ length: 12 }, (_, m) => h("td", {}, salida(`v.${y}.mes.${m}`))),
          h("td", {}, salida(`v.${y}.unidadesTotal`)))))),

      h("h4", { text: "Costo, precio y resultado del año" }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
        h("thead", {}, h("tr", {}, ["Producto", "Costo unitario", "Precio unitario", "Margen por unidad", "Unidades", "Ingresos", "Utilidad bruta", "Variación de ingresos"]
          .map((t, i) => h("th", { class: i ? "num" : null, text: t })))),
        h("tbody", {}, Array.from({ length: n }, (_, p) => h("tr", {},
          h("th", { scope: "row" }, h("span", { "data-nombre-producto": p })),
          h("td", {}, campoNum(`ventas.anos.${y}.costo.${p}`, { min: 0, "aria-label": `Costo unitario producto ${p + 1}` })),
          h("td", {}, campoNum(`ventas.anos.${y}.precio.${p}`, { min: 0, "aria-label": `Precio unitario producto ${p + 1}` })),
          h("td", {}, salida(`v.${y}.margen.${p}`)),
          h("td", {}, salida(`v.${y}.unidades.${p}`)),
          h("td", {}, salida(`v.${y}.ingresos.${p}`)),
          h("td", {}, salida(`v.${y}.utilidad.${p}`)),
          h("td", {}, salida(`v.${y}.variacion.${p}`))))),
        h("tfoot", {}, h("tr", { class: "fila-total" }, h("th", { text: "Total" }), h("td"), h("td"), h("td"),
          h("td", {}, salida(`v.${y}.unidadesTotal`)), h("td", {}, salida(`v.${y}.ingresosTotal`)),
          h("td", {}, salida(`v.${y}.utilidadTotal`)), h("td", {}, salida(`v.${y}.variacionTotal`)))))),
      h("p", { class: "note", text: "El costo y el precio se aplican a todos los meses del año. La variación compara los ingresos con el año anterior." })));

    return [
      h("div", { class: "plan-grid-2" },
        h("label", {}, "Mes de inicio", h("input", { type: "month", "data-ruta": "general.inicio" })),
        h("label", {}, "Moneda", h("select", { "data-ruta": "general.moneda" }, h("option", { value: "CRC", text: "Colones (₡)" }), h("option", { value: "USD", text: "Dólares ($)" })))),
      h("h4", { text: "Productos o servicios" }), productos,
      botonAgregar("Agregar producto o servicio", () => { lista("ventas.productos", nProductos()).push(""); cambioEstructura("ventas"); }),
      tabs, ...anos,
      h("h4", { text: "Resumen de los 3 años" }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
        h("thead", {}, h("tr", {}, ["Año", "Unidades", "Ingresos", "Utilidad bruta", "Margen bruto"].map((t, i) => h("th", { class: i ? "num" : null, text: t })))),
        h("tbody", {}, ANOS.map((y) => h("tr", {}, h("th", { scope: "row", "data-ano": y, text: etiquetaAno(y) }),
          h("td", {}, salida(`v.${y}.unidadesTotal`)), h("td", {}, salida(`v.${y}.ingresosTotal`)),
          h("td", {}, salida(`v.${y}.utilidadTotal`)), h("td", {}, salida(`v.${y}.margenTotal`))))))),
      h("div", { class: "plan-charts" },
        h("figure", { class: "chart" }, h("figcaption", {}, h("strong", { text: "Unidades vendidas por mes" }), h("span", { class: "chart-sub", "data-chart-ano": true })),
          h("div", { class: "chart-legend", id: "leyenda-unidades" }), h("div", { class: "chart-area", id: "grafico-unidades" })),
        h("figure", { class: "chart" }, h("figcaption", {}, h("strong", { text: "Ingresos y utilidad bruta por año" })),
          h("div", { class: "chart-legend", id: "leyenda-anual" }), h("div", { class: "chart-area", id: "grafico-anual" }))),
    ];
  });

// Quitar un producto mueve los datos de los siguientes una posición hacia arriba, en los 3 años.
function quitarProducto(p) {
  const tiene = tieneDatos(leer(`ventas.productos.${p}`)) || ANOS.some((y) =>
    ["unidades", "costo", "precio"].some((k) => tieneDatos(leer(`ventas.anos.${y}.${k}.${p}`))));
  if (tiene && !confirm(`¿Quitar «${nombreProducto(p)}»? Se borrarán sus unidades, costos y precios.`)) return;
  const n = nProductos();
  lista("ventas.productos", n).splice(p, 1);
  ANOS.forEach((y) => ["unidades", "costo", "precio"].forEach((k) => lista(`ventas.anos.${y}.${k}`, n).splice(p, 1)));
  cambioEstructura("ventas");
}

// 2. Plan financiero
seccion("financiero", "Números", "Plan financiero",
  "Explique los supuestos de sus proyecciones y, si necesita financiamiento, de dónde vendrá y en qué lo usará.",
  ["financiero"], () => [
    h("label", {}, "Supuestos clave", campoArea("financiero.supuestos", { placeholder: "¿Cómo llegó a estas cifras? (resultados anteriores, estudios de mercado, contratos). ¿Qué crecimiento y utilidad espera?" })),
    h("div", { class: "plan-grid-2" },
      h("div", {}, h("h4", { text: "Fuentes de financiamiento" }),
        tablaFilas("financiero.fuentes", [["concepto", "Concepto"], ["monto", "Monto", "num"]], 5, "financiero", "Agregar fuente"),
        h("p", { class: "plan-total-linea" }, "Total fuentes: ", salida("f.fuentes"))),
      h("div", {}, h("h4", { text: "Uso del financiamiento" }),
        tablaFilas("financiero.usos", [["concepto", "Concepto"], ["monto", "Monto", "num"]], 5, "financiero", "Agregar uso"),
        h("p", { class: "plan-total-linea" }, "Total usos: ", salida("f.usos")))),
    h("div", { class: "plan-resumen" }, h("span", { text: "Diferencia (fuentes − usos)" }), salida("f.diferencia", "plan-cifra"), h("p", { "data-salida": "f.mensaje", class: "tool-message" })),
  ]);

// 3. Balance de situación
const BALANCE = [
  { clave: "ac", lado: "activos", grupo: "Activo corriente", total: "Total activo corriente", items: [["efectivo", "Efectivo y bancos"], ["cxc", "Cuentas por cobrar (clientes)"], ["inventario", "Inventario"], ["anticipados", "Gastos pagados por anticipado"], ["invCorto", "Inversiones a corto plazo"]] },
  { clave: "anc", lado: "activos", grupo: "Activo no corriente", total: "Total activo no corriente", items: [["invLargo", "Inversiones a largo plazo"], ["propiedad", "Propiedad, planta y equipo"], ["depAcum", "Depreciación acumulada (en negativo)"], ["intangibles", "Activos intangibles"]] },
  { clave: "oa", lado: "activos", grupo: "Otros activos", total: "Total otros activos", items: [["impDiferidos", "Impuestos diferidos"], ["otrosActivos", "Otros activos"]] },
  { clave: "pc", lado: "pasivos", grupo: "Pasivo corriente", total: "Total pasivo corriente", items: [["proveedores", "Proveedores"], ["prestCorto", "Préstamos a corto plazo"], ["impuestos", "Impuestos por pagar"], ["salarios", "Salarios y cargas sociales por pagar"], ["adelantos", "Ingresos recibidos por adelantado"], ["porcionCorriente", "Porción corriente de la deuda a largo plazo"]] },
  { clave: "pnc", lado: "pasivos", grupo: "Pasivo no corriente", total: "Total pasivo no corriente", items: [["deudaLargo", "Deuda a largo plazo"], ["rentaDiferida", "Impuesto sobre la renta diferido"], ["otrosPasivos", "Otros pasivos"]] },
  { clave: "pat", lado: "patrimonio", grupo: "Patrimonio", total: "Total patrimonio", items: [["capital", "Capital aportado por los socios"], ["retenidas", "Utilidades retenidas"], ["otrosPatrimonio", "Otros"]] },
];
seccion("balance", "Números", "Balance de situación",
  "Lo que la empresa tiene (activos), lo que debe (pasivos) y lo que pertenece a los socios (patrimonio) al cierre de cada año. Siempre debe cumplirse: Activo = Pasivo + Patrimonio. En cada grupo puede agregar las cuentas que necesite.",
  ["balance"], () => {
    const bloque = (lados, titulo, totalEtiqueta, totalClave) => h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
      encabezadoAnual(titulo),
      h("tbody", {}, BALANCE.filter((g) => lados.includes(g.lado)).flatMap((g) => [
        filaGrupo(g.grupo),
        ...g.items.map(([k, et]) => filaAnual("balance", k, et)),
        ...filasExtra(`balance.extra.${g.clave}`, "balance", `Agregar cuenta a ${g.grupo.toLowerCase()}`),
        filaTotal(`b.grupo.${g.clave}`, g.total, "fila-subtotal"),
      ])),
      h("tfoot", {}, filaTotal(totalClave, totalEtiqueta))));
    return [
      bloque(["activos"], "Activos", "Total activos", "b.activos"),
      bloque(["pasivos", "patrimonio"], "Pasivo y patrimonio", "Total pasivo y patrimonio", "b.pasivoPatrimonio"),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual("Control"),
        h("tbody", {}, h("tr", {}, h("th", { scope: "row", text: "Diferencia (activo − pasivo − patrimonio)" }), ANOS.map((y) => h("td", {}, salida(`b.cuadre.${y}`))))))),
      h("h4", { text: "Razones financieras" }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual("Razón"),
        h("tbody", {}, [
          ["endeudamiento", "Endeudamiento (pasivo total ÷ activo total)"],
          ["corriente", "Razón corriente (activo corriente ÷ pasivo corriente)"],
          ["capitalTrabajo", "Capital de trabajo (activo corriente − pasivo corriente)"],
          ["apalancamiento", "Activos ÷ patrimonio"],
          ["deudaPatrimonio", "Deuda ÷ patrimonio"],
        ].map(([k, et]) => h("tr", {}, h("th", { scope: "row", text: et }), ANOS.map((y) => h("td", {}, salida(`b.razon.${k}.${y}`)))))))),
    ];
  });

// 4. Flujo de caja
const FLUJO = [
  { grupo: "Actividades de operación", total: "Efectivo neto de operación", clave: "operacion", items: [["utilidadNeta", "Utilidad neta"], ["capitalTrabajo", "Cambios en el capital de trabajo"], ["depreciacion", "Depreciaciones y amortizaciones"], ["cxc", "Variación de cuentas por cobrar"], ["cxp", "Variación de cuentas por pagar"], ["impDiferidos", "Impuestos diferidos"], ["otrosOp", "Otros"]] },
  { grupo: "Actividades de inversión", total: "Efectivo neto de inversión", clave: "inversion", items: [["ventaActivos", "Venta de activos fijos"], ["compraActivos", "Compra de activos fijos (en negativo)"], ["otrosLargo", "Aumento de otros activos a largo plazo"], ["otrosInv", "Otros"]] },
  { grupo: "Actividades de financiamiento", total: "Efectivo neto de financiamiento", clave: "financiamiento", items: [["aportes", "Aportes de capital de los socios"], ["prestamos", "Préstamos recibidos"], ["pagoPrestamos", "Pago de préstamos (en negativo)"], ["dividendos", "Dividendos pagados (en negativo)"]] },
];
seccion("flujo", "Números", "Flujo de caja",
  "Cuánto dinero entra y sale realmente cada año. Escriba en negativo las salidas de efectivo. El efectivo inicial de los años 2 y 3 se toma del cierre del año anterior.",
  ["flujo"], () => [h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual(),
    h("tbody", {}, FLUJO.flatMap((g) => [
      filaGrupo(g.grupo),
      ...g.items.map(([k, et]) => filaAnual("flujo", k, et)),
      ...filasExtra(`flujo.extra.${g.clave}`, "flujo", "Agregar concepto"),
      filaTotal(`fc.${g.clave}`, g.total, "fila-subtotal"),
    ]),
    filaGrupo("Cierre del año"),
    filaTotal("fc.neto", "Aumento o disminución neta de efectivo", "fila-subtotal"),
    filaAnual("flujo", "efectivoInicial", "Efectivo al inicio del año", { soloPrimerAno: true })),
    h("tfoot", {}, filaTotal("fc.final", "Efectivo al final del año"))))]);

// 5. Estado de resultados
const RESULTADOS_VENTA = [["sueldosVenta", "Sueldos y salarios"], ["comisiones", "Comisiones"], ["publicidad", "Publicidad y mercadeo"], ["depVenta", "Depreciación"], ["otrosVenta", "Otros (p. ej. honorarios profesionales)"]];
const RESULTADOS_ADM = [["sueldosAdm", "Sueldos y salarios"], ["cargas", "Cargas sociales (CCSS)"], ["beneficios", "Beneficios a empleados"], ["seguros", "Seguros y pólizas"], ["alquiler", "Alquiler"], ["servicios", "Servicios públicos (agua, luz, internet)"], ["depAdm", "Depreciación y amortización"], ["oficina", "Materiales de oficina"], ["viajes", "Viáticos y transporte"], ["mantenimiento", "Mantenimiento y alquiler de equipo"], ["intereses", "Intereses financieros"], ["patentes", "Patentes y permisos"], ["otrosAdm", "Otros"]];
seccion("resultados", "Números", "Estado de resultados",
  "Muestra si la empresa gana o pierde: ventas, menos costo de ventas, menos gastos, menos impuestos. En cada grupo puede agregar las cuentas que necesite.",
  ["resultados"], () => [
    h("div", { class: "plan-grid-2" },
      h("label", {}, "Tasa del impuesto sobre la renta (%)", campoNum("resultados.tasaRenta", { min: 0, max: 100, placeholder: "30" }),
        h("small", { class: "field-hint", text: "Personas jurídicas: 30 %. Las pymes con ingresos brutos menores al límite que fija Hacienda pagan tarifas reducidas; consulte su caso." })),
      SOLO_LECTURA ? h("span") : h("div", { class: "plan-accion" }, h("button", { type: "button", class: "btn btn-outline btn-small", onclick: traerVentas, text: "Usar los ingresos de la previsión de ventas" }))),
    h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual(),
      h("tbody", {},
        filaGrupo("Ingresos"), filaAnual("resultados", "ventasBrutas", "Ventas brutas"), filaAnual("resultados", "devoluciones", "Devoluciones y descuentos (se restan)"),
        filasExtra("resultados.extra.ingresos", "resultados", "Agregar otro ingreso"),
        filaTotal("r.ventasNetas", "Ingresos netos", "fila-subtotal"),
        filaGrupo("Costo de ventas"), filaAnual("resultados", "invInicial", "Inventario inicial"), filaAnual("resultados", "compras", "Compras o costo de producción"),
        filasExtra("resultados.extra.costo", "resultados", "Agregar otro costo"),
        filaTotal("r.disponible", "Total disponible para la venta", "fila-subtotal"), filaAnual("resultados", "invFinal", "Inventario final (se resta)"),
        filaTotal("r.costo", "Costo de ventas", "fila-subtotal"),
        filaTotal("r.utilidadBruta", "Utilidad bruta"),
        filaGrupo("Gastos de venta"), RESULTADOS_VENTA.map(([k, et]) => filaAnual("resultados", k, et)),
        filasExtra("resultados.extra.venta", "resultados", "Agregar gasto de venta"),
        filaTotal("r.gastosVenta", "Total gastos de venta", "fila-subtotal"),
        filaGrupo("Gastos generales y administrativos"), RESULTADOS_ADM.map(([k, et]) => filaAnual("resultados", k, et)),
        filasExtra("resultados.extra.adm", "resultados", "Agregar gasto general"),
        filaTotal("r.gastosAdm", "Total gastos generales", "fila-subtotal"),
        filaTotal("r.gastosOperacion", "Total gastos de operación", "fila-subtotal"),
        filaTotal("r.antesImpuestos", "Utilidad antes de impuestos"),
        filaTotal("r.impuesto", "Impuesto sobre la renta", "fila-subtotal"),
        filaTotal("r.despuesImpuestos", "Utilidad después de impuestos"),
        filaGrupo("Partidas extraordinarias"),
        filaAnual("resultados", "extraordinarios", "Ganancias o pérdidas extraordinarias"), filaAnual("resultados", "impExtra", "Impuesto sobre extraordinarios (se resta)"),
        filasExtra("resultados.extra.extraordinarios", "resultados", "Agregar partida extraordinaria")),
      h("tfoot", {}, filaTotal("r.neto", "Resultado neto")))),
    h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual("Indicador"),
      h("tbody", {}, [["margenBruto", "Margen bruto"], ["margenNeto", "Margen neto"]].map(([k, et]) =>
        h("tr", {}, h("th", { scope: "row", text: et }), ANOS.map((y) => h("td", {}, salida(`r.${k}.${y}`)))))))),
  ]);

// Secciones de texto: campos fijos + apartados que agrega el cliente.
function textos(id, titulo, ayuda, campos) {
  seccion(id, "Estrategia", titulo, ayuda, [`textos.${id}`], () => {
    const base = `textos.${id}.extra`;
    return [
      ...campos.map(([k, et, ph]) => h("label", {}, et, campoArea(`textos.${id}.${k}`, { placeholder: ph || "" }))),
      ...Array.from({ length: largo(base, 0) }, (_, i) => h("div", { class: "plan-card apartado" },
        h("div", { class: "extra-nombre" }, campoTexto(`${base}.${i}.titulo`, { placeholder: "Título del apartado", "aria-label": "Título del apartado" }),
          botonQuitar("apartado", () => quitarDe(base, i, id))),
        campoArea(`${base}.${i}.texto`, { "aria-label": "Contenido del apartado" }))),
      botonAgregar("Agregar apartado", () => agregarA(base, 0, { titulo: "", texto: "" }, id)),
    ];
  });
}

textos("vision", "Visión general de la empresa", "Describa la empresa y el sector en el que opera: tendencias, clientes, regulaciones y factores económicos que la afectan.", [
  ["general", "Visión general", "¿Qué hace la empresa, desde cuándo y en qué sector?"],
  ["mision", "Misión", "¿Para qué existe la empresa?"],
  ["visionFutura", "Visión", "¿Qué quiere lograr en los próximos años?"],
]);
textos("problemas", "Problemas y soluciones", "El problema que resuelve su empresa y cómo lo resuelve.", [
  ["problemas", "Problemas", "¿Qué necesidad o dificultad de sus clientes atiende?"],
  ["soluciones", "Soluciones", "¿Cómo la resuelve su producto o servicio?"],
]);
textos("oferta", "Oferta de productos o servicios", "Describa sus productos o servicios, cómo benefician al cliente y qué los hace únicos.", [
  ["descripcion", "Descripción de la oferta", ""],
  ["propuesta", "Propuesta única de valor", "¿Por qué un cliente debería elegirle a usted y no a la competencia?"],
]);

// 9. Calendario y métricas
seccion("calendario", "Estrategia", "Calendario y métricas", "Las actividades, los hitos y los indicadores con los que medirá el avance del plan.", ["calendario"], () => [
  h("h4", { text: "Calendario de actividades" }),
  tablaFilas("calendario.actividades", [["actividad", "Actividad"], ["objetivo", "Objetivo"], ["fecha", "Fecha límite", "fecha"]], 5, "calendario", "Agregar actividad"),
  h("h4", { text: "Hitos" }),
  tablaFilas("calendario.hitos", [["nombre", "Hito"], ["descripcion", "Descripción"], ["fecha", "Fecha límite", "fecha"]], 5, "calendario", "Agregar hito"),
  h("h4", { text: "Indicadores clave (KPI)" }),
  tablaFilas("calendario.kpis", [["nombre", "Indicador"], ["descripcion", "Descripción"], ["metrica", "Meta"]], 5, "calendario", "Agregar indicador"),
]);

textos("resumen", "Resumen ejecutivo", "Se escribe al final: resume en pocas líneas los puntos clave de todo el plan.", [
  ["resumen", "Resumen ejecutivo", "La empresa, su oferta, su mercado, sus números principales y lo que necesita."],
]);
textos("marketing", "Plan de mercadeo y ventas", "Cómo atraerá clientes y cómo convertirá a los interesados en compradores frecuentes.", [
  ["marketing", "Plan de mercadeo", "Objetivos, canales (redes sociales, ferias, alianzas), presupuesto y acciones."],
  ["ventas", "Plan de ventas", "Proceso de venta, metas, seguimiento a clientes y cómo aumentar las compras repetidas."],
]);

// 12. Mercado objetivo
const MERCADO = [
  ["Demográfico", [["genero", "Género"], ["edad", "Edad"], ["ingresos", "Ingresos"], ["educacion", "Educación"]]],
  ["Psicográfico", [["estatus", "Estatus social"], ["valores", "Valores"], ["intereses", "Intereses"], ["estilo", "Estilo de vida"]]],
  ["Geográfico", [["provincia", "Provincia"], ["canton", "Cantón o ciudad"]]],
  ["Comportamiento", [["gasto", "Hábitos de gasto"], ["marca", "Relación con la marca"], ["momento", "Momento u ocasión de compra"]]],
];
seccion("mercado", "Estrategia", "Mercado objetivo", "Describa sus segmentos de clientes ideales. Puede agregar segmentos y características propias.", ["mercado"], () => [
  h("div", { class: "plan-grid-2" }, Array.from({ length: largo("mercado", 2) }, (_, s) => h("div", { class: "plan-card" },
    h("div", { class: "extra-nombre" }, h("h4", {}, `Segmento ${s + 1}`), largo("mercado", 2) > 1 ? botonQuitar(`segmento ${s + 1}`, () => quitarDe("mercado", s, "mercado")) : null),
    campoTexto(`mercado.${s}.nombre`, { placeholder: "Nombre del segmento (p. ej. familias jóvenes)", "aria-label": `Nombre del segmento ${s + 1}` }),
    MERCADO.map(([grupo, campos]) => h("div", {}, h("p", { class: "plan-subgrupo", text: grupo }),
      campos.map(([k, et]) => h("label", {}, et, campoTexto(`mercado.${s}.${k}`))))),
    h("p", { class: "plan-subgrupo", text: "Otras características" }),
    Array.from({ length: largo(`mercado.${s}.extra`, 0) }, (_, i) => h("div", { class: "extra-par" },
      campoTexto(`mercado.${s}.extra.${i}.nombre`, { placeholder: "Característica", "aria-label": "Característica" }),
      campoTexto(`mercado.${s}.extra.${i}.valor`, { placeholder: "Descripción", "aria-label": "Descripción" }),
      botonQuitar("característica", () => quitarDe(`mercado.${s}.extra`, i, "mercado")))),
    botonAgregar("Agregar característica", () => agregarA(`mercado.${s}.extra`, 0, { nombre: "", valor: "" }, "mercado"))))),
  botonAgregar("Agregar segmento", () => agregarA("mercado", largo("mercado", 2), {}, "mercado")),
]);

// 13. Análisis FODA
const FODA = [["fortalezas", "Fortalezas", "Factores internos (+)", "fortaleza"], ["debilidades", "Debilidades", "Factores internos (−)", "debilidad"], ["oportunidades", "Oportunidades", "Factores externos (+)", "oportunidad"], ["amenazas", "Amenazas", "Factores externos (−)", "amenaza"]];
seccion("foda", "Estrategia", "Análisis FODA", "Fortalezas y debilidades (internas), oportunidades y amenazas (externas), con su importancia.", ["foda"], () => [
  h("div", { class: "plan-grid-2" }, FODA.map(([k, titulo, sub, singular]) => {
    const base = `foda.${k}`, n = largo(base, 6);
    return h("div", { class: `plan-card foda-${k}` },
      h("h4", {}, titulo, h("small", { text: ` · ${sub}` })),
      Array.from({ length: n }, (_, i) => h("div", { class: "foda-fila" },
        h("span", { class: "foda-num", text: i + 1 }),
        campoTexto(`${base}.${i}.texto`, { "aria-label": `${titulo} ${i + 1}` }),
        h("select", { "data-ruta": `${base}.${i}.importancia`, "aria-label": `Importancia ${i + 1}` },
          ["", "Alta", "Media", "Baja"].map((v) => h("option", { value: v, text: v || "Importancia" }))),
        botonQuitar("factor", () => quitarDe(base, i, "foda")))),
      botonAgregar(`Agregar ${singular}`, () => agregarA(base, n, { texto: "", importancia: "" }, "foda")));
  })),
]);

// 14. Competencia
seccion("competencia", "Estrategia", "Competencia", "Cómo hizo el análisis, qué alternativas usan hoy sus clientes y en qué se diferencia usted.", ["competencia"], () => [
  h("label", {}, "Análisis competitivo", campoArea("competencia.analisis")),
  h("h4", { text: "Competidores" }),
  tablaFilas("competencia.competidores", [["nombre", "Competidor (tipo o nombre)"], ["descripcion", "Descripción"], ["fortaleza", "Su principal fortaleza"], ["diferencia", "Cómo me diferencio"]], 5, "competencia", "Agregar competidor"),
]);

// 15. Diagnóstico financiero (cliente: breve) y 16. Análisis del asesor (completo, solo asesor)
seccion("diagnostico", "Resultados", "Diagnóstico financiero",
  "Un resumen automático del estado de su empresa según la información que ingresó en el plan. Es orientativo: su asesor lo revisará con usted.",
  [], () => [h("div", { id: "diag-cliente", class: "diag" })]);
seccion("analisis", "Resultados", "Análisis del asesor",
  "Análisis completo con indicadores, hallazgos, recomendaciones y preguntas para guiar la reunión con el cliente. Esta sección solo la ve el asesor.",
  [], () => [h("div", { id: "diag-asesor", class: "diag" })]);
SECCIONES.at(-1).soloAsesor = true;

// Reemplaza el contenido de un elemento aceptando listas anidadas y valores vacíos.
const rellenarEn = (el, ...hijos) => el.replaceChildren(...hijos.flat(3).filter((x) => x != null && x !== false));
const ETIQUETA_ESTADO = { fortaleza: "Sano", atencion: "Atención", alerta: "Alerta" };
const chip = (estado, texto) => h("span", { class: `semaforo ${estado === "fortaleza" ? "sano" : estado}`, text: texto || ETIQUETA_ESTADO[estado] });
const claseCalificacion = (p) => (p == null ? "" : p >= 75 ? "sano" : p >= 55 ? "atencion" : p >= 35 ? "atencion" : "alerta");

function pintarDiagnosticoCliente(el) {
  const A = calcular.analisis;
  if (!A) return;
  const hay = A.fortalezas.length + A.mejoras.length;
  if (!hay) {
    rellenarEn(el, h("div", { class: "callout" }, h("p", { text: "Complete la previsión de ventas, el estado de resultados y el balance de situación para ver el diagnóstico de su empresa." })));
    return;
  }
  const lista = (items, vacio) => items.length ? h("ul", { class: "diag-lista" }, items.map((x) => h("li", {}, chip(x.estado), h("span", { text: x.cliente })))) : h("p", { class: "muted-text", text: vacio });
  rellenarEn(el,
    h("div", { class: "diag-cabecera" },
      h("div", { class: `diag-puntaje ${claseCalificacion(A.puntaje)}` },
        h("strong", { text: A.puntaje == null ? "—" : String(A.puntaje) }), h("span", { text: "de 100" })),
      h("div", {},
        h("p", { class: "diag-calificacion", text: `Salud financiera: ${A.calificacion}` }),
        h("div", { class: "diag-areas" }, A.areas.filter((a) => a.peso && a.puntaje != null).map((a) => h("span", { class: "diag-area" }, chip(a.estado), h("span", { text: a.nombre })))))),
    A.sinFinancieros ? h("p", { class: "note", text: "Este diagnóstico usa solo su previsión de ventas. Complete el estado de resultados y el balance para un análisis más completo." }) : null,
    h("div", { class: "plan-grid-2" },
      h("div", { class: "plan-card" }, h("h4", { text: "Lo que va bien" }), lista(A.fortalezas.slice(0, 3), "Aún no hay suficientes datos para destacar fortalezas.")),
      h("div", { class: "plan-card" }, h("h4", { text: "Lo que conviene mejorar" }), lista(A.mejoras.slice(0, 3), "No se encontraron puntos críticos con la información actual."))),
    h("div", { class: "plan-card" }, h("h4", { text: "Recomendaciones" }),
      h("ol", { class: "diag-recs" }, A.recomendaciones.slice(0, 3).map((r) => h("li", { text: r.cliente })))),
    h("div", { class: "diag-cta" },
      h("p", { text: "¿Quiere revisar este diagnóstico en detalle y armar un plan de acción?" }),
      h("a", { class: "btn btn-small", href: "https://wa.me/50670123241?text=" + encodeURIComponent("Hola Luis, revisé el diagnóstico financiero de mi plan de negocios y quisiera coordinar una revisión."), target: "_blank", rel: "noopener", text: "Coordinar revisión con mi asesor" })),
    h("p", { class: "note", text: "Diagnóstico automático y orientativo, calculado con los datos que usted ingresó. No sustituye la revisión de un profesional." }));
}

function pintarAnalisisAsesor(el) {
  const A = calcular.analisis, M = calcular.modelo;
  if (!A || !M) return;
  const y0 = M.anos[0];
  const fm = fmtMoneda;
  const ingresos0 = A.usaResultados ? y0.res.ventasNetas : y0.ventas.ingresos;
  const alertas = A.hallazgos.filter((x) => x.estado === "alerta");
  const atenciones = A.hallazgos.filter((x) => x.estado === "atencion");
  const fortalezas = A.hallazgos.filter((x) => x.estado === "fortaleza");
  const valor = (id) => A.hallazgos.find((x) => x.id === id)?.valor;

  const resumen = [
    A.puntaje == null ? "Aún no hay datos financieros suficientes para calcular el puntaje." : `Puntaje de salud financiera: ${A.puntaje}/100 (${A.calificacion}).`,
    ingresos0 ? `Ingresos de ${etiquetaAno(0)}: ${fm(ingresos0)}${valor("crecimiento") ? `, con crecimiento anual promedio de ${valor("crecimiento")}` : ""}.` : "",
    valor("margenNeto") ? `Margen neto: ${valor("margenNeto")}.` : valor("margenBruto") ? `Margen bruto: ${valor("margenBruto")}.` : "",
    valor("razonCorriente") ? `Razón corriente: ${valor("razonCorriente")}.` : "",
    valor("endeudamiento") ? `Endeudamiento: ${valor("endeudamiento")}.` : "",
    valor("dscr") ? `Cobertura del servicio de deuda: ${valor("dscr")}.` : "",
    `${fortalezas.length} fortalezas, ${atenciones.length} puntos de atención y ${alertas.length} alertas.`,
    alertas.length ? `Prioridades: ${alertas.slice(0, 3).map((x) => x.titulo.toLowerCase()).join("; ")}.` : "",
    A.usaResultados ? "" : "La rentabilidad del año 1 se calculó con la previsión de ventas porque el estado de resultados de ese año está vacío.",
  ].filter(Boolean).join(" ");

  const claves = [
    ["Ingresos", ingresos0 ? fm(ingresos0) : "—"],
    ["Utilidad bruta", A.usaResultados ? fm(y0.res.utilidadBruta) : fm(y0.ventas.utilidadBruta || 0)],
    ["Resultado neto", A.usaResultados ? fm(y0.res.neto) : "—"],
    ["EBITDA", Number.isFinite(M.clave.ebitda) ? fm(M.clave.ebitda) : "—"],
    ["Punto de equilibrio anual", Number.isFinite(M.clave.puntoEquilibrio) ? fm(M.clave.puntoEquilibrio) : "—"],
    ["Margen de seguridad", Number.isFinite(M.clave.margenSeguridad) ? fmtPct(M.clave.margenSeguridad) : "—"],
    ["Ciclo de conversión de efectivo", Number.isFinite(M.clave.ciclo) ? `${Math.round(M.clave.ciclo)} días` : "—"],
    ["Cobertura del servicio de deuda", Number.isFinite(M.clave.dscr) ? fmtRazon(M.clave.dscr) : "—"],
    ["Efectivo al cierre del año 1", y0.flujo.tieneDatos ? fm(y0.flujo.final) : "—"],
  ];
  const sinDatos = visibles().filter((s) => s.raices.length && !s.raices.some((r) => tieneDatos(leer(r)))).map((s) => s.titulo);

  rellenarEn(el,
    h("div", { class: "callout diag-privado" }, h("p", { text: "Solo usted ve esta sección. El cliente ve únicamente el diagnóstico breve." })),
    h("h4", { text: "Resumen ejecutivo" }), h("p", { class: "diag-resumen", text: resumen }),
    h("div", { class: "plan-grid-2" },
      h("div", {}, h("h4", { text: `Datos clave · ${etiquetaAno(0)}` }),
        h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, h("tbody", {}, claves.map(([k, v]) => h("tr", {}, h("th", { scope: "row", text: k }), h("td", { class: "num", text: v }))))))),
      h("div", {}, h("h4", { text: "Puntaje por área" }),
        h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
          h("tbody", {}, A.areas.map((a) => h("tr", {}, h("th", { scope: "row", text: a.nombre }),
            h("td", { class: "num", text: a.puntaje == null ? (a.hallazgos.length ? "—" : a.peso ? "Sin datos" : "Sin observaciones") : `${a.puntaje}/100` }),
            h("td", {}, a.estado ? chip(a.estado) : a.hallazgos.length ? chip(a.hallazgos.some((x) => x.estado === "alerta") ? "alerta" : "atencion", `${a.hallazgos.length} observación(es)`) : null)))))))),
    h("h4", { text: "Hallazgos por área" }),
    A.areas.filter((a) => a.hallazgos.length).map((a) => h("details", { class: "diag-area-detalle", open: a.hallazgos.some((x) => x.estado !== "fortaleza") },
      h("summary", {}, h("span", { text: a.nombre }), h("span", { class: "muted-small", text: `${a.hallazgos.length} hallazgo(s)` })),
      a.hallazgos.map((x) => h("div", { class: `diag-hallazgo ${x.estado}` },
        h("div", { class: "diag-hallazgo-cab" }, chip(x.estado), h("strong", { text: x.titulo }), h("span", { class: "diag-valor", text: String(x.valor ?? "") })),
        h("p", { text: x.asesor }),
        x.cliente ? h("p", { class: "muted-small", text: `El cliente ve: «${x.cliente}»` }) : null,
        x.preguntas?.length ? h("ul", { class: "diag-preguntas" }, x.preguntas.map((q) => h("li", { text: q }))) : null)))),
    h("h4", { text: "Recomendaciones detalladas" }),
    h("ol", { class: "diag-recs" }, A.recomendaciones.map((r) => h("li", { text: r.asesor }))),
    h("h4", { text: "Guía para la reunión con el cliente" }),
    A.preguntas.length ? h("ol", { class: "diag-recs" }, A.preguntas.slice(0, 10).map((q) => h("li", { text: q }))) : h("p", { class: "muted-text", text: "Sin preguntas pendientes." }),
    sinDatos.length ? [h("h4", { text: "Información que falta solicitar" }), h("p", { text: sinDatos.join(", ") + "." })] : null,
    h("details", { class: "diag-area-detalle" }, h("summary", {}, h("span", { text: "Metodología y fuentes" })),
      h("ul", {}, [
        "Razones de liquidez, endeudamiento, rentabilidad y eficiencia: Corporate Finance Institute (CFI), Financial Ratios Definitive Guide.",
        "Ciclo de conversión de efectivo (días de cobro + días de inventario − días de pago): CFA Institute.",
        "Cobertura del servicio de deuda: las entidades financieras suelen exigir 1,25 veces o más para crédito a pymes.",
        "Crecimiento real: comparado con la meta de inflación del BCCR (3 % ± 1 punto porcentual).",
        "Punto de equilibrio y margen de seguridad: gastos de operación tratados como fijos y margen bruto como margen de contribución.",
        "Los rangos de referencia son generales; ajústelos según la actividad y el tamaño de la empresa.",
      ].map((t) => h("li", { text: t })))));
}

// ---------------------------------------------------------------- Cálculos

const S = {}; // salidas calculadas: clave → texto
function calcular() {
  for (const k in S) delete S[k];
  const n = nProductos();
  // Modelo numérico para el análisis financiero.
  const modelo = {
    anos: ANOS.map(() => ({ ventas: { porProducto: [], mesesIngreso: Array(12).fill(0) }, res: {}, bal: {}, flujo: {} })),
    fmt: fmtMoneda, mes: etiquetaMes, ano: etiquetaAno, simbolo: moneda() === "USD" ? "$" : "₡", clave: {},
  };

  // Ventas
  const ingresosProducto = ANOS.map(() => []);
  const anual = ANOS.map((y) => {
    let unidadesTotal = 0, ingresosTotal = 0, utilidadTotal = 0;
    const mes = Array(12).fill(0);
    for (let p = 0; p < n; p++) {
      const costo = num(`ventas.anos.${y}.costo.${p}`), precio = num(`ventas.anos.${y}.precio.${p}`);
      const meses = Array.from({ length: 12 }, (_, m) => num(`ventas.anos.${y}.unidades.${p}.${m}`));
      meses.forEach((u, m) => (mes[m] += u));
      const unidades = sumar(meses), ingresos = unidades * precio, utilidad = unidades * (precio - costo);
      unidadesTotal += unidades; ingresosTotal += ingresos; utilidadTotal += utilidad;
      ingresosProducto[y][p] = ingresos;
      modelo.anos[y].ventas.porProducto.push({ nombre: nombreProducto(p), ingresos, utilidad, precio, costo, unidades });
      meses.forEach((u, m) => (modelo.anos[y].ventas.mesesIngreso[m] += u * precio));
      S[`v.${y}.margen.${p}`] = fmtMoneda(precio - costo);
      S[`v.${y}.unidades.${p}`] = fmtNum(unidades);
      S[`v.${y}.ingresos.${p}`] = fmtMoneda(ingresos);
      S[`v.${y}.utilidad.${p}`] = fmtMoneda(utilidad);
    }
    mes.forEach((u, m) => (S[`v.${y}.mes.${m}`] = fmtNum(u)));
    S[`v.${y}.unidadesTotal`] = fmtNum(unidadesTotal);
    S[`v.${y}.ingresosTotal`] = fmtMoneda(ingresosTotal);
    S[`v.${y}.utilidadTotal`] = fmtMoneda(utilidadTotal);
    S[`v.${y}.margenTotal`] = fmtPct(div(utilidadTotal, ingresosTotal));
    Object.assign(modelo.anos[y].ventas, { ingresos: ingresosTotal, utilidadBruta: utilidadTotal, unidades: unidadesTotal });
    return { unidadesTotal, ingresosTotal, utilidadTotal };
  });
  ANOS.forEach((y) => {
    for (let p = 0; p < n; p++) {
      S[`v.${y}.variacion.${p}`] = y === 0 ? "—" : fmtPct(div(ingresosProducto[y][p], ingresosProducto[y - 1][p]) - 1);
    }
    S[`v.${y}.variacionTotal`] = y === 0 ? "—" : fmtPct(div(anual[y].ingresosTotal, anual[y - 1].ingresosTotal) - 1);
  });
  calcular.anual = anual;

  // Plan financiero
  const totalLista = (clave) => {
    const a = leer(`financiero.${clave}`);
    return Array.isArray(a) ? a.reduce((t, _, i) => t + num(`financiero.${clave}.${i}.monto`), 0) : 0;
  };
  const fuentes = totalLista("fuentes"), usos = totalLista("usos");
  S["f.fuentes"] = fmtMoneda(fuentes);
  S["f.usos"] = fmtMoneda(usos);
  S["f.diferencia"] = fmtMoneda(fuentes - usos);
  S["f.mensaje"] = !fuentes && !usos ? "" : fuentes === usos ? "Las fuentes cubren exactamente los usos."
    : fuentes > usos ? "Las fuentes superan los usos: tiene un margen disponible." : "Los usos superan las fuentes: falta financiamiento.";
  S["f.mensaje.clase"] = fuentes >= usos ? "ok" : "warn";
  modelo.financiero = { fuentes, usos };

  // Balance (cuentas fijas + cuentas agregadas)
  ANOS.forEach((y) => {
    const t = {};
    BALANCE.forEach((g) => {
      t[g.clave] = sumar(g.items.map(([k]) => num(`balance.${k}.${y}`))) + sumaExtras(`balance.extra.${g.clave}`, y);
      S[`b.grupo.${g.clave}.${y}`] = fmtMoneda(t[g.clave]);
    });
    const activos = t.ac + t.anc + t.oa, pasivos = t.pc + t.pnc, pat = t.pat;
    S[`b.activos.${y}`] = fmtMoneda(activos);
    S[`b.pasivoPatrimonio.${y}`] = fmtMoneda(pasivos + pat);
    const dif = activos - pasivos - pat;
    S[`b.cuadre.${y}`] = !activos && !pasivos && !pat ? "—" : Math.abs(dif) < 0.5 ? "Cuadra ✓" : `No cuadra: ${fmtMoneda(dif)}`;
    S[`b.razon.endeudamiento.${y}`] = fmtPct(div(pasivos, activos));
    S[`b.razon.corriente.${y}`] = fmtRazon(div(t.ac, t.pc));
    S[`b.razon.capitalTrabajo.${y}`] = activos || pasivos ? fmtMoneda(t.ac - t.pc) : "—";
    S[`b.razon.apalancamiento.${y}`] = fmtRazon(div(activos, pat));
    S[`b.razon.deudaPatrimonio.${y}`] = fmtRazon(div(pasivos, pat));
    const bk = (k) => num(`balance.${k}.${y}`);
    modelo.anos[y].bal = {
      ...t, activos, pasivos, efectivo: bk("efectivo"), cxc: bk("cxc"), inventario: bk("inventario"), proveedores: bk("proveedores"),
      prestCorto: bk("prestCorto"), porcionCorriente: bk("porcionCorriente"),
      tieneDatos: Boolean(activos || pasivos || pat), cuadra: Math.abs(dif) < 0.5, dif,
    };
  });

  // Flujo de caja (el efectivo inicial de los años 2 y 3 es el final del año anterior)
  let efectivo = num("flujo.efectivoInicial.0");
  ANOS.forEach((y) => {
    const tot = FLUJO.map((g) => {
      const t = sumar(g.items.map(([k]) => num(`flujo.${k}.${y}`))) + sumaExtras(`flujo.extra.${g.clave}`, y);
      S[`fc.${g.clave}.${y}`] = fmtMoneda(t);
      return t;
    });
    const neto = sumar(tot);
    modelo.anos[y].flujo = { operacion: tot[0], inversion: tot[1], financiamiento: tot[2], neto, tieneDatos: tot.some(Boolean), utilidadNeta: num(`flujo.utilidadNeta.${y}`) };
    if (y > 0) S[`flujo.efectivoInicial.${y}`] = fmtMoneda(efectivo);
    S[`fc.neto.${y}`] = fmtMoneda(neto);
    efectivo += neto;
    S[`fc.final.${y}`] = fmtMoneda(efectivo);
    modelo.anos[y].flujo.final = efectivo;
  });

  // Estado de resultados
  const tasa = (leer("resultados.tasaRenta") ?? 30) / 100; // 30 % si no se indica otra tasa
  ANOS.forEach((y) => {
    const r = (k) => num(`resultados.${k}.${y}`);
    const extra = (k) => sumaExtras(`resultados.extra.${k}`, y);
    const ventasNetas = r("ventasBrutas") - r("devoluciones") + extra("ingresos");
    const disponible = r("invInicial") + r("compras") + extra("costo");
    const costo = disponible - r("invFinal");
    const utilidadBruta = ventasNetas - costo;
    const gastosVenta = sumar(RESULTADOS_VENTA.map(([k]) => r(k))) + extra("venta");
    const gastosAdm = sumar(RESULTADOS_ADM.map(([k]) => r(k))) + extra("adm");
    const antes = utilidadBruta - gastosVenta - gastosAdm;
    const impuesto = antes > 0 ? antes * tasa : 0;
    const despues = antes - impuesto;
    const neto = despues + r("extraordinarios") - r("impExtra") + extra("extraordinarios");
    Object.entries({ ventasNetas, disponible, costo, utilidadBruta, gastosVenta, gastosAdm, gastosOperacion: gastosVenta + gastosAdm, antesImpuestos: antes, impuesto, despuesImpuestos: despues, neto })
      .forEach(([k, v]) => (S[`r.${k}.${y}`] = fmtMoneda(v)));
    S[`r.margenBruto.${y}`] = fmtPct(div(utilidadBruta, ventasNetas));
    S[`r.margenNeto.${y}`] = fmtPct(div(neto, ventasNetas));
    modelo.anos[y].res = {
      ventasBrutas: r("ventasBrutas"), ventasNetas, costo, utilidadBruta, gastosVenta, gastosAdm, gastosOperacion: gastosVenta + gastosAdm,
      antes, impuesto, neto, intereses: r("intereses"), depreciacion: r("depVenta") + r("depAdm"),
      personal: r("sueldosVenta") + r("comisiones") + r("sueldosAdm") + r("cargas") + r("beneficios"),
      tieneDatos: Boolean(ventasNetas || costo || gastosVenta || gastosAdm),
    };
  });

  // Información cualitativa para el análisis.
  const conTexto = (ruta, campo) => (Array.isArray(leer(ruta)) ? leer(ruta).filter((x) => (x?.[campo] || "").trim()) : []);
  const foda = Object.fromEntries(FODA.map(([k]) => [k, conTexto(`foda.${k}`, "texto")]));
  modelo.cualitativo = {
    foda: {
      fortalezas: foda.fortalezas.length, debilidades: foda.debilidades.length, oportunidades: foda.oportunidades.length, amenazas: foda.amenazas.length,
      total: Object.values(foda).reduce((t, a) => t + a.length, 0),
      altas: Object.values(foda).flat().filter((x) => x.importancia === "Alta").length,
    },
    kpis: conTexto("calendario.kpis", "nombre").length,
    competidores: conTexto("competencia.competidores", "nombre").length,
    mercado: tieneDatos(leer("mercado")),
    marketing: tieneDatos(leer("textos.marketing")),
  };
  calcular.modelo = modelo;
  calcular.analisis = analizar(modelo);
}

function traerVentas() {
  calcular();
  ANOS.forEach((y) => {
    const v = Math.round(calcular.anual[y].ingresosTotal * 100) / 100;
    escribir(`resultados.ventasBrutas.${y}`, v);
    const campo = document.querySelector(`[data-ruta="resultados.ventasBrutas.${y}"]`);
    if (campo) campo.value = v;
  });
  alCambiarDatos();
}

// ---------------------------------------------------------------- Gráficos (SVG)

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
function escala(max) {
  if (!(max > 0)) return { max: 1, paso: 0.25 };
  const bruto = max / 4, pot = 10 ** Math.floor(Math.log10(bruto)), f = bruto / pot;
  const paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pot;
  return { max: paso * Math.ceil(max / paso), paso };
}
function leyenda(cont, series) {
  cont.replaceChildren(...series.map((s) => h("span", { class: "chart-key" }, h("i", { style: `background:${s.color}` }), h("span", { text: s.nombre }))));
}
const vacio = (area, texto) => area.replaceChildren(h("p", { class: "chart-empty", text: texto }));

// Marco común: ejes, cuadrícula y tooltip.
function marco(area, maxValor, nX) {
  const W = 640, H = 260, M = { t: 12, r: 12, b: 28, l: 52 };
  const { max, paso } = escala(maxValor);
  const raiz = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", class: "chart-svg" });
  const y = (v) => M.t + (H - M.t - M.b) * (1 - v / max);
  for (let v = 0; v <= max + paso / 2; v += paso) {
    raiz.append(svg("line", { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), class: v === 0 ? "chart-base" : "chart-grid" }));
    const t = svg("text", { x: M.l - 8, y: y(v) + 4, "text-anchor": "end", class: "chart-tick" });
    t.textContent = fmtCompacto(v);
    raiz.append(t);
  }
  const anchoBanda = (W - M.l - M.r) / nX;
  const tip = h("div", { class: "chart-tip", hidden: true });
  area.replaceChildren(raiz, tip);
  const mostrarTip = (evento, contenido) => {
    tip.replaceChildren(...contenido);
    tip.hidden = false;
    const caja = area.getBoundingClientRect();
    const x = evento.clientX - caja.left, yy = evento.clientY - caja.top;
    tip.style.left = `${Math.min(Math.max(x + 12, 0), caja.width - tip.offsetWidth - 4)}px`;
    tip.style.top = `${Math.max(yy - tip.offsetHeight - 12, 0)}px`;
  };
  const ocultarTip = () => (tip.hidden = true);
  return { raiz, W, H, M, y, anchoBanda, mostrarTip, ocultarTip, xCentro: (i) => M.l + anchoBanda * (i + 0.5) };
}
const filaTip = (color, nombre, valor) => h("div", { class: "chart-tip-row" }, h("i", { style: `background:${color}` }), h("span", { text: nombre }), h("strong", { text: valor }));

function graficoLineas(area, etiquetas, series, formato) {
  const max = Math.max(0, ...series.flatMap((s) => s.valores));
  if (!series.length || max === 0) return vacio(area, "Escriba las unidades por mes para ver el gráfico.");
  const g = marco(area, max, etiquetas.length);
  etiquetas.forEach((et, i) => {
    if (etiquetas.length > 6 && i % 2) return;
    const t = svg("text", { x: g.xCentro(i), y: g.H - 8, "text-anchor": "middle", class: "chart-tick" });
    t.textContent = et;
    g.raiz.append(t);
  });
  series.forEach((s) => {
    const d = s.valores.map((v, i) => `${i ? "L" : "M"}${g.xCentro(i).toFixed(1)},${g.y(v).toFixed(1)}`).join("");
    g.raiz.append(svg("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  });
  const guia = svg("line", { y1: g.M.t, y2: g.H - g.M.b, class: "chart-cross", visibility: "hidden" });
  const puntos = series.map((s) => svg("circle", { r: 4, fill: s.color, stroke: "#fff", "stroke-width": 2, visibility: "hidden" }));
  g.raiz.append(guia, ...puntos);
  etiquetas.forEach((et, i) => {
    const zona = svg("rect", { x: g.M.l + g.anchoBanda * i, y: g.M.t, width: g.anchoBanda, height: g.H - g.M.t - g.M.b, fill: "transparent" });
    zona.addEventListener("pointermove", (e) => {
      guia.setAttribute("x1", g.xCentro(i)); guia.setAttribute("x2", g.xCentro(i)); guia.setAttribute("visibility", "visible");
      puntos.forEach((p, k) => { p.setAttribute("cx", g.xCentro(i)); p.setAttribute("cy", g.y(series[k].valores[i])); p.setAttribute("visibility", "visible"); });
      g.mostrarTip(e, [h("div", { class: "chart-tip-title", text: et }), ...series.map((s) => filaTip(s.color, s.nombre, formato(s.valores[i])))]);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); puntos.forEach((p) => p.setAttribute("visibility", "hidden")); g.ocultarTip(); });
    g.raiz.append(zona);
  });
}

function graficoBarras(area, etiquetas, series, formato) {
  const max = Math.max(0, ...series.flatMap((s) => s.valores));
  if (max === 0) return vacio(area, "Escriba unidades, costos y precios para ver el gráfico.");
  const g = marco(area, max, etiquetas.length);
  const anchoGrupo = g.anchoBanda * 0.56, gap = 2, ancho = (anchoGrupo - gap * (series.length - 1)) / series.length;
  etiquetas.forEach((et, i) => {
    const t = svg("text", { x: g.xCentro(i), y: g.H - 8, "text-anchor": "middle", class: "chart-tick" });
    t.textContent = et;
    g.raiz.append(t);
    series.forEach((s, k) => {
      const v = Math.max(0, s.valores[i]), x = g.xCentro(i) - anchoGrupo / 2 + k * (ancho + gap), y0 = g.y(0), y1 = g.y(v), r = Math.min(4, ancho / 2, y0 - y1);
      const d = v > 0 ? `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + ancho - r}Q${x + ancho},${y1} ${x + ancho},${y1 + r}V${y0}Z` : `M${x},${y0}H${x + ancho}`;
      const barra = svg("path", { d, fill: s.color, class: "chart-bar" });
      const zona = svg("rect", { x: x - gap / 2, y: g.M.t, width: ancho + gap, height: y0 - g.M.t, fill: "transparent" });
      const enter = (e) => { barra.classList.add("activa"); g.mostrarTip(e, [h("div", { class: "chart-tip-title", text: et }), filaTip(s.color, s.nombre, formato(s.valores[i]))]); };
      zona.addEventListener("pointermove", enter);
      zona.addEventListener("pointerleave", () => { barra.classList.remove("activa"); g.ocultarTip(); });
      g.raiz.append(barra, zona);
    });
  });
}

function pintarGraficos() {
  const area1 = document.getElementById("grafico-unidades");
  if (!area1) return;
  if (!calcular.anual) calcular();
  const y = estado.anoVentas;
  const unidadesMes = (p) => Array.from({ length: 12 }, (_, m) => num(`ventas.anos.${y}.unidades.${p}.${m}`));
  const activos = Array.from({ length: nProductos() }, (_, p) => p).filter((p) =>
    (leer(`ventas.productos.${p}`) || "").trim() || unidadesMes(p).some(Boolean));
  // Hasta 8 productos con color propio; el resto se agrupa en "Otros".
  const series = activos.slice(0, COLORES.length).map((p) => ({ nombre: nombreProducto(p), color: COLORES[p % COLORES.length], valores: unidadesMes(p) }));
  const resto = activos.slice(COLORES.length);
  if (resto.length) series.push({ nombre: `Otros (${resto.length})`, color: COLOR_OTROS, valores: Array.from({ length: 12 }, (_, m) => sumar(resto.map((p) => unidadesMes(p)[m]))) });
  leyenda(document.getElementById("leyenda-unidades"), series.length > 1 ? series : []);
  graficoLineas(area1, Array.from({ length: 12 }, (_, m) => etiquetaMes(y, m)), series, fmtNum);
  document.querySelector("[data-chart-ano]").textContent = ` · ${etiquetaAno(y)}`;

  const anual = calcular.anual;
  const seriesAnual = [
    { nombre: "Ingresos", color: COLORES[0], valores: anual.map((a) => a.ingresosTotal) },
    { nombre: "Utilidad bruta", color: COLORES[1], valores: anual.map((a) => a.utilidadTotal) },
  ];
  leyenda(document.getElementById("leyenda-anual"), seriesAnual);
  graficoBarras(document.getElementById("grafico-anual"), ANOS.map(etiquetaAno), seriesAnual, fmtMoneda);
}

// ---------------------------------------------------------------- Interfaz

const estado = { anoVentas: 0, seccion: "ventas" };

function pintarSalidas() {
  calcular();
  document.querySelectorAll("[data-salida]").forEach((el) => {
    const k = el.dataset.salida;
    if (k in S) el.textContent = S[k];
    if (k === "f.mensaje") el.className = `tool-message ${S["f.mensaje.clase"]}`;
  });
  document.querySelectorAll("[data-nombre-producto]").forEach((el) => (el.textContent = nombreProducto(Number(el.dataset.nombreProducto))));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = etiquetaAno(Number(el.dataset.ano))));
  document.querySelectorAll("[data-mes]").forEach((el) => { const [y, m] = el.dataset.mes.split(".").map(Number); el.textContent = etiquetaMes(y, m); });
  pintarGraficos();
  pintarProgreso();
  const dc = document.getElementById("diag-cliente");
  if (dc) pintarDiagnosticoCliente(dc);
  const da = document.getElementById("diag-asesor");
  if (da) pintarAnalisisAsesor(da);
}

// Una sección cuenta como iniciada si tiene cualquier dato escrito.
const tieneDatos = (v) => v != null && v !== "" && (typeof v !== "object" || Object.values(v).some(tieneDatos));
function pintarProgreso() {
  let hechas = 0;
  const conDatos = visibles().filter((s) => s.raices.length);
  conDatos.forEach((s) => {
    const ok = s.raices.some((r) => tieneDatos(leer(r)));
    if (ok) hechas++;
    document.querySelector(`[data-nav="${s.id}"]`)?.classList.toggle("iniciada", ok);
  });
  const p = document.getElementById("plan-progreso");
  if (p) p.textContent = `${hechas} de ${conDatos.length} secciones con datos`;
}

function mostrarSeccion(id) {
  estado.seccion = id;
  document.querySelectorAll("[data-seccion]").forEach((s) => (s.hidden = s.dataset.seccion !== id));
  document.querySelectorAll("[data-nav]").forEach((b) => b.setAttribute("aria-current", b.dataset.nav === id ? "true" : "false"));
  const sel = document.getElementById("plan-nav-select");
  if (sel) sel.value = id;
  if (id === "ventas") pintarGraficos();
}

function construirSeccion(s) {
  const lista = visibles();
  const i = lista.indexOf(s);
  const el = h("section", { class: "plan-seccion", "data-seccion": s.id, hidden: estado.seccion !== s.id, "aria-labelledby": `titulo-${s.id}` },
    h("p", { class: "eyebrow eyebrow-accent", text: `${s.grupo} · ${i + 1} de ${lista.length}` }),
    h("h3", { class: "plan-titulo", id: `titulo-${s.id}`, text: s.titulo }),
    h("p", { class: "plan-ayuda", text: s.ayuda }),
    ...s.construir(),
    h("div", { class: "plan-pasos" },
      i > 0 ? h("button", { type: "button", class: "btn btn-outline btn-small", onclick: () => { mostrarSeccion(lista[i - 1].id); scrollArriba(); }, text: `‹ ${lista[i - 1].titulo}` }) : h("span"),
      i < lista.length - 1 ? h("button", { type: "button", class: "btn btn-small", onclick: () => { mostrarSeccion(lista[i + 1].id); scrollArriba(); }, text: `${lista[i + 1].titulo} ›` }) : h("span")));
  // Valores guardados en los campos.
  el.querySelectorAll("[data-ruta]").forEach((campo) => {
    const v = leer(campo.dataset.ruta);
    if (v != null) campo.value = v;
    if (SOLO_LECTURA) campo.disabled = true;
  });
  const sel = el.querySelector('[data-ruta="general.moneda"]');
  if (sel && !leer("general.moneda")) sel.value = "CRC";
  return el;
}

// Al agregar o quitar elementos, se vuelve a dibujar solo esa sección y se guarda.
function cambioEstructura(idSeccion) {
  const s = visibles().find((x) => x.id === idSeccion);
  const viejo = document.querySelector(`[data-seccion="${idSeccion}"]`);
  const foco = document.activeElement?.dataset?.ruta;
  viejo.replaceWith(construirSeccion(s));
  if (foco) document.querySelector(`[data-ruta="${foco}"]`)?.focus();
  alCambiarDatos();
}

function construir() {
  const nav = document.getElementById("plan-nav");
  const cont = document.getElementById("plan-secciones");
  const lista = visibles();
  const grupos = [...new Set(lista.map((s) => s.grupo))];
  nav.replaceChildren(
    h("select", { id: "plan-nav-select", class: "plan-nav-select", "aria-label": "Sección", onchange: (e) => mostrarSeccion(e.target.value) },
      lista.map((s, i) => h("option", { value: s.id, text: `${i + 1}. ${s.titulo}` }))),
    ...grupos.map((g) => h("div", { class: "plan-nav-grupo" }, h("p", { text: g }),
      lista.filter((s) => s.grupo === g).map((s) => h("button", {
        type: "button", "data-nav": s.id, class: s.soloAsesor ? "solo-asesor" : null, onclick: () => mostrarSeccion(s.id),
      }, h("span", { text: `${lista.indexOf(s) + 1}. ${s.titulo}` }))))),
    h("p", { class: "plan-progreso", id: "plan-progreso" }));
  cont.replaceChildren(...lista.map(construirSeccion));
  mostrarSeccion(estado.seccion);
  pintarSalidas();
}
const scrollArriba = () => document.getElementById("plan-app").scrollIntoView({ behavior: "smooth", block: "start" });

// ---------------------------------------------------------------- Inicio y guardado

// El plan se guarda como texto JSON en un solo campo: Firestore no admite listas dentro de
// listas (como las unidades por producto y mes), y así el formato no tiene restricciones.
const serializar = () => JSON.stringify(datos);
function deserializar(doc) {
  if (typeof doc?.json === "string") {
    try { return JSON.parse(doc.json) || {}; } catch { return {}; }
  }
  return doc?.datos || {};
}

export function iniciarPlan({ sesion, auth, db, fs, esAsesor }) {
  const estadoCarga = document.getElementById("plan-estado");
  const guardadoEl = document.getElementById("plan-guardado");
  let ref = null, pendiente = null, guardando = false;

  const marcar = (texto, clase = "") => { guardadoEl.textContent = texto; guardadoEl.className = `plan-save ${clase}`; };

  async function guardar() {
    pendiente = null;
    guardando = true;
    marcar("Guardando…");
    try {
      await fs.setDoc(ref, { json: serializar(), version: 2, actualizado: fs.serverTimestamp() });
      marcar("Cambios guardados", "ok");
    } catch {
      marcar("No se pudo guardar. Revise su conexión.", "warn");
    }
    guardando = false;
  }
  const programar = () => {
    clearTimeout(pendiente);
    marcar("Cambios sin guardar…");
    pendiente = setTimeout(guardar, 1200);
  };
  window.addEventListener("beforeunload", (e) => {
    if (pendiente || guardando) { e.preventDefault(); e.returnValue = ""; }
  });

  auth.onAuthStateChanged(sesion, async (usuario) => {
    if (!usuario) {
      location.replace("../cuenta/index.html");
      return;
    }
    const pedido = new URLSearchParams(location.search).get("cliente");
    const ajeno = Boolean(pedido && pedido !== usuario.uid);
    if (ajeno && !esAsesor(usuario)) {
      estadoCarga.textContent = "Solo puede ver su propio plan de negocios.";
      return;
    }
    const uid = ajeno ? pedido : usuario.uid;
    ref = fs.doc(db, "planes", uid);
    try {
      const snap = await fs.getDoc(ref);
      datos = snap.exists() ? deserializar(snap.data()) : {};
      if (ajeno) {
        const perfil = await fs.getDoc(fs.doc(db, "usuarios", uid)).catch(() => null);
        const p = perfil?.exists() ? perfil.data() : {};
        const aviso = document.getElementById("plan-lectura");
        aviso.textContent = `Está viendo el plan de ${p.nombre || "un cliente"}${p.empresa ? ` (${p.empresa})` : ""} en modo de solo lectura.`;
        aviso.hidden = false;
      }
    } catch (err) {
      estadoCarga.textContent = err?.code === "permission-denied"
        ? "Firestore rechazó el acceso al plan. Publique las reglas actualizadas de firestore.rules."
        : "No se pudo cargar el plan. Recargue la página.";
      return;
    }
    SOLO_LECTURA = ajeno;
    VER_ANALISIS = esAsesor(usuario);
    if (ajeno) estado.seccion = "analisis";
    alCambiarDatos = ajeno ? () => {} : () => { pintarSalidas(); programar(); };
    construir();
    document.getElementById("plan-espera").hidden = true;
    document.getElementById("plan-app").hidden = false;
    pintarGraficos();
    marcar(ajeno ? "Solo lectura" : "Los cambios se guardan automáticamente");

    if (ajeno) return;
    const cont = document.getElementById("plan-secciones");
    const alEscribir = (e) => {
      const el = e.target;
      if (!el.dataset?.ruta) return;
      const v = el.dataset.tipo === "num" ? (el.value === "" ? null : Number(el.value)) : el.value;
      escribir(el.dataset.ruta, v);
      alCambiarDatos();
    };
    cont.addEventListener("input", alEscribir);
    cont.addEventListener("change", alEscribir);
  });

  document.getElementById("btn-imprimir").addEventListener("click", () => {
    document.querySelectorAll("[data-seccion]").forEach((s) => (s.hidden = false));
    document.querySelectorAll("[data-panel-ano]").forEach((p) => (p.hidden = false));
    window.print();
    mostrarSeccion(estado.seccion);
    document.querySelectorAll("[data-panel-ano]").forEach((p) => (p.hidden = Number(p.dataset.panelAno) !== estado.anoVentas));
  });
}
