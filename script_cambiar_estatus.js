const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}

// =====================
// script_cambiar_estatus.js (con paginación)
// =====================

const tabla = document.getElementById("cuerpoTabla");
const filtroEstatus   = document.getElementById("filtroEstatus");
const filtroInicio    = document.getElementById("filtroFechaInicio");
const filtroFin       = document.getElementById("filtroFechaFin");
const filtroBodega    = document.getElementById("filtroBodega");
const filtroProducto  = document.getElementById("filtroProducto");
const filtroPlaca     = document.getElementById("filtroPlaca");
const filtroPiloto    = document.getElementById("filtroPiloto");
const filtroEmpresa   = document.getElementById("filtroEmpresa");

// Botones de paginación 
const btnAnterior   = document.getElementById("btnAnterior");
const btnSiguiente  = document.getElementById("btnSiguiente");
const lblContador   = document.getElementById("contadorOrdenes");

// Formateador de toneladas
const fmtTon = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let ordenesPagina = [];      // SOLO la página actual
let empresasPorNit = {};
let empresaToNits = {};
let usuariosDataGlobal = [];
let buquesPorId = {};

// Paginación
let paginaActual = 1;
const pageSize   = 15;       
let totalFiltradas = 0;


async function cargarProductosUnicos() {
  const { data, error } = await supabaseClient
    .from("productos_buque")
    .select("producto");

  if (error) {
    console.error("Error al cargar productos:", error);
    return;
  }

  const productosUnicos = [...new Set((data || []).map(p => p.producto))];
  const filtroProducto = document.getElementById("filtroProducto");

  filtroProducto.innerHTML = `<option value="">Todos</option>`;

  productosUnicos.forEach(prod => {
    const opt = document.createElement("option");
    opt.value = prod;
    opt.textContent = prod;
    filtroProducto.appendChild(opt);
  });
}



// =====================
// CARGAS INICIALES
// =====================

async function cargarOrdenes() {
  // 1) Cargar todos los buques (para mostrar el nombre)
  const { data: buquesData, error: buquesError } = await supabaseClient.from("buques")
    .select("id, nombre");

  if (buquesError) {
    console.error("Error al cargar buques:", buquesError);
    return;
  }

  buquesPorId = {};
  (buquesData || []).forEach((b) => {
    buquesPorId[b.id] = b.nombre;
  });

  // 2) Obtener empresas por NIT
  const { data: usuariosData, error: usuariosError } = await supabaseClient.from("usuarios")
    .select("nit, empresa");

  if (usuariosError) {
    console.error("Error al obtener empresas:", usuariosError);
    return;
  }

  usuariosDataGlobal = usuariosData || [];

  empresasPorNit = {};
  empresaToNits = {};

  usuariosDataGlobal.forEach((u) => {
    empresasPorNit[u.nit] = u.empresa || "";
    const emp = (u.empresa || "").trim();
    if (!emp) return;
    if (!empresaToNits[emp]) empresaToNits[emp] = [];
    empresaToNits[emp].push(u.nit);
  });

  
  const empresasUnicas = Object.keys(empresaToNits).sort();
  filtroEmpresa.innerHTML = `<option value="">Todas</option>`;
  empresasUnicas.forEach((empresa) => {
    const opt = document.createElement("option");
    opt.value = empresa;       // valor = nombre exacto
    opt.textContent = empresa;
    filtroEmpresa.appendChild(opt);
  });

  // 4) Primera página
  paginaActual = 1;
  await mostrarOrdenes();
}


// =====================
// QUERY BASE CON FILTROS (SERVER-SIDE)
// =====================

