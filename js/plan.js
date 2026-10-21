// Plan de negocios del Área de clientes: entradas, cálculos y gráficos de las 14 secciones,
// guardados en Firestore (planes/{uid}). El asesor puede abrir el plan de un cliente en solo lectura.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const N_PRODUCTOS = 5;
const ANOS = [0, 1, 2];
// Paleta categórica validada (orden fijo; el color sigue al producto, no a su posición en el ranking).
const COLORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

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
const nombreProducto = (p) => (leer(`ventas.productos.${p}`) || "").trim() || `Producto / Servicio ${p + 1}`;

// Campos enlazados a una ruta de datos.
const campoNum = (ruta, props = {}) => h("input", { type: "number", step: "any", inputmode: "decimal", "data-ruta": ruta, "data-tipo": "num", ...props });
const campoTexto = (ruta, props = {}) => h("input", { type: "text", "data-ruta": ruta, ...props });
const campoArea = (ruta, props = {}) => h("textarea", { rows: 5, "data-ruta": ruta, ...props });
const salida = (clave, clase = "num") => h("span", { "data-salida": clave, class: clase, text: "—" });

// ---------------------------------------------------------------- Secciones

const SECCIONES = [];
const seccion = (id, grupo, titulo, ayuda, raices, construir) => SECCIONES.push({ id, grupo, titulo, ayuda, raices, construir });

// Fila de tabla anual: concepto + 3 años de entrada.
function filaAnual(base, clave, etiqueta, opciones = {}) {
  return h("tr", {},
    h("th", { scope: "row", text: etiqueta }),
    ANOS.map((y) => h("td", {}, opciones.soloPrimerAno && y > 0
      ? salida(`${base}.${clave}.${y}`)
      : campoNum(`${base}.${clave}.${y}`, { "aria-label": `${etiqueta}, ${etiquetaAno(y)}` }))));
}
const filaTotal = (clave, etiqueta, clase = "fila-total") => h("tr", { class: clase },
  h("th", { scope: "row", text: etiqueta }), ANOS.map((y) => h("td", {}, salida(`${clave}.${y}`))));
const encabezadoAnual = (titulo = "Concepto") => h("thead", {}, h("tr", {}, h("th", { text: titulo }), ANOS.map((y) => h("th", { class: "num", "data-ano": y, text: etiquetaAno(y) }))));
const filaGrupo = (texto) => h("tr", { class: "fila-grupo" }, h("th", { colspan: 4, text: texto }));

