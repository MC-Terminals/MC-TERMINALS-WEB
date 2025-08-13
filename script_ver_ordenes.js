// script_ver_ordenes.js


const tabla = document.getElementById("tablaOrdenes");
const filtroEstatus = document.getElementById("filtroEstatus");
const filtroInicio = document.getElementById("filtroFechaInicio");
const filtroFin = document.getElementById("filtroFechaFin");
const filtroBodega = document.getElementById("filtroBodega");
const filtroProducto = document.getElementById("filtroProducto");
const filtroPlaca = document.getElementById("filtroPlaca");
const filtroPiloto = document.getElementById("filtroPiloto");
const filtroBodegaExterna = document.getElementById("filtroBodegaExterna");
const filtroEmpresa = document.getElementById("filtroEmpresa");



let ordenes = [];
let empresasPorNit = {};
let buquesPorId = {};
let paginaActual = 1;
const ordenesPorPagina = 10;
let ordenesFiltradas = [];
// === Límite de selección para orden masiva ===
const MAX_MASIVO = 25;


// === Selección inteligente para impresión masiva ===
const seleccionadas = new Set();        // no_orden seleccionadas
let groupKey = null;                     // "buque|bl|producto"

const fmtQQ  = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:0, maximumFractionDigits:4 });
const fmtTon = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:2, maximumFractionDigits:2 });

const keyFrom   = (o) => `${o.buque}|${o.bl}|${o.producto}`;
const ordenById = (id) => ordenes.find(x => x.no_orden === id);

function actualizarUISeleccion() {
  const btn = document.getElementById("btnImprimirMasivo");
  const selInfo = document.getElementById("selInfo");
  if (btn) btn.disabled = seleccionadas.size === 0;
  if (!selInfo) return;

  if (!groupKey) {
    selInfo.textContent = seleccionadas.size ? `(${seleccionadas.size} seleccionadas)` : "";
    return;
  }
  const [b, bl, prod] = groupKey.split("|");
  selInfo.innerHTML =
    `<span class="badge bg-secondary">Agrupando</span>
     <span class="ms-1">Buque: ${buquesPorId[b] || b}</span> |
     <span>BL: ${bl}</span> |
     <span>Producto: ${prod}</span> — ${seleccionadas.size} seleccionadas`;
}


function applyGroupLock() {
  // deshabilita filas que no coinciden con la regla (sin tocar las ya marcadas)
  tabla.querySelectorAll(".chkOrden").forEach(chk => {
    const id = Number(chk.dataset.id);
    const o  = ordenById(id);
    const ok = !groupKey || keyFrom(o) === groupKey;
    chk.disabled = !ok && !seleccionadas.has(id);
    chk.closest("tr").classList.toggle("table-warning", !ok && !seleccionadas.has(id));
  });
  syncCheckAllPage();
}

function clearGroup() {
  seleccionadas.clear();
  groupKey = null;
  const all = document.getElementById("checkAllPage");
  if (all) all.checked = false;
  actualizarUISeleccion();
  applyGroupLock();
}


let warnTimer;
function showWarn(msg) {
  const el = document.getElementById("selInfo");
  if (!el) return;
  el.textContent = msg;
  el.style.color = "#ffc107";
  clearTimeout(warnTimer);
  warnTimer = setTimeout(() => { el.style.color = ""; actualizarUISeleccion(); }, 2000);
}


function syncCheckAllPage() {
  const visibles = Array.from(tabla.querySelectorAll(".chkOrden")).filter(c => !c.disabled);
  const all = document.getElementById("checkAllPage");
  if (!all) return;
  all.checked = visibles.length > 0 && visibles.every(c => c.checked);
}



