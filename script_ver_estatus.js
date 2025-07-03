
// script_ver_estatus.js

const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const tabla = document.getElementById("cuerpoTabla");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroEstatus = document.getElementById("filtroEstatus");
const filtroBodegaExterna = document.getElementById("filtroBodegaExterna");

let ordenes = [];
let buquesPorId = {};

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

let empresasPorNit = {};

async function cargarOrdenes() {
  await eliminarOrdenesVencidas();

  const rol = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

  let query = supabase.from("ordenes").select("*");
  if (rol === "cliente" || rol === "consignatario") {
    query = query.eq("nit_usuario", nitUsuario);
  }

  const { data: ordenesData, error: ordenesError } = await query;
  if (ordenesError) {
    console.error("Error al obtener órdenes:", ordenesError);
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


  // Obtener empresa para cada nit
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
  const placa = filtroPlaca.value.toLowerCase();
  const estatusFiltro = filtroEstatus.value;
  const rol = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

   const esAdmin = rol === "admin" || rol === "ube_admin";
  const cuerpo = document.getElementById("cuerpoTabla");
  cuerpo.innerHTML = "";

const bodegaExternaFiltro = filtroBodegaExterna.value;

const filtradas = ordenes.filter(o => {
  if (o.estatus === "finalizada") return false;
  if (rol === "consignatario" && o.nit_usuario !== nitUsuario) return false;

  return (
    (!estatusFiltro || o.estatus === estatusFiltro) &&
    o.placa.toLowerCase().includes(placa) &&
    (bodegaExternaFiltro === "" || String(o.bodega_externa) === bodegaExternaFiltro)
  );
});


  filtradas.forEach((o) => {
    const tr = document.createElement("tr");
  tr.innerHTML = `
  <td>${o.no_orden}</td>
  <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
  <td>${o.placa}</td>
  <td>${o.piloto}</td>
  <td>${o.producto}</td>
  <td>${o.bodega}</td>
  <td>${buquesPorId[o.buque] || o.buque}</td>
  <td>${o.bl}</td>
  <td>${o.observacion || "-"}</td>
  <td>${o.estatus}</td>
<td>${o.bodega_externa ? 'Sí' : 'No'}</td>
  <td>
    ${
      esAdmin && o.estatus !== "finalizada"
        ? `<div class="d-grid gap-2">
             <button class="btn btn-sm btn-primary" onclick="editarOrden(${o.no_orden})">Editar</button>
             <button class="btn btn-sm btn-danger" onclick="eliminarOrden(${o.no_orden})">Eliminar</button>
           </div>`
        : o.estatus === "generada"
          ? `<span class="text-muted">No editable</span>`
          : `<span class="text-muted">No editable</span>`
    }
  </td>
`;
    cuerpo.appendChild(tr);
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
  filtroBodegaExterna.addEventListener("input", mostrarOrdenes);
  if (!localStorage.getItem("nit")) {
  window.location.href = "login.html";
}

});