function buildQueryBase() {
  const rol = localStorage.getItem("rol");

  const estatusSel = filtroEstatus.value;       // "", generada, registrada, ...
  const inicio     = filtroInicio.value;        // yyyy-mm-dd
  const fin        = filtroFin.value;           // yyyy-mm-dd
  const bodega     = (filtroBodega.value || "").trim();
  const producto   = (filtroProducto.value || "").trim();
  const placa      = (filtroPlaca.value || "").trim();
  const piloto     = (filtroPiloto.value || "").trim();
  const empresaSel = filtroEmpresa.value;       // nombre exacto

  let q = supabaseClient.from("ordenes")
    .select("*", { count: "exact" })
    .in("estatus", ["generada", "registrada", "salio_predio", "peso_inicial"])
    .order("no_orden", { ascending: false });

  
  q = q.in("estado_logico", ["activa", "vencida"]);

  // Reglas de visibilidad por rol:
  if (rol === "operador_externo") {
    // Solo bodega_externa = true
    q = q.eq("bodega_externa", true);
  } else if (rol === "bascula") {
    // Bascula NO ve bodega externa
    q = q.or("bodega_externa.is.null,bodega_externa.eq.false");
  }
  // Otros roles (admin, ube_admin, cheque) ven todo lo de esos estatus

  // Filtros:
  if (estatusSel) q = q.eq("estatus", estatusSel);

  // Fechas: incluimos el día completo
  if (inicio) q = q.gte("fecha_generada", `${inicio} 00:00:00`);
  if (fin)    q = q.lte("fecha_generada", `${fin} 23:59:59`);

  if (bodega)   q = q.ilike("bodega", `%${bodega}%`);
  if (producto) q = q.ilike("producto", `%${producto}%`);
  if (placa)    q = q.ilike("placa", `%${placa}%`);
  if (piloto)   q = q.ilike("piloto", `%${piloto}%`);

  // Filtro por empresa (nombre → lista de NITs)
  if (empresaSel) {
    const listaNits = empresaToNits[empresaSel] || [];
    if (listaNits.length === 0) {
      // Empresa sin nits → forzamos resultado vacío
      q = q.eq("nit_usuario", "__ninguno__");
    } else {
      q = q.in("nit_usuario", listaNits);
    }
  }

  return q;
}


// =====================
// PAGINACIÓN: CARGAR UNA PÁGINA
// =====================

