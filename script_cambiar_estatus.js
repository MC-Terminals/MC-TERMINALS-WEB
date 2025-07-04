



const tabla = document.getElementById("cuerpoTabla");
const filtroEstatus = document.getElementById("filtroEstatus");
const filtroInicio = document.getElementById("filtroFechaInicio");
const filtroFin = document.getElementById("filtroFechaFin");
const filtroBodega = document.getElementById("filtroBodega");
const filtroProducto = document.getElementById("filtroProducto");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroPiloto = document.getElementById("filtroPiloto");

let ordenes = [];
let empresasPorNit = {};
let buquesPorId = {};

async function cargarOrdenes() {
  // Obtener órdenes
 const { data: ordenesData, error: ordenesError } = await supabase
  .from("ordenes")
  .select("*")
  .in("estatus", ["generada", "registrada", "salio_predio", "peso_inicial"]);

  if (ordenesError) {
    console.error("Error al cargar las órdenes:", ordenesError);
    return;
  }
// Cargar todos los buques
const { data: buquesData, error: buquesError } = await supabase.from("buques").select("id, nombre");
if (buquesError) {
  console.error("Error al cargar buques:", buquesError);
  return;
}
buquesPorId = {};
buquesData.forEach(b => {
  buquesPorId[b.id] = b.nombre;
});


  // Obtener empresas por NIT
  const { data: usuariosData, error: usuariosError } = await supabase
    .from("usuarios")
    .select("nit, empresa");

  if (usuariosError) {
    console.error("Error al obtener empresas:", usuariosError);
    return;
  }

  empresasPorNit = {};
  usuariosData.forEach(u => {
    empresasPorNit[u.nit] = u.empresa;
  });

  ordenes = ordenesData;
  mostrarOrdenes();
}


function mostrarOrdenes() {
  const estatus = filtroEstatus.value;
  const inicio = filtroInicio.value;
  const fin = filtroFin.value;
  const bodega = filtroBodega.value.toLowerCase();
  const producto = filtroProducto.value.toLowerCase();
  const placa = filtroPlaca.value.toLowerCase();
  const piloto = filtroPiloto.value.toLowerCase();
  const rol = localStorage.getItem("rol");

  const tbody = document.getElementById("cuerpoTabla");
  tbody.innerHTML = "";

  // 1. Filtrar por estatus general y rol
  let ordenesFiltradas = ordenes.filter((o) => {
    if (o.estatus === "finalizada") return false;

    if (rol === "operador_externo") {
      return o.bodega_externa === true;
    }

    if (rol === "bascula" && o.bodega_externa === true) return false;

    return true;
  });

  // 2. Aplicar los filtros de búsqueda
  ordenesFiltradas = ordenesFiltradas.filter((o) => {
const fecha = new Date(o.fecha_generada).toLocaleDateString('fr-CA');
    return (
      (!estatus || o.estatus === estatus) &&
      (!inicio || fecha >= inicio) &&
      (!fin || fecha <= fin) &&
      o.bodega.toLowerCase().includes(bodega) &&
      o.producto.toLowerCase().includes(producto) &&
      o.placa.toLowerCase().includes(placa) &&
      o.piloto.toLowerCase().includes(piloto)
    );
  });

  // 3. Mostrar las órdenes filtradas
  ordenesFiltradas.forEach((o) => {
   const tr = document.createElement("tr");

// Aplicar clase especial si es bodega externa
if (o.bodega_externa === true) {
  tr.classList.add("bodega-externa");
}

tr.innerHTML = `
  <td>${o.no_orden}</td>
  <td>${new Date(o.fecha_generada).toLocaleString()}</td>
  <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
  <td>${buquesPorId[o.buque] || o.buque}</td>
  <td>${o.bl}</td>
  <td>${o.piloto}</td>
  <td>${o.placa}</td>
  <td>${o.producto}</td>
  <td>${o.bodega}</td>
  <td>${o.cantidad_qq}</td>
  <td>${o.cantidad_ton.toFixed(2)}</td>
  <td>${o.observacion || "-"}</td>
  <td>${o.estatus}</td>
  <td>${o.turno ?? "-"}</td>
  <td>
    <select class="form-select form-select-sm mb-1" onchange="cambiarEstatus(${o.no_orden}, this.value)">
      <option value="">Seleccionar</option>
      ${generarOpcionesEstatus(o.estatus)}
    </select>
    ${mostrarBotonBodegaExterna(o)}
  </td>
  <td>${o.bodega_externa ? "Sí" : "No"}</td> <!-- NUEVA CELDA -->
`;
tbody.appendChild(tr);

  });

  // 4. Mostrar total (opcional)
  console.log(`Total órdenes mostradas: ${ordenesFiltradas.length}`);
}


function mostrarBotonBodegaExterna(orden) {
  const rol = localStorage.getItem("rol");
  if (
    !["admin", "ube_admin", "bascula"].includes(rol) ||
    orden.bodega_externa === true ||
    orden.estatus !== "salio_predio"
  ) {
    return "";
  }

  return `
    <button class="btn btn-sm btn-warning mt-1" onclick="asignarBodegaExterna(${orden.no_orden})">
      Bodega Externa
    </button>
  `;
}

