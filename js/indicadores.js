// Indicadores financieros del Área de clientes. Todo se calcula en el navegador; nada se guarda.
(function () {
  const form = document.getElementById("form-indicadores");
  if (!form) return;

  const num = (name) => {
    const v = parseFloat(form.elements[name].value);
    return Number.isFinite(v) ? v : NaN;
  };
  const razon = (v) => v.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v) => `${(v * 100).toLocaleString("es-CR", { maximumFractionDigits: 1 })} %`;
  const dias = (v) => `${Math.round(v).toLocaleString("es-CR")} días`;
  const div = (a, b) => (b > 0 && Number.isFinite(a) ? a / b : NaN);

  // Semáforo: "sano" (verde), "atencion" (amarillo) o "alerta" (rojo).
  const mayorEs = (v, verde, amarillo) => (v >= verde ? "sano" : v >= amarillo ? "atencion" : "alerta");
  const menorEs = (v, verde, amarillo) => (v <= verde ? "sano" : v <= amarillo ? "atencion" : "alerta");
  const ETIQUETAS = { sano: "Sano", atencion: "Atención", alerta: "Alerta" };

  function calcular() {
    const ventas = num("ventas"), costo = num("costo"), utilidad = num("utilidad");
    const inv = num("inventarios"), cxc = num("cxc"), cxp = num("cxp");
    const ac = num("ac"), pc = num("pc"), at = num("at"), pt = num("pt");

    const diasCobro = div(cxc, ventas) * 365;
    const diasPago = div(cxp, costo) * 365;
    const resultados = {
      "razon-corriente": [div(ac, pc), razon, (v) => mayorEs(v, 1.5, 1)],
      "prueba-acida": [div(ac - inv, pc), razon, (v) => mayorEs(v, 1, 0.7)],
      "endeudamiento": [div(pt, at), pct, (v) => menorEs(v, 0.5, 0.7)],
      "margen-bruto": [div(ventas - costo, ventas), pct, (v) => mayorEs(v, 0.3, 0.15)],
      "margen-neto": [div(utilidad, ventas), pct, (v) => mayorEs(v, 0.1, 0.03)],
      "dias-cobro": [diasCobro, dias, (v) => menorEs(v, 45, 90)],
      "dias-inventario": [div(inv, costo) * 365, dias, (v) => menorEs(v, 60, 120)],
      // Pagar a proveedores después de cobrar a clientes favorece la liquidez.
      "dias-pago": [diasPago, dias, (v) => (v >= diasCobro ? "sano" : "atencion")],
    };

    for (const [id, [valor, formato, estado]] of Object.entries(resultados)) {
      const celda = document.getElementById(`ind-${id}`);
      const est = document.getElementById(`est-${id}`);
      if (!Number.isFinite(valor)) {
        celda.textContent = "—";
        est.innerHTML = "";
        continue;
      }
      const clave = estado(valor);
      celda.textContent = formato(valor);
      est.innerHTML = `<span class="semaforo ${clave}">${ETIQUETAS[clave]}</span>`;
    }
  }

  form.addEventListener("input", calcular);
  calcular();
})();
