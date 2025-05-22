
// script_ver_estatus.js

const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const tabla = document.getElementById("cuerpoTabla");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroEstatus = document.getElementById("filtroEstatus");

let ordenes = [];

async function eliminarOrdenesVencidas() {
  const { data, error } = await supabase
    .from("ordenes")
    .select("no_orden, fecha_generada, estatus");

  if (error) {
    console.error("Error obteniendo órdenes para limpieza:", error);
    return;
  }

  const ahora = new Date();

  for (const orden of data) {
    if (
      orden.estatus === "generada" &&
      orden.fecha_generada &&
      new Date(orden.fecha_generada) < new Date(ahora.getTime() - 24 * 60 * 60 * 1000) // hace más de 24 horas
    ) {
      const { error: deleteError } = await supabase
        .from("ordenes")
        .delete()
        .eq("no_orden", orden.no_orden);

      if (deleteError) {
        console.error(`Error eliminando orden #${orden.no_orden}:`, deleteError);
      } else {
        console.log(`Orden #${orden.no_orden} eliminada automáticamente por expiración.`);
      }
    }
  }
}

async function cargarOrdenes() {
  await eliminarOrdenesVencidas(); // limpia las expiradas primero
  const rol = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

  let query = supabase.from("ordenes").select("*");

  if (rol === "cliente" || rol === "consignatario") {
    query = query.eq("nit_usuario", nitUsuario);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al obtener órdenes:", error);
    return;
  }

  ordenes = data;
  mostrarOrdenes();
}

function mostrarOrdenes() {
  const placaFiltro = filtroPlaca.value.toLowerCase();
  const estatusFiltro = filtroEstatus.value;

  const filtradas = ordenes.filter((o) => {
    return (
      (!placaFiltro || o.placa.toLowerCase().includes(placaFiltro)) &&
      (!estatusFiltro || o.estatus === estatusFiltro)
    );
  });

  tabla.innerHTML = "";

  filtradas.forEach((o) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.no_orden}</td>
      <td>${o.placa}</td>
      <td>${o.piloto}</td>
      <td>${o.producto}</td>
      <td>${o.bodega}</td>
      <td>${o.buque}</td>
      <td>${o.bl}</td>
      <td>${o.estatus}</td>
      <td>
        ${
          o.estatus === "generada"
            ?  `<div class="d-grid gap-2">
     <button class="btn btn-sm btn-primary" onclick="editarOrden(${o.no_orden})">Editar</button>
     <button class="btn btn-sm btn-danger" onclick="eliminarOrden(${o.no_orden})">Eliminar</button>
   </div>`
            : `<span class="text-muted">No editable</span>`
        }
      </td>
    `;
    tabla.appendChild(tr);
  });
}

function editarOrden(no_orden) {
  window.location.href = `editar_orden.html?orden=${no_orden}`;
}

async function eliminarOrden(no_orden) {
  const confirmar = confirm("¿Estás seguro de que deseas eliminar esta orden?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("ordenes")
    .delete()
    .eq("no_orden", no_orden);

  if (error) {
    alert("Error al eliminar la orden.");
    console.error(error);
  } else {
    alert("Orden eliminada correctamente.");
    cargarOrdenes(); // Recargar tabla
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarOrdenes();
  filtroPlaca.addEventListener("input", mostrarOrdenes);
  filtroEstatus.addEventListener("input", mostrarOrdenes);
});