async function asignarBodegaExterna(no_orden) {
  const confirmar = confirm("¿Deseas asignar esta orden a bodega externa?");
  if (!confirmar) return;

  const ahora = new Date().toISOString();

  const { error } = await supabase
    .from("ordenes")
    .update({
      bodega_externa: true,
      fecha_bodega_externa: ahora
    })
    .eq("no_orden", no_orden);

  if (error) {
    console.error("Error al asignar bodega externa:", error);
    alert("No se pudo asignar la bodega externa.");
  } else {
    alert("Bodega externa asignada correctamente.");
    cargarOrdenes();
  }
}



function generarOpcionesEstatus(actual) {
  const rol = localStorage.getItem("rol");
  const opciones = [];

  if (rol === "cheque") {
    if (actual === "generada") opciones.push("registrada");
    if (actual === "registrada") opciones.push("salio_predio");
  } else if (["bascula", "admin", "ube_admin"].includes(rol)) {
    if (actual === "generada") opciones.push("registrada");
    if (actual === "registrada") opciones.push("salio_predio");
    if (actual === "salio_predio") opciones.push("peso_inicial");
    if (actual === "peso_inicial") opciones.push("finalizada");
  } else if (rol === "operador_externo") {
    if (actual === "salio_predio") opciones.push("peso_inicial");
    if (actual === "peso_inicial") opciones.push("finalizada");
  }

  return opciones
    .map((op) => `<option value="${op}">${op.replace("_", " ")}</option>`)
    .join("");
}



async function cambiarEstatus(no_orden, nuevoEstatus) {
  if (!nuevoEstatus) return;

  const rol = localStorage.getItem("rol");
  const orden = ordenes.find((o) => o.no_orden === no_orden);
  if (!orden) return alert("Orden no encontrada.");

  const actual = orden.estatus;
 const permitido = {
  cheque: { generada: ["registrada"], registrada: ["salio_predio"] },
  bascula: {
    generada: ["registrada"],
    registrada: ["salio_predio"],
    salio_predio: ["peso_inicial"],
    peso_inicial: ["finalizada"],
  },
  admin: {
    generada: ["registrada"],
    registrada: ["salio_predio"],
    salio_predio: ["peso_inicial"],
    peso_inicial: ["finalizada"],
  },
  ube_admin: {
    generada: ["registrada"],
    registrada: ["salio_predio"],
    salio_predio: ["peso_inicial"],
    peso_inicial: ["finalizada"],
  },
  operador_externo: {
    salio_predio: ["peso_inicial"],
    peso_inicial: ["finalizada"]
  }
};

if (rol === "operador_externo" && !orden.bodega_externa) {
  return alert("Solo puedes modificar órdenes asignadas a bodega externa.");
}

  if (!permitido[rol] || !permitido[rol][actual] || !permitido[rol][actual].includes(nuevoEstatus)) {
    return alert("Cambio de estatus no permitido según el rol o flujo de estados.");
  }

  const campos = {};
  const ahora = new Date().toLocaleString('sv-SE');

  if (nuevoEstatus === "registrada") {
    const maxTurno = Math.max(0, ...ordenes.map(o => o.turno || 0));
    campos.turno = maxTurno + 1;
    campos.fecha_registrada = ahora;
  }

  if (nuevoEstatus === "salio_predio") {
  campos.fecha_salio_predio = ahora;
}


  if (nuevoEstatus === "peso_inicial") {
    campos.fecha_peso_inicial = ahora;
  }

  if (nuevoEstatus === "finalizada") {
    const boleta = prompt("Ingrese número de boleta para finalizar:");
    if (!boleta) return alert("Debe ingresar un número de boleta.");
    campos.boleta_final = boleta;
    campos.fecha_finalizada = ahora;
    campos.turno = null;
  }

  campos.estatus = nuevoEstatus;

  const { error } = await supabase
    .from("ordenes")
    .update(campos)
    .eq("no_orden", no_orden);

  if (error) {
    console.error("Error al actualizar estatus:", error);
    alert("No se pudo actualizar el estatus.");
  } else {
    alert("Estatus actualizado correctamente.");
    cargarOrdenes();
  }
}


[filtroEstatus, filtroInicio, filtroFin, filtroBodega, filtroProducto, filtroPlaca, filtroPiloto]
  .forEach(f => f.addEventListener("input", mostrarOrdenes));

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toLocaleDateString('fr-CA');  // yyyy-mm-dd en hora local
const inicioMes = new Date();
inicioMes.setDate(1);
const inicioMesStr = inicioMes.toLocaleDateString('fr-CA');
setInterval(() => {
  const hoyActualizado = new Date().toLocaleDateString('fr-CA');
  filtroFin.value = hoyActualizado;
}, 60 * 1000); // actualiza cada 60 segundos


  filtroInicio.value = inicioMesStr;
  filtroFin.value = hoy;

  cargarOrdenes();
});
