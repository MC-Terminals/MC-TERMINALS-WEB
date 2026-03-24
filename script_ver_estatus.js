const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}


const tabla = document.getElementById("cuerpoTabla");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroEstatus = document.getElementById("filtroEstatus");
const filtroBodegaExterna = document.getElementById("filtroBodegaExterna");

let empresasPorNit = {};
let buquesPorId = {};


let paginaActual = 1;
const pageSize = 15;        // ajusta a 50/100
let totalFiltradas = 0;
let ordenesPagina = [];     // solo la página actual


const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const lblContador = document.getElementById("contadorOrdenes");

// helper para formatear 
const fmtTon = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


const ordenById = (id) => ordenesPagina.find(o => o.no_orden === id);





async function cargarOrdenes() {
  

  // buques (para mostrar nombre en la tabla)
  const { data: buquesData, error: buquesError } = await supabaseClient.from("buques").select("id, nombre");
  if (buquesError) { console.error("Error buques:", buquesError); return; }
  buquesPorId = {};
  buquesData.forEach(b => { buquesPorId[b.id] = b.nombre; });

  // empresas por NIT (para mostrar empresa)
  const { data: usuariosData, error: usuariosError } = await supabaseClient.from("usuarios").select("nit, empresa");
  if (usuariosError) { console.error("Error empresas:", usuariosError); return; }

  empresasPorNit = {};
  usuariosData.forEach(u => { empresasPorNit[u.nit] = u.empresa; });

  // primera página
  paginaActual = 1;
  await mostrarOrdenes();
}

function buildQueryBase() {
  const rol        = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

  const placa      = (filtroPlaca.value || "").trim();
  const estatusVal = filtroEstatus.value;             // "" | generada | registrada | ...
  const extVal     = filtroBodegaExterna.value;       // "" | "true" | "false"

  let q = supabaseClient.from("ordenes")
    .select("*", { count: "exact" })
    .order("no_orden", { ascending: false }); // más nuevas primero

  
  q = q.neq("estatus", "finalizada");

  // Rol: filtrar por NIT si corresponde
  if (rol === "cliente" || rol === "consignatario") {
    q = q.eq("nit_usuario", nitUsuario);
  }

  // Filtros
  if (estatusVal) q = q.eq("estatus", estatusVal);
  if (placa)      q = q.ilike("placa", `%${placa}%`);
  if (extVal !== "") q = q.eq("bodega_externa", extVal === "true");
//  Ver por defecto: activas + vencidas (oculta eliminadas)
q = q.in("estado_logico", ["activa", "vencida"]);


  return q;
}

async function cargarPagina(pagina = 1) {
  const from = (pagina - 1) * pageSize;
  const to   = from + pageSize - 1;

  const { data, count, error } = await buildQueryBase().range(from, to);
  if (error) {
    console.error("Error al obtener órdenes:", error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}




async function mostrarOrdenes() {
  const rol = localStorage.getItem("rol");
  const esAdmin = rol === "admin" || rol === "ube_admin";

  const { data, count } = await cargarPagina(paginaActual);
  ordenesPagina  = data;
  totalFiltradas = count || 0;

  tabla.innerHTML = "";

  ordenesPagina.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.no_orden}</td>
      <td>${o.fecha_generada ? new Date(o.fecha_generada).toLocaleDateString("es-ES") : ""}</td>
      <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
      <td>${o.placa || ""}</td>
      <td>${o.piloto || ""}</td>
      <td>${o.producto || ""}</td>
      <td>${o.bodega || ""}</td>
      <td>${buquesPorId[o.buque] || o.buque}</td>
      <td>${o.bl || ""}</td>
      <td>${o.cantidad_qq ?? ""}</td>
      <td>${fmtTon.format(Number(o.cantidad_ton ?? 0))}</td>
      <td>${o.nombre_transporte || ""}</td>
      <td>${o.no_orden_interna || ""}</td>
      <td>${o.observacion || "-"}</td>
      <td>${o.estatus}</td>
      <td>${o.bodega_externa ? 'Sí' : 'No'}</td>
      <td>
        ${
          (esAdmin || (rol === "consignatario" && o.estatus === "generada"))
          ? `<div class="d-grid gap-2">
               <button class="btn btn-sm btn-primary" onclick="editarOrden(${o.no_orden})">Editar</button>
               <button class="btn btn-sm btn-danger" onclick="eliminarOrden(${o.no_orden})">Eliminar</button>
             </div>`
          : `<span class="text-muted">No editable</span>`
        }
      </td>
    `;
    tabla.appendChild(tr);
  });

  // paginación UI
  const totalPaginas = Math.max(1, Math.ceil(totalFiltradas / pageSize));
  if (lblContador) {
    lblContador.textContent = `Mostrando ${ordenesPagina.length} de ${totalFiltradas} órdenes (Página ${paginaActual} de ${totalPaginas})`;
  }
  if (btnAnterior)  btnAnterior.disabled  = paginaActual <= 1;
  if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas;
}



function editarOrden(no_orden) {
  window.location.href = `editar_orden.html?orden=${no_orden}`;
}

async function eliminarOrden(no_orden) {
  const confirmar = confirm("¿Estás seguro de que deseas eliminar esta orden?");
  if (!confirmar) return;

  const nitUsuario = localStorage.getItem("nit");
  if (!nitUsuario) {
    alert("Sesión inválida. Inicia sesión de nuevo.");
    window.location.href = "login.html";
    return;
  }

  
  const { data, error } = await supabaseClient.rpc("eliminar_orden_seguro", {
    p_no_orden: Number(no_orden),
    p_nit: nitUsuario
  });

  if (error) {
    console.error(error);
    alert("Error al eliminar la orden: " + (error.message || "desconocido"));
    return;
  }

  alert(data);   
  cargarOrdenes();
}

async function fetchAllFiltradas() {
  const first = await buildQueryBase().range(0, 0); 
  if (first.error) { console.error(first.error); return []; }
  const count = first.count || 0;

  const CHUNK = 1000;
  let all = [];
  for (let from = 0; from < count; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, count - 1);
    const { data, error } = await buildQueryBase().range(from, to);
    if (error) { console.error(error); break; }
    all = all.concat(data || []);
  }
  return all;
}


document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("nit")) {
    window.location.href = "login.html";
    return;
  }

  cargarOrdenes();

  // Resetear a página 1 cada vez que cambia un filtro
  [filtroPlaca, filtroEstatus, filtroBodegaExterna].forEach(f => {
    f.addEventListener("input", () => {
      paginaActual = 1;
      mostrarOrdenes();
    });
  });

  if (btnAnterior)  btnAnterior.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      mostrarOrdenes();
    }
  });

  if (btnSiguiente) btnSiguiente.addEventListener("click", () => {
    paginaActual++;
    mostrarOrdenes();
  });
});