// 1. Previsión de ventas a 3 años
seccion("ventas", "Números", "Previsión de ventas a 3 años",
  "Escriba hasta 5 productos o servicios, las unidades que espera vender cada mes, y su costo y precio por unidad. Los totales, la utilidad bruta y los gráficos se calculan solos.",
  ["ventas"], () => {
    const productos = h("div", { class: "plan-grid-5" },
      Array.from({ length: N_PRODUCTOS }, (_, p) => h("label", {}, `Producto o servicio ${p + 1}`,
        campoTexto(`ventas.productos.${p}`, { placeholder: `Producto ${p + 1}` }))));

    const tabs = h("div", { class: "segmented plan-anos", role: "tablist", "aria-label": "Año de la previsión" },
      ANOS.map((y) => h("button", { type: "button", role: "tab", "data-ano-ventas": y, "aria-selected": y === 0 ? "true" : "false", text: `Año ${y + 1}` })));

    const anos = ANOS.map((y) => h("div", { class: "plan-ano", "data-panel-ano": y, hidden: y !== 0 },
      h("h4", { text: "Unidades vendidas por mes" }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table plan-meses" },
        h("thead", {}, h("tr", {}, h("th", { text: "Producto" }),
          Array.from({ length: 12 }, (_, m) => h("th", { class: "num", "data-mes": `${y}.${m}`, text: etiquetaMes(y, m) })),
          h("th", { class: "num", text: "Total" }))),
        h("tbody", {}, Array.from({ length: N_PRODUCTOS }, (_, p) => h("tr", {},
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
        h("tbody", {}, Array.from({ length: N_PRODUCTOS }, (_, p) => h("tr", {},
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

// 2. Plan financiero
seccion("financiero", "Números", "Plan financiero",
  "Explique los supuestos de sus proyecciones y, si necesita financiamiento, de dónde vendrá y en qué lo usará.",
  ["financiero"], () => {
    const lista = (clave, titulo) => h("div", {},
      h("h4", { text: titulo }),
      h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
        h("thead", {}, h("tr", {}, h("th", { text: "Concepto" }), h("th", { class: "num", text: "Monto" }))),
        h("tbody", {}, Array.from({ length: 9 }, (_, i) => h("tr", {},
          h("td", {}, campoTexto(`financiero.${clave}.${i}.concepto`, { "aria-label": `${titulo} ${i + 1}` })),
          h("td", {}, campoNum(`financiero.${clave}.${i}.monto`, { "aria-label": `Monto ${i + 1}` }))))),
        h("tfoot", {}, h("tr", { class: "fila-total" }, h("th", { text: "Total" }), h("td", {}, salida(`f.${clave}`)))))));
    return [
      h("label", {}, "Supuestos clave", campoArea("financiero.supuestos", { placeholder: "¿Cómo llegó a estas cifras? (resultados anteriores, estudios de mercado, contratos). ¿Qué crecimiento y utilidad espera?" })),
      h("div", { class: "plan-grid-2" },
        lista("fuentes", "Fuentes de financiamiento"),
        lista("usos", "Uso del financiamiento")),
      h("div", { class: "plan-resumen" }, h("span", { text: "Diferencia (fuentes − usos)" }), salida("f.diferencia", "plan-cifra"), h("p", { "data-salida": "f.mensaje", class: "tool-message" })),
    ];
  });

// 3. Balance de situación
const BALANCE = [
  { lado: "activos", grupo: "Activo corriente", total: "Total activo corriente", items: [["efectivo", "Efectivo y bancos"], ["cxc", "Cuentas por cobrar (clientes)"], ["inventario", "Inventario"], ["anticipados", "Gastos pagados por anticipado"], ["invCorto", "Inversiones a corto plazo"]] },
  { lado: "activos", grupo: "Activo no corriente", total: "Total activo no corriente", items: [["invLargo", "Inversiones a largo plazo"], ["propiedad", "Propiedad, planta y equipo"], ["depAcum", "Depreciación acumulada (en negativo)"], ["intangibles", "Activos intangibles"]] },
  { lado: "activos", grupo: "Otros activos", total: "Total otros activos", items: [["impDiferidos", "Impuestos diferidos"], ["otrosActivos", "Otros activos"]] },
  { lado: "pasivos", grupo: "Pasivo corriente", total: "Total pasivo corriente", items: [["proveedores", "Proveedores"], ["prestCorto", "Préstamos a corto plazo"], ["impuestos", "Impuestos por pagar"], ["salarios", "Salarios y cargas sociales por pagar"], ["adelantos", "Ingresos recibidos por adelantado"], ["porcionCorriente", "Porción corriente de la deuda a largo plazo"]] },
  { lado: "pasivos", grupo: "Pasivo no corriente", total: "Total pasivo no corriente", items: [["deudaLargo", "Deuda a largo plazo"], ["rentaDiferida", "Impuesto sobre la renta diferido"], ["otrosPasivos", "Otros pasivos"]] },
  { lado: "patrimonio", grupo: "Patrimonio", total: "Total patrimonio", items: [["capital", "Capital aportado por los socios"], ["retenidas", "Utilidades retenidas"], ["otrosPatrimonio", "Otros"]] },
];
seccion("balance", "Números", "Balance de situación",
  "Lo que la empresa tiene (activos), lo que debe (pasivos) y lo que pertenece a los socios (patrimonio) al cierre de cada año. Siempre debe cumplirse: Activo = Pasivo + Patrimonio.",
  ["balance"], () => {
    const bloque = (lado, titulo, totalEtiqueta, totalClave) => h("div", { class: "table-wrap" }, h("table", { class: "plan-table" },
      encabezadoAnual(titulo),
      h("tbody", {}, BALANCE.filter((g) => g.lado === lado || (lado === "pasivos" && g.lado === "patrimonio")).flatMap((g, i) => [
        filaGrupo(g.grupo),
        ...g.items.map(([k, et]) => filaAnual("balance", k, et)),
        filaTotal(`b.grupo.${BALANCE.indexOf(g)}`, g.total, "fila-subtotal"),
      ])),
      h("tfoot", {}, filaTotal(totalClave, totalEtiqueta))));
    return [
      bloque("activos", "Activos", "Total activos", "b.activos"),
      bloque("pasivos", "Pasivo y patrimonio", "Total pasivo y patrimonio", "b.pasivoPatrimonio"),
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
    h("tbody", {}, FLUJO.flatMap((g) => [filaGrupo(g.grupo), ...g.items.map(([k, et]) => filaAnual("flujo", k, et)), filaTotal(`fc.${g.clave}`, g.total, "fila-subtotal")]),
      filaGrupo("Cierre del año"),
      filaTotal("fc.neto", "Aumento o disminución neta de efectivo", "fila-subtotal"),
      filaAnual("flujo", "efectivoInicial", "Efectivo al inicio del año", { soloPrimerAno: true })),
    h("tfoot", {}, filaTotal("fc.final", "Efectivo al final del año"))))]);

// 5. Estado de resultados
const RESULTADOS_VENTA = [["sueldosVenta", "Sueldos y salarios"], ["comisiones", "Comisiones"], ["publicidad", "Publicidad y mercadeo"], ["depVenta", "Depreciación"], ["otrosVenta", "Otros (p. ej. honorarios profesionales)"]];
const RESULTADOS_ADM = [["sueldosAdm", "Sueldos y salarios"], ["cargas", "Cargas sociales (CCSS)"], ["beneficios", "Beneficios a empleados"], ["seguros", "Seguros y pólizas"], ["alquiler", "Alquiler"], ["servicios", "Servicios públicos (agua, luz, internet)"], ["depAdm", "Depreciación y amortización"], ["oficina", "Materiales de oficina"], ["viajes", "Viáticos y transporte"], ["mantenimiento", "Mantenimiento y alquiler de equipo"], ["intereses", "Intereses financieros"], ["patentes", "Patentes y permisos"], ["otrosAdm", "Otros"]];
seccion("resultados", "Números", "Estado de resultados",
  "Muestra si la empresa gana o pierde: ventas, menos costo de ventas, menos gastos, menos impuestos.",
  ["resultados"], () => [
    h("div", { class: "plan-grid-2" },
      h("label", {}, "Tasa del impuesto sobre la renta (%)", campoNum("resultados.tasaRenta", { min: 0, max: 100, placeholder: "30" }),
        h("small", { class: "field-hint", text: "Personas jurídicas: 30 %. Las pymes con ingresos brutos menores al límite que fija Hacienda pagan tarifas reducidas; consulte su caso." })),
      h("div", { class: "plan-accion" }, h("button", { type: "button", class: "btn btn-outline btn-small", id: "btn-traer-ventas", text: "Usar los ingresos de la previsión de ventas" }))),
    h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual(),
      h("tbody", {},
        filaGrupo("Ingresos"), filaAnual("resultados", "ventasBrutas", "Ventas brutas"), filaAnual("resultados", "devoluciones", "Devoluciones y descuentos"),
        filaTotal("r.ventasNetas", "Ventas netas", "fila-subtotal"),
        filaGrupo("Costo de ventas"), filaAnual("resultados", "invInicial", "Inventario inicial"), filaAnual("resultados", "compras", "Compras o costo de producción"),
        filaTotal("r.disponible", "Total disponible para la venta", "fila-subtotal"), filaAnual("resultados", "invFinal", "Inventario final"),
        filaTotal("r.costo", "Costo de ventas", "fila-subtotal"),
        filaTotal("r.utilidadBruta", "Utilidad bruta"),
        filaGrupo("Gastos de venta"), RESULTADOS_VENTA.map(([k, et]) => filaAnual("resultados", k, et)), filaTotal("r.gastosVenta", "Total gastos de venta", "fila-subtotal"),
        filaGrupo("Gastos generales y administrativos"), RESULTADOS_ADM.map(([k, et]) => filaAnual("resultados", k, et)), filaTotal("r.gastosAdm", "Total gastos generales", "fila-subtotal"),
        filaTotal("r.gastosOperacion", "Total gastos de operación", "fila-subtotal"),
        filaTotal("r.antesImpuestos", "Utilidad antes de impuestos"),
        filaTotal("r.impuesto", "Impuesto sobre la renta", "fila-subtotal"),
        filaTotal("r.despuesImpuestos", "Utilidad después de impuestos"),
        filaAnual("resultados", "extraordinarios", "Ganancias o pérdidas extraordinarias"), filaAnual("resultados", "impExtra", "Impuesto sobre extraordinarios")),
      h("tfoot", {}, filaTotal("r.neto", "Resultado neto")))),
    h("div", { class: "table-wrap" }, h("table", { class: "plan-table" }, encabezadoAnual("Indicador"),
      h("tbody", {}, [["margenBruto", "Margen bruto"], ["margenNeto", "Margen neto"]].map(([k, et]) =>
        h("tr", {}, h("th", { scope: "row", text: et }), ANOS.map((y) => h("td", {}, salida(`r.${k}.${y}`)))))))),
  ]);

// Secciones de texto
const textos = (id, titulo, ayuda, campos) => seccion(id, "Estrategia", titulo, ayuda, [`textos.${id}`],
  () => campos.map(([k, et, ph]) => h("label", {}, et, campoArea(`textos.${id}.${k}`, { placeholder: ph || "" }))));

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
const tablaFilas = (base, columnas, filas = 6) => h("div", { class: "table-wrap" }, h("table", { class: "plan-table plan-filas" },
  h("thead", {}, h("tr", {}, columnas.map(([, t]) => h("th", { text: t })))),
  h("tbody", {}, Array.from({ length: filas }, (_, i) => h("tr", {}, columnas.map(([k, t, tipo]) => h("td", {},
    tipo === "fecha" ? h("input", { type: "date", "data-ruta": `${base}.${i}.${k}`, "aria-label": `${t} ${i + 1}` })
      : campoTexto(`${base}.${i}.${k}`, { "aria-label": `${t} ${i + 1}` }))))))));
seccion("calendario", "Estrategia", "Calendario y métricas", "Las actividades, los hitos y los indicadores con los que medirá el avance del plan.", ["calendario"], () => [
  h("h4", { text: "Calendario de actividades" }), tablaFilas("calendario.actividades", [["actividad", "Actividad"], ["objetivo", "Objetivo"], ["fecha", "Fecha límite", "fecha"]]),
  h("h4", { text: "Hitos" }), tablaFilas("calendario.hitos", [["nombre", "Hito"], ["descripcion", "Descripción"], ["fecha", "Fecha límite", "fecha"]]),
  h("h4", { text: "Indicadores clave (KPI)" }), tablaFilas("calendario.kpis", [["nombre", "Indicador"], ["descripcion", "Descripción"], ["metrica", "Meta"]]),
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
seccion("mercado", "Estrategia", "Mercado objetivo", "Describa hasta dos segmentos de clientes ideales.", ["mercado"], () => [
  h("div", { class: "plan-grid-2" }, [0, 1].map((s) => h("div", { class: "plan-card" },
    h("h4", {}, `Segmento ${s + 1}`),
    campoTexto(`mercado.${s}.nombre`, { placeholder: "Nombre del segmento (p. ej. familias jóvenes)", "aria-label": `Nombre del segmento ${s + 1}` }),
    MERCADO.map(([grupo, campos]) => h("div", {}, h("p", { class: "plan-subgrupo", text: grupo }),
      campos.map(([k, et]) => h("label", {}, et, campoTexto(`mercado.${s}.${k}`)))))))),
]);

// 13. Análisis FODA
const FODA = [["fortalezas", "Fortalezas", "Factores internos (+)"], ["debilidades", "Debilidades", "Factores internos (−)"], ["oportunidades", "Oportunidades", "Factores externos (+)"], ["amenazas", "Amenazas", "Factores externos (−)"]];
seccion("foda", "Estrategia", "Análisis FODA", "Fortalezas y debilidades (internas), oportunidades y amenazas (externas), con su importancia.", ["foda"], () => [
  h("div", { class: "plan-grid-2" }, FODA.map(([k, titulo, sub]) => h("div", { class: `plan-card foda-${k}` },
    h("h4", {}, titulo, h("small", { text: ` · ${sub}` })),
    Array.from({ length: 8 }, (_, i) => h("div", { class: "foda-fila" },
      h("span", { class: "foda-num", text: i + 1 }),
      campoTexto(`foda.${k}.${i}.texto`, { "aria-label": `${titulo} ${i + 1}` }),
      h("select", { "data-ruta": `foda.${k}.${i}.importancia`, "aria-label": `Importancia ${i + 1}` },
        ["", "Alta", "Media", "Baja"].map((v) => h("option", { value: v, text: v || "Importancia" })))))))),
]);

// 14. Competencia
seccion("competencia", "Estrategia", "Competencia", "Cómo hizo el análisis, qué alternativas usan hoy sus clientes y en qué se diferencia usted.", ["competencia"], () => [
  h("label", {}, "Análisis competitivo", campoArea("competencia.analisis")),
  h("h4", { text: "Competidores" }),
  tablaFilas("competencia.competidores", [["nombre", "Competidor (tipo o nombre)"], ["descripcion", "Descripción"], ["fortaleza", "Su principal fortaleza"], ["diferencia", "Cómo me diferencio"]], 5),
]);

// ---------------------------------------------------------------- Cálculos

const S = {}; // salidas calculadas: clave → texto
function calcular() {
  for (const k in S) delete S[k];

  // Ventas
  const anual = ANOS.map((y) => {
    let unidadesTotal = 0, ingresosTotal = 0, utilidadTotal = 0;
    const mes = Array(12).fill(0);
    for (let p = 0; p < N_PRODUCTOS; p++) {
      const costo = num(`ventas.anos.${y}.costo.${p}`), precio = num(`ventas.anos.${y}.precio.${p}`);
      const meses = Array.from({ length: 12 }, (_, m) => num(`ventas.anos.${y}.unidades.${p}.${m}`));
      meses.forEach((u, m) => (mes[m] += u));
      const unidades = sumar(meses), ingresos = unidades * precio, utilidad = unidades * (precio - costo);
      unidadesTotal += unidades; ingresosTotal += ingresos; utilidadTotal += utilidad;
      S[`v.${y}.margen.${p}`] = fmtMoneda(precio - costo);
      S[`v.${y}.unidades.${p}`] = fmtNum(unidades);
      S[`v.${y}.ingresos.${p}`] = fmtMoneda(ingresos);
      S[`v.${y}.utilidad.${p}`] = fmtMoneda(utilidad);
      S[`v.${y}._ing.${p}`] = ingresos;
    }
    mes.forEach((u, m) => (S[`v.${y}.mes.${m}`] = fmtNum(u)));
    S[`v.${y}.unidadesTotal`] = fmtNum(unidadesTotal);
    S[`v.${y}.ingresosTotal`] = fmtMoneda(ingresosTotal);
    S[`v.${y}.utilidadTotal`] = fmtMoneda(utilidadTotal);
    S[`v.${y}.margenTotal`] = fmtPct(div(utilidadTotal, ingresosTotal));
    return { unidadesTotal, ingresosTotal, utilidadTotal };
  });
  ANOS.forEach((y) => {
    for (let p = 0; p < N_PRODUCTOS; p++) {
      S[`v.${y}.variacion.${p}`] = y === 0 ? "—" : fmtPct(div(S[`v.${y}._ing.${p}`], S[`v.${y - 1}._ing.${p}`]) - 1);
    }
    S[`v.${y}.variacionTotal`] = y === 0 ? "—" : fmtPct(div(anual[y].ingresosTotal, anual[y - 1].ingresosTotal) - 1);
  });
  calcular.anual = anual;

  // Plan financiero
  const totalLista = (clave) => sumar(Array.from({ length: 9 }, (_, i) => num(`financiero.${clave}.${i}.monto`)));
  const fuentes = totalLista("fuentes"), usos = totalLista("usos");
  S["f.fuentes"] = fmtMoneda(fuentes);
  S["f.usos"] = fmtMoneda(usos);
  S["f.diferencia"] = fmtMoneda(fuentes - usos);
  S["f.mensaje"] = !fuentes && !usos ? "" : fuentes === usos ? "Las fuentes cubren exactamente los usos."
    : fuentes > usos ? "Las fuentes superan los usos: tiene un margen disponible." : "Los usos superan las fuentes: falta financiamiento.";
  S["f.mensaje.clase"] = fuentes >= usos ? "ok" : "warn";

  // Balance
  ANOS.forEach((y) => {
    const totGrupo = BALANCE.map((g, i) => {
      const t = sumar(g.items.map(([k]) => num(`balance.${k}.${y}`)));
      S[`b.grupo.${i}.${y}`] = fmtMoneda(t);
      return t;
    });
    const [ac, anc, oa, pc, pnc, pat] = totGrupo;
    const activos = ac + anc + oa, pasivos = pc + pnc;
    S[`b.activos.${y}`] = fmtMoneda(activos);
    S[`b.pasivoPatrimonio.${y}`] = fmtMoneda(pasivos + pat);
    const dif = activos - pasivos - pat;
    S[`b.cuadre.${y}`] = !activos && !pasivos && !pat ? "—" : Math.abs(dif) < 0.5 ? "Cuadra ✓" : `No cuadra: ${fmtMoneda(dif)}`;
    S[`b.razon.endeudamiento.${y}`] = fmtPct(div(pasivos, activos));
    S[`b.razon.corriente.${y}`] = fmtRazon(div(ac, pc));
    S[`b.razon.capitalTrabajo.${y}`] = activos || pasivos ? fmtMoneda(ac - pc) : "—";
    S[`b.razon.apalancamiento.${y}`] = fmtRazon(div(activos, pat));
    S[`b.razon.deudaPatrimonio.${y}`] = fmtRazon(div(pasivos, pat));
  });

  // Flujo de caja (el efectivo inicial de los años 2 y 3 es el final del año anterior)
  let efectivo = num("flujo.efectivoInicial.0");
  ANOS.forEach((y) => {
    const tot = FLUJO.map((g) => {
      const t = sumar(g.items.map(([k]) => num(`flujo.${k}.${y}`)));
      S[`fc.${g.clave}.${y}`] = fmtMoneda(t);
      return t;
    });
    const neto = sumar(tot);
    if (y > 0) S[`flujo.efectivoInicial.${y}`] = fmtMoneda(efectivo);
    S[`fc.neto.${y}`] = fmtMoneda(neto);
    efectivo += neto;
    S[`fc.final.${y}`] = fmtMoneda(efectivo);
  });

  // Estado de resultados
  const tasa = (leer("resultados.tasaRenta") ?? 30) / 100; // 30 % si no se indica otra tasa
  ANOS.forEach((y) => {
    const r = (k) => num(`resultados.${k}.${y}`);
    const ventasNetas = r("ventasBrutas") - r("devoluciones");
    const disponible = r("invInicial") + r("compras");
    const costo = disponible - r("invFinal");
    const utilidadBruta = ventasNetas - costo;
    const gastosVenta = sumar(RESULTADOS_VENTA.map(([k]) => r(k)));
    const gastosAdm = sumar(RESULTADOS_ADM.map(([k]) => r(k)));
    const antes = utilidadBruta - gastosVenta - gastosAdm;
    const impuesto = antes > 0 ? antes * tasa : 0;
    const despues = antes - impuesto;
    const neto = despues + r("extraordinarios") - r("impExtra");
    Object.entries({ ventasNetas, disponible, costo, utilidadBruta, gastosVenta, gastosAdm, gastosOperacion: gastosVenta + gastosAdm, antesImpuestos: antes, impuesto, despuesImpuestos: despues, neto })
      .forEach(([k, v]) => (S[`r.${k}.${y}`] = fmtMoneda(v)));
    S[`r.margenBruto.${y}`] = fmtPct(div(utilidadBruta, ventasNetas));
    S[`r.margenNeto.${y}`] = fmtPct(div(neto, ventasNetas));
  });
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
  const activos = Array.from({ length: N_PRODUCTOS }, (_, p) => p).filter((p) =>
    (leer(`ventas.productos.${p}`) || "").trim() || Array.from({ length: 12 }, (_, m) => num(`ventas.anos.${y}.unidades.${p}.${m}`)).some(Boolean));
  const series = activos.map((p) => ({ nombre: nombreProducto(p), color: COLORES[p], valores: Array.from({ length: 12 }, (_, m) => num(`ventas.anos.${y}.unidades.${p}.${m}`)) }));
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
}

// Una sección cuenta como iniciada si tiene cualquier dato escrito.
const tieneDatos = (v) => v != null && v !== "" && (typeof v !== "object" || Object.values(v).some(tieneDatos));
function pintarProgreso() {
  let hechas = 0;
  SECCIONES.forEach((s) => {
    const ok = s.raices.some((r) => tieneDatos(leer(r)));
    if (ok) hechas++;
    document.querySelector(`[data-nav="${s.id}"]`)?.classList.toggle("iniciada", ok);
  });
  const p = document.getElementById("plan-progreso");
  if (p) p.textContent = `${hechas} de ${SECCIONES.length} secciones con datos`;
}

function mostrarSeccion(id) {
  estado.seccion = id;
  document.querySelectorAll("[data-seccion]").forEach((s) => (s.hidden = s.dataset.seccion !== id));
  document.querySelectorAll("[data-nav]").forEach((b) => b.setAttribute("aria-current", b.dataset.nav === id ? "true" : "false"));
  const sel = document.getElementById("plan-nav-select");
  if (sel) sel.value = id;
  if (id === "ventas") pintarGraficos();
}

function construir(soloLectura) {
  const nav = document.getElementById("plan-nav");
  const cont = document.getElementById("plan-secciones");
  const grupos = [...new Set(SECCIONES.map((s) => s.grupo))];
  nav.replaceChildren(
    h("select", { id: "plan-nav-select", class: "plan-nav-select", "aria-label": "Sección", onchange: (e) => mostrarSeccion(e.target.value) },
      SECCIONES.map((s, i) => h("option", { value: s.id, text: `${i + 1}. ${s.titulo}` }))),
    ...grupos.map((g) => h("div", { class: "plan-nav-grupo" }, h("p", { text: g }),
      SECCIONES.filter((s) => s.grupo === g).map((s) => h("button", {
        type: "button", "data-nav": s.id, onclick: () => mostrarSeccion(s.id),
      }, h("span", { text: `${SECCIONES.indexOf(s) + 1}. ${s.titulo}` }))))),
    h("p", { class: "plan-progreso", id: "plan-progreso" }));

  cont.replaceChildren(...SECCIONES.map((s, i) => h("section", { class: "plan-seccion", "data-seccion": s.id, hidden: true, "aria-labelledby": `titulo-${s.id}` },
    h("p", { class: "eyebrow eyebrow-accent", text: `${s.grupo} · ${i + 1} de ${SECCIONES.length}` }),
    h("h3", { class: "plan-titulo", id: `titulo-${s.id}`, text: s.titulo }),
    h("p", { class: "plan-ayuda", text: s.ayuda }),
    ...s.construir(),
    h("div", { class: "plan-pasos" },
      i > 0 ? h("button", { type: "button", class: "btn btn-outline btn-small", onclick: () => { mostrarSeccion(SECCIONES[i - 1].id); scrollArriba(); }, text: `‹ ${SECCIONES[i - 1].titulo}` }) : h("span"),
      i < SECCIONES.length - 1 ? h("button", { type: "button", class: "btn btn-small", onclick: () => { mostrarSeccion(SECCIONES[i + 1].id); scrollArriba(); }, text: `${SECCIONES[i + 1].titulo} ›` }) : h("span")))));

  // Valores guardados en los campos.
  cont.querySelectorAll("[data-ruta]").forEach((el) => {
    const v = leer(el.dataset.ruta);
    if (v != null) el.value = v;
    if (soloLectura) el.disabled = true;
  });
  if (!leer("general.moneda")) cont.querySelector('[data-ruta="general.moneda"]').value = "CRC";
  if (soloLectura) cont.querySelectorAll("#btn-traer-ventas").forEach((b) => (b.hidden = true));

  cont.querySelectorAll("[data-ano-ventas]").forEach((b) => b.addEventListener("click", () => {
    estado.anoVentas = Number(b.dataset.anoVentas);
    cont.querySelectorAll("[data-ano-ventas]").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
    cont.querySelectorAll("[data-panel-ano]").forEach((p) => (p.hidden = Number(p.dataset.panelAno) !== estado.anoVentas));
    pintarGraficos();
  }));

  mostrarSeccion(SECCIONES[0].id);
  pintarSalidas();
}
const scrollArriba = () => document.getElementById("plan-app").scrollIntoView({ behavior: "smooth", block: "start" });

// ---------------------------------------------------------------- Inicio y guardado

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
      await fs.setDoc(ref, { datos, actualizado: fs.serverTimestamp() });
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
    const ajeno = pedido && pedido !== usuario.uid;
    if (ajeno && !esAsesor(usuario)) {
      estadoCarga.textContent = "Solo puede ver su propio plan de negocios.";
      return;
    }
    const uid = ajeno ? pedido : usuario.uid;
    ref = fs.doc(db, "planes", uid);
    try {
      const snap = await fs.getDoc(ref);
      datos = snap.exists() ? snap.data().datos || {} : {};
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
    construir(ajeno);
    document.getElementById("plan-espera").hidden = true;
    document.getElementById("plan-app").hidden = false;
    pintarGraficos();
    marcar(ajeno ? "Solo lectura" : "Los cambios se guardan automáticamente");

    if (ajeno) return;
    const cont = document.getElementById("plan-secciones");
    const alCambiar = (e) => {
      const el = e.target;
      if (!el.dataset?.ruta) return;
      const v = el.dataset.tipo === "num" ? (el.value === "" ? null : Number(el.value)) : el.value;
      escribir(el.dataset.ruta, v);
      pintarSalidas();
      programar();
    };
    cont.addEventListener("input", alCambiar);
    cont.addEventListener("change", alCambiar);
    document.getElementById("btn-traer-ventas")?.addEventListener("click", () => {
      ANOS.forEach((y) => {
        const v = Math.round(calcular.anual[y].ingresosTotal * 100) / 100;
        escribir(`resultados.ventasBrutas.${y}`, v);
        const campo = cont.querySelector(`[data-ruta="resultados.ventasBrutas.${y}"]`);
        if (campo) campo.value = v;
      });
      pintarSalidas();
      programar();
    });
  });

  document.getElementById("btn-imprimir").addEventListener("click", () => {
    document.querySelectorAll("[data-seccion]").forEach((s) => (s.hidden = false));
    document.querySelectorAll("[data-panel-ano]").forEach((p) => (p.hidden = false));
    window.print();
    mostrarSeccion(estado.seccion);
    document.querySelectorAll("[data-panel-ano]").forEach((p) => (p.hidden = Number(p.dataset.panelAno) !== estado.anoVentas));
  });
}
