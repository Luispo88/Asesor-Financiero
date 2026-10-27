// Pruebas del sitio en el navegador, con Firebase simulado (carpeta mock/).
// Uso, desde la raíz del repositorio:  node herramientas/pruebas/probar.mjs
// Termina con código 1 si alguna prueba falla.
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const ASESOR = "luis1988salas@hotmail.com";

// Playwright: instalación local o global.
async function cargarPlaywright() {
  try { return await import("playwright"); } catch {}
  const global = join(execSync("npm root -g").toString().trim(), "playwright", "index.mjs");
  return import(pathToFileURL(global).href);
}
const { chromium } = await cargarPlaywright();
const CHROMIUM = "/opt/pw-browsers/chromium";

// Servidor estático del repositorio.
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png" };
const servidor = createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (ruta.endsWith("/")) ruta += "index.html";
  const archivo = join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ) || !existsSync(archivo)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TIPOS[extname(archivo)] || "application/octet-stream" });
  res.end(readFileSync(archivo));
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const B = `http://127.0.0.1:${servidor.address().port}/`;

const navegador = await chromium.launch(existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {});
const fallas = [];
let total = 0;
function revisar(cond, mensaje) { total++; if (!cond) { fallas.push(mensaje); console.log("  ✗", mensaje); } }
const seccion = (t) => console.log("\n▶", t);

async function contexto(viewport = { width: 1440, height: 1000 }) {
  const ctx = await navegador.newContext({ viewport, acceptDownloads: true });
  for (const n of ["app", "auth", "firestore"])
    await ctx.route(`https://www.gstatic.com/firebasejs/10.12.2/firebase-${n}.js`, (r) =>
      r.fulfill({ contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: readFileSync(join(AQUI, "mock", n + ".js"), "utf8") }));
  await ctx.route(/^https:\/\/(fonts\.|wa\.me)/, (r) => r.abort());
  const p = await ctx.newPage();
  p.errores = [];
  p.on("pageerror", (e) => p.errores.push(e.message));
  p.on("dialog", (d) => d.accept());
  return { ctx, p };
}

