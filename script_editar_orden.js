const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const params = new URLSearchParams(window.location.search);
const ordenId = params.get("orden");

const form = document.getElementById("formEditarOrden");
const mensaje = document.getElementById("mensaje");
const fechaInput = document.getElementById("fecha_programada");

const placaInput = document.getElementById("placa");
const pilotoInput = document.getElementById("piloto");
const productoSelect = document.getElementById("producto");
const bodegaSelect = document.getElementById("bodega");
const tipoUnidadSelect = document.getElementById("tipo_unidad");
const cantidadInput = document.getElementById("cantidad_qq");
const buqueSelect = document.getElementById("buque");
const blSelect = document.getElementById("bl");
const observacionInput = document.getElementById("observacion");
const nombreTransporteInput = document.getElementById("nombre_transporte");
const noOrdenInternaInput = document.getElementById("no_orden_interna");

let todosLosBuques = [];
let buqueBLProducto = {}; // buque → bl → producto

// 🔧 NUEVO: helper para “ahora” en Guatemala con TZ explícita
function isoAhoraGuatemala() {
  const tz = "America/Guatemala";
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).format(new Date()); // "YYYY-MM-DD HH:mm:ss" en GT
  return s.replace(" ", "T") + "-06:00"; // "YYYY-MM-DDTHH:mm:ss-06:00"
}

async function cargarBuques() {
  const { data, error } = await supabase
    .from("buques")
    .select("id, nombre, productos_buque (producto, bls_producto (bl))");

  if (error) {
    console.error("Error al cargar buques:", error);
    return;
  }

  todosLosBuques = data;
  buqueSelect.innerHTML = '<option value="">Seleccione un buque</option>';

  data.forEach(buque => {
    const option = document.createElement("option");
    option.value = buque.id;
    option.textContent = buque.nombre;
    buqueSelect.appendChild(option);

    const blProducto = {};
    buque.productos_buque.forEach(p => {
      p.bls_producto.forEach(bl => {
        blProducto[bl.bl] = p.producto;
      });
    });

    buqueBLProducto[buque.id] = blProducto;
  });
}

buqueSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  productoSelect.innerHTML = '<option value="">Seleccione producto</option>';
  blSelect.innerHTML = '<option value="">Seleccione una Poliza</option>';

  if (buqueBLProducto[buqueId]) {
    const bls = Object.keys(buqueBLProducto[buqueId]);
    const productosUnicos = [...new Set(Object.values(buqueBLProducto[buqueId]))];

    productosUnicos.forEach(prod => {
      const opt = document.createElement("option");
      opt.value = prod;
      opt.textContent = prod;
      productoSelect.appendChild(opt);
    });

    bls.forEach(bl => {
      const opt = document.createElement("option");
      opt.value = bl;
      opt.textContent = bl;
      blSelect.appendChild(opt);
    });
  }
  productoSelect.value = '';
  blSelect.value = '';
});

blSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  const blValue = blSelect.value;

  if (buqueBLProducto[buqueId] && buqueBLProducto[buqueId][blValue]) {
    const productoRelacionado = buqueBLProducto[buqueId][blValue];
    const productosUnicos = [...new Set(Object.values(buqueBLProducto[buqueId]))];

    productoSelect.innerHTML = '<option value="">Seleccione producto</option>';
    productosUnicos.forEach(prod => {
      const opt = document.createElement("option");
      opt.value = prod;
      opt.textContent = prod;
      productoSelect.appendChild(opt);
    });

    productoSelect.value = productoRelacionado;
  }
});

productoSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  const productoSeleccionado = productoSelect.value;

  if (buqueBLProducto[buqueId]) {
    const blsRelacionados = Object.entries(buqueBLProducto[buqueId])
      .filter(([bl, prod]) => prod === productoSeleccionado)
      .map(([bl]) => bl);

    blSelect.innerHTML = '<option value="">Seleccione una Poliza</option>';
    blsRelacionados.forEach(bl => {
      const opt = document.createElement("option");
      opt.value = bl;
      opt.textContent = bl;
      blSelect.appendChild(opt);
    });

    if (!blsRelacionados.includes(blSelect.value)) {
      blSelect.value = '';
    }
  }
});

// === Validación de placa (editar) ===
placaInput.addEventListener("input", (e) => {
  let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const numeros = v.slice(0, 3).replace(/\D/g, "");
  const letras  = v.slice(3, 6).replace(/[^A-Z]/g, "");
  e.target.value = (numeros + letras).slice(0, 6);
});

placaInput.addEventListener("blur", () => {
  const ok = /^\d{3}[A-Z]{3}$/.test(placaInput.value);
  if (placaInput.value && !ok) {
    mensaje.innerText = "Placa inválida. Formato requerido: C-123ABC (usted solo escribe 123ABC).";
    mensaje.style.color = "orange";
    placaInput.focus();
  } else if (ok) {
    mensaje.innerText = "";
  }
});