async function cargarOrdenes() {
  const { data: ordenesData, error: ordenesError } = await supabase.from("ordenes").select("*");
  if (ordenesError) {
    console.error("Error al cargar las órdenes:", ordenesError);
    return;
  }

  const { data: usuariosData, error: usuariosError } = await supabase.from("usuarios").select("nit, empresa");
  if (usuariosError) {
    console.error("Error al cargar usuarios:", usuariosError);
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


  // Crea un mapa de NIT → Empresa
  empresasPorNit = {};
  usuariosData.forEach(u => {
    empresasPorNit[u.nit] = u.empresa;
  });

  function llenarFiltroEmpresa() {
  const select = document.getElementById("filtroEmpresa");
  select.innerHTML = '<option value="">Todas</option>';

  // Obtener lista única de empresas
  const empresasUnicas = [...new Set(Object.values(empresasPorNit))].sort();

  empresasUnicas.forEach(empresa => {
    const option = document.createElement("option");
    option.value = empresa.toLowerCase();
    option.textContent = empresa;
    select.appendChild(option);
  });
 
}


  ordenes = ordenesData;
  mostrarOrdenes();
  llenarFiltroEmpresa();
}


function mostrarOrdenes() {
  const rol = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

  const estatus = filtroEstatus.value;
  const inicio = filtroInicio.value;
  const fin = filtroFin.value;
  const bodega = filtroBodega.value.toLowerCase();
  const producto = filtroProducto.value.toLowerCase();
  const placa = filtroPlaca.value.toLowerCase();
  const piloto = filtroPiloto.value.toLowerCase();

  tabla.innerHTML = "";

  // Aplicar filtros
const empresaFiltro = filtroEmpresa.value;

ordenesFiltradas = ordenes.filter(o => {
  const fecha = new Date(o.fecha_generada).toLocaleDateString('fr-CA');
  const empresaActual = (empresasPorNit[o.nit_usuario] || "").toLowerCase();

  if (rol === "consignatario" && o.nit_usuario !== nitUsuario) return false;

  return (
    (estatus === "" || o.estatus === estatus) &&
    (!inicio || fecha >= inicio) &&
    (!fin || fecha <= fin) &&
    o.bodega.toLowerCase().includes(bodega) &&
    o.producto.toLowerCase().includes(producto) &&
    o.placa.toLowerCase().includes(placa) &&
    (o.piloto || "").toLowerCase().includes(piloto) &&
    (filtroBodegaExterna.value === "" || String(o.bodega_externa) === filtroBodegaExterna.value) &&
    (empresaFiltro === "" || empresaActual === empresaFiltro)

  );
});

// Calcular total, páginas y rango actual
const totalOrdenes = ordenesFiltradas.length;
const totalPaginas = Math.ceil(totalOrdenes / ordenesPorPagina);
const inicioPagina = (paginaActual - 1) * ordenesPorPagina;
const finPagina = Math.min(inicioPagina + ordenesPorPagina, totalOrdenes);

// Texto más informativo para el usuario
const textoOrdenes = (finPagina - inicioPagina === 1) ? "orden" : "órdenes";
document.getElementById("contadorOrdenes").textContent =
  `Mostrando ${finPagina - inicioPagina} de ${totalOrdenes} ${textoOrdenes} (Página ${paginaActual} de ${totalPaginas})`;


  const ordenesPaginadas = ordenesFiltradas.slice(inicioPagina, finPagina);

  // Mostrar órdenes paginadas
  ordenesPaginadas.forEach(o => {
    const tr = document.createElement("tr");
    const checked = seleccionadas.has(o.no_orden) ? "checked" : "";
    tr.innerHTML = `
    <td><input type="checkbox" class="chkOrden" data-id="${o.no_orden}" ${checked}></td>
      <td>${o.no_orden}</td>
      <td>${new Date(o.fecha_generada).toLocaleString()}</td>
      <td>${buquesPorId[o.buque] || o.buque}</td>
      <td>${o.bl}</td>
      <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
      <td>${o.placa}</td>
      <td>${o.piloto}</td>
      <td>${o.producto}</td>
      <td>${o.bodega}</td>
      <td>${o.cantidad_qq}</td>
      <td>${o.cantidad_ton.toFixed(2)}</td>
      <td>${o.nombre_transporte || "-"}</td>
      <td>${o.no_orden_interna || "-"}</td>
      <td>${o.observacion || "-"}</td>
      <td>${o.estatus}</td>
      <td>${o.bodega_externa ? 'Sí' : 'No'}</td>
      <td><button class="btn btn-sm btn-success" onclick="imprimirOrden(${o.no_orden})">Imprimir</button></td>
    `;
    tabla.appendChild(tr);
  });

  // Actualizar estado de botones
  document.getElementById("btnAnterior").disabled = paginaActual === 1;
  document.getElementById("btnSiguiente").disabled = finPagina >= ordenesFiltradas.length;

  // === Listeners de checks por fila ===
tabla.querySelectorAll(".chkOrden").forEach(chk => {
  chk.addEventListener("change", (e) => {
    const id = Number(e.target.dataset.id);
    const o  = ordenById(id);

    if (e.target.checked) {
      // Límite 25
      if (seleccionadas.size >= MAX_MASIVO && !seleccionadas.has(id)) {
        e.target.checked = false;
        showWarn(`Máximo permitido: ${MAX_MASIVO} unidades por orden masiva.`);
        return;
      }
      // Primera selección fija la regla
      if (!groupKey) groupKey = keyFrom(o);
      if (keyFrom(o) !== groupKey) {
        e.target.checked = false;
        showWarn("Solo puedes agrupar órdenes con el MISMO buque, BL y producto.");
        return;
      }
      seleccionadas.add(id);
    } else {
      seleccionadas.delete(id);
      if (seleccionadas.size === 0) groupKey = null;
    }

    actualizarUISeleccion();
    applyGroupLock();
  });
});


// === Checkbox maestro: seleccionar/deseleccionar TODAS las FILTRADAS (respetando la regla y el límite) ===
const checkAllPage = document.getElementById("checkAllPage");
if (checkAllPage) {
  checkAllPage.onclick = () => {
    if (checkAllPage.checked) {
      // Si no hay regla, la fijamos con la primera orden filtrada
      if (!groupKey && ordenesFiltradas.length) {
        groupKey = keyFrom(ordenesFiltradas[0]);
      }
      // Tomar todas las filtradas que cumplan la regla
      const candidatas = ordenesFiltradas.filter(o => keyFrom(o) === groupKey);
      if (candidatas.length > MAX_MASIVO) {
        showWarn(`Se seleccionarán solo ${MAX_MASIVO} (límite por orden).`);
      }
      // Rellenar hasta el límite, manteniendo las ya marcadas
      const ya = new Set(seleccionadas);
      seleccionadas.clear();
      // Primero conserva las ya seleccionadas (que cumplan la regla)
      Array.from(ya).forEach(id => {
        const o = ordenById(id);
        if (o && keyFrom(o) === groupKey && seleccionadas.size < MAX_MASIVO) {
          seleccionadas.add(id);
        }
      });
      // Luego agrega más de las filtradas hasta llegar al tope
      for (const o of candidatas) {
        if (seleccionadas.size >= MAX_MASIVO) break;
        seleccionadas.add(o.no_orden);
      }
    } else {
      clearGroup();
    }
    // Re-pintar para reflejar checks en la página actual y las otras
    mostrarOrdenes();
  };
}


// aplicar bloqueo/estilos y actualizar badge
applyGroupLock();
actualizarUISeleccion();
}



// (puedes dejar aquí tus dos líneas de paginación si quieres)
// document.getElementById("btnAnterior").disabled = paginaActual === 1;
// document.getElementById("btnSiguiente").disabled = finPagina >= ordenesFiltradas.length;


async function imprimirOrden(no_orden) {
  const orden = ordenes.find(o => o.no_orden === no_orden);
  if (!orden) return alert("Orden no encontrada.");

  // Obtener nombre de la empresa desde el usuario
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("empresa")
    .eq("nit", orden.nit_usuario)
    .single();

  const empresaNombre = usuario?.empresa || "Empresa Desconocida";

  const ventana = window.open("", "_blank");
  ventana.document.write(`
    <html>
      <head>
        <title>Orden #${orden.no_orden}</title>
        <style>
          @media print {
            @page { size: half-letter portrait; margin: 20mm; }
            body { font-size: 12px; }
          }

          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .logo {
            width: 120px;
          }
          h2 {
            text-align: center;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid black;
            padding: 6px;
            text-align: left;
          }
          .footer {
            margin-top: 40px;
            text-align: right;
            font-size: 12px;
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500)">
        <div class="header">
          <div><strong>${empresaNombre}</strong></div>
          <div><img src="https://fpqnzqrdyxmhptosplos.supabase.co/storage/v1/object/public/logos//logo_empresa.png" class="logo"></div>
        </div>
        <h2>Orden de Carga</h2>
        <table>
          <tr><th>No. Orden</th><td>${orden.no_orden}</td></tr>
          <tr><th>Empresa</th><td>${empresaNombre}</td></tr>
          <tr><th>Piloto</th><td>${orden.piloto}</td></tr>
          <tr><th>Placa</th><td>${orden.placa}</td></tr>
          <tr><th>Buque</th><td>${buquesPorId[orden.buque] || orden.buque}</td></tr>
            <tr><th>Poliza</th><td>${orden.bl}</td></tr>
          <tr><th>Tipo Unidad</th><td>${orden.tipo_unidad}</td></tr>
          <tr><th>Producto</th><td>${orden.producto}</td></tr>
          <tr><th>Bodega</th><td>${orden.bodega}</td></tr>
          <tr><th>Cantidad (qq)</th><td>${orden.cantidad_qq}</td></tr>
          <tr><th>Cantidad (ton)</th><td>${orden.cantidad_ton.toFixed(2)}</td></tr>
          <tr><th>Estatus</th><td>${orden.estatus}</td></tr>
          <tr><th>Nombre Transporte</th><td>${orden.nombre_transporte || ""}</td></tr>
          <tr><th>No. Orden Interna</th><td>${orden.no_orden_interna || ""}</td></tr>
          <tr><th>Observación</th><td>${orden.observacion || ""}</td></tr>
          <tr><th>Turno</th><td>${orden.turno || ""}</td></tr>
          <tr><th>Fecha Generada</th><td>${orden.fecha_generada ? new Date(orden.fecha_generada).toLocaleString() : ""}</td></tr>
          <tr><th>Fecha Bodega Externa</th><td>${orden.fecha_bodega_externa ? new Date(orden.fecha_bodega_externa).toLocaleString() : ""}</td></tr>
        </table>
        <div class="footer">Guatemala, ${new Date().toLocaleDateString('es-ES')}</div>
      </body>
    </html>
  `);
  ventana.document.close();
}

async function imprimirOrdenMasiva() {
  if (seleccionadas.size === 0) return;

  const ids   = Array.from(seleccionadas);
  const lista = ids.map(ordenById).filter(Boolean);

  // Validación de regla y límite
  const gk = keyFrom(lista[0]);
  if (lista.some(o => keyFrom(o) !== gk)) {
    showWarn("Selección inválida. Limpia y vuelve a seleccionar (mismo buque/BL/producto).");
    return;
  }
  if (lista.length > MAX_MASIVO) {
    showWarn(`Máximo permitido: ${MAX_MASIVO} unidades por orden masiva.`);
    return;
  }

  const { buque, bl, producto, nit_usuario } = lista[0];
  const empresaNombre = (empresasPorNit[nit_usuario] || "Empresa Desconocida");
  const buqueNombre   = buquesPorId[buque] || buque;

  // Totales
  const totalQQ  = lista.reduce((a, o) => a + Number(o.cantidad_qq || 0), 0);
  const totalTon = lista.reduce((a, o) => a + Number(
    o.cantidad_ton != null ? o.cantidad_ton : (o.cantidad_qq || 0) / 22.046
  ), 0);

  // Ordenar por piloto, luego placa
  lista.sort((a, b) => (a.piloto || "").localeCompare(b.piloto || "") || (a.placa || "").localeCompare(b.placa || ""));

  // Auto-escala para una hoja A4
  const n = lista.length;
  const fs      = n <= 14 ? 12 : n <= 18 ? 11 : n <= 22 ? 10 : 9;      // px
  const padCell = n <= 14 ? 6  : n <= 18 ? 5  : n <= 22 ? 4  : 3;      // px
  const h2Size  = n <= 18 ? 16 : 14;                                  // título
  const metaFS  = n <= 18 ? 12 : 11;

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Orden Masiva (${lista.length} unidades)</title>
        <style>
          @media print { @page { size: A4 portrait; margin: 10mm; } }
          body { font-family: Arial, sans-serif; color: #000; font-size: ${fs}px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
          .logo { width:110px; }
          h2 { text-align:center; margin: 6px 0 10px; font-size:${h2Size}px; }
          table { width:100%; border-collapse:collapse; }
          th, td { border:1px solid #000; padding:${padCell}px ${Math.max(3,padCell-1)}px; text-align:left; }
          th { background:#f2f2f2; }
          .totales { margin-top:8px; text-align:right; }
          .meta { font-size:${metaFS}px; }
          .meta td { padding:2px 0; border:none; }
          .nowrap { white-space:nowrap; }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 300)">
        <div class="header">
          <div>
            <div><strong>${empresaNombre}</strong></div>
            <table class="meta">
              <tr><td><strong>Buque:</strong> ${buqueNombre}</td></tr>
              <tr><td><strong>BL:</strong> ${bl}</td></tr>
              <tr><td><strong>Producto:</strong> ${producto}</td></tr>
              <tr><td><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</td></tr>
            </table>
          </div>
          <img src="https://fpqnzqrdyxmhptosplos.supabase.co/storage/v1/object/public/logos//logo_1.png" class="logo" />
        </div>

        <h2>ORDEN DE CARGA (MASIVA)</h2>

        <table>
          <thead>
            <tr>
              <th class="nowrap">#</th>
              <th class="nowrap">No. Orden</th>
              <th>Piloto</th>
              <th class="nowrap">Placa</th>
              <th>Nombre Transporte</th>
              <th class="nowrap">No. Orden Interna</th>
              <th class="nowrap">Cantidad (qq)</th>
              <th class="nowrap">Cantidad (ton)</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map((o, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${o.no_orden}</td>
                <td>${o.piloto || ""}</td>
                <td>${o.placa || ""}</td>
                <td>${o.nombre_transporte || ""}</td>
                <td>${o.no_orden_interna || ""}</td>
                <td>${fmtQQ.format(Number(o.cantidad_qq || 0))}</td>
                <td>${fmtTon.format(Number(o.cantidad_ton != null ? o.cantidad_ton : (o.cantidad_qq || 0) / 22.046))}</td>
                <td>${o.observacion || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totales">
          <div><strong>Unidades:</strong> ${lista.length}</div>
          <div><strong>Total Cantidad (qq):</strong> ${fmtQQ.format(totalQQ)}</div>
          <div><strong>Total Cantidad (ton):</strong> ${fmtTon.format(totalTon)}</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}



function formatearFecha(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  f.setHours(f.getHours() - 6); // Ajustar UTC-6
  return f.toLocaleString("es-GT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  });
}


function exportarExcel() {
    const rol = localStorage.getItem("rol");
  const nitUsuario = localStorage.getItem("nit");

  const wb = XLSX.utils.book_new();
  const ws_data = [
[
  "No. Orden", "Fecha Creada", "Buque", "Poliza", "Empresa", "Placa", "Piloto", "Producto", "Bodega", "Nombre Transporte", "No. Orden Interna",
  "Cant. (qq)", "Cant. (ton)", "Estatus",
  "Fecha Generada", "Fecha Registrada", "Fecha Salió Predio", "Fecha Peso Inicial", "Fecha Finalizada", "Boleta",
  "Fecha Bodega Externa", "Observación"
]


  ];

  ordenes.filter(o => {
   const fecha = new Date(o.fecha_generada).toLocaleDateString('fr-CA');
    const filtroBodegaExt = document.getElementById("filtroBodegaExterna").value;
    const filtroEmpresa = document.getElementById("filtroEmpresa").value.toLowerCase();



    // ✅ Filtrar por nit del consignatario
    if (rol === "consignatario" && o.nit_usuario !== nitUsuario) return false;

    return (
  (!filtroEstatus.value || o.estatus === filtroEstatus.value) &&
  (!filtroInicio.value || fecha >= filtroInicio.value) &&
  (!filtroFin.value || fecha <= filtroFin.value) &&
  o.bodega.toLowerCase().includes(filtroBodega.value.toLowerCase()) &&
  o.producto.toLowerCase().includes(filtroProducto.value.toLowerCase()) &&
  o.placa.toLowerCase().includes(filtroPlaca.value.toLowerCase()) &&
  o.piloto.toLowerCase().includes(filtroPiloto.value.toLowerCase()) &&
  (filtroBodegaExt === "" || String(o.bodega_externa) === filtroBodegaExt)
  && (filtroEmpresa === "" || (empresasPorNit[o.nit_usuario] || "").toLowerCase().includes(filtroEmpresa))
);
  })

  .forEach(o => {
ws_data.push([
  o.no_orden,
  o.fecha_creada ? new Date(o.fecha_creada) : null,
  buquesPorId[o.buque] || o.buque,
  o.bl,
  empresasPorNit[o.nit_usuario] || "Desconocida",
  o.placa,
  o.piloto,
  o.producto,
  o.bodega,
    o.nombre_transporte,
  o.no_orden_interna,
  o.cantidad_qq,
  o.cantidad_ton,
  o.estatus,
  o.fecha_generada ? new Date(o.fecha_generada) : null,
  o.fecha_registrada ? new Date(o.fecha_registrada) : null,
  o.fecha_salio_predio ? new Date(o.fecha_salio_predio) : null,
  o.fecha_peso_inicial ? new Date(o.fecha_peso_inicial) : null,
  o.fecha_finalizada ? new Date(o.fecha_finalizada) : null,
  o.boleta_final ? Number(o.boleta_final) : null,
  o.fecha_bodega_externa ? new Date(o.fecha_bodega_externa) : null,
  o.observacion
]);
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

 // ✅ Aplicar formato de fecha y hora a las columnas correctas
const dateColumns = [1, 14, 15, 16, 17, 18, 20]; // índices reales de columnas fecha
for (let i = 1; i < ws_data.length; i++) {
  dateColumns.forEach(col => {
    const ref = XLSX.utils.encode_cell({ r: i, c: col });
    const cell = ws[ref];
    if (cell && cell.v instanceof Date) {
      cell.t = 'd'; // tipo fecha
      cell.z = 'dd/mm/yyyy hh:mm:ss'; // formato fecha y hora
    }
  });
}

// ✅ Aplicar formato numérico a la columna de boleta (índice 19)
for (let i = 1; i < ws_data.length; i++) {
  const ref = XLSX.utils.encode_cell({ r: i, c: 19 });
  const cell = ws[ref];
  if (cell && typeof cell.v === 'number') {
    cell.t = 'n'; // tipo numérico
    cell.z = '0'; // sin decimales
  }
}


// Ajustar ancho automático con mejor precisión
const colWidths = ws_data[0].map((_, colIdx) => {
  const maxLen = ws_data.reduce((max, row) => {
    const cell = row[colIdx];
    const value = cell instanceof Date ? cell.toLocaleString() : String(cell || "");
    return Math.max(max, value.length);
  }, 10);
  return { wch: maxLen + 2 }; // Ajuste más fino
});
ws["!cols"] = colWidths;


  // Encabezado azul con letras blancas (solo visual en Excel si se usa con SheetJS Pro o herramientas externas)
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      fill: { fgColor: { rgb: "1F4E78" } }, // Azul
      font: { bold: true, color: { rgb: "FFFFFF" } }, // Blanco
      alignment: { horizontal: "center" }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Órdenes");
  XLSX.writeFile(wb, "ordenes_reporte.xlsx");
}

function limpiarFiltros() {
  filtroEstatus.value = "";
  filtroBodega.value = "";
  filtroProducto.value = "";
  filtroPlaca.value = "";
  filtroPiloto.value = "";
  filtroBodegaExterna.value = "";
  filtroEmpresa.value = "";

   clearGroup();                              // 👈 limpia selección global
  const all = document.getElementById("checkAllPage");
  if (all) all.checked = false;              // 👈 desmarca el maestro
  
 const hoy = new Date().toLocaleDateString('fr-CA'); // Formato YYYY-MM-DD
  filtroInicio.value = hoy;
  filtroFin.value = hoy;

  paginaActual = 1;
  mostrarOrdenes();
}

[
  filtroEstatus,
  filtroInicio,
  filtroFin,
  filtroBodega,
  filtroProducto,
  filtroPlaca,
  filtroPiloto,
  filtroBodegaExterna,
  filtroEmpresa // 👈 nuevo
].forEach(f => f.addEventListener("input", mostrarOrdenes));



document.addEventListener("DOMContentLoaded", () => {
  const btnExportar = document.querySelector("button[onclick='exportarExcel()']");

  document.getElementById("btnAnterior").addEventListener("click", () => {
  if (paginaActual > 1) {
    paginaActual--;
    mostrarOrdenes();
  }
});

document.getElementById("btnSiguiente").addEventListener("click", () => {
  if ((paginaActual * ordenesPorPagina) < ordenesFiltradas.length) {
    paginaActual++;
    mostrarOrdenes();
  }
});

const btnMasivo = document.getElementById("btnImprimirMasivo");
if (btnMasivo) btnMasivo.addEventListener("click", imprimirOrdenMasiva);





  if (!localStorage.getItem("nit")) {
    window.location.href = "login.html";
  }

  // ⏰ Establecer fecha actual como valor por defecto en los filtros
  const hoy = new Date().toLocaleDateString('fr-CA'); // Formato YYYY-MM-DD
  filtroInicio.value = hoy;
  filtroFin.value = hoy;

  cargarOrdenes();
});

