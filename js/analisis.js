// Motor de análisis financiero del plan de negocios (basado en reglas, sin IA).
// Recibe el modelo numérico que arma plan.js y devuelve hallazgos clasificados, un puntaje
// por área y recomendaciones. Cada hallazgo trae dos textos: uno breve para el cliente y uno
// completo para el asesor, con acciones sugeridas y preguntas para guiar la conversación.
//
// Rangos de referencia (generales; deben ajustarse según la actividad de la empresa):
// - Liquidez, endeudamiento, rentabilidad y eficiencia: Corporate Finance Institute (CFI),
//   "Financial Ratios Definitive Guide", y CFA Institute (ciclo de conversión de efectivo).
// - Cobertura del servicio de deuda (DSCR): 1,25 veces es el mínimo usual de las entidades
//   financieras para crédito a pymes.
// - Crecimiento real: meta de inflación del BCCR, 3 % ± 1 punto porcentual.
// - Punto de equilibrio y margen de seguridad: contabilidad gerencial (margen de contribución).
// - Rangos por actividad (SECTORES): márgenes, liquidez y días de capital de trabajo cambian
//   mucho entre un comercio, un restaurante o una constructora. Se basan en referencias para
//   pequeñas empresas (Crestmont Capital y BizMiner, 2026: razón corriente, márgenes netos y
//   brutos por sector), en Damodaran (NYU Stern, enero de 2026: márgenes por industria de
//   empresas que cotizan en EE. UU., como techo de referencia) y en la rotación de inventario
//   por industria (OnRamp Funds, 2026), ajustados a la escala de una pyme. Son orientativos.

const INFLACION_META = 0.03;
const PESO_ESTADO = { fortaleza: 100, atencion: 55, alerta: 15 };

// Referencias por actividad. Cada par es [sano, alerta]; "planilla" es el peso de la planilla
// sobre las ventas a partir del cual se marca atención. "general" es la referencia por omisión.
export const SECTORES = {
  general: {
    nombre: "General", mb: 0.30, mo: [0.10, 0.03], mn: [0.08, 0.02], rc: [1.5, 1], pa: [1, 0.7],
    cobro: [45, 90], inventario: [60, 120], ciclo: [60, 120], planilla: 0.40,
  },
  comercio: {
    nombre: "Comercio (tiendas, distribución)", mb: 0.25, mo: [0.05, 0.015], mn: [0.04, 0.01], rc: [1.5, 1], pa: [0.5, 0.3],
    cobro: [30, 60], inventario: [60, 120], ciclo: [45, 90], planilla: 0.20,
    nota: "Margen bajo y alta rotación: el comercio gana por volumen. Mucho activo corriente es inventario, por eso la prueba ácida sana es menor.",
  },
  restaurante: {
    nombre: "Restaurantes, sodas y cafeterías", mb: 0.60, mo: [0.08, 0.03], mn: [0.06, 0.02], rc: [1, 0.7], pa: [0.7, 0.4],
    cobro: [10, 30], inventario: [10, 20], ciclo: [10, 30], planilla: 0.38,
    nota: "Cobra de contado y paga a proveedores a plazo, por eso opera sano con una razón corriente cercana a 1. El costo de alimentos ronda 30–35 % de las ventas y la planilla 30–35 %; el inventario es perecedero.",
  },
  servicios: {
    nombre: "Servicios profesionales y técnicos", mb: 0.50, mo: [0.15, 0.05], mn: [0.10, 0.03], rc: [1.5, 1], pa: [1.2, 0.8],
    cobro: [45, 90], inventario: [30, 60], ciclo: [45, 90], planilla: 0.55,
    nota: "Casi no maneja inventario y su principal costo es el personal, por eso la planilla pesa más. Los márgenes deben ser mayores que en comercio.",
  },
  manufactura: {
    nombre: "Manufactura e industria", mb: 0.30, mo: [0.08, 0.03], mn: [0.06, 0.02], rc: [1.5, 1.1], pa: [0.8, 0.5],
    cobro: [60, 90], inventario: [90, 150], ciclo: [90, 150], planilla: 0.35,
    nota: "Mantiene materia prima, producto en proceso y terminado: los días de inventario y el ciclo de efectivo son naturalmente más largos.",
  },
  construccion: {
    nombre: "Construcción y contratistas", mb: 0.20, mo: [0.06, 0.02], mn: [0.04, 0.015], rc: [1.3, 1], pa: [1, 0.7],
    cobro: [60, 90], inventario: [45, 90], ciclo: [60, 120], planilla: 0.40,
    nota: "Márgenes estrechos y cobro por avance de obra: el riesgo está en los atrasos de pago y en los sobrecostos.",
  },
  agropecuario: {
    nombre: "Agropecuario", mb: 0.25, mo: [0.08, 0.02], mn: [0.05, 0.01], rc: [1.5, 1.1], pa: [0.8, 0.5],
    cobro: [45, 90], inventario: [120, 240], ciclo: [120, 240], planilla: 0.40,
    nota: "Ciclos de cosecha o engorde largos y ventas concentradas en ciertos meses: necesita más capital de trabajo y reservas de efectivo.",
  },
};
export const AREAS = [
  { id: "ventas", nombre: "Ventas y crecimiento", peso: 15 },
  { id: "rentabilidad", nombre: "Rentabilidad", peso: 25 },
  { id: "liquidez", nombre: "Liquidez", peso: 20 },
  { id: "endeudamiento", nombre: "Endeudamiento y solvencia", peso: 15 },
  { id: "eficiencia", nombre: "Eficiencia y capital de trabajo", peso: 10 },
  { id: "flujo", nombre: "Flujo de caja", peso: 15 },
  { id: "consistencia", nombre: "Consistencia de la información", peso: 0 },
  { id: "estrategia", nombre: "Estrategia y planificación", peso: 0 },
];

const div = (a, b) => (b ? a / b : NaN);
const ok = Number.isFinite;
const pct = (v) => (ok(v) ? `${(v * 100).toLocaleString("es-CR", { maximumFractionDigits: 1 })} %` : "—");
const veces = (v) => (ok(v) ? `${v.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} veces` : "—");
const dias = (v) => (ok(v) ? `${Math.round(v).toLocaleString("es-CR")} días` : "—");
const nivel = (v, sano, alerta, mayorEsMejor = true) =>
  mayorEsMejor ? (v >= sano ? "fortaleza" : v >= alerta ? "atencion" : "alerta")
    : (v <= sano ? "fortaleza" : v <= alerta ? "atencion" : "alerta");