async function cargarDatosOrden() {
  if (!ordenId) {
    mensaje.innerText = "Orden no especificada.";
    return;
  }

  const { data, error } = await supabase
    .from("ordenes")
    .select("*")
    .eq("no_orden", ordenId)
    .single();

  if (error || !data) {
    mensaje.innerText = "Error al cargar los datos de la orden.";
    console.error(error);
    return;
  }

  placaInput.value = (data.placa || "").toUpperCase().replace(/^C-/, "");
  pilotoInput.value = data.piloto;
  bodegaSelect.value = data.bodega;
  tipoUnidadSelect.value = data.tipo_unidad;
  cantidadInput.value = data.cantidad_qq;
  // dejamos esta línea como la tienes para no romper nada más
  fechaInput.value = data.fecha_generada ? data.fecha_generada.split("T")[0] : "";
  observacionInput.value = data.observacion || "";
  nombreTransporteInput.value = data.nombre_transporte || "";
  noOrdenInternaInput.value = data.no_orden_interna || "";

  await cargarBuques();

  buqueSelect.value = data.buque;
  buqueSelect.dispatchEvent(new Event("change"));

  productoSelect.value = data.producto;
  productoSelect.dispatchEvent(new Event("change"));

  blSelect.value = data.bl;
}

function obtenerFechaHoraGuatemala() {
  const ahora = new Date();
  const opciones = {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const fechaHora = new Intl.DateTimeFormat("en-CA", opciones).formatToParts(ahora);
  const partes = Object.fromEntries(fechaHora.map(({ type, value }) => [type, value]));

  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}

function parseCantidadQQ(v) {
  if (v == null || v === "") return { ok: false, error: "Cantidad vacía" };
  if (typeof v === "number") {
    if (v < 1) return { ok: false, error: "debe ser ≥ 1" };
    return { ok: true, valor: Number(v.toFixed(4)) };
  }
  let s = String(v).trim().replace(/\s/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return { ok: false, error: "Cantidad inválida" };
  if (n < 1) return { ok: false, error: "debe ser ≥ 1" };
  return { ok: true, valor: Number(n.toFixed(4)) };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fechaSeleccionada = fechaInput.value;
  const fechaSeleccionadaDate = new Date(fechaSeleccionada + "T00:00:00");
  const hoyDate = new Date();
  hoyDate.setHours(0, 0, 0, 0);

  if (fechaSeleccionadaDate < hoyDate) {
    alert("No se permiten fechas pasadas.");
    return;
  }

  const placaRaw = placaInput.value.trim().toUpperCase();
  if (!/^\d{3}[A-Z]{3}$/.test(placaRaw)) {
    alert("Placa inválida. Debe escribir 3 números seguidos de 3 letras, por ejemplo: 123ABC. El sistema agregará C- automáticamente.");
    return;
  }

  const cantRes = parseCantidadQQ(cantidadInput.value);
  if (!cantRes.ok) {
    alert(`Cantidad (qq) ${cantRes.error}.`);
    return;
  }

  // 🔧 CAMBIO CLAVE: fecha_generada = AHORA en Guatemala (reinicia 24h)
  const nuevosDatos = {
    placa: `C-${placaRaw}`,
    piloto: pilotoInput.value.trim(),
    producto: productoSelect.value,
    bodega: bodegaSelect.value,
    tipo_unidad: tipoUnidadSelect.value,
    cantidad_qq: cantRes.valor,
    buque: buqueSelect.value,
    bl: blSelect.value,
    observacion: observacionInput.value.trim(),
    fecha_generada: isoAhoraGuatemala(),   // ⬅️ antes: fechaSeleccionada + " 00:00:00"
    nombre_transporte: nombreTransporteInput.value.trim(),
    no_orden_interna: noOrdenInternaInput.value.trim(),
  };

  const { data: datosPrevios, error: errorPrevios } = await supabase
    .from("ordenes")
    .select("*")
    .eq("no_orden", ordenId)
    .single();

  if (errorPrevios) {
    console.error("Error al obtener datos anteriores:", errorPrevios);
    mensaje.innerText = "Error al verificar cambios.";
    return;
  }

  let huboCambios = false;
  const cambios = [];

  for (const campo in nuevosDatos) {
    if (campo !== "fecha_generada" && nuevosDatos[campo] != datosPrevios[campo]) {
      huboCambios = true;
      cambios.push({
        no_orden: datosPrevios.no_orden,
        nit_usuario: localStorage.getItem("nit"),
        campo: campo,
        valor_anterior: datosPrevios[campo],
        valor_nuevo: nuevosDatos[campo],
        fecha_modificacion: obtenerFechaHoraGuatemala()
      });
    }
  }

  if (!huboCambios && nuevosDatos.fecha_generada === datosPrevios.fecha_generada) {
    mensaje.style.color = "orange";
    mensaje.innerText = "No se realizaron cambios en la orden.";
    return;
  }

  if (cambios.length > 0) {
    const { error: errorHistorial } = await supabase
      .from("historial_ordenes")
      .insert(cambios);
    if (errorHistorial) {
      console.error("Error al guardar historial de modificaciones:", errorHistorial);
    }
  }

  const { error: errorActualizacion } = await supabase
    .from("ordenes")
    .update(nuevosDatos)
    .eq("no_orden", ordenId);

  if (errorActualizacion) {
    mensaje.innerText = "Error al actualizar la orden.";
    console.error(errorActualizacion);
  } else {
    mensaje.style.color = "lightgreen";
    mensaje.innerText = "Orden actualizada correctamente.";
    setTimeout(() => {
      window.location.href = "ver_estatus.html";
    }, 2000);
  }
});

document.addEventListener("DOMContentLoaded", cargarDatosOrden);
document.addEventListener("DOMContentLoaded", cargarDatosOrden);