// Simula usuarios y documentos guardados (ver mock/firestore.js).
async function sembrar(p, { usuarios = {}, sesion = null, docs = {} }) {
  await p.goto(B + "index.html");
  await p.evaluate(({ usuarios, sesion, docs }) => {
    localStorage.clear();
    localStorage.setItem("mockUsers", JSON.stringify(usuarios));
    localStorage.setItem("mockAuth", JSON.stringify(sesion));
    for (const [k, v] of Object.entries(docs)) localStorage.setItem("doc:" + k, JSON.stringify(v));
  }, { usuarios, sesion, docs });
}
const asesor = { [ASESOR]: { uid: "adm", email: ASESOR, pass: "x", verified: true } };
const sinDesborde = async (p, ancho) => (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho;

// Planes de ejemplo: una empresa sana y una en riesgo.
const meses = (base, paso = 0) => Array.from({ length: 12 }, (_, m) => base + m * paso);
const SANA = {
  general: { moneda: "CRC", inicio: "2026-01" },
  ventas: { productos: ["Pan", "Repostería", "Café"], anos: [
    { unidades: [meses(1000, 50), meses(300, 20), meses(400, 10)], costo: [400, 1500, 300], precio: [900, 3000, 1200] },
    { unidades: [meses(1150, 50), meses(350, 20), meses(450, 10)], costo: [420, 1550, 310], precio: [950, 3100, 1250] },
    { unidades: [meses(1300, 50), meses(400, 20), meses(500, 10)], costo: [440, 1600, 320], precio: [1000, 3200, 1300] }] },
  resultados: { ventasBrutas: [33000000, 38000000, 43000000], compras: [16000000, 18500000, 21000000], sueldosAdm: [6000000, 6300000, 6600000], cargas: [1600000, 1700000, 1800000], alquiler: [2400000, 2400000, 2520000], servicios: [900000, 950000, 1000000], intereses: [300000, 250000, 200000], depAdm: [400000, 400000, 400000], publicidad: [600000, 700000, 800000] },
  balance: { efectivo: [3000000], cxc: [2500000], inventario: [2000000], propiedad: [9000000], proveedores: [1800000], prestCorto: [600000], porcionCorriente: [900000], deudaLargo: [4000000], capital: [6000000], retenidas: [3200000] },
  flujo: { efectivoInicial: [1500000], utilidadNeta: [3500000], depreciacion: [400000], compraActivos: [-1200000], pagoPrestamos: [-900000] },
  foda: { fortalezas: [{ texto: "Receta propia", importancia: "Alta" }, { texto: "Ubicación" }], debilidades: [{ texto: "Poco capital" }] },
  calendario: { kpis: [{ nombre: "Ventas mensuales" }] }, competencia: { competidores: [{ nombre: "Panadería X" }] }, mercado: [{ nombre: "Familias" }], textos: { marketing: { marketing: "Redes" } },
};
const RIESGO = {
  general: { moneda: "CRC", inicio: "2026-01" },
  ventas: { productos: ["Servicio A", "Servicio B"], anos: [
    { unidades: [[100, 10, 10, 10, 10, 150, 10, 10, 10, 10, 10, 200], meses(5)], costo: [9000, 2000], precio: [8500, 3000] },
    { unidades: [[90, 10, 10, 10, 10, 120, 10, 10, 10, 10, 10, 150], meses(5)], costo: [9500, 2100], precio: [8800, 3000] },
    { unidades: [[80, 10, 10, 10, 10, 100, 10, 10, 10, 10, 10, 120], meses(5)], costo: [9800, 2200], precio: [9000, 3000] }] },
  resultados: { ventasBrutas: [9000000], compras: [7500000], sueldosAdm: [3000000], cargas: [800000], alquiler: [1200000], intereses: [900000] },
  balance: { efectivo: [200000], cxc: [2600000], inventario: [1500000], propiedad: [3000000], proveedores: [2500000], prestCorto: [3000000], deudaLargo: [3500000], capital: [1000000], retenidas: [-2700000] },
  flujo: { efectivoInicial: [300000], utilidadNeta: [-4400000], pagoPrestamos: [-1000000] },
  financiero: { fuentes: [{ concepto: "Préstamo", monto: 2000000 }], usos: [{ concepto: "Equipo", monto: 5000000 }] },
};

// 1. Páginas públicas en computadora y celular.
seccion("Páginas públicas");
{
  const paginas = ["index.html", ...["servicios", "blog", "cuenta"].flatMap((d) => readdirSync(join(RAIZ, d)).filter((f) => f.endsWith(".html")).map((f) => `${d}/${f}`))];
  for (const ancho of [1440, 375]) {
    const { ctx, p } = await contexto({ width: ancho, height: 900 });
    for (const f of paginas) {
      p.errores.length = 0;
      await p.goto(B + f);
      await p.waitForTimeout(150);
      revisar(p.errores.length === 0, `${f} (${ancho}px) sin errores de JavaScript: ${p.errores.join(" | ")}`);
      revisar(await sinDesborde(p, ancho), `${f} (${ancho}px) sin desborde horizontal`);
    }
    await ctx.close();
  }
  console.log(`  ${paginas.length} páginas × 2 anchos`);
}

// 2. Calculadoras de la página de inicio.
seccion("Calculadoras");
{
  const { ctx, p } = await contexto();
  await p.goto(B + "index.html");
  revisar(/\d/.test(await p.textContent("#cuota-mensual")), "la calculadora de cuota muestra un monto");
  await p.click("[data-open-tab=tab-capacidad] >> nth=0").catch(() => {});
  revisar(/\d/.test(await p.textContent("#cap-monto-max")), "la capacidad de endeudamiento muestra un monto");
  revisar(/\d/.test(await p.textContent("#cap-cargas")), "se rebajan las cargas sociales");
  revisar(/\d/.test(await p.textContent("#cap-renta")), "se rebaja el impuesto sobre la renta");
  revisar(p.errores.length === 0, "calculadoras sin errores: " + p.errores.join(" | "));
  await ctx.close();
}

// 3. Registro de un cliente y su plan de negocios.
seccion("Registro y plan de negocios del cliente");
{
  const { ctx, p } = await contexto();
  await sembrar(p, {});
  await p.goto(B + "cuenta/index.html?modo=registro");
  const f = "#form-registro ";
  await p.fill(f + "[name=nombre]", "Ana Pérez"); await p.fill(f + "[name=empresa]", "Panadería La Espiga");
  await p.fill(f + "[name=telefono]", "88887777"); await p.fill(f + "[name=sector]", "Comercio");
  await p.fill(f + "[name=correo]", "ana@ejemplo.com"); await p.fill(f + "[name=clave]", "clave1234"); await p.fill(f + "[name=clave2]", "clave1234");
  await p.check(f + "[name=consentimiento]"); await p.click(f + "button[type=submit]");
  await p.waitForURL(/clientes/);
  revisar(await p.isVisible(".plan-promo"), "el área de clientes muestra el acceso al plan");
  revisar(await p.locator("[data-solo-asesor]:visible").count() === 0, "el cliente no ve el enlace al panel");

  await p.goto(B + "clientes/plan.html"); await p.waitForSelector("#plan-app:not([hidden])");
  revisar(await p.locator('[data-nav="analisis"]').count() === 0, "el cliente no ve el análisis del asesor");
  await p.fill('[data-ruta="ventas.productos.0"]', "Pan");
  await p.fill('[data-ruta="ventas.anos.0.unidades.0.0"]', "100"); await p.fill('[data-ruta="ventas.anos.0.precio.0"]', "1000");
  const antes = await p.locator('[data-ruta^="ventas.productos."]').count();
  await p.locator(".plan-seccion:not([hidden]) .plan-add", { hasText: "Agregar producto" }).first().click();
  revisar(await p.locator('[data-ruta^="ventas.productos."]').count() === antes + 1, "se puede agregar un producto");
  const ultimo = antes;
  await p.fill(`[data-ruta="ventas.productos.${ultimo}"]`, "Café");
  await p.fill(`[data-ruta="ventas.anos.0.unidades.${ultimo}.0"]`, "50"); await p.fill(`[data-ruta="ventas.anos.0.precio.${ultimo}"]`, "800");
  const ingresos = await p.textContent('[data-panel-ano="0"] [data-salida="v.0.ingresosTotal"]');
  revisar(ingresos.replace(/\D/g, "") === "140000", `ingresos del año 1 = 140 000 (obtenido: ${ingresos})`);

  await p.waitForTimeout(1600);
  const doc = await p.evaluate(() => JSON.parse(localStorage.getItem("doc:planes/uid-0")));
  revisar(doc && typeof doc.json === "string" && doc.version === 2, "el plan se guarda como texto JSON (versión 2)");
  await p.reload(); await p.waitForSelector("#plan-app:not([hidden])");
  revisar(await p.inputValue(`[data-ruta="ventas.productos.${ultimo}"]`) === "Café", "el plan se conserva al recargar");

  await p.goto(B + "panel/index.html"); await p.waitForTimeout(500);
  revisar(await p.isHidden("#panel-contenido"), "un cliente no puede entrar al panel del asesor");
  revisar(p.errores.length === 0, "registro y plan sin errores: " + p.errores.join(" | "));
  await ctx.close();
}

// 4. Análisis financiero del plan.
seccion("Análisis financiero");
{
  const { ctx, p } = await contexto();
  const usuarios = { ...asesor, "cliente@e.com": { uid: "c1", email: "cliente@e.com", pass: "x" } };
  for (const [nombre, datos] of [["sana", SANA], ["en riesgo", RIESGO]]) {
    const docs = { "planes/c1": { json: JSON.stringify(datos) }, "usuarios/c1": { nombre: "Ana Pérez", empresa: "Panadería" } };
    await sembrar(p, { usuarios, sesion: { uid: "c1", email: "cliente@e.com" }, docs });
    await p.goto(B + "clientes/plan.html"); await p.waitForSelector("#plan-app:not([hidden])");
    await p.click('[data-nav="diagnostico"]');
    revisar((await p.locator("#diag-cliente").innerText()).length > 50, `empresa ${nombre}: el cliente ve su diagnóstico`);

    await sembrar(p, { usuarios, sesion: { uid: "adm", email: ASESOR }, docs });
    await p.goto(B + "clientes/plan.html?cliente=c1"); await p.waitForSelector("#plan-app:not([hidden])");
    const texto = await p.locator("#diag-asesor").innerText();
    revisar(!/\[object|null|undefined|NaN/.test(texto), `empresa ${nombre}: el análisis del asesor no muestra valores rotos`);
    revisar(await p.locator("#plan-secciones input:not([disabled])").count() === 0, `empresa ${nombre}: el asesor ve el plan en solo lectura`);
  }

  // Referencias por actividad: la misma empresa se evalúa distinto como restaurante.
  const comoRestaurante = { ...SANA, general: { ...SANA.general, sector: "restaurante" } };
  const docsR = { "planes/c1": { json: JSON.stringify(comoRestaurante) }, "usuarios/c1": { nombre: "Ana Pérez", empresa: "Panadería" } };
  await sembrar(p, { usuarios, sesion: { uid: "c1", email: "cliente@e.com" }, docs: docsR });
  await p.goto(B + "clientes/plan.html"); await p.waitForSelector("#plan-app:not([hidden])");
  revisar(await p.locator('[data-ruta="general.sector"] option').count() === 8, "el plan ofrece las actividades para elegir");
  revisar(await p.inputValue('[data-ruta="general.sector"]') === "restaurante", "la actividad elegida se conserva");
  await p.click('[data-nav="diagnostico"]');
  revisar(/restaurantes, sodas y cafeterías/.test(await p.locator("#diag-cliente").innerText()), "el cliente ve con qué actividad se comparó");
  await sembrar(p, { usuarios, sesion: { uid: "adm", email: ASESOR }, docs: docsR });
  await p.goto(B + "clientes/plan.html?cliente=c1"); await p.waitForSelector("#plan-app:not([hidden])");
  const textoR = await p.locator("#diag-asesor").innerText();
  revisar(/Referencias del sector: restaurantes/.test(textoR) && /Referencia para restaurantes/.test(textoR), "el análisis del asesor usa las referencias de restaurantes");
  revisar(!/\[object|null|undefined|NaN/.test(textoR), "el análisis por actividad no muestra valores rotos");
  const puntajeR = await p.evaluate(async (doc) => (await import("/js/plan.js")).diagnosticoDePlan(doc).analisis.puntaje, docsR["planes/c1"]);
  revisar(puntajeR === 91, `como restaurante, la empresa sana obtiene 91 en lugar de 100 (obtenido: ${puntajeR})`);
  revisar(p.errores.length === 0, "análisis sin errores: " + p.errores.join(" | "));
  await ctx.close();
}

// 5. Panel del asesor: salud financiera, exportación y guía de tarifas.
seccion("Panel del asesor");
{
  const { ctx, p } = await contexto();
  const u = (nombre, empresa) => ({ nombre, empresa, correo: nombre.split(" ")[0].toLowerCase() + "@e.com", telefono: "88887777", sector: "Comercio", creado: "ts" });
  await sembrar(p, { usuarios: asesor, sesion: { uid: "adm", email: ASESOR }, docs: {
    "usuarios/c1": u("Ana Pérez", "Panadería La Espiga"), "usuarios/c2": u("José Ríos", "Taller Ríos"), "usuarios/c3": u("María Solís", "Floristería"),
    "planes/c1": { json: JSON.stringify(SANA), actualizado: "ts" }, "planes/c2": { json: JSON.stringify(RIESGO), actualizado: "ts" },
  } });
  await p.goto(B + "panel/index.html"); await p.waitForSelector("#panel-contenido:not([hidden])");
  revisar(await p.textContent("#stat-total") === "3", "el panel cuenta 3 clientes");
  revisar(await p.textContent("#stat-riesgo") === "1", "el panel cuenta 1 cliente en riesgo");
  const salud = async () => p.evaluate(() => [...document.querySelectorAll("#panel-filas tr")].map((r) => r.cells[3].innerText));
  await p.selectOption("#panel-orden", "puntaje");
  const filas = await salud();
  revisar(/En riesgo/.test(filas[0]) && /100\/100/.test(filas[1]) && /Sin plan/.test(filas[2]), `orden por menor salud: ${filas.map((f) => f.split("\n")[0]).join(" · ")}`);

  const [descarga] = await Promise.all([p.waitForEvent("download"), p.click("#btn-exportar")]);
  const csv = readFileSync(await descarga.path(), "utf8");
  revisar(/Puntaje de salud financiera/.test(csv) && /Plan actualizado/.test(csv), "la exportación incluye la salud financiera");

  await p.fill("#form-tarifas [name=tarifa]", "25000");
  revisar(/22\s?222/.test(await p.textContent("#tar-equilibrio")), "guía de tarifas: mínimo de ₡22 222 por hora");
  await p.check("#form-tarifas [name=iva]");
  const precio = await p.textContent("#tarifas-filas tr:nth-child(2) [data-tarifa-precio]");
  revisar(precio.replace(/\D/g, "") === "5500085000", `guía de tarifas con IVA: capacidad de crédito ₡55 000 – ₡85 000 (obtenido: ${precio})`);
  revisar(p.errores.length === 0, "panel sin errores: " + p.errores.join(" | "));

  const movil = await ctx.newPage(); await movil.setViewportSize({ width: 375, height: 800 });
  await movil.goto(B + "panel/index.html"); await movil.waitForSelector("#panel-contenido:not([hidden])");
  revisar(await sinDesborde(movil, 375), "el panel no se desborda en el celular");
  await ctx.close();
}

await navegador.close();
servidor.close();
console.log(`\n${total - fallas.length} de ${total} pruebas pasaron.`);
if (fallas.length) { console.log("Fallaron:\n- " + fallas.join("\n- ")); process.exit(1); }