// ---------------------------------------------------------------- Biblioteca de recomendaciones

// Recomendaciones reutilizables. "cliente" es la versión corta; "asesor" la detallada.
const RECOMENDACIONES = {
  precio: {
    cliente: "Revise sus precios: calcule el costo real de cada producto y el margen que necesita.",
    asesor: "Revisar la política de precios: costeo completo por producto (materia prima, mano de obra, empaque, comisión de pago), precio por valor percibido frente a la competencia y prueba de aumentos graduales en un grupo pequeño de productos o clientes antes de generalizar. Un aumento de precio se traslada casi completo al margen de contribución y reduce el punto de equilibrio.",
  },
  costos: {
    cliente: "Negocie con proveedores y reduzca mermas para mejorar su margen.",
    asesor: "Reducir el costo de ventas: negociar plazos y descuentos por volumen, consolidar compras, comparar al menos tres proveedores, controlar mermas e inventario dañado y revisar recetas o fichas técnicas de producción.",
  },
  mezcla: {
    cliente: "Impulse los productos que le dejan más ganancia por unidad.",
    asesor: "Gestionar la mezcla de ventas: dar más visibilidad y prioridad comercial a los productos de mayor utilidad bruta, crear combos que incluyan un producto de alto margen y entrenar al personal en venta cruzada.",
  },
  diversificar: {
    cliente: "Dependa menos de un solo producto: desarrolle otras líneas o clientes.",
    asesor: "Reducir la concentración: desarrollar líneas complementarias, ampliar la base de clientes y canales (mayoristas, empresas, compras públicas en SICOP con la condición PYME) para que una caída en el producto principal no comprometa la operación.",
  },
  estacionalidad: {
    cliente: "Planifique promociones para los meses de menores ventas.",
    asesor: "Atenuar la estacionalidad: campañas y preventas en los meses bajos, productos de temporada, ajuste de compras y de personal según el calendario, y reserva de efectivo de los meses altos para cubrir los bajos.",
  },
  crecimiento: {
    cliente: "Abra nuevos canales de venta (redes sociales, WhatsApp Business, alianzas) y fidelice a sus clientes.",
    asesor: "Acelerar las ventas: canales digitales (catálogo en WhatsApp Business, redes sociales, comercio electrónico), alianzas con negocios complementarios, ferias, programa de referidos, recompra y fidelización, y aumento del ticket promedio con combos o servicios adicionales. Medir el costo de adquisición por canal.",
  },
  cobro: {
    cliente: "Cobre más rápido: acuerde plazos claros y facilite el pago (SINPE Móvil, transferencia).",
    asesor: "Acortar los días de cobro: política de crédito por escrito (límite y plazo por cliente), facturación inmediata, recordatorios antes del vencimiento, descuento por pronto pago, cobro por SINPE Móvil o transferencia y, si aplica, factoreo de facturas para adelantar liquidez.",
  },
  inventario: {
    cliente: "Mantenga menos inventario parado: compre según lo que realmente vende.",
    asesor: "Reducir los días de inventario: clasificar artículos ABC, liquidar los de lento movimiento, fijar puntos de reorden y comprar según la rotación real.",
  },
  liquidez: {
    cliente: "Refuerce su efectivo para cubrir las obligaciones de corto plazo.",
    asesor: "Fortalecer la liquidez: trasladar deuda de corto a largo plazo, negociar una línea de crédito revolutiva para capital de trabajo (banca comercial o SBD), mantener una reserva de efectivo de al menos un mes de gastos fijos y revisar el calendario de pagos.",
  },
  deuda: {
    cliente: "Evite más deuda por ahora y valore reestructurar la actual.",
    asesor: "Gestionar el endeudamiento: evaluar una reestructuración o consolidación (plazo, tasa, moneda), aportes de capital de los socios o reinversión de utilidades, y no asumir nuevas deudas hasta mejorar la cobertura del servicio de deuda.",
  },
  gastos: {
    cliente: "Revise sus gastos fijos: alquiler, servicios y suscripciones.",
    asesor: "Optimizar los gastos de operación: revisar alquiler, servicios, suscripciones y gastos no esenciales, comparar la estructura de personal con el nivel de ventas y convertir gastos fijos en variables cuando sea posible.",
  },
  flujo: {
    cliente: "Haga un presupuesto de efectivo mes a mes para anticipar faltantes.",
    asesor: "Instalar un flujo de caja proyectado semanal o mensual a 13 semanas o 12 meses, priorizar pagos, separar las finanzas personales de las de la empresa y anticipar necesidades de financiamiento antes de que se conviertan en urgencias.",
  },
  registros: {
    cliente: "Complete el balance y el estado de resultados para un diagnóstico más preciso.",
    asesor: "Solicitar estados financieros (idealmente certificados por un CPA) o al menos registros de ventas, compras, gastos y saldos de bancos y deudas, para validar las cifras del plan.",
  },
};

// ---------------------------------------------------------------- Análisis