async function cargarPagina(pagina = 1) {
  const from = (pagina - 1) * pageSize;
  const to   = from + pageSize - 1;

  const { data, count, error } = await buildQueryBase().range(from, to);

  if (error) {
    console.error("Error al cargar órdenes:", error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}


// =====================
// MOSTRAR TABLA
// =====================

async function mostrarOrdenes() {
  const rol = localStorage.getItem("rol");

  const { data, count } = await cargarPagina(paginaActual);
  ordenesPagina   = data;
  totalFiltradas  = count || 0;

  const tbody = document.getElementById("cuerpoTabla");
  tbody.innerHTML = "";

  ordenesPagina.forEach((o) => {
    const tr = document.createElement("tr");

    // Clase especial si es bodega externa
    if (o.bodega_externa === true) {
      tr.classList.add("bodega-externa");
    }

    const fechaGenerada = o.fecha_generada
      ? new Date(o.fecha_generada).toLocaleString()
      : "";

    const cantQQ = o.cantidad_qq ?? "";
    const cantTon = o.cantidad_ton != null
      ? fmtTon.format(Number(o.cantidad_ton))
      : "";

    tr.innerHTML = `
      <td>${o.no_orden}</td>
      <td>${fechaGenerada}</td>
      <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
      <td>${buquesPorId[o.buque] || o.buque}</td>
      <td>${o.bl || ""}</td>
      <td>${o.piloto || ""}</td>
      <td>${o.placa || ""}</td>
      <td>${o.producto || ""}</td>
      <td>${o.bodega || ""}</td>
      <td>${cantQQ}</td>
      <td>${cantTon}</td>
      <td>${o.nombre_transporte || ""}</td>
      <td>${o.no_orden_interna || ""}</td>
      <td>${o.observacion || ""}</td>
      <td>${o.estatus}</td>
      <td>${o.turno ?? "-"}</td>
      <td>
        <select class="form-select form-select-sm mb-1"
                onchange="cambiarEstatus(${o.no_orden}, this.value)">
          <option value="">Seleccionar</option>
          ${generarOpcionesEstatus(o.estatus)}
        </select>
        ${mostrarBotonBodegaExterna(o)}
      </td>
      <td>${o.bodega_externa ? "Sí" : "No"}</td>
    `;

    tbody.appendChild(tr);
  });

  // Paginación UI
  const totalPaginas = Math.max(1, Math.ceil(totalFiltradas / pageSize));
  if (lblContador) {
    lblContador.textContent =
      `Mostrando ${ordenesPagina.length} de ${totalFiltradas} órdenes ` +
      `(Página ${paginaActual} de ${totalPaginas})`;
  }
  if (btnAnterior)  btnAnterior.disabled  = paginaActual <= 1;
  if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas;

  console.log(`Total órdenes filtradas (todas las páginas): ${totalFiltradas}`);
}


// =====================
// BODEGA EXTERNA
// =====================

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
    <button class="btn btn-sm btn-warning mt-1"
            onclick="asignarBodegaExterna(${orden.no_orden})">
      Bodega Externa
    </button>
  `;
}

async function asignarBodegaExterna(no_orden) {
  const confirmar = confirm("¿Deseas asignar esta orden a bodega externa?");
  if (!confirmar) return;

  const ahoraISO = new Date().toISOString();

  const { error } = await supabaseClient
    .from("ordenes")
    .update({
      bodega_externa: true,
      fecha_bodega_externa: ahoraISO,
    })
    .eq("no_orden", no_orden);

  if (error) {
    console.error("Error al asignar bodega externa:", error);
    alert("No se pudo asignar la bodega externa.");
  } else {
    alert("Bodega externa asignada correctamente.");
    mostrarOrdenes(); // recargar página actual
  }
}


// =====================
// GENERAR OPCIONES DE ESTATUS
// =====================

function generarOpcionesEstatus(actual) {
  const rol = localStorage.getItem("rol");
  const opciones = [];

  if (rol === "cheque") {
    if (actual === "generada")   opciones.push("registrada");
    if (actual === "registrada") opciones.push("salio_predio");
  } else if (["bascula", "admin", "ube_admin"].includes(rol)) {
    if (actual === "generada")     opciones.push("registrada");
    if (actual === "registrada")   opciones.push("salio_predio");
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


// =====================
// CAMBIAR ESTATUS
// =====================

async function cambiarEstatus(no_orden, nuevoEstatus) {
  if (!nuevoEstatus) return;

  const rol = localStorage.getItem("rol");
  const orden = ordenesPagina.find((o) => o.no_orden === no_orden);
  if (!orden) return alert("Orden no encontrada en la página actual.");

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
      peso_inicial: ["finalizada"],
    },
  };

  if (rol === "operador_externo" && !orden.bodega_externa) {
    return alert("Solo puedes modificar órdenes asignadas a bodega externa.");
  }

  if (
    !permitido[rol] ||
    !permitido[rol][actual] ||
    !permitido[rol][actual].includes(nuevoEstatus)
  ) {
    return alert("Cambio de estatus no permitido según el rol o flujo de estados.");
  }

  const campos = {};
  const ahoraStr = new Date().toLocaleString("sv-SE"); 
  // Al pasar a 'registrada' calculamos el turno en la BD (no en el array paginado)
  if (nuevoEstatus === "registrada") {
    const { data: maxData, error: maxError } = await supabaseClient
      .from("ordenes")
      .select("turno")
      .order("turno", { ascending: false })
      .limit(1);

    let maxTurno = 0;
    if (!maxError && maxData && maxData.length > 0 && maxData[0].turno != null) {
      maxTurno = maxData[0].turno;
    }

    campos.turno = maxTurno + 1;
    campos.fecha_registrada = ahoraStr;
  }

  if (nuevoEstatus === "salio_predio") {
    campos.fecha_salio_predio = ahoraStr;
  }

  if (nuevoEstatus === "peso_inicial") {
    campos.fecha_peso_inicial = ahoraStr;
  }

  if (nuevoEstatus === "finalizada") {
    const boleta = prompt("Ingrese número de boleta para finalizar:");
    if (!boleta) return alert("Debe ingresar un número de boleta.");
    campos.boleta_final = boleta;
    campos.fecha_finalizada = ahoraStr;
    campos.turno = null;
  }

  campos.estatus = nuevoEstatus;

  const { error } = await supabaseClient
    .from("ordenes")
    .update(campos)
    .eq("no_orden", no_orden);

  if (error) {
    console.error("Error al actualizar estatus:", error);
    alert("No se pudo actualizar el estatus.");
  } else {
    alert("Estatus actualizado correctamente.");
    // No reiniciamos filtros ni página, solo recargamos la actual
    await mostrarOrdenes();
  }
}


// =====================
// EVENTOS DE FILTROS Y CARGA INICIAL
// =====================

[
  filtroEstatus,
  filtroInicio,
  filtroFin,
  filtroBodega,
  filtroProducto,
  filtroPlaca,
  filtroPiloto,
  filtroEmpresa,
].forEach((f) =>
  f.addEventListener("input", () => {
    paginaActual = 1; // siempre volvemos a la primera página al filtrar
    mostrarOrdenes();
  })
);

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toLocaleDateString("fr-CA"); // yyyy-mm-dd
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toLocaleDateString("fr-CA");

  filtroInicio.value = inicioMesStr;
  filtroFin.value = hoy;

  // Actualizar fecha fin cada 60 segundos (si te interesa mantenerlo)
  setInterval(() => {
    const hoyActualizado = new Date().toLocaleDateString("fr-CA");
    filtroFin.value = hoyActualizado;
  }, 60 * 1000);
  
  cargarProductosUnicos();

  // Cargar data base (buques, empresas, y luego la primera página de órdenes)
  cargarOrdenes();

  // Botones de paginación
  if (btnAnterior) {
    btnAnterior.addEventListener("click", () => {
      if (paginaActual > 1) {
        paginaActual--;
        mostrarOrdenes();
      }
    });
  }

  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", () => {
      paginaActual++;
      mostrarOrdenes();
    });
  }
});

