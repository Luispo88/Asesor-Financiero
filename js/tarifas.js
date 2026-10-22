// Guía de tarifas del Panel del asesor. Todo se calcula en el navegador; nada se guarda.
(function () {
  const form = document.getElementById("form-tarifas");
  if (!form) return;

  const IVA = 0.13;
  const num = (name) => {
    const v = parseFloat(form.elements[name].value);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const colones = (v) => `₡${Math.round(v).toLocaleString("es-CR")}`;
  const redondear = (v) => Math.round(v / 5000) * 5000;
  const poner = (id, texto) => (document.getElementById(id).textContent = texto);

  function calcular() {
    const meta = num("meta"), costos = num("costos"), horas = num("horas"), tarifa = num("tarifa");
    const conIva = form.elements.iva.checked;
    const facturar = meta + costos;
    const equilibrio = horas > 0 ? facturar / horas : 0;
    const factor = conIva ? 1 + IVA : 1;

    poner("tar-equilibrio", horas > 0 ? `${colones(equilibrio)} / hora` : "—");
    poner("tar-facturar", colones(facturar));
    poner("tar-margen", equilibrio > 0 && tarifa > 0 ? `${tarifa >= equilibrio ? "+" : ""}${Math.round((tarifa / equilibrio - 1) * 100)} %` : "—");

    // Plan Estándar: 9 horas promedio al mes.
    const estandar = redondear(tarifa * 9);
    poner("tar-cfo", estandar > 0 ? `${Math.ceil(facturar / estandar)} (a ${colones(estandar)} c/u)` : "—");

    const mensaje = document.getElementById("tar-mensaje");
    if (tarifa > 0 && tarifa < equilibrio) {
      mensaje.className = "tool-message warn";
      mensaje.textContent = "Su tarifa está por debajo del mínimo: con estas horas no cubre la meta y los costos.";
    } else if (tarifa > 0 && tarifa < 28681) {
      mensaje.className = "tool-message warn";
      mensaje.textContent = "Cubre sus costos, pero está por debajo de la hora mínima de los contadores privados (₡28 681).";
    } else {
      mensaje.className = "tool-message ok";
      mensaje.textContent = tarifa > 0 ? "Su tarifa cubre la meta y los costos." : "";
    }

    poner("tar-col", conIva ? "Con su tarifa (IVA incluido)" : "Con su tarifa (+ IVA)");
    document.querySelectorAll("#tarifas-filas tr").forEach((tr) => {
      const celda = tr.querySelector("[data-tarifa-precio]");
      const min = parseFloat(tr.dataset.hmin), max = parseFloat(tr.dataset.hmax);
      if (tr.hasAttribute("data-gratis") || tarifa <= 0) {
        celda.textContent = tr.hasAttribute("data-gratis") ? "Gratis" : "—";
        return;
      }
      const a = redondear(min * tarifa * factor), b = redondear(max * tarifa * factor);
      const sufijo = tr.hasAttribute("data-mensual") ? " / mes" : "";
      celda.textContent = (a === b ? colones(a) : `${colones(a)} – ${colones(b)}`) + sufijo;
    });
  }

  form.addEventListener("input", calcular);
  calcular();
})();
