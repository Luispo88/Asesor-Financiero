"""Genera las páginas internas del sitio con encabezado y pie comunes.

Uso, desde la raíz del repositorio:  python3 herramientas/construir.py
Genera servicios/, blog/, cuenta/, clientes/, panel/ y sitemap.xml.
index.html no se genera: se edita a mano.
"""
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WA = "https://wa.me/50670123241"
SITE = "https://luispo88.github.io/Asesor-Financiero/"


def header(active):
    def item(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'        <a href="{href}"{cur}>{label}</a>'
    links = "\n".join([
        item("../servicios/index.html", "Servicios", "servicios"),
        item("../index.html#ruta-pyme", "Ruta PYME", "ruta"),
        item("../index.html#herramientas", "Herramientas", "herramientas"),
        item("../blog/index.html", "Blog", "blog"),
        item("../index.html#sobre-mi", "Sobre mí", "sobre"),
        item("../cuenta/index.html", "Acceso clientes", "cuenta"),
    ])
    return f'''  <header class="site-header">
    <div class="container nav">
      <a href="../index.html" class="brand">
        <span class="brand-mark" aria-hidden="true">LS</span>
        <span class="brand-name">Luis Salas<small>Asesor Financiero</small></span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">
        <span></span><span></span>
      </button>
      <nav id="menu" class="menu" aria-label="Principal">
{links}
        <a href="../index.html#contacto" class="menu-cta">Diagnóstico gratuito</a>
      </nav>
    </div>
  </header>'''


def footer():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        home = f.read()
    block = home[home.index('  <footer class="site-footer">'):home.index("  </footer>") + len("  </footer>")]
    # Mismos enlaces que la portada, con rutas relativas a una subcarpeta.
    return re.sub(r'href="(?!https?:|mailto:|#)([^"]+)"', r'href="../\1"', block)


def page(path, title, description, active, crumbs, eyebrow, h1, lead, body, meta="", scripts="", privada=False):
    crumb_html = " › ".join(
        f'<a href="{href}">{label}</a>' if href else label for label, href in crumbs
    )
    meta_html = f'\n        <p class="post-meta">{meta}</p>' if meta else ""
    html = f'''<!doctype html>
<html lang="es-CR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | Luis Salas, Asesor Financiero</title>
  <meta name="description" content="{description}">{'\n  <meta name="robots" content="noindex">' if privada else ""}
  <link rel="canonical" href="{SITE}{path.removesuffix("index.html")}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_CR">
  <meta property="og:site_name" content="Luis Salas, Asesor Financiero">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{SITE}{path.removesuffix("index.html")}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css">
  <script>document.documentElement.classList.add("js");</script>
</head>
<body>
{header(active)}

  <main>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Ruta de navegación">{crumb_html}</nav>
        <p class="eyebrow eyebrow-accent reveal">{eyebrow}</p>
        <h1 class="reveal">{h1}</h1>
        <p class="lead reveal">{lead}</p>{meta_html}
      </div>
    </section>
{body}
  </main>

{footer()}

  <script src="../js/main.js"></script>{scripts}
</body>
</html>
'''
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(html)


def cta_band(titulo, texto, mensaje):
    return f'''
    <section class="cta-band on-dark">
      <div class="container">
        <h2 class="reveal">{titulo}</h2>
        <p class="reveal">{texto}</p>
        <div class="actions reveal">
          <a href="{WA}" class="btn" data-whatsapp-link data-mensaje="{mensaje}">Escribirme por WhatsApp</a>
        </div>
      </div>
    </section>'''


def ul(items, cls="check-list"):
    lis = "\n".join(f"            <li>{i}</li>" for i in items)
    return f'          <ul class="{cls}">\n{lis}\n          </ul>'


def steps(items):
    out = []
    for n, (t, d) in enumerate(items, 1):
        out.append(f'''            <li class="step">
              <span class="step-num">Paso {n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </li>''')
    return '          <ol class="steps">\n' + "\n".join(out) + "\n          </ol>"


def faq(items):
    return "\n".join(
        f'''          <details>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>''' for q, a in items
    )


# ---------------------------------------------------------------- Servicios

REGISTRO_CFO = """
    <section class="section section-alt" id="registro">
      <div class="container">
        <div class="section-head reveal">
          <p class="eyebrow eyebrow-accent">Registro de pymes interesadas</p>
          <h2 class="section-title">Dé el siguiente paso.</h2>
          <p class="section-sub">Si le interesa este servicio, cree su cuenta. Tendrá acceso a la <strong>Introducción al CFO</strong> y, más adelante, le pediré algunos datos financieros de su empresa para preparar un acompañamiento a su medida.</p>
        </div>

        <div class="cards cards-4 reveal">
          <div class="card"><span class="card-tag">Módulo 1</span><h3>El rol del CFO en la pyme</h3><p>Qué hace un gerente financiero y cómo ayuda a tomar mejores decisiones.</p></div>
          <div class="card"><span class="card-tag">Módulo 2</span><h3>Revisión y control de estados financieros</h3><p>Cómo leer el balance y el estado de resultados, y qué indicadores vigilar.</p></div>
          <div class="card"><span class="card-tag">Módulo 3</span><h3>Flujo de caja y presupuesto</h3><p>Anticipar faltantes de liquidez y planificar ingresos y gastos.</p></div>
          <div class="card"><span class="card-tag">Módulo 4</span><h3>Planificación para la sostenibilidad</h3><p>Metas, financiamiento y crecimiento ordenado a mediano plazo.</p></div>
        </div>
        <p class="note center">Contenido disponible en el Área de clientes. Se irá ampliando con nuevos módulos.</p>

        <div class="register-cta reveal">
          <h3>Cree su cuenta de cliente</h3>
          <p>Con su correo y una contraseña podrá entrar al <strong>Área de clientes</strong>, donde encontrará la introducción al funcionamiento del CFO externo y a la revisión de la información financiera de su pyme.</p>
          <div class="actions">
            <a href="../cuenta/index.html?modo=registro" class="btn">Crear mi cuenta</a>
            <a href="../cuenta/index.html" class="btn btn-outline">Ya tengo cuenta</a>
          </div>
        </div>
      </div>
    </section>"""


SERVICIOS = [
    {
        "slug": "capacidad-de-credito",
        "grupo": "Personas",
        "titulo": "Diagnóstico de capacidad de crédito",
        "corto": "Sepa cuánto puede pedir, qué tasa esperar y qué corregir antes de ir al banco.",
        "desc": "Diagnóstico de capacidad de crédito y comparación de ofertas en Costa Rica: endeudamiento, historial en el CIC de SUGEF y costo real del crédito.",
        "lead": "Antes de presentar una solicitud, revisamos su situación con los mismos criterios que usa un analista de crédito. Así llega al banco sabiendo cuánto puede pedir y con su expediente en orden.",
        "para": [
            "Personas asalariadas o independientes que van a solicitar un crédito personal, prendario o de vivienda.",
            "Quien recibió un rechazo y quiere entender por qué.",
            "Quien tiene varias ofertas y no sabe cuál le conviene realmente.",
        ],
        "incluye": [
            "Análisis de ingresos demostrables y nivel de endeudamiento actual",
            "Revisión de su historial en el CIC de SUGEF y burós privados",
            "Cálculo del monto y la cuota que puede asumir con holgura",
            "Comparación de ofertas: tasa de referencia (TBP, TRI o SOFR), margen, comisiones, seguros y plazo",
            "Lista de documentos y recomendaciones para fortalecer su solicitud",
        ],
        "pasos": [
            ("Conversación inicial", "Entendemos su objetivo: qué quiere financiar, en qué moneda y en qué plazo."),
            ("Revisión de documentos", "Analizamos ingresos, deudas, historial crediticio y garantías disponibles."),
            ("Informe y recomendaciones", "Le entrego un resumen claro con el monto viable, riesgos y pasos a seguir."),
            ("Acompañamiento", "Si lo desea, le acompaño en la solicitud y en la comparación de ofertas."),
        ],
        "docs": [
            "Cédula de identidad o DIMEX vigente",
            "Constancia salarial y colillas de pago recientes (asalariados)",
            "Certificación de ingresos emitida por un contador público autorizado (independientes)",
            "Estados de cuenta bancarios de los últimos meses",
            "Detalle de deudas actuales: saldos, cuotas y tasas",
        ],
        "faq": [
            ("¿Consultar mi historial afecta mi calificación?", "Revisar su propio reporte no es lo mismo que solicitar varios créditos a la vez. Le explico cómo obtener su reporte del CIC y cómo interpretarlo."),
            ("¿Qué porcentaje de mi ingreso puedo destinar a deudas?", "Depende de la entidad, el tipo de crédito y su estabilidad de ingresos. Como referencia, muchas entidades aceptan que el total de cuotas llegue a entre un 50 % y un 60 % del ingreso neto (para asalariados, el salario después de cargas sociales). Para su tranquilidad, mientras más bajo, mejor."),
        ],
        "mensaje": "Hola Luis, me interesa un diagnóstico de mi capacidad de crédito.",
    },
    {
        "slug": "consolidacion-de-deudas",
        "grupo": "Personas",
        "titulo": "Consolidación y reestructuración de deudas",
        "corto": "Ordene tarjetas y préstamos en una cuota que sí pueda pagar.",
        "desc": "Consolidación de deudas y reestructuración de tarjetas de crédito y préstamos en Costa Rica, con un plan para bajar la cuota y el costo total.",
        "lead": "Cuando las tarjetas y los préstamos se acumulan, el problema no es solo la cuota: es el costo total. Diseñamos un plan para reducirlo y recuperar el control de su flujo mensual.",
        "para": [
            "Personas con varias tarjetas de crédito o préstamos con tasas altas.",
            "Quien paga solo el mínimo y siente que la deuda no baja.",
            "Quien tiene atrasos y necesita negociar con la entidad antes de que la situación empeore.",
        ],
        "incluye": [
            "Inventario completo de deudas: saldos, tasas, cuotas y fechas",
            "Cálculo del costo real de seguir pagando como hasta ahora",
            "Evaluación de alternativas: consolidación, readecuación, prórroga o pago escalonado",
            "Preparación de la solicitud de consolidación ante la entidad más conveniente",
            "Presupuesto mensual para no volver a endeudarse",
        ],
        "pasos": [
            ("Inventario de deudas", "Reunimos estados de cuenta y armamos el mapa completo de lo que debe."),
            ("Análisis de opciones", "Comparamos escenarios con números: cuota, plazo y costo total de cada alternativa."),
            ("Gestión", "Preparamos la solicitud o la propuesta de negociación con la entidad."),
            ("Plan de salida", "Un presupuesto y un calendario para salir de deudas y reconstruir su historial."),
        ],
        "docs": [
            "Estados de cuenta de todas las tarjetas y préstamos",
            "Comprobantes de ingresos recientes",
            "Reporte de su historial crediticio (CIC de SUGEF)",
            "Detalle de gastos mensuales fijos",
        ],
        "faq": [
            ("¿Consolidar siempre conviene?", "No siempre. Si la nueva deuda tiene un plazo mucho más largo, la cuota baja pero puede pagar más intereses en total. Por eso comparamos el costo total, no solo la cuota."),
            ("¿Qué pasa si ya tengo atrasos?", "Es más difícil, pero no imposible. Mientras antes se negocie con la entidad, más opciones hay. También revisamos las tasas máximas permitidas por ley en Costa Rica."),
        ],
        "mensaje": "Hola Luis, quiero ayuda para consolidar o reestructurar mis deudas.",
    },
    {
        "slug": "credito-hipotecario",
        "grupo": "Personas",
        "titulo": "Acompañamiento en crédito hipotecario",
        "corto": "De la precalificación a la firma, con las mejores condiciones posibles.",
        "desc": "Acompañamiento en créditos hipotecarios en Costa Rica: precalificación, comparación de ofertas, tasa fija o variable y riesgo cambiario.",
        "lead": "Comprar o construir vivienda es probablemente la decisión financiera más grande de su vida. Le acompaño en todo el proceso para que elija bien y no se lleve sorpresas en la formalización.",
        "para": [
            "Familias que van a comprar, construir o remodelar vivienda.",
            "Quien quiere trasladar su hipoteca a otra entidad con mejores condiciones.",
            "Quien duda entre un crédito en colones o en dólares.",
        ],
        "incluye": [
            "Precalificación: cuánto le pueden prestar y con qué prima",
            "Comparación de ofertas de bancos, cooperativas y mutuales",
            "Análisis de tasa fija, variable o mixta y su referencia (TBP, TRI o SOFR)",
            "Simulación del riesgo cambiario si el crédito es en dólares",
            "Costos de formalización: avalúo, honorarios, timbres y seguros",
            "Orientación sobre el bono familiar de vivienda, si califica",
        ],
        "pasos": [
            ("Precalificación", "Revisamos ingresos, deudas e historial para definir un monto realista."),
            ("Comparación de ofertas", "Pedimos y comparamos propuestas de varias entidades con el costo total."),
            ("Expediente", "Preparamos los documentos personales y del inmueble para agilizar la aprobación."),
            ("Formalización", "Revisamos las condiciones finales antes de firmar."),
        ],
        "docs": [
            "Cédula y comprobantes de ingresos",
            "Estados de cuenta y detalle de deudas actuales",
            "Opción de compraventa o presupuesto de construcción",
            "Plano catastrado y certificación literal del inmueble (Registro Nacional)",
            "Avalúo del inmueble (lo coordina la entidad)",
        ],
        "faq": [
            ("¿Es mejor tasa fija o variable?", "La fija le da certeza durante el periodo pactado; la variable puede empezar más baja pero sube si sube la tasa de referencia. Simulamos ambos escenarios con su caso."),
            ("Gano en colones, ¿puedo pedir en dólares?", "Puede, pero asume el riesgo cambiario: si el colón se deprecia, su cuota en colones sube. Las entidades lo evalúan con más exigencia cuando el deudor no genera dólares."),
        ],
        "mensaje": "Hola Luis, me interesa asesoría para un crédito hipotecario.",
    },
    {
        "slug": "financiamiento-pymes",
        "grupo": "Pymes",
        "titulo": "Gestión de financiamiento para pymes",
        "corto": "Expediente completo y acompañamiento ante bancos, cooperativas y el SBD.",
        "desc": "Gestión de financiamiento para pymes en Costa Rica: expediente de crédito, flujo de caja proyectado y acceso al Sistema de Banca para el Desarrollo (SBD).",
        "lead": "Muchas pymes viables reciben un \"no\" porque su solicitud no muestra bien su capacidad de pago. Preparo su expediente como lo haría un ejecutivo de crédito, y le acompaño hasta la aprobación.",
        "para": [
            "Pymes que necesitan capital de trabajo, maquinaria, vehículos o infraestructura.",
            "Emprendimientos formalizados que buscan su primer crédito empresarial.",
            "Empresas que quieren acceder a opciones del Sistema de Banca para el Desarrollo (SBD).",
        ],
        "incluye": [
            "Diagnóstico de la empresa: estados financieros, flujo de caja e indicadores",
            "Definición del tipo de crédito, monto y plazo adecuados",
            "Flujo de caja proyectado y plan de inversión",
            "Identificación de opciones: banca comercial, cooperativas, SBD, FODEMIPYME, arrendamiento y factoreo",
            "Armado del expediente y acompañamiento ante la entidad",
        ],
        "pasos": [
            ("Diagnóstico", "Entendemos el negocio, su necesidad de financiamiento y su situación financiera."),
            ("Estructuración", "Definimos el producto, el monto, el plazo y las garantías más convenientes."),
            ("Expediente", "Preparamos estados financieros, proyecciones y documentos legales."),
            ("Gestión y negociación", "Presentamos la solicitud y le acompañamos hasta la formalización."),
        ],
        "docs": [
            "Personería jurídica y cédula del representante legal (sociedades)",
            "Estados financieros de los últimos periodos, preferiblemente certificados por un CPA",
            "Declaraciones de impuestos (renta e IVA)",
            "Constancias de estar al día con la CCSS y Hacienda",
            "Cotizaciones o proformas de la inversión a financiar",
        ],
        "faq": [
            ("¿Necesito estados financieros auditados?", "Depende del monto y de la entidad. Para montos menores suelen bastar estados certificados por un contador público autorizado. Le indico qué pide cada entidad."),
            ("¿Qué ventajas tiene el SBD?", "El Sistema de Banca para el Desarrollo ofrece opciones de crédito y avales pensadas para pymes y emprendimientos, que pueden ayudar cuando las garantías son limitadas."),
        ],
        "mensaje": "Hola Luis, necesito financiamiento para mi empresa.",
    },
    {
        "slug": "condicion-pyme-meic",
        "grupo": "Pymes",
        "titulo": "Condición PYME ante el MEIC",
        "corto": "Formalice su empresa y obtenga la condición PYME en el SIEC.",
        "desc": "Acompañamiento para obtener la condición PYME ante el MEIC en Costa Rica: requisitos de la Ley 8262, formalización y registro en el SIEC.",
        "lead": "La condición PYME abre la puerta a programas de apoyo, financiamiento y beneficios en compras públicas. Le guío en cada trámite, desde la formalización hasta el registro en el SIEC del MEIC.",
        "para": [
            "Emprendimientos que aún no están formalizados.",
            "Empresas que cumplen parcialmente y necesitan ponerse al día.",
            "Pymes que quieren acceder a financiamiento del SBD o a programas de apoyo.",
        ],
        "incluye": [
            "Revisión de su situación ante Hacienda, la CCSS y el INS",
            "Orientación sobre la figura legal más conveniente (persona física o sociedad)",
            "Ruta de formalización con el orden correcto de los trámites",
            "Acompañamiento en el registro en el SIEC del MEIC",
            "Recordatorio para mantener y renovar la condición PYME",
        ],
        "pasos": [
            ("Diagnóstico de formalidad", "Verificamos qué requisitos cumple hoy: CCSS, Hacienda y póliza del INS."),
            ("Regularización", "Le guiamos para completar lo que falta, en el orden adecuado."),
            ("Registro en el SIEC", "Preparamos la información de personal, ventas y activos y le acompañamos en el registro."),
            ("Aprovechamiento", "Le orientamos sobre los programas y financiamientos a los que puede acceder."),
        ],
        "docs": [
            "Cédula de la persona física o personería jurídica de la sociedad",
            "Inscripción ante Hacienda y declaraciones al día",
            "Constancia de estar al día con la CCSS",
            "Póliza de riesgos del trabajo del INS (si tiene colaboradores)",
            "Datos de personal promedio, ventas anuales y activos",
        ],
        "faq": [
            ("¿Cuántos requisitos necesito cumplir?", "La Ley 8262 pide cumplir al menos dos de tres: cargas sociales (CCSS), obligaciones tributarias (Hacienda) y obligaciones laborales (como la póliza del INS)."),
            ("¿La condición PYME es permanente?", "No. Tiene una vigencia limitada y debe renovarse. Le ayudamos a no perderla."),
        ],
        "mensaje": "Hola Luis, quiero ayuda para obtener la condición PYME ante el MEIC.",
        "extra": '''          <div class="callout">
            <p>¿Quiere saber si ya cumple? Use el <a href="../index.html#herramientas">verificador de condición PYME</a> o lea la <a href="../blog/condicion-pyme-meic-paso-a-paso.html">guía paso a paso</a>.</p>
          </div>''',
    },
    {
        "slug": "cfo-externo",
        "grupo": "Pymes",
        "titulo": "CFO externo para pymes",
        "corto": "Gerencia financiera mensual sin el costo de un puesto a tiempo completo.",
        "desc": "Servicio de CFO externo para pymes en Costa Rica: flujo de caja, presupuesto, indicadores, reestructuración de pasivos y relación con bancos.",
        "lead": "Su contador registra lo que pasó; un gerente financiero le ayuda a decidir lo que viene. Le ofrezco ese acompañamiento de forma mensual, adaptado al tamaño de su empresa.",
        "para": [
            "Pymes que crecen y necesitan ordenar sus números para tomar decisiones.",
            "Empresas con problemas de liquidez aunque vendan bien.",
            "Dueños que quieren una mejor relación con sus bancos y proveedores de crédito.",
        ],
        "incluye": [
            "Flujo de caja semanal o mensual y proyección a 12 meses",
            "Presupuesto anual y seguimiento de resultados",
            "Indicadores clave: liquidez, endeudamiento, rentabilidad y punto de equilibrio",
            "Diagnóstico financiero inicial con recomendaciones concretas",
            "Reestructuración de pasivos para liberar flujo de caja",
            "Relación y negociación con entidades financieras",
        ],
        "pasos": [
            ("Diagnóstico financiero", "Revisamos estados financieros, deudas, márgenes y flujo de caja."),
            ("Plan de trabajo", "Definimos prioridades, indicadores y la frecuencia de reuniones."),
            ("Acompañamiento mensual", "Reportes, reuniones de seguimiento y apoyo en decisiones clave."),
            ("Mejora continua", "Ajustamos el plan según los resultados y el crecimiento de la empresa."),
        ],
        "docs": [
            "Estados financieros recientes y balance de comprobación",
            "Detalle de deudas y condiciones de cada crédito",
            "Reportes de ventas y cuentas por cobrar y por pagar",
            "Presupuesto actual, si existe",
        ],
        "faq": [
            ("¿Reemplaza a mi contador?", "No. Lo complementa: el contador lleva los registros y las obligaciones fiscales; el CFO externo usa esa información para planear y decidir."),
            ("¿Cómo se cobra?", "Con una tarifa mensual fija según el alcance acordado. El diagnóstico inicial puede contratarse por separado."),
        ],
        "mensaje": "Hola Luis, me interesa el servicio de CFO externo para mi empresa.",
        "despues": REGISTRO_CFO,
        "aside_extra": '''          <a href="#registro" class="btn btn-outline btn-block aside-second">Registrar mi pyme</a>''',
    },
]




def servicio_page(s):
    body = f'''
    <section class="section">
      <div class="container layout-sidebar">
        <div class="prose">
          <h2>¿Para quién es?</h2>
{ul(s["para"], "")}
          <h2>Qué incluye</h2>
{ul(s["incluye"])}
          <h2>Cómo funciona</h2>
{steps(s["pasos"])}
          <h2>Documentos que suele necesitar</h2>
{ul(s["docs"], "")}
{s.get("extra", "")}
          <h2>Preguntas frecuentes</h2>
{faq(s["faq"])}
        </div>
        <aside class="aside-card">
          <h3>Diagnóstico gratuito</h3>
          <p>Una conversación de 30 minutos para entender su caso, sin compromiso.</p>
          <a href="{WA}" class="btn btn-block" data-whatsapp-link data-mensaje="{s["mensaje"]}">Escribirme por WhatsApp</a>
{s.get("aside_extra", "")}
          <ul>
            <li>+506 7012-3241</li>
            <li><a href="mailto:luis1988salas@hotmail.com" data-email-link>luis1988salas@hotmail.com</a></li>
          </ul>
        </aside>
      </div>
    </section>
{s.get("despues", "")}
{cta_band("¿Conversamos sobre su caso?", "Le respondo en menos de 24 horas hábiles.", s["mensaje"])}'''
    page(
        f'servicios/{s["slug"]}.html', s["titulo"], s["desc"], "servicios",
        [("Inicio", "../index.html"), ("Servicios", "index.html"), (s["titulo"], None)],
        f'Servicios para {s["grupo"].lower()}', s["titulo"], s["lead"], body,
    )


def servicios_index():
    grupos = []
    for grupo, titulo in [("Personas", "Para personas"), ("Pymes", "Para pymes")]:
        cards = "\n".join(
            f'''          <a class="card card-link" href="{s["slug"]}.html">
            <h3>{s["titulo"]}</h3>
            <p>{s["corto"]}</p>
            <span class="link-more">Ver servicio</span>
          </a>''' for s in SERVICIOS if s["grupo"] == grupo
        )
        alt = " section-alt" if grupo == "Pymes" else ""
        grupos.append(f'''
    <section class="section{alt}">
      <div class="container">
        <div class="section-head reveal">
          <p class="eyebrow eyebrow-accent">{titulo}</p>
          <h2 class="section-title">{"Finanzas personales." if grupo == "Personas" else "Su empresa, en orden."}</h2>
        </div>
        <div class="cards">
{cards}
        </div>
      </div>
    </section>''')
    body = "".join(grupos) + cta_band(
        "¿No sabe qué servicio necesita?",
        "Cuénteme su situación y le recomiendo por dónde empezar.",
        "Hola Luis, quisiera orientación sobre qué servicio necesito.",
    )
    page(
        "servicios/index.html", "Servicios",
        "Servicios de asesoría financiera para personas y pymes en Costa Rica: crédito, deudas, hipotecas, financiamiento, condición PYME y CFO externo.",
        "servicios", [("Inicio", "../index.html"), ("Servicios", None)],
        "Servicios", "Asesoría financiera para personas y pymes",
        "Más de 15 años en banca, ahora de su lado. Elija el servicio que necesita o escríbame y lo definimos juntos.",
        body,
    )


# ---------------------------------------------------------------- Blog

ARTICULOS = [
    {
        "slug": "por-que-el-banco-rechazo-su-credito",
        "titulo": "¿Por qué el banco rechazó su crédito? Las 8 razones más comunes",
        "corto": "Las razones más comunes desde la perspectiva de un ejecutivo de crédito, y cómo corregirlas.",
        "tag": "Crédito",
        "desc": "Las razones más comunes por las que un banco rechaza un crédito en Costa Rica, explicadas por un ex-ejecutivo de crédito, y qué hacer para que la próxima solicitud sí sea aprobada.",
        "lead": "Después de casi 10 años como ejecutivo de crédito, he visto que la mayoría de los rechazos se repiten por las mismas razones. La buena noticia: casi todas se pueden corregir.",
        "minutos": 7,
        "cuerpo": '''
          <p>Un rechazo no siempre significa que usted no puede pagar un crédito. Muchas veces significa que su solicitud no logró <strong>demostrarlo</strong> con los criterios que usa la entidad. Estas son las razones que más veo, y qué puede hacer con cada una.</p>

          <h2>1. Su nivel de endeudamiento es muy alto</h2>
          <p>Es la causa más frecuente. La entidad suma todas sus cuotas actuales más la nueva y las compara con su ingreso neto. Si el resultado supera su política interna, la solicitud no avanza, aunque usted nunca se haya atrasado.</p>
          <p><strong>Qué hacer:</strong> calcule su relación cuota/ingreso con nuestra <a href="../index.html#herramientas">calculadora de capacidad de endeudamiento</a>. Si está alta, considere cancelar o consolidar deudas pequeñas antes de solicitar, o pedir un monto menor o a mayor plazo.</p>

          <h2>2. Tiene atrasos en su historial crediticio</h2>
          <p>Las entidades consultan el Centro de Información Crediticia (CIC) de la SUGEF y burós privados. Atrasos recientes, operaciones en cobro judicial o deudas canceladas con arreglo de pago pesan mucho en la decisión.</p>
          <p><strong>Qué hacer:</strong> solicite su propio reporte y revíselo. Si hay errores, pida la corrección a la entidad que reportó. Si los atrasos son reales, póngase al día y construya un periodo de buen comportamiento antes de volver a solicitar.</p>

          <h2>3. Sus ingresos no se pueden demostrar</h2>
          <p>Para el banco, un ingreso que no se puede documentar es como si no existiera. Esto afecta sobre todo a trabajadores independientes, comerciantes y quienes reciben parte de su ingreso en efectivo.</p>
          <p><strong>Qué hacer:</strong> deposite sus ingresos en una cuenta bancaria, declare sus impuestos y obtenga una certificación de ingresos de un contador público autorizado (CPA). Lo que no está en papel, no cuenta.</p>

          <h2>4. Poca estabilidad laboral o del negocio</h2>
          <p>Un trabajo con pocos meses de antigüedad, un contrato temporal o un negocio muy reciente generan dudas sobre la continuidad del ingreso durante el plazo del crédito.</p>
          <p><strong>Qué hacer:</strong> si acaba de cambiar de trabajo, puede ser mejor esperar unos meses. Si es independiente, muestre un historial de ingresos de al menos uno o dos años.</p>

          <h2>5. La garantía no es suficiente</h2>
          <p>En créditos hipotecarios o prendarios, el avalúo puede salir por debajo de lo esperado, o el inmueble puede tener limitaciones registrales. En créditos fiduciarios, el fiador puede no calificar.</p>
          <p><strong>Qué hacer:</strong> revise la situación registral del bien antes de solicitar, considere aportar una prima mayor o explore opciones con avales, como las del Sistema de Banca para el Desarrollo en el caso de pymes.</p>

          <h2>6. Pidió en dólares sin generar dólares</h2>
          <p>Si sus ingresos son en colones y solicita un crédito en dólares, la entidad analiza qué pasaría con su cuota si el tipo de cambio sube. Esa prueba de estrés puede hacer que ya no califique.</p>
          <p><strong>Qué hacer:</strong> compare la opción en colones. Le explico el tema a fondo en <a href="credito-en-colones-o-dolares.html">¿Crédito en colones o en dólares?</a></p>

          <h2>7. Inconsistencias en la documentación</h2>
          <p>Datos que no coinciden entre la solicitud, la constancia salarial y los estados de cuenta generan desconfianza inmediata, aunque sean errores involuntarios.</p>
          <p><strong>Qué hacer:</strong> revise que todo sea coherente antes de entregar: montos, fechas, direcciones y nombres.</p>

          <h2>8. Solicitó en muchas entidades a la vez</h2>
          <p>Varias consultas en poco tiempo pueden interpretarse como una necesidad urgente de dinero, lo que se percibe como mayor riesgo.</p>
          <p><strong>Qué hacer:</strong> prepare bien una solicitud y preséntela en las entidades que mejor se ajusten a su perfil, no en todas.</p>

          <blockquote>
            <p><strong>Consejo de ejecutivo:</strong> siempre pregunte el motivo del rechazo. No todas las entidades lo detallan, pero la mayoría le dará una orientación, y es la información más valiosa para su próxima solicitud.</p>
          </blockquote>

          <h2>¿Qué hacer ahora?</h2>
          <ol>
            <li>Pida el motivo del rechazo.</li>
            <li>Revise su reporte del CIC y corrija errores.</li>
            <li>Calcule su capacidad de endeudamiento real.</li>
            <li>Documente sus ingresos.</li>
            <li>Vuelva a solicitar con un expediente sólido, en la entidad adecuada.</li>
          </ol>
          <p>Si quiere que revisemos su caso juntos, este es exactamente el trabajo del <a href="../servicios/capacidad-de-credito.html">diagnóstico de capacidad de crédito</a>.</p>''',
        "mensaje": "Hola Luis, me rechazaron un crédito y quisiera que revisemos mi caso.",
    },
    {
        "slug": "condicion-pyme-meic-paso-a-paso",
        "titulo": "Cómo obtener la condición PYME ante el MEIC, paso a paso",
        "corto": "Requisitos, orden de los trámites y beneficios de registrar su empresa.",
        "tag": "Pymes",
        "desc": "Guía para obtener la condición PYME ante el MEIC en Costa Rica: requisitos de la Ley 8262, formalización en Hacienda, CCSS e INS, registro en el SIEC y beneficios.",
        "lead": "La condición PYME es la puerta de entrada a programas de apoyo, financiamiento y beneficios del Estado. Esta guía le explica qué necesita y en qué orden hacerlo.",
        "minutos": 6,
        "cuerpo": '''
          <h2>¿Qué es la condición PYME?</h2>
          <p>Es el reconocimiento que otorga el Ministerio de Economía, Industria y Comercio (MEIC) a las micro, pequeñas y medianas empresas que cumplen los requisitos de la <strong>Ley 8262 de Fortalecimiento de las Pequeñas y Medianas Empresas</strong>. Se gestiona en línea en el Sistema de Información Empresarial Costarricense (SIEC).</p>

          <h2>El requisito clave: 2 de 3</h2>
          <p>Para ser reconocida como PYME, la empresa debe cumplir <strong>al menos dos</strong> de estos tres requisitos:</p>
          <ul class="check-list">
            <li><strong>Cargas sociales:</strong> estar inscrita y al día con la CCSS.</li>
            <li><strong>Obligaciones tributarias:</strong> estar inscrita y al día con el Ministerio de Hacienda.</li>
            <li><strong>Obligaciones laborales:</strong> por ejemplo, la póliza de riesgos del trabajo del INS.</li>
          </ul>
          <p>Puede comprobar en un minuto si cumple con nuestro <a href="../index.html#herramientas">verificador de condición PYME</a>.</p>

          <h2>Paso a paso</h2>
          <h3>1. Defina la figura legal</h3>
          <p>Puede operar como persona física con actividad lucrativa o constituir una sociedad (por ejemplo, una S.R.L. o una S.A.) en el Registro Nacional. La sociedad separa su patrimonio personal del de la empresa, pero tiene costos y obligaciones adicionales, como la declaración en el Registro de Transparencia y Beneficiarios Finales del Banco Central.</p>

          <h3>2. Inscríbase en Hacienda</h3>
          <p>Registre su actividad económica en la plataforma tributaria del Ministerio de Hacienda, elija el régimen que le corresponde (tradicional o simplificado) y active la facturación electrónica.</p>

          <h3>3. Inscríbase en la CCSS</h3>
          <p>Como patrono si tiene colaboradores, o como trabajador independiente. Lo importante es mantener las cuotas al día: el atraso le hace perder este requisito.</p>

          <h3>4. Contrate la póliza de riesgos del trabajo</h3>
          <p>Es obligatoria si tiene personas trabajando para usted y se adquiere en el INS.</p>

          <h3>5. Obtenga los permisos de operación</h3>
          <p>La patente municipal y, según la actividad, el permiso sanitario de funcionamiento del Ministerio de Salud u otros permisos sectoriales.</p>

          <h3>6. Regístrese en el SIEC del MEIC</h3>
          <p>Ingrese los datos de su empresa: personal promedio, ventas anuales netas y activos. Con esa información el MEIC la clasifica como micro, pequeña o mediana empresa y emite la condición PYME.</p>

          <div class="callout">
            <p><strong>Importante:</strong> la condición PYME tiene una vigencia limitada y debe renovarse. Además, si deja de estar al día con la CCSS o Hacienda, puede perder los requisitos.</p>
          </div>

          <h2>¿Para qué sirve?</h2>
          <ul class="check-list">
            <li>Acceso a programas de apoyo, capacitación y acompañamiento del MEIC y otras instituciones.</li>
            <li>Opciones de crédito y avales del Sistema de Banca para el Desarrollo (SBD) y fondos como FODEMIPYME.</li>
            <li>Acceso a fondos no reembolsables para proyectos de innovación, como PROPYME.</li>
            <li>Beneficios para participar en compras públicas.</li>
            <li>Una empresa formal, mejor evaluada por bancos y proveedores.</li>
          </ul>

          <h2>Errores frecuentes</h2>
          <ul>
            <li>Inscribirse en Hacienda pero no presentar las declaraciones, aunque sean en cero.</li>
            <li>Atrasarse con la CCSS y descubrirlo justo cuando se necesita una constancia.</li>
            <li>Reportar datos de ventas o personal que no coinciden con lo declarado a Hacienda.</li>
            <li>Olvidar la renovación de la condición PYME.</li>
          </ul>

          <p class="note">Esta guía es orientativa. Requisitos, plataformas y plazos pueden cambiar: verifíquelos siempre con el MEIC y las instituciones correspondientes.</p>

          <p>Si prefiere que le acompañe en todo el proceso, conozca el servicio de <a href="../servicios/condicion-pyme-meic.html">condición PYME ante el MEIC</a>.</p>''',
        "mensaje": "Hola Luis, leí la guía de condición PYME y quisiera ayuda con mi empresa.",
    },
    {
        "slug": "credito-en-colones-o-dolares",
        "titulo": "¿Crédito en colones o en dólares? El riesgo cambiario que pocos le explican",
        "corto": "El riesgo cambiario que pocos explican y cómo decidir con números.",
        "tag": "Crédito",
        "desc": "Cómo decidir entre un crédito en colones o en dólares en Costa Rica: riesgo cambiario, tasas de referencia TBP, TRI y SOFR, y un ejemplo con números.",
        "lead": "La tasa en dólares suele verse más baja, y por eso muchas personas la eligen. Pero si su ingreso es en colones, hay un riesgo que la tasa no muestra: el tipo de cambio.",
        "minutos": 5,
        "cuerpo": '''
          <h2>La tasa no lo es todo</h2>
          <p>Cuando compara un crédito en colones con uno en dólares, no está comparando solo dos tasas. Está decidiendo <strong>en qué moneda va a tener su deuda</strong> durante 5, 10 o 30 años. Si gana en colones y debe en dólares, cualquier movimiento del tipo de cambio cambia lo que paga cada mes.</p>

          <h2>Un ejemplo con números</h2>
          <p>Suponga una cuota de <strong>$1 000</strong> al mes. Vea cuánto le cuesta en colones según el tipo de cambio (cifras ilustrativas):</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Tipo de cambio</th><th class="num">Cuota en colones</th><th class="num">Variación</th></tr>
              </thead>
              <tbody>
                <tr><td>₡500 por dólar</td><td class="num">₡500 000</td><td class="num">—</td></tr>
                <tr><td>₡550 por dólar</td><td class="num">₡550 000</td><td class="num">+10 %</td></tr>
                <tr><td>₡600 por dólar</td><td class="num">₡600 000</td><td class="num">+20 %</td></tr>
              </tbody>
            </table>
          </div>
          <p>Su salario en colones no sube automáticamente cuando sube el tipo de cambio. Esa diferencia sale de su presupuesto.</p>

          <h2>Las entidades también lo saben</h2>
          <p>Por eso, cuando el deudor no genera ingresos en dólares, las entidades financieras aplican análisis más exigentes: evalúan si usted podría seguir pagando si el tipo de cambio sube. En la práctica, eso puede reducir el monto que le aprueban o hacer que no califique.</p>

          <h2>Tasa variable: el segundo riesgo</h2>
          <p>La mayoría de los créditos de largo plazo tienen tasa variable, compuesta por una <strong>tasa de referencia</strong> más un <strong>margen</strong> fijo:</p>
          <ul>
            <li>En colones, las referencias habituales son la Tasa Básica Pasiva (TBP) o la Tasa de Referencia Interbancaria (TRI).</li>
            <li>En dólares, es común la SOFR u otra referencia internacional.</li>
          </ul>
          <p>Si la referencia sube, su cuota sube. Al comparar ofertas, pregunte siempre cuál es la referencia, cuál es el margen y cada cuánto se revisa la tasa.</p>

          <h2>¿Cuándo tiene sentido endeudarse en dólares?</h2>
          <ul class="check-list">
            <li>Cuando una parte importante de sus ingresos es en dólares.</li>
            <li>Cuando tiene ahorros en dólares que le sirven de respaldo.</li>
            <li>Cuando su cuota es baja en relación con su ingreso y puede absorber variaciones.</li>
          </ul>

          <h2>Cómo decidir</h2>
          <ol>
            <li>Calcule la cuota en ambas monedas con la <a href="../index.html#herramientas">calculadora de cuota</a>.</li>
            <li>Simule un aumento del tipo de cambio de 10 % y 20 % en la opción en dólares.</li>
            <li>Simule un aumento de la tasa de referencia en ambas opciones.</li>
            <li>Elija la opción que pueda pagar con tranquilidad en el escenario difícil, no solo en el escenario actual.</li>
          </ol>

          <blockquote>
            <p><strong>Regla práctica:</strong> endéudese en la moneda en la que gana, salvo que tenga una razón sólida y números que la respalden.</p>
          </blockquote>

          <p>Si está evaluando un crédito de vivienda, le acompaño en la comparación en el servicio de <a href="../servicios/credito-hipotecario.html">crédito hipotecario</a>.</p>''',
        "mensaje": "Hola Luis, quisiera comparar un crédito en colones y en dólares.",
    },
]


def articulo_page(a):
    body = f'''
    <section class="section">
      <div class="container layout-sidebar">
        <article class="prose">
{a["cuerpo"]}
        </article>
        <aside class="aside-card">
          <h3>¿Le ayudo con su caso?</h3>
          <p>Diagnóstico gratuito de 30 minutos, sin compromiso.</p>
          <a href="{WA}" class="btn btn-block" data-whatsapp-link data-mensaje="{a["mensaje"]}">Escribirme por WhatsApp</a>
          <ul>
            <li><a href="index.html">Más artículos del blog</a></li>
            <li><a href="../servicios/index.html">Ver servicios</a></li>
          </ul>
        </aside>
      </div>
    </section>
{cta_band("¿Tiene dudas sobre su situación?", "Escríbame y lo revisamos juntos.", a["mensaje"])}'''
    page(
        f'blog/{a["slug"]}.html', a["titulo"], a["desc"], "blog",
        [("Inicio", "../index.html"), ("Blog", "index.html"), (a["tag"], None)],
        a["tag"], a["titulo"], a["lead"], body,
        meta=f'Por Luis Salas · {a["minutos"]} min de lectura',
    )


def blog_index():
    cards = "\n".join(
        f'''          <a class="card card-link" href="{a["slug"]}.html">
            <span class="card-tag">{a["tag"]}</span>
            <h3>{a["titulo"]}</h3>
            <p>{a["corto"]}</p>
            <span class="link-more">Leer · {a["minutos"]} min</span>
          </a>''' for a in ARTICULOS
    )
    body = f'''
    <section class="section">
      <div class="container">
        <div class="cards">
{cards}
        </div>
      </div>
    </section>
{cta_band("¿Prefiere que lo revisemos juntos?", "Diagnóstico gratuito, sin compromiso.", "Hola Luis, leí su blog y quisiera hacerle una consulta.")}'''
    page(
        "blog/index.html", "Blog",
        "Artículos sobre crédito, deudas, pymes y finanzas personales en Costa Rica, escritos por un ex-ejecutivo de crédito bancario.",
        "blog", [("Inicio", "../index.html"), ("Blog", None)],
        "Blog", "Finanzas claras, desde adentro del banco",
        "Lo que aprendí en más de 15 años en banca, explicado sin tecnicismos para que tome mejores decisiones.",
        body,
    )


# ---------------------------------------------------------------- Cuentas de clientes

AUTH_SCRIPTS = '\n  <script type="module" src="../js/auth.js"></script>'

AVISO_CONFIG = """          <div class="callout auth-pendiente" data-auth-pendiente hidden>
            <p><strong>El acceso de clientes se está configurando.</strong> Mientras tanto, puede escribirme por <a href="https://wa.me/50670123241" data-whatsapp-link data-mensaje="Hola Luis, quiero crear mi cuenta de cliente para el servicio de CFO externo.">WhatsApp</a>.</p>
          </div>"""


def cuenta_page():
    body = f'''
    <section class="section">
      <div class="container narrow">
        <div class="auth-card reveal">
{AVISO_CONFIG}
          <div class="segmented-wrap">
            <div class="segmented" role="tablist" aria-label="Acceso">
              <button role="tab" id="tab-ingresar" aria-controls="panel-ingresar" aria-selected="true">Iniciar sesión</button>
              <button role="tab" id="tab-registro" aria-controls="panel-registro" aria-selected="false" tabindex="-1">Crear cuenta</button>
            </div>
          </div>

          <div role="tabpanel" id="panel-ingresar" aria-labelledby="tab-ingresar">
            <form id="form-ingresar" class="auth-form" novalidate>
              <label>Correo electrónico
                <input type="email" name="correo" required autocomplete="email">
              </label>
              <label>Contraseña
                <input type="password" name="clave" required autocomplete="current-password">
              </label>
              <button type="submit" class="btn btn-block">Iniciar sesión</button>
              <button type="button" class="link-button" id="btn-olvido">¿Olvidó su contraseña?</button>
            </form>
          </div>

          <div role="tabpanel" id="panel-registro" aria-labelledby="tab-registro" hidden>
            <form id="form-registro" class="auth-form" novalidate>
              <div class="field-row">
                <label>Nombre completo
                  <input type="text" name="nombre" required autocomplete="name">
                </label>
                <label>Empresa
                  <input type="text" name="empresa" required autocomplete="organization">
                </label>
              </div>
              <div class="field-row">
                <label>Teléfono / WhatsApp
                  <input type="tel" name="telefono" required autocomplete="tel">
                </label>
                <label>Actividad o sector
                  <input type="text" name="sector" required placeholder="Ej.: comercio, servicios">
                </label>
              </div>
              <label>Correo electrónico
                <input type="email" name="correo" required autocomplete="email">
              </label>
              <div class="field-row">
                <label>Contraseña
                  <input type="password" name="clave" required minlength="8" autocomplete="new-password">
                </label>
                <label>Confirmar contraseña
                  <input type="password" name="clave2" required minlength="8" autocomplete="new-password">
                </label>
              </div>
              <small class="field-hint">Mínimo 8 caracteres.</small>
              <label class="check"><input type="checkbox" name="consentimiento" required> Acepto que mis datos se guarden para gestionar mi cuenta y que se me contacte para solicitar información financiera de mi empresa, conforme a la Ley 8968 de Protección de Datos Personales.</label>
              <button type="submit" class="btn btn-block">Crear mi cuenta</button>
            </form>
          </div>

          <p id="auth-mensaje" class="tool-message" role="status"></p>
        </div>
        <p class="note center">Su contraseña se gestiona de forma segura y nunca queda visible para el asesor.</p>
      </div>
    </section>'''
    page(
        "cuenta/index.html", "Acceso clientes",
        "Inicie sesión o cree su cuenta para entrar al Área de clientes de Luis Salas, Asesor Financiero.",
        "cuenta", [("Inicio", "../index.html"), ("Acceso clientes", None)],
        "Acceso clientes", "Bienvenido.",
        "Entre con su correo y contraseña, o cree su cuenta para acceder al Área de clientes.",
        body, scripts=AUTH_SCRIPTS,
    )


INDICADORES = [
    # (id, nombre, fórmula, cómo leerlo)
    ("razon-corriente", "Razón corriente", "Activo circulante ÷ Pasivo circulante", "Capacidad de pagar las deudas de corto plazo. Por encima de 1,0 es lo mínimo; entre 1,5 y 2,0 es cómodo."),
    ("prueba-acida", "Prueba ácida", "(Activo circulante − Inventarios) ÷ Pasivo circulante", "Lo mismo, sin contar inventarios. Cerca de 1,0 o más es saludable."),
    ("endeudamiento", "Endeudamiento", "Pasivo total ÷ Activo total", "Qué parte de los activos se financia con deuda. Por encima de 70 % es una señal de alerta."),
    ("margen-bruto", "Margen bruto", "Utilidad bruta ÷ Ventas", "Cuánto queda de cada colón vendido después del costo de lo vendido."),
    ("margen-neto", "Margen neto", "Utilidad neta ÷ Ventas", "Cuánto queda al final, después de todos los gastos e impuestos."),
    ("dias-cobro", "Días de cobro", "Cuentas por cobrar ÷ Ventas × 365", "Cuántos días tarda en cobrar a sus clientes."),
    ("dias-inventario", "Días de inventario", "Inventarios ÷ Costo de ventas × 365", "Cuántos días permanece la mercadería antes de venderse."),
    ("dias-pago", "Días de pago", "Cuentas por pagar ÷ Costo de ventas × 365", "Cuántos días tarda en pagar a sus proveedores."),
]


def clientes_page():
    filas = "\n".join(
        f'''              <tr><td><strong>{n}</strong><br><span class="muted-small">{f}</span></td><td class="num" id="ind-{i}">—</td><td class="ind-estado" id="est-{i}"></td></tr>'''
        for i, n, f, _ in INDICADORES
    )
    explicacion = "\n".join(f"            <li><strong>{n}:</strong> {t}</li>" for _, n, _, t in INDICADORES)
    body = f'''
    <section class="section" id="area-espera">
      <div class="container narrow center">
{AVISO_CONFIG}
        <p class="section-sub" id="area-cargando">Verificando su sesión…</p>
      </div>
    </section>

    <div id="area-contenido" hidden>
    <section class="section">
      <div class="container">
        <div class="member-bar">
          <div>
            <p class="eyebrow eyebrow-accent">Área de clientes</p>
            <h2 class="section-title member-hello">Hola, <span data-usuario-nombre>cliente</span>.</h2>
            <p class="muted-text"><span data-usuario-empresa></span></p>
          </div>
          <div class="member-actions">
            <a href="../panel/index.html" class="btn btn-small" data-solo-asesor hidden>Panel del asesor</a>
            <button type="button" class="btn btn-outline btn-small" id="btn-salir">Cerrar sesión</button>
          </div>
        </div>

        <a href="plan.html" class="plan-promo">
          <span class="card-tag">Nuevo · Herramienta</span>
          <strong>Plan de negocios de su empresa</strong>
          <span>Previsión de ventas a 3 años, plan financiero, balance, flujo de caja, estado de resultados, FODA, mercado y más. Se guarda en su cuenta.</span>
          <span class="link-more">Abrir mi plan de negocios</span>
        </a>

        <nav class="member-nav" aria-label="Contenido del área de clientes">
          <a href="plan.html">Plan de negocios</a>
          <a href="#modulo-cfo">1. Cómo funciona el CFO externo</a>
          <a href="#modulo-estados">2. Revisión de la información financiera</a>
          <a href="#modulo-indicadores">3. Sus indicadores</a>
          <a href="#modulo-siguiente">4. Próximos pasos</a>
        </nav>
      </div>
    </section>

    <section class="section section-alt" id="modulo-cfo">
      <div class="container narrow">
        <article class="prose">
          <p class="eyebrow eyebrow-accent">Módulo 1</p>
          <h2>Cómo funciona el CFO externo</h2>
          <p>El CFO (por sus siglas en inglés, <em>Chief Financial Officer</em>) es el responsable de las finanzas de una empresa. En una pyme, ese rol casi siempre lo asume el dueño, que además vende, produce y administra. Un <strong>CFO externo</strong> le acompaña algunas horas al mes para que las decisiones financieras se tomen con números y no por intuición.</p>
          <h3>Contador y CFO: roles distintos que se complementan</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Contador</th><th>CFO externo</th></tr></thead>
              <tbody>
                <tr><td>Registra lo que ya pasó</td><td>Analiza qué significa y planifica lo que viene</td></tr>
                <tr><td>Prepara estados financieros y declaraciones</td><td>Usa esos estados para tomar decisiones</td></tr>
                <tr><td>Cumple con Hacienda y la CCSS</td><td>Cuida la liquidez, la rentabilidad y el endeudamiento</td></tr>
              </tbody>
            </table>
          </div>
          <h3>El ciclo mensual</h3>
          <ol>
            <li><strong>Recibir la información:</strong> estados financieros, ventas, cuentas por cobrar y por pagar, y saldos de deudas.</li>
            <li><strong>Revisar y controlar:</strong> confirmar que los números cuadran y comparar el mes con el presupuesto.</li>
            <li><strong>Analizar:</strong> calcular indicadores y detectar señales de alerta a tiempo.</li>
            <li><strong>Reunirse y decidir:</strong> una reunión mensual con el dueño para acordar acciones concretas.</li>
            <li><strong>Dar seguimiento:</strong> verificar el mes siguiente que las acciones dieron resultado.</li>
          </ol>
          <h3>Qué recibe cada mes</h3>
          <ul class="check-list">
            <li>Un resumen de resultados del mes frente al presupuesto</li>
            <li>El flujo de caja proyectado de las próximas semanas y meses</li>
            <li>Los indicadores clave con su semáforo</li>
            <li>Una lista breve de acciones recomendadas</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section" id="modulo-estados">
      <div class="container narrow">
        <article class="prose">
          <p class="eyebrow eyebrow-accent">Módulo 2</p>
          <h2>Revisión de la información financiera</h2>
          <p>Antes de analizar, hay que confiar en los números. Estos son los tres estados que revisaremos y lo que se busca en cada uno.</p>
          <h3>1. Balance general (estado de situación)</h3>
          <p>Muestra lo que la empresa <strong>tiene</strong> (activos), lo que <strong>debe</strong> (pasivos) y lo que pertenece a los dueños (patrimonio) en una fecha. Siempre se cumple que <em>Activo = Pasivo + Patrimonio</em>.</p>
          <h3>2. Estado de resultados</h3>
          <p>Muestra si la empresa <strong>ganó o perdió</strong> en un periodo: ventas, menos costo de ventas, menos gastos de operación, financieros e impuestos.</p>
          <h3>3. Flujo de efectivo</h3>
          <p>Muestra cuánto <strong>dinero entró y salió</strong> realmente. Una empresa puede tener utilidades y aun así quedarse sin efectivo, por ejemplo si vende a crédito y cobra tarde.</p>
          <h3>Lista de control mensual</h3>
          <ul class="check-list">
            <li>El balance cuadra: activo igual a pasivo más patrimonio</li>
            <li>Los saldos de bancos coinciden con los estados de cuenta</li>
            <li>Las cuentas por cobrar están al día y se revisan las vencidas</li>
            <li>Las deudas coinciden con lo que reportan las entidades financieras</li>
            <li>El inventario se cuenta físicamente al menos una vez al año</li>
            <li>Las declaraciones de Hacienda y la CCSS coinciden con la contabilidad</li>
            <li>Los gastos personales del dueño están separados de los de la empresa</li>
          </ul>
          <h3>Señales de alerta</h3>
          <ul>
            <li>Las ventas crecen pero la caja disminuye.</li>
            <li>Los días de cobro aumentan mes a mes.</li>
            <li>Se usa la tarjeta de crédito o el sobregiro para pagar planilla o proveedores.</li>
            <li>El margen bruto baja sin una razón clara.</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section section-alt" id="modulo-indicadores">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow eyebrow-accent">Módulo 3</p>
          <h2 class="section-title">Sus indicadores.</h2>
          <p class="section-sub">Escriba las cifras de sus estados financieros (anuales) y vea sus indicadores principales. Los datos no se guardan ni se envían: solo se calculan en su navegador.</p>
        </div>
        <div class="tool">
          <form class="tool-form" id="form-indicadores" novalidate>
            <div class="field-row">
              <label>Ventas<input type="number" name="ventas" min="0" step="1000" value="120000000"></label>
              <label>Costo de ventas<input type="number" name="costo" min="0" step="1000" value="78000000"></label>
            </div>
            <div class="field-row">
              <label>Utilidad neta<input type="number" name="utilidad" step="1000" value="7200000"></label>
              <label>Inventarios<input type="number" name="inventarios" min="0" step="1000" value="15000000"></label>
            </div>
            <div class="field-row">
              <label>Cuentas por cobrar<input type="number" name="cxc" min="0" step="1000" value="18000000"></label>
              <label>Cuentas por pagar<input type="number" name="cxp" min="0" step="1000" value="9000000"></label>
            </div>
            <div class="field-row">
              <label>Activo circulante<input type="number" name="ac" min="0" step="1000" value="40000000"></label>
              <label>Pasivo circulante<input type="number" name="pc" min="0" step="1000" value="25000000"></label>
            </div>
            <div class="field-row">
              <label>Activo total<input type="number" name="at" min="0" step="1000" value="90000000"></label>
              <label>Pasivo total<input type="number" name="pt" min="0" step="1000" value="50000000"></label>
            </div>
          </form>
          <div class="tool-result">
            <div class="table-wrap">
              <table class="ind-table">
                <thead><tr><th>Indicador</th><th class="num">Resultado</th><th>Estado</th></tr></thead>
                <tbody>
{filas}
                </tbody>
              </table>
            </div>
            <p class="note">Referencias generales. Los rangos sanos cambian según la actividad: un comercio, un restaurante y una industria tienen ciclos muy distintos.</p>
          </div>
        </div>
        <div class="prose ind-help">
          <h3>Cómo leer cada indicador</h3>
          <ul>
{explicacion}
          </ul>
        </div>
      </div>
    </section>

    <section class="section" id="modulo-siguiente">
      <div class="container narrow center">
        <p class="eyebrow eyebrow-accent">Módulo 4</p>
        <h2 class="section-title">Próximos pasos.</h2>
        <p class="section-sub">Para preparar un acompañamiento a su medida le solicitaré la información financiera de su empresa. Cuando corresponda, le indicaré cómo compartirla de forma segura.</p>
        <div class="actions">
          <a href="https://wa.me/50670123241" class="btn" data-whatsapp-link data-mensaje="Hola Luis, ya creé mi cuenta de cliente y quisiera coordinar la revisión de la información financiera de mi pyme.">Coordinar mi revisión</a>
        </div>
      </div>
    </section>
    </div>'''
    page(
        "clientes/index.html", "Área de clientes",
        "Área privada para clientes: introducción al CFO externo y a la revisión de la información financiera de la pyme.",
        "cuenta", [("Inicio", "../index.html"), ("Área de clientes", None)],
        "Área de clientes", "Su espacio financiero.",
        "Introducción al CFO externo y a la revisión y control de la información financiera de su pyme.",
        body, scripts=AUTH_SCRIPTS + '\n  <script src="../js/indicadores.js"></script>', privada=True,
    )


TARIFAS = [
    # (servicio, detalle, horas mín, horas máx, rango sugerido, forma de cobro, mensual)
    ("Diagnóstico inicial", "Reunión de 30 minutos", 0.5, 0.5, "Gratis", "Atrae clientes; ya está en el sitio", False),
    ("Capacidad de crédito", "Persona física", 2, 3, "₡40 000 – ₡75 000", "Precio fijo", False),
    ("Consolidación de deudas", "Análisis y propuesta", 4, 6, "₡80 000 – ₡150 000", "Fijo; bono opcional si se logra el ahorro", False),
    ("Crédito hipotecario", "Acompañamiento completo", 6, 10, "₡150 000 – ₡300 000", "Fijo, o 50 % al inicio y 50 % al aprobarse", False),
    ("Financiamiento pyme", "Expediente, flujo y presentación al banco o al SBD", 10, 20, "₡300 000 – ₡700 000", "50 % adelantado; opcional 0,5–1 % del crédito aprobado, con tope", False),
    ("Condición PYME ante el MEIC", "Orden de CCSS, Hacienda e INS", 2, 4, "₡50 000 – ₡100 000", "Precio fijo; puerta de entrada al CFO externo", False),
    ("Plan de negocios", "Con la herramienta del área de clientes", 15, 25, "₡350 000 – ₡800 000", "Por etapas", False),
    ("CFO externo · Básico", "Revisión mensual de estados, puntaje de salud, 1 reunión", 4, 4, "₡120 000 – ₡150 000 / mes", "Mensualidad, mínimo 3 meses", True),
    ("CFO externo · Estándar", "Básico + flujo de caja, presupuesto, 2 reuniones", 8, 10, "₡250 000 – ₡350 000 / mes", "Mensualidad", True),
    ("CFO externo · Avanzado", "Estándar + relación con bancos, proyecciones, junta", 16, 20, "₡500 000 – ₡700 000 / mes", "Mensualidad", True),
]


def tarifas_seccion():
    def horas(a, b):
        f = lambda x: f"{x:g}".replace(".", ",")
        txt = f(a) if a == b else f"{f(a)}–{f(b)}"
        return txt
    filas = "\n".join(
        f'                  <tr data-hmin="{a}" data-hmax="{b}"{" data-mensual" if m else ""}{" data-gratis" if r == "Gratis" else ""}>'
        f'<td><strong>{s}</strong><br><span class="field-hint">{d}</span></td>'
        f'<td class="num">{horas(a, b)}</td><td class="num">{r}</td>'
        f'<td class="num" data-tarifa-precio>—</td><td>{c}</td></tr>'
        for s, d, a, b, r, c, m in TARIFAS
    )
    return f'''
    <section class="section section-alt" id="tarifas">
      <div class="container container-wide">
        <div class="section-head">
          <p class="eyebrow eyebrow-accent">Solo para usted</p>
          <h2 class="section-title">Guía de tarifas.</h2>
          <p class="section-sub">Cuánto cobrar por cada servicio, a partir de sus costos y de las referencias del mercado. Son rangos de referencia: valídelos con sus primeros clientes.</p>
        </div>

        <div class="tool">
          <form class="tool-form" id="form-tarifas" novalidate>
            <label>Ingreso que quiere ganar al mes (₡)
              <input type="number" name="meta" min="0" step="10000" value="1500000">
            </label>
            <label>Costos al mes (₡)
              <input type="number" name="costos" min="0" step="10000" value="500000">
              <span class="field-hint">CCSS como independiente, herramientas, publicidad, teléfono y transporte.</span>
            </label>
            <label>Horas cobrables al mes
              <input type="number" name="horas" min="1" max="300" step="1" value="90">
              <span class="field-hint">De unas 160 horas, solo una parte se puede cobrar; el resto es prospección, trámites y aprendizaje.</span>
            </label>
            <label>Su tarifa por hora (₡)
              <input type="number" name="tarifa" min="0" step="1000" value="25000">
              <span class="field-hint">Recomendado: entre ₡25 000 y ₡35 000 más IVA.</span>
            </label>
            <label class="check"><input type="checkbox" name="iva"> Mostrar precios con IVA (13 %)</label>
          </form>
          <div class="tool-result" aria-live="polite">
            <div class="result-main">
              <span>Tarifa mínima para no perder</span>
              <strong id="tar-equilibrio">—</strong>
            </div>
            <dl class="result-list">
              <div><dt>Debe facturar al mes (sin IVA)</dt><dd id="tar-facturar">—</dd></div>
              <div><dt>Su tarifa frente al mínimo</dt><dd id="tar-margen">—</dd></div>
              <div><dt>Clientes CFO Estándar para cubrir la meta</dt><dd id="tar-cfo">—</dd></div>
            </dl>
            <p class="tool-message" id="tar-mensaje"></p>
          </div>
        </div>

        <div class="table-wrap tarifas-wrap">
          <table class="ind-table tarifas-table">
            <thead><tr><th>Servicio</th><th class="num">Horas</th><th class="num">Rango sugerido (+ IVA)</th><th class="num" id="tar-col">Con su tarifa</th><th>Forma de cobro</th></tr></thead>
            <tbody id="tarifas-filas">
{filas}
            </tbody>
          </table>
        </div>
        <p class="note">«Con su tarifa» multiplica las horas por su tarifa y redondea a ₡5 000. En los planes de CFO externo es el precio por mes.</p>

        <div class="cards cards-3 tarifas-notas">
          <div class="card">
            <span class="card-tag">Referencias del mercado</span>
            <ul>
              <li>Colegio de Contadores Privados: mínimo <strong>₡28 681 + IVA</strong> por hora profesional.</li>
              <li>Contador externo para una pyme: <strong>₡80 000 a ₡400 000 o más</strong> al mes.</li>
              <li>CFO de planta: <strong>$4 000 a $14 000</strong> al mes con cargas sociales. Es lo que usted reemplaza.</li>
              <li>Salario mínimo de un licenciado en 2026: <strong>₡796 921</strong>.</li>
              <li>Colegio de Ciencias Económicas: tarifas recomendadas desde 2021 (La Gaceta 108). Confirme el monto con el Colegio.</li>
            </ul>
          </div>
          <div class="card">
            <span class="card-tag">Por qué estos rangos</span>
            <ul>
              <li><strong>CFO externo:</strong> ingreso recurrente. Con 7 a 9 clientes en el plan Estándar cubre la meta, según su tarifa.</li>
              <li><strong>Condición PYME:</strong> el trámite ante el MEIC es gratuito; cobre poco y úselo para llegar al CFO externo.</li>
              <li><strong>Financiamiento y crédito hipotecario:</strong> su experiencia de crédito permite cobrar por valor, no solo por horas.</li>
              <li>Empiece cerca de ₡25 000 por hora y suba hacia ₡35 000 cuando tenga demanda constante.</li>
            </ul>
          </div>
          <div class="card">
            <span class="card-tag">Precauciones</span>
            <ul>
              <li><strong>IVA del 13 %:</strong> inscríbase en Hacienda como independiente y emita factura electrónica.</li>
              <li><strong>Conflicto de interés:</strong> si recibe comisiones de entidades, dígalo por escrito. Si trabaja en un banco, revise su contrato y el código de ética.</li>
              <li><strong>Contrato y adelanto</strong> en los servicios por proyecto.</li>
              <li>Publique precios «desde» y dé el precio final después del diagnóstico.</li>
              <li>Cada 6 meses, o al llegar a 10 clientes, compare las horas reales y ajuste.</li>
            </ul>
          </div>
        </div>

        <p class="note">Fuentes:
          <a href="https://consultoresjimenez.com/cuanto-cobra-un-contador-en-costa-rica/" target="_blank" rel="noopener">Consultores Jiménez</a>,
          <a href="https://facturasimple.com/cr/blog/cr-contador-cpa-costa-rica-cuanto-cuesta-cuando-necesitar-rol-empresa" target="_blank" rel="noopener">FacturaSimple</a>,
          <a href="https://clarivo.co/es/blog/cuanto-cuesta-un-cfo-opciones-pymes" target="_blank" rel="noopener">Clarivo</a>,
          <a href="https://ccpa.or.cr/tarifas-por-servicios-profesionales/" target="_blank" rel="noopener">Colegio de Contadores Públicos</a>,
          <a href="https://aglegal.com/es/salario-minimo-costa-rica/" target="_blank" rel="noopener">AG Legal (salarios mínimos 2026)</a>.
          Revisado en octubre de 2026.</p>
      </div>
    </section>'''


def panel_page():
    opciones = "".join(f'<option>{e}</option>' for e in ["Nuevo", "Contactado", "En diagnóstico", "Cliente activo", "No interesado"])
    body = f'''
    <section class="section" id="panel-espera">
      <div class="container narrow center">
{AVISO_CONFIG}
        <p class="section-sub" id="panel-estado">Verificando su sesión…</p>
        <div class="actions" id="panel-verificar" hidden>
          <button type="button" class="btn" id="btn-reenviar">Reenviar correo de verificación</button>
          <button type="button" class="btn btn-outline" id="btn-ya-verifique">Ya verifiqué mi correo</button>
        </div>
        <p id="auth-mensaje" class="tool-message" role="status"></p>
      </div>
    </section>

    <div id="panel-contenido" hidden>
    <section class="section">
      <div class="container container-wide">
        <div class="member-bar">
          <div>
            <p class="eyebrow eyebrow-accent">Panel del asesor</p>
            <h2 class="section-title member-hello">Clientes registrados.</h2>
          </div>
          <div class="member-actions">
            <a class="btn btn-outline btn-small" href="#tarifas">Guía de tarifas</a>
            <button type="button" class="btn btn-outline btn-small" id="btn-actualizar">Actualizar</button>
            <button type="button" class="btn btn-small" id="btn-exportar">Exportar a Excel</button>
            <button type="button" class="btn btn-outline btn-small" id="btn-salir">Cerrar sesión</button>
          </div>
        </div>

        <div class="panel-stats">
          <div class="panel-stat"><strong id="stat-total">0</strong><span>Registrados</span></div>
          <div class="panel-stat"><strong id="stat-30">0</strong><span>Últimos 30 días</span></div>
          <div class="panel-stat"><strong id="stat-nuevos">0</strong><span>Sin contactar</span></div>
          <div class="panel-stat"><strong id="stat-activos">0</strong><span>Clientes activos</span></div>
          <div class="panel-stat"><strong id="stat-riesgo">0</strong><span>Salud financiera en riesgo</span></div>
        </div>

        <div class="panel-toolbar">
          <label class="panel-search">Buscar
            <input type="search" id="panel-buscar" placeholder="Nombre, empresa, correo, sector o teléfono">
          </label>
          <label>Estado
            <select id="panel-filtro"><option value="">Todos</option>{opciones}</select>
          </label>
          <label>Ordenar por
            <select id="panel-orden">
              <option value="registro">Registro más reciente</option>
              <option value="puntaje">Menor salud primero</option>
              <option value="actualizado">Plan más reciente</option>
            </select>
          </label>
        </div>

        <div class="table-wrap panel-table-wrap">
          <table class="panel-table">
            <thead>
              <tr><th>Registro</th><th>Cliente</th><th>Sector</th><th>Salud financiera</th><th>Plan actualizado</th><th>Contacto</th><th>Estado</th><th>Notas</th></tr>
            </thead>
            <tbody id="panel-filas"></tbody>
          </table>
        </div>
        <p class="note center" id="panel-vacio" hidden></p>
        <p class="note">La salud financiera se calcula con el plan de negocios de cada cliente (puntaje de 0 a 100); abra «Ver plan de negocios» para el análisis completo. El estado y las notas se guardan automáticamente al cambiarlos, y solo usted puede verlos. El teléfono abre WhatsApp y el correo abre su programa de correo.</p>
      </div>
    </section>{tarifas_seccion()}
    </div>
    <div id="panel-guardado" class="panel-toast" role="status"></div>'''
    page(
        "panel/index.html", "Panel del asesor",
        "Panel privado del asesor para revisar y dar seguimiento a los clientes registrados.",
        "cuenta", [("Inicio", "../index.html"), ("Panel del asesor", None)],
        "Panel del asesor", "Sus clientes, en un solo lugar.",
        "Revise quién se registró, contáctelo y lleve el seguimiento de cada cliente.",
        body, scripts=AUTH_SCRIPTS + '\n  <script src="../js/tarifas.js"></script>', privada=True,
    )


def plan_page():
    body = f'''
    <section class="section" id="plan-espera">
      <div class="container narrow center">
{AVISO_CONFIG}
        <p class="section-sub" id="plan-estado">Cargando su plan de negocios…</p>
      </div>
    </section>

    <section class="section plan-section" id="plan-app" hidden>
      <div class="container container-wide">
        <div class="member-bar plan-top">
          <p class="callout plan-lectura" id="plan-lectura" hidden></p>
          <div class="member-actions">
            <span class="plan-save" id="plan-guardado" role="status"></span>
            <button type="button" class="btn btn-outline btn-small" id="btn-imprimir">Imprimir o guardar en PDF</button>
            <a href="index.html" class="btn btn-outline btn-small">Volver al Área de clientes</a>
          </div>
        </div>
        <div class="plan-layout">
          <nav class="plan-nav" id="plan-nav" aria-label="Secciones del plan"></nav>
          <div class="plan-contenido" id="plan-secciones"></div>
        </div>
      </div>
    </section>'''
    page(
        "clientes/plan.html", "Plan de negocios",
        "Plan de negocios de la pyme: previsión de ventas, estados financieros, FODA, mercado y calendario.",
        "cuenta", [("Inicio", "../index.html"), ("Área de clientes", "index.html"), ("Plan de negocios", None)],
        "Herramienta para su empresa", "Su plan de negocios.",
        "Complete cada sección a su ritmo. Los cálculos y gráficos se hacen solos, y todo se guarda en su cuenta.",
        body, scripts=AUTH_SCRIPTS, privada=True,
    )


for s in SERVICIOS:
    servicio_page(s)
servicios_index()
for a in ARTICULOS:
    articulo_page(a)
blog_index()
cuenta_page()
clientes_page()
panel_page()
plan_page()
urls = [""] + [f"servicios/{x['slug']}.html" for x in SERVICIOS] + ["servicios/"] + [f"blog/{x['slug']}.html" for x in ARTICULOS] + ["blog/", "cuenta/"]
with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    f.writelines(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls)
    f.write("</urlset>\n")
print("ok")
