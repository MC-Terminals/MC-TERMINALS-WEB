

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

async function cargarOrdenes() {
  // Obtener órdenes
  const { data: ordenesData, error: ordenesError } = await supabase
    .from("ordenes")
    .select("*")
    .in("estatus", ["generada", "registrada", "peso_inicial"]);

  if (ordenesError) {
    console.error("Error al cargar las órdenes:", ordenesError);
    return;
  }

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

  const tbody = document.getElementById("cuerpoTabla");
  tbody.innerHTML = "";

  ordenes
    .filter((o) => {
      const fecha = new Date(o.fecha_generada).toISOString().slice(0, 10);
      return (
        (!estatus || o.estatus === estatus) &&
        (!inicio || fecha >= inicio) &&
        (!fin || fecha <= fin) &&
        o.bodega.toLowerCase().includes(bodega) &&
        o.producto.toLowerCase().includes(producto) &&
        o.placa.toLowerCase().includes(placa) &&
        o.piloto.toLowerCase().includes(piloto)
      );
    })
    .forEach((o) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${o.no_orden}</td>
        <td>${new Date(o.fecha_generada).toLocaleString()}</td>
        <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
        <td>${o.buque}</td>
        <td>${o.bl}</td>
        <td>${o.piloto}</td>
        <td>${o.placa}</td>
        <td>${o.producto}</td>
<td>${o.bodega}</td>
<td>${o.estatus}</td>
<td>${o.turno ?? "-"}</td>
<td>
  <select class="form-select form-select-sm" onchange="cambiarEstatus(${o.no_orden}, this.value)">
    <option value="">Seleccionar</option>
    ${generarOpcionesEstatus(o.estatus)}
  </select>
</td>
      `;
      tbody.appendChild(tr);
    });
}



function generarOpcionesEstatus(actual) {
  const rol = localStorage.getItem("rol");
  const opciones = [];

  if (rol === "cheque") {
    if (actual === "generada") opciones.push("registrada"); // solo puede pasar de generada a registrada
  } else if (["bascula", "admin", "ube_admin"].includes(rol)) {
    if (actual === "generada") opciones.push("registrada");
    if (actual === "registrada") opciones.push("peso_inicial");
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
    cheque: { generada: ["registrada"] },
    bascula: {
      generada: ["registrada"],
      registrada: ["peso_inicial"],
      peso_inicial: ["finalizada"],
    },
    admin: {
      generada: ["registrada"],
      registrada: ["peso_inicial"],
      peso_inicial: ["finalizada"],
    },
    ube_admin: {
      generada: ["registrada"],
      registrada: ["peso_inicial"],
      peso_inicial: ["finalizada"],
    }
  };

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

document.addEventListener("DOMContentLoaded", cargarOrdenes);