export function analizar(M) {
  const H = []; // hallazgos
  const rec = new Set(); // claves de recomendaciones activadas
  const agregar = (hallazgo, recomendaciones = []) => {
    H.push(hallazgo);
    if (hallazgo.estado !== "fortaleza") recomendaciones.forEach((r) => rec.add(r));
  };
  const y0 = M.anos[0], y1 = M.anos[1], y2 = M.anos[2];
  const fm = M.fmt; // formateador de moneda
  const sectorId = SECTORES[M.sector] ? M.sector : "general";
  const R = SECTORES[sectorId];
  const ref = sectorId === "general" ? "Referencia general" : `Referencia para ${R.nombre.toLowerCase()}`;

  // Cada año usa el estado de resultados si tiene datos; si no, la previsión de ventas.
  const usaResultados = y0.res.tieneDatos;
  const ingresos = (a) => (a.res.tieneDatos ? a.res.ventasNetas : a.ventas.ingresos);
  const utilBruta = (a) => (a.res.tieneDatos ? a.res.utilidadBruta : a.ventas.utilidadBruta);

  // ----- Ventas y crecimiento
  if (M.anos.some((a) => ingresos(a) > 0)) {
    // La serie de crecimiento usa una sola fuente: el estado de resultados si tiene los 3 años;
    // si no, la previsión de ventas (si tiene al menos 2 años); si no, lo que haya.
    const prevision = M.anos.map((x) => x.ventas.ingresos || 0);
    const v = M.anos.every((x) => x.res.tieneDatos) ? M.anos.map((x) => x.res.ventasNetas)
      : prevision.filter((x) => x > 0).length >= 2 ? prevision : M.anos.map(ingresos);
    // Un año sin datos (ingresos en cero) no cuenta como caída de ventas.
    const g1 = v[0] > 0 && v[1] > 0 ? v[1] / v[0] - 1 : NaN, g2 = v[1] > 0 && v[2] > 0 ? v[2] / v[1] - 1 : NaN;
    const crec = [g1, g2].filter(ok);
    if (crec.length) {
      const prom = crec.reduce((a, b) => a + b, 0) / crec.length;
      const estado = prom > 0.6 ? "atencion" : prom >= INFLACION_META + 0.02 ? "fortaleza" : prom >= 0 ? "atencion" : "alerta";
      agregar({
        area: "ventas", id: "crecimiento", estado, valor: pct(prom),
        titulo: "Crecimiento de las ventas",
        cliente: prom > 0.6 ? `Proyecta crecer ${pct(prom)} por año: es una meta muy ambiciosa; revise que sea alcanzable.`
          : estado === "fortaleza" ? `Sus ventas crecen ${pct(prom)} por año, por encima de la inflación.`
            : prom >= 0 ? `Sus ventas crecen poco (${pct(prom)} por año), casi al ritmo de la inflación.`
              : `Sus ventas proyectadas bajan ${pct(-prom)} por año.`,
        asesor: `Crecimiento anual promedio de ingresos: ${pct(prom)} (año 1→2: ${pct(g1)}; año 2→3: ${pct(g2)}). Referencia: crecimiento real positivo por encima de la meta de inflación del BCCR (3 % ± 1). ${prom > 0.6 ? "Un crecimiento mayor al 60 % anual exige sustento: contratos, capacidad instalada, inversión en mercadeo y financiamiento del capital de trabajo adicional." : prom < 0 ? "Las ventas decrecientes comprometen la cobertura de gastos fijos y la capacidad de pago." : ""}`,
        preguntas: prom > 0.6 ? ["¿Qué respalda este crecimiento (contratos, nuevos clientes, nuevos productos)?", "¿Tiene la capacidad de producción y el capital de trabajo para atenderlo?"]
          : ["¿Qué canales o clientes nuevos podría sumar el próximo año?", "¿Cuánto representa la recompra de clientes actuales?"],
      }, prom > 0.6 ? [] : ["crecimiento"]);
    }
  }

  // Concentración, márgenes por producto y estacionalidad (previsión del año 1)
  const productos = y0.ventas.porProducto.filter((p) => p.ingresos > 0);
  if (productos.length >= 2) {
    const total = productos.reduce((t, p) => t + p.ingresos, 0);
    const top = [...productos].sort((a, b) => b.ingresos - a.ingresos)[0];
    const peso = top.ingresos / total;
    agregar({
      area: "ventas", id: "concentracion", estado: nivel(peso, 0.5, 0.7, false), valor: pct(peso),
      titulo: "Concentración de ventas",
      cliente: peso > 0.5 ? `«${top.nombre}» genera el ${pct(peso)} de sus ventas: depende mucho de un solo producto.`
        : `Sus ventas están bien repartidas entre ${productos.length} productos.`,
      asesor: `El producto principal («${top.nombre}») concentra el ${pct(peso)} de los ingresos del año 1 entre ${productos.length} productos con ventas. Referencia: más del 50 % implica dependencia; más del 70 %, riesgo alto ante cambios de demanda, precio o proveedores.`,
      preguntas: ["¿Qué pasaría con la empresa si las ventas de este producto bajan un 20 %?", "¿Qué otros productos o clientes podría desarrollar?"],
    }, ["diversificar"]);
  }
  const conVentas = y0.ventas.porProducto.filter((p) => p.unidades > 0 && p.precio > 0);
  const perdida = conVentas.filter((p) => p.precio - p.costo <= 0);
  const bajos = conVentas.filter((p) => p.precio - p.costo > 0 && (p.precio - p.costo) / p.precio < 0.2);
  if (perdida.length) {
    agregar({
      area: "rentabilidad", id: "margenNegativo", estado: "alerta", valor: perdida.map((p) => p.nombre).join(", "),
      titulo: "Productos que se venden con pérdida",
      cliente: `${perdida.map((p) => `«${p.nombre}»`).join(", ")} se ${perdida.length > 1 ? "venden" : "vende"} a un precio igual o menor que su costo.`,
      asesor: `Productos con margen unitario igual o menor a cero: ${perdida.map((p) => `${p.nombre} (precio ${fm(p.precio)}, costo ${fm(p.costo)})`).join("; ")}. Cada unidad vendida aumenta la pérdida. Revisar costeo, precio o la continuidad del producto (salvo que sea un gancho comercial deliberado).`,
      preguntas: ["¿El costo unitario incluye todos los insumos y la mano de obra?", "¿Este producto atrae ventas de otros productos rentables?"],
    }, ["precio", "costos"]);
  }
  if (bajos.length) {
    agregar({
      area: "rentabilidad", id: "margenBajo", estado: "atencion", valor: bajos.map((p) => p.nombre).join(", "),
      titulo: "Productos con margen bajo",
      cliente: `${bajos.map((p) => `«${p.nombre}»`).join(", ")} ${bajos.length > 1 ? "dejan" : "deja"} menos del 20 % de margen sobre el precio.`,
      asesor: `Productos con margen bruto unitario menor al 20 % del precio: ${bajos.map((p) => `${p.nombre} (${pct((p.precio - p.costo) / p.precio)})`).join("; ")}. Tienen poco espacio para absorber aumentos de costos, comisiones de pago o descuentos.`,
      preguntas: ["¿Cuándo ajustó precios por última vez?", "¿Hay proveedores alternativos para estos insumos?"],
    }, ["precio", "costos", "mezcla"]);
  }
  if (conVentas.length >= 2) {
    const mejor = [...conVentas].sort((a, b) => b.utilidad - a.utilidad)[0];
    agregar({
      area: "ventas", id: "mejorProducto", estado: "fortaleza", valor: mejor.nombre,
      titulo: "Producto más rentable",
      cliente: `«${mejor.nombre}» es el que más utilidad bruta le genera.`,
      asesor: `«${mejor.nombre}» aporta la mayor utilidad bruta del año 1 (${fm(mejor.utilidad)}, margen unitario ${pct((mejor.precio - mejor.costo) / mejor.precio)}). Es candidato a mayor esfuerzo comercial, combos y venta cruzada.`,
      preguntas: ["¿Este producto tiene espacio para crecer en volumen?"],
    });
    rec.add("mezcla");
  }
  const meses = y0.ventas.mesesIngreso;
  const conMeses = meses.filter((v) => v > 0).length;
  if (conMeses >= 6) {
    const media = meses.reduce((a, b) => a + b, 0) / 12;
    const cv = Math.sqrt(meses.reduce((t, v) => t + (v - media) ** 2, 0) / 12) / media;
    const iMax = meses.indexOf(Math.max(...meses)), iMin = meses.indexOf(Math.min(...meses));
    if (cv > 0.35) {
      agregar({
        area: "ventas", id: "estacionalidad", estado: "atencion", valor: pct(cv),
        titulo: "Ventas estacionales",
        cliente: `Sus ventas varían mucho entre meses: el más alto es ${M.mes(0, iMax)} y el más bajo ${M.mes(0, iMin)}.`,
        asesor: `Coeficiente de variación de los ingresos mensuales del año 1: ${pct(cv)} (mayor a 35 % indica estacionalidad marcada). Mes más alto: ${M.mes(0, iMax)} (${fm(meses[iMax])}); más bajo: ${M.mes(0, iMin)} (${fm(meses[iMin])}). Planificar el efectivo de los meses bajos y el inventario de los altos.`,
        preguntas: ["¿Cómo cubre los gastos fijos en los meses de menos ventas?", "¿Qué productos o promociones podría ofrecer en esos meses?"],
      }, ["estacionalidad", "flujo"]);
    }
  }

  // ----- Rentabilidad (estado de resultados o previsión)
  const ing0 = ingresos(y0);
  if (ing0 > 0) {
    const mb = div(utilBruta(y0), ing0);
    const mbs = M.anos.map((a) => div(utilBruta(a), ingresos(a)));
    const tendencia = ok(mbs[2]) && ok(mbs[0]) ? mbs[2] - mbs[0] : ok(mbs[1]) && ok(mbs[0]) ? mbs[1] - mbs[0] : NaN;
    agregar({
      area: "rentabilidad", id: "margenBruto", estado: mb < 0 ? "alerta" : ok(tendencia) && tendencia < -0.03 ? "atencion" : mb >= R.mb ? "fortaleza" : "atencion",
      valor: pct(mb), titulo: "Margen bruto",
      cliente: mb < 0 ? "Sus ventas no alcanzan para cubrir el costo de lo que vende."
        : `De cada ${M.simbolo}100 que vende, le quedan ${M.simbolo}${Math.round(mb * 100)} después del costo de lo vendido${ok(tendencia) && tendencia < -0.03 ? ", y ese margen baja con los años" : ""}.`,
      asesor: `Margen bruto año 1: ${pct(mb)}; años 2 y 3: ${pct(mbs[1])} y ${pct(mbs[2])} (cada año según el estado de resultados si tiene datos, o la previsión de ventas). ${ref}: ${pct(R.mb)} o más. ${ok(tendencia) && tendencia < -0.03 ? `cae ${pct(-tendencia)}, lo que sugiere costos que crecen más rápido que los precios.` : "comparar con empresas similares del sector."}`,
      preguntas: ["¿Sus proveedores han aumentado precios en el último año?", "¿Trasladó esos aumentos a sus precios de venta?"],
    }, ["precio", "costos"]);
  }
  if (usaResultados && y0.res.ventasNetas > 0) {
    const r = y0.res;
    const ebit = r.antes + r.intereses;
    const mo = div(ebit, r.ventasNetas), mn = div(r.neto, r.ventasNetas);
    agregar({
      area: "rentabilidad", id: "margenOperativo", estado: nivel(mo, ...R.mo), valor: pct(mo),
      titulo: "Margen operativo",
      cliente: mo >= R.mo[0] ? "Su operación es rentable antes de intereses e impuestos." : mo >= R.mo[1] ? "Su operación deja poca ganancia después de los gastos." : "Sus gastos de operación consumen casi toda (o más que) la utilidad bruta.",
      asesor: `Margen operativo (utilidad antes de intereses e impuestos ÷ ventas netas) año 1: ${pct(mo)}. ${ref}: ${pct(R.mo[0])} o más sólido, ${pct(R.mo[1])}–${pct(R.mo[0])} ajustado, menos de ${pct(R.mo[1])} frágil. Gastos de operación: ${fm(r.gastosOperacion)} (${pct(div(r.gastosOperacion, r.ventasNetas))} de las ventas).`,
      preguntas: ["¿Cuáles son sus tres gastos fijos más grandes?", "¿Qué gastos podría reducir sin afectar las ventas?"],
    }, ["gastos", "precio"]);
    agregar({
      area: "rentabilidad", id: "margenNeto", estado: nivel(mn, ...R.mn), valor: pct(mn),
      titulo: "Margen neto",
      cliente: mn >= R.mn[0] ? `Su empresa gana ${M.simbolo}${Math.round(mn * 100)} de cada ${M.simbolo}100 vendidos: un buen resultado.` : mn >= R.mn[1] ? `Su empresa gana ${M.simbolo}${Math.round(mn * 100)} de cada ${M.simbolo}100 vendidos: es un margen ajustado.` : "Su empresa no genera utilidad neta suficiente.",
      asesor: `Margen neto año 1: ${pct(mn)} (resultado neto ${fm(r.neto)}). ${ref}: ${pct(R.mn[0])} o más es saludable; ${pct(R.mn[1])}–${pct(R.mn[0])} ajustado; menos de ${pct(R.mn[1])} deja poco margen para reinvertir o pagar deudas.`,
      preguntas: ["¿Qué hace hoy con las utilidades (reinversión, retiros de los socios)?"],
    }, ["gastos", "precio", "costos"]);

    // Punto de equilibrio y margen de seguridad (gastos de operación como costos fijos)
    const mc = div(r.utilidadBruta, r.ventasNetas);
    if (mc > 0 && r.gastosOperacion > 0) {
      const pe = r.gastosOperacion / mc;
      const ms = (r.ventasNetas - pe) / r.ventasNetas;
      M.clave.puntoEquilibrio = pe;
      M.clave.margenSeguridad = ms;
      agregar({
        area: "rentabilidad", id: "equilibrio", estado: nivel(ms, 0.25, 0.1), valor: pct(ms),
        titulo: "Punto de equilibrio",
        cliente: ms > 0 ? `Necesita vender ${fm(pe)} al año para no perder; hoy proyecta ${pct(ms)} por encima de ese punto.`
          : `Necesita vender ${fm(pe)} al año para no perder, y hoy proyecta vender menos.`,
        asesor: `Punto de equilibrio aproximado: ${fm(pe)} anuales (${fm(pe / 12)} por mes), usando los gastos de operación como fijos y el margen bruto como margen de contribución. Margen de seguridad: ${pct(ms)} (referencia: 25 % o más es cómodo; menos de 10 %, cualquier caída en ventas genera pérdidas). Supone precios y estructura de costos estables.`,
        preguntas: ["¿Cuáles de sus gastos son realmente fijos y cuáles varían con las ventas?"],
      }, ["gastos", "precio", "crecimiento"]);
    }

    const personal = r.personal;
    if (personal > 0) {
      const pp = div(personal, r.ventasNetas);
      if (pp > R.planilla) {
        agregar({
          area: "eficiencia", id: "personal", estado: "atencion", valor: pct(pp),
          titulo: "Peso de la planilla",
          cliente: `Los salarios y cargas sociales equivalen al ${pct(pp)} de sus ventas.`,
          asesor: `Costo de personal (sueldos, comisiones, cargas sociales y beneficios) = ${pct(pp)} de las ventas netas del año 1. ${ref}: por encima de ${pct(R.planilla)} presiona la rentabilidad. Revisar productividad por colaborador y estructura de turnos.`,
          preguntas: ["¿Cuántas personas trabajan en la empresa y en qué funciones?"],
        }, ["gastos"]);
      }
    }
  }

  // ----- Balance: liquidez, endeudamiento, rentabilidad sobre activos y eficiencia
  const b = y0.bal;
  if (b.tieneDatos && b.activos > 0) {
    if (b.pc > 0) {
      const rc = b.ac / b.pc, pa = (b.ac - b.inventario) / b.pc;
      agregar({
        area: "liquidez", id: "razonCorriente", estado: nivel(rc, ...R.rc), valor: veces(rc),
        titulo: "Razón corriente",
        cliente: rc >= R.rc[0] ? "Tiene suficientes recursos de corto plazo para pagar sus deudas de corto plazo." : rc >= R.rc[1] ? "Sus recursos de corto plazo alcanzan justo para sus deudas de corto plazo." : "Sus deudas de corto plazo son mayores que sus recursos de corto plazo.",
        asesor: `Activo corriente ÷ pasivo corriente = ${veces(rc)} (${fm(b.ac)} ÷ ${fm(b.pc)}). ${ref}: ${veces(R.rc[0])} o más cómodo; ${veces(R.rc[1])}–${veces(R.rc[0])} ajustado; menos de ${veces(R.rc[1])} indica posible dificultad para cubrir obligaciones de corto plazo (CFI). Capital de trabajo: ${fm(b.ac - b.pc)}.`,
        preguntas: ["¿Alguna vez ha tenido que atrasar pagos a proveedores o planilla?"],
      }, ["liquidez"]);
      agregar({
        area: "liquidez", id: "pruebaAcida", estado: nivel(pa, ...R.pa), valor: veces(pa),
        titulo: "Prueba ácida",
        cliente: pa >= R.pa[0] ? "Puede cubrir sus deudas de corto plazo sin depender de vender inventario." : "Depende de vender su inventario para pagar sus deudas de corto plazo.",
        asesor: `(Activo corriente − inventario) ÷ pasivo corriente = ${veces(pa)}. ${ref}: ${veces(R.pa[0])} o más es sano; menos de ${veces(R.pa[1])} indica dependencia de la rotación del inventario para cumplir.`,
        preguntas: ["¿Qué tan rápido se vende su inventario?"],
      }, ["liquidez", "inventario"]);
    }
    const end = b.pasivos / b.activos;
    agregar({
      area: "endeudamiento", id: "endeudamiento", estado: nivel(end, 0.5, 0.7, false), valor: pct(end),
      titulo: "Nivel de endeudamiento",
      cliente: end <= 0.5 ? `Su empresa se financia mayormente con recursos propios (deuda: ${pct(end)} de los activos).` : end <= 0.7 ? `La mitad o más de sus activos está financiada con deuda (${pct(end)}).` : `Su empresa está muy endeudada: la deuda equivale al ${pct(end)} de sus activos.`,
      asesor: `Pasivo total ÷ activo total = ${pct(end)} (pasivos ${fm(b.pasivos)}; activos ${fm(b.activos)}). Referencia: hasta 50 % conservador; 50–70 % moderado; más de 70 % alto, con menor capacidad para nuevo crédito.`,
      preguntas: ["¿Qué deudas tiene, a qué tasa, plazo y moneda?"],
    }, ["deuda"]);
    if (b.pat <= 0) {
      agregar({
        area: "endeudamiento", id: "patrimonioNegativo", estado: "alerta", valor: fm(b.pat),
        titulo: "Patrimonio negativo",
        cliente: "Lo que la empresa debe supera lo que tiene: su patrimonio es negativo.",
        asesor: `Patrimonio de ${fm(b.pat)}: las pérdidas acumuladas o las deudas superan los activos. Es una señal de riesgo de solvencia y limita el acceso a crédito; requiere capitalización, reestructuración de pasivos o un plan de retorno a utilidades.`,
        preguntas: ["¿Los socios podrían aportar capital?", "¿Hay deudas personales mezcladas con las de la empresa?"],
      }, ["deuda"]);
    } else {
      const dp = b.pasivos / b.pat;
      agregar({
        area: "endeudamiento", id: "deudaPatrimonio", estado: nivel(dp, 1, 2, false), valor: veces(dp),
        titulo: "Deuda frente al patrimonio",
        cliente: dp <= 1 ? "Sus deudas son menores que el capital de los socios." : "Sus deudas superan el capital de los socios.",
        asesor: `Pasivo total ÷ patrimonio = ${veces(dp)}. Referencia: hasta 1 conservador; 1–2 moderado; más de 2 apalancamiento alto.`,
        preguntas: [],
      }, ["deuda"]);
      if (usaResultados) {
        const roe = y0.res.neto / b.pat;
        agregar({
          area: "rentabilidad", id: "roe", estado: nivel(roe, 0.15, 0.05), valor: pct(roe),
          titulo: "Rentabilidad del patrimonio (ROE)",
          cliente: roe >= 0.15 ? "El capital invertido por los socios rinde bien." : "El capital invertido por los socios rinde poco.",
          asesor: `Resultado neto ÷ patrimonio = ${pct(roe)}. Referencia: 15 % o más es atractivo; menos de 5 % es inferior a lo que rendirían alternativas de menor riesgo. Comparar con la tasa de un certificado de depósito a plazo.`,
          preguntas: ["¿Qué rendimiento espera obtener de lo que ha invertido en la empresa?"],
        });
      }
    }
    if (usaResultados) {
      const roa = y0.res.neto / b.activos;
      agregar({
        area: "rentabilidad", id: "roa", estado: nivel(roa, 0.05, 0.02), valor: pct(roa),
        titulo: "Rentabilidad de los activos (ROA)",
        cliente: roa >= 0.05 ? "Sus activos generan buena utilidad." : "Sus activos generan poca utilidad.",
        asesor: `Resultado neto ÷ activo total = ${pct(roa)}; rotación de activos (ventas ÷ activos) = ${veces(div(y0.res.ventasNetas, b.activos))}. Referencia: ROA de 5 % o más es sano; menos de 2 % indica activos ociosos o márgenes bajos.`,
        preguntas: ["¿Tiene equipos, inventario o espacios que no se aprovechan?"],
      });

      // Eficiencia del capital de trabajo (CFA Institute: ciclo de conversión de efectivo)
      const r = y0.res;
      const dso = b.cxc > 0 && r.ventasNetas > 0 ? (b.cxc / r.ventasNetas) * 365 : NaN;
      const dio = b.inventario > 0 && r.costo > 0 ? (b.inventario / r.costo) * 365 : NaN;
      const dpo = b.proveedores > 0 && r.costo > 0 ? (b.proveedores / r.costo) * 365 : NaN;
      if (ok(dso)) agregar({
        area: "eficiencia", id: "diasCobro", estado: nivel(dso, ...R.cobro, false), valor: dias(dso),
        titulo: "Días de cobro",
        cliente: dso <= R.cobro[0] ? `Cobra a sus clientes en unos ${Math.round(dso)} días: un buen plazo.` : `Tarda unos ${Math.round(dso)} días en cobrar a sus clientes.`,
        asesor: `Cuentas por cobrar ÷ ventas × 365 = ${dias(dso)}. ${ref}: hasta ${dias(R.cobro[0])} bueno; hasta ${dias(R.cobro[1])} a vigilar; más de ${dias(R.cobro[1])} compromete el flujo de caja y suele indicar cartera morosa. Comparar con el plazo de crédito otorgado.`,
        preguntas: ["¿Qué plazo de crédito da a sus clientes?", "¿Tiene clientes con atrasos de más de 60 días?"],
      }, ["cobro", "flujo"]);
      if (ok(dio)) agregar({
        area: "eficiencia", id: "diasInventario", estado: nivel(dio, ...R.inventario, false), valor: dias(dio),
        titulo: "Días de inventario",
        cliente: dio <= R.inventario[0] ? "Su inventario rota a buen ritmo." : `Su inventario tarda unos ${Math.round(dio)} días en venderse.`,
        asesor: `Inventario ÷ costo de ventas × 365 = ${dias(dio)}. ${ref}: hasta ${dias(R.inventario[0])} ágil; más de ${dias(R.inventario[1])} inmoviliza efectivo y aumenta el riesgo de obsolescencia o merma.`,
        preguntas: ["¿Tiene productos que no se han vendido en los últimos 3 meses?"],
      }, ["inventario"]);
      const ciclo = (ok(dso) ? dso : 0) + (ok(dio) ? dio : 0) - (ok(dpo) ? dpo : 0);
      if (ok(dso) || ok(dio)) {
        M.clave.ciclo = ciclo;
        agregar({
          area: "eficiencia", id: "ciclo", estado: nivel(ciclo, ...R.ciclo, false), valor: dias(ciclo),
          titulo: "Ciclo de conversión de efectivo",
          cliente: `Desde que paga a proveedores hasta que cobra sus ventas pasan unos ${Math.max(0, Math.round(ciclo))} días.`,
          asesor: `Ciclo de conversión de efectivo = días de cobro + días de inventario − días de pago = ${dias(dso)} + ${dias(dio)} − ${dias(dpo)} = ${dias(ciclo)}. ${ref}: hasta ${dias(R.ciclo[0])} sano; más de ${dias(R.ciclo[1])} exige mucho capital de trabajo. Un ciclo más corto requiere menos capital de trabajo (CFA Institute). Si es largo, la empresa financia a sus clientes y a su inventario con su propio efectivo o con deuda de corto plazo.`,
          preguntas: ["¿Qué plazo de pago le dan sus proveedores?"],
        }, ["cobro", "inventario", "flujo"]);
      }
    }

    // Cobertura de intereses y del servicio de deuda
    if (usaResultados) {
      const r = y0.res;
      const ebit = r.antes + r.intereses, ebitda = ebit + r.depreciacion;
      M.clave.ebitda = ebitda;
      if (r.intereses > 0) {
        const ci = ebit / r.intereses;
        agregar({
          area: "endeudamiento", id: "coberturaIntereses", estado: nivel(ci, 3, 1.5), valor: veces(ci),
          titulo: "Cobertura de intereses",
          cliente: ci >= 3 ? "Su utilidad operativa cubre con holgura los intereses de sus deudas." : "Su utilidad operativa cubre con poca holgura los intereses de sus deudas.",
          asesor: `Utilidad antes de intereses e impuestos ÷ intereses = ${veces(ci)}. Referencia: 3 veces o más cómodo; menos de 1,5 riesgo de no poder pagar intereses si bajan las ventas.`,
          preguntas: [],
        }, ["deuda"]);
      }
      const servicio = r.intereses + b.porcionCorriente + b.prestCorto;
      if (servicio > 0) {
        const dscr = ebitda / servicio;
        M.clave.dscr = dscr;
        agregar({
          area: "endeudamiento", id: "dscr", estado: nivel(dscr, 1.25, 1), valor: veces(dscr),
          titulo: "Capacidad de pago de deudas",
          cliente: dscr >= 1.25 ? "Su empresa genera lo suficiente para pagar sus deudas del año." : dscr >= 1 ? "Su empresa genera justo lo necesario para pagar sus deudas del año." : "Su empresa no genera lo suficiente para pagar sus deudas del año.",
          asesor: `Cobertura del servicio de deuda (EBITDA ÷ (intereses + porción corriente de deuda a largo plazo + préstamos de corto plazo)) = ${veces(dscr)}. EBITDA ${fm(ebitda)}; servicio de deuda ${fm(servicio)}. Las entidades financieras suelen exigir 1,25 veces o más para aprobar crédito a pymes; menos de 1 indica que la operación no cubre las obligaciones.`,
          preguntas: ["¿Está pensando solicitar un nuevo crédito?", "¿Las cuotas actuales le generan presión de efectivo?"],
        }, ["deuda", "liquidez"]);
      }
    }
    if (b.efectivo >= 0 && b.pc > 0 && b.efectivo / b.pc < 0.2) {
      agregar({
        area: "liquidez", id: "efectivo", estado: "atencion", valor: veces(b.efectivo / b.pc),
        titulo: "Efectivo disponible",
        cliente: "Su efectivo en bancos es bajo frente a lo que debe pagar en el corto plazo.",
        asesor: `Efectivo ÷ pasivo corriente = ${veces(b.efectivo / b.pc)}. Por debajo de 0,2 la empresa depende de cobrar a tiempo para cumplir.`,
        preguntas: ["¿Cuántos meses de gastos fijos podría cubrir con su efectivo actual?"],
      }, ["liquidez", "flujo"]);
    }
  }

  // ----- Flujo de caja
  if (M.anos.some((a) => a.flujo.tieneDatos)) {
    const negativos = M.anos.map((a, i) => (a.flujo.final < 0 ? i : -1)).filter((i) => i >= 0);
    const opNeg = M.anos.map((a, i) => (a.flujo.tieneDatos && a.flujo.operacion < 0 ? i : -1)).filter((i) => i >= 0);
    agregar({
      area: "flujo", id: "efectivoFinal", estado: negativos.length ? "alerta" : "fortaleza",
      valor: negativos.length ? negativos.map((i) => M.ano(i)).join(", ") : "positivo",
      titulo: "Efectivo al cierre de cada año",
      cliente: negativos.length ? `Según su flujo, le faltaría efectivo en ${negativos.map((i) => M.ano(i)).join(" y ")}.` : "Su flujo de caja cierra con efectivo positivo los tres años.",
      asesor: negativos.length ? `El efectivo final es negativo en ${negativos.map((i) => `${M.ano(i)} (${fm(M.anos[i].flujo.final)})`).join("; ")}: hay una necesidad de financiamiento no cubierta o gastos e inversiones que deben postergarse.`
        : `Efectivo final: ${M.anos.map((a, i) => `${M.ano(i)} ${fm(a.flujo.final)}`).join("; ")}.`,
      preguntas: negativos.length ? ["¿Cómo planea cubrir ese faltante (crédito, aportes, postergar inversiones)?"] : [],
    }, ["flujo", "liquidez"]);
    if (opNeg.length) {
      agregar({
        area: "flujo", id: "flujoOperativo", estado: "alerta", valor: opNeg.map((i) => M.ano(i)).join(", "),
        titulo: "Flujo de la operación negativo",
        cliente: "Su operación consume más efectivo del que genera.",
        asesor: `El efectivo neto de operación es negativo en ${opNeg.map((i) => `${M.ano(i)} (${fm(M.anos[i].flujo.operacion)})`).join("; ")}. La empresa se sostiene con financiamiento o con el efectivo acumulado, lo que no es sostenible.`,
        preguntas: ["¿La empresa ya genera utilidades o está en etapa de arranque?"],
      }, ["flujo", "cobro", "gastos"]);
    } else {
      const a = y0.flujo;
      if (a.tieneDatos && a.operacion > 0 && a.financiamiento > a.operacion) {
        agregar({
          area: "flujo", id: "dependenciaFinanciamiento", estado: "atencion", valor: fm(a.financiamiento),
          titulo: "Dependencia del financiamiento",
          cliente: "Su efectivo depende más de préstamos o aportes que de la operación.",
          asesor: `En ${M.ano(0)} el financiamiento (${fm(a.financiamiento)}) supera al flujo de operación (${fm(a.operacion)}). Validar que la deuda financie inversiones que generen flujo y no gastos corrientes.`,
          preguntas: ["¿En qué se usará el financiamiento?"],
        }, ["deuda"]);
      } else if (a.tieneDatos && a.operacion > 0) {
        agregar({
          area: "flujo", id: "flujoOperativo", estado: "fortaleza", valor: fm(a.operacion),
          titulo: "Flujo de la operación",
          cliente: "Su operación genera efectivo.",
          asesor: `Efectivo neto de operación ${M.ano(0)}: ${fm(a.operacion)}; flujo libre (operación + inversión): ${fm(a.operacion + a.inversion)}.`,
          preguntas: [],
        });
      }
    }
  }

  // ----- Consistencia de la información (solo para el asesor)
  M.anos.forEach((a, i) => {
    if (a.bal.tieneDatos && !a.bal.cuadra) agregar({
      area: "consistencia", id: `cuadre${i}`, estado: "alerta", valor: fm(a.bal.dif), soloAsesor: true,
      titulo: `El balance de ${M.ano(i)} no cuadra`,
      cliente: "", asesor: `Activo − pasivo − patrimonio = ${fm(a.bal.dif)} en ${M.ano(i)}. Las razones de balance de ese año no son confiables hasta corregirlo (suele faltar la utilidad del período en el patrimonio o alguna cuenta).`,
      preguntas: ["¿Incluyó la utilidad del período en las utilidades retenidas?"],
    }, ["registros"]);
  });
  if (usaResultados && y0.ventas.ingresos > 0 && y0.res.ventasBrutas > 0) {
    const d = Math.abs(y0.res.ventasBrutas - y0.ventas.ingresos) / y0.ventas.ingresos;
    if (d > 0.1) agregar({
      area: "consistencia", id: "ventasVsResultados", estado: "atencion", valor: pct(d), soloAsesor: true,
      titulo: "Ventas de la previsión y del estado de resultados no coinciden",
      cliente: "", asesor: `Las ventas brutas del estado de resultados (${fm(y0.res.ventasBrutas)}) difieren ${pct(d)} de los ingresos de la previsión de ventas (${fm(y0.ventas.ingresos)}) en ${M.ano(0)}. Aclarar cuál cifra es la correcta.`,
      preguntas: ["¿Cuál de las dos cifras de ventas refleja mejor su realidad?"],
    });
  }
  if (usaResultados && y0.flujo.tieneDatos && y0.flujo.utilidadNeta && Math.abs(y0.flujo.utilidadNeta - y0.res.neto) > Math.max(1, Math.abs(y0.res.neto) * 0.05)) {
    agregar({
      area: "consistencia", id: "utilidadFlujo", estado: "atencion", valor: fm(y0.flujo.utilidadNeta), soloAsesor: true,
      titulo: "Utilidad del flujo distinta a la del estado de resultados",
      cliente: "", asesor: `El flujo de caja parte de una utilidad neta de ${fm(y0.flujo.utilidadNeta)}, pero el estado de resultados da ${fm(y0.res.neto)} en ${M.ano(0)}.`,
      preguntas: [],
    });
  }
  if (M.financiero.usos > M.financiero.fuentes && M.financiero.usos > 0) {
    agregar({
      area: "consistencia", id: "financiamiento", estado: "atencion", valor: M.fmt(M.financiero.usos - M.financiero.fuentes),
      titulo: "Financiamiento insuficiente",
      cliente: "Sus planes de inversión superan las fuentes de financiamiento que indicó.",
      asesor: `Los usos (${fm(M.financiero.usos)}) superan las fuentes (${fm(M.financiero.fuentes)}) por ${fm(M.financiero.usos - M.financiero.fuentes)}. Identificar con el cliente fuentes adicionales (SBD, FODEMIPYME, banca, aportes) o priorizar inversiones.`,
      preguntas: ["¿Qué inversiones son indispensables y cuáles podrían esperar?"],
    }, ["deuda"]);
  }

  // ----- Estrategia (información cualitativa)
  const q = M.cualitativo;
  if (q.foda.total > 0) {
    if (q.foda.debilidades > q.foda.fortalezas || q.foda.amenazas > q.foda.oportunidades) agregar({
      area: "estrategia", id: "foda", estado: "atencion", valor: `F${q.foda.fortalezas} D${q.foda.debilidades} O${q.foda.oportunidades} A${q.foda.amenazas}`,
      titulo: "Balance del FODA",
      cliente: "Identificó más debilidades o amenazas que fortalezas u oportunidades: priorice un plan para atenderlas.",
      asesor: `FODA: ${q.foda.fortalezas} fortalezas, ${q.foda.debilidades} debilidades, ${q.foda.oportunidades} oportunidades, ${q.foda.amenazas} amenazas (de importancia alta: ${q.foda.altas}). Convertir cada debilidad o amenaza de importancia alta en una acción con responsable y fecha en el calendario.`,
      preguntas: ["¿Cuál de las debilidades le preocupa más hoy?"],
    });
  }
  const faltan = [];
  if (!q.kpis) faltan.push("indicadores clave (KPI)");
  if (!q.mercado) faltan.push("mercado objetivo");
  if (!q.competidores) faltan.push("competencia");
  if (!q.marketing) faltan.push("plan de mercadeo y ventas");
  if (faltan.length) agregar({
    area: "estrategia", id: "planificacion", estado: "atencion", valor: faltan.length,
    titulo: "Planificación comercial incompleta",
    cliente: `Le falta definir: ${faltan.join(", ")}.`,
    asesor: `Secciones estratégicas sin datos: ${faltan.join(", ")}. Sin metas medibles ni un mercado objetivo claro, la previsión de ventas carece de sustento.`,
    preguntas: ["¿Quién es su cliente ideal y cómo lo atrae hoy?"],
  }, ["crecimiento"]);

  // ----- Datos faltantes para el análisis
  const sinFinancieros = !usaResultados && !M.anos.some((a) => a.bal.tieneDatos);
  if (sinFinancieros) rec.add("registros");

  // Puntajes por área
  const areas = AREAS.map((a) => {
    const hs = H.filter((x) => x.area === a.id && x.estado in PESO_ESTADO);
    const puntaje = hs.length ? Math.round(hs.reduce((t, x) => t + PESO_ESTADO[x.estado], 0) / hs.length) : null;
    return { ...a, puntaje, estado: puntaje == null ? null : puntaje >= 75 ? "fortaleza" : puntaje >= 45 ? "atencion" : "alerta", hallazgos: H.filter((x) => x.area === a.id) };
  });
  const conPeso = areas.filter((a) => a.peso && a.puntaje != null);
  const pesoTotal = conPeso.reduce((t, a) => t + a.peso, 0);
  const puntaje = pesoTotal ? Math.round(conPeso.reduce((t, a) => t + a.puntaje * a.peso, 0) / pesoTotal) : null;
  const calificacion = puntaje == null ? "Sin datos suficientes" : puntaje >= 75 ? "Sólida" : puntaje >= 55 ? "Estable" : puntaje >= 35 ? "Requiere atención" : "En riesgo";

  // Recomendaciones: las activadas por los hallazgos, y siempre al menos las de crecimiento de ventas.
  if (rec.size < 3) ["crecimiento", "mezcla", "precio"].forEach((r) => rec.add(r));
  const recomendaciones = [...rec].map((k) => ({ id: k, ...RECOMENDACIONES[k] }));

  const orden = { alerta: 0, atencion: 1, fortaleza: 2 };
  const paraCliente = H.filter((x) => !x.soloAsesor && x.cliente);
  return {
    puntaje, calificacion, areas, hallazgos: H, recomendaciones, usaResultados, sinFinancieros,
    sector: { id: sectorId, ...R, indicado: sectorId === M.sector },
    fortalezas: paraCliente.filter((x) => x.estado === "fortaleza"),
    mejoras: paraCliente.filter((x) => x.estado !== "fortaleza").sort((a, b) => orden[a.estado] - orden[b.estado]),
    preguntas: [...new Set(H.filter((x) => x.estado !== "fortaleza").sort((a, b) => orden[a.estado] - orden[b.estado]).flatMap((x) => x.preguntas || []))],
  };
}
