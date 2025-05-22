// script_cambiar_estatus.js
const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const tabla = document.getElementById("tablaOrdenes");
const filtroEstatus = document.getElementById("filtroEstatus");
const filtroInicio = document.getElementById("filtroFechaInicio");
const filtroFin = document.getElementById("filtroFechaFin");
const filtroBodega = document.getElementById("filtroBodega");
const filtroProducto = document.getElementById("filtroProducto");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroPiloto = document.getElementById("filtroPiloto");

let ordenes = [];

async function cargarOrdenes() {
  const { data, error } = await supabase
    .from("ordenes")
    .select("*")
    .in("estatus", ["generada", "registrada", "peso_inicial"]);
  if (error) {
    console.error("Error al cargar las órdenes:", error);
    return;
  }
  ordenes = data;
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

  const tbody = document.getElementById("tablaOrdenes");
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
        <td>${o.buque}</td>
        <td>${o.bl}</td>
        <td>${o.piloto}</td>
        <td>${o.placa}</td>
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
  const opciones = [];
  if (actual === "generada") opciones.push("registrada", "peso_inicial", "finalizada");
  if (actual === "registrada") opciones.push("peso_inicial", "finalizada");
  if (actual === "peso_inicial") opciones.push("finalizada");
  return opciones
    .map((op) => `<option value="${op}">${op.replace("_", " ")}</option>`)
    .join("");
}

async function cambiarEstatus(no_orden, nuevoEstatus) {
  if (!nuevoEstatus) return;
  const orden = ordenes.find((o) => o.no_orden === no_orden);
  if (!orden) return alert("Orden no encontrada.");

  const campos = {};
 const ahora = new Date().toLocaleString('sv-SE'); // formato yyyy-MM-dd HH:mm:ss


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
