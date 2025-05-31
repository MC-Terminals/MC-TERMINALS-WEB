// script_ver_ordenes.js


const tabla = document.getElementById("tablaOrdenes");
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

  // Crea un mapa de NIT → Empresa
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

  tabla.innerHTML = "";

  ordenes.filter(o => {
    const fecha = new Date(o.fecha_generada).toISOString().slice(0, 10);
    return (
      (estatus === "" || o.estatus === estatus) &&
      (!inicio || fecha >= inicio) &&
      (!fin || fecha <= fin) &&
      o.bodega.toLowerCase().includes(bodega) &&
      o.producto.toLowerCase().includes(producto) &&
      o.placa.toLowerCase().includes(placa) &&
      o.piloto.toLowerCase().includes(piloto)
    );
  }).forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.no_orden}</td>
      <td>${new Date(o.fecha_generada).toLocaleString()}</td>
      <td>${o.buque}</td>
        <td>${o.bl}</td>
        <td>${empresasPorNit[o.nit_usuario] || "Desconocida"}</td>
      <td>${o.placa}</td>
      <td>${o.piloto}</td>
      <td>${o.producto}</td>
      <td>${o.bodega}</td>
      <td>${o.cantidad_qq}</td>
      <td>${o.cantidad_ton.toFixed(2)}</td>
      <td>${o.estatus}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="imprimirOrden(${o.no_orden})">Imprimir</button>
      </td>
    `;
    tabla.appendChild(tr);
  });
}

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
          <tr><th>Buque</th><td>${orden.buque}</td></tr>
            <tr><th>BL</th><td>${orden.bl}</td></tr>
          <tr><th>Tipo Unidad</th><td>${orden.tipo_unidad}</td></tr>
          <tr><th>Producto</th><td>${orden.producto}</td></tr>
          <tr><th>Bodega</th><td>${orden.bodega}</td></tr>
          <tr><th>Cantidad (qq)</th><td>${orden.cantidad_qq}</td></tr>
          <tr><th>Cantidad (ton)</th><td>${orden.cantidad_ton.toFixed(2)}</td></tr>
          <tr><th>Estatus</th><td>${orden.estatus}</td></tr>
          <tr><th>Observación</th><td>${orden.observacion || ""}</td></tr>
          <tr><th>Turno</th><td>${orden.turno || ""}</td></tr>
          <tr><th>Fecha Generada</th><td>${orden.fecha_generada ? new Date(orden.fecha_generada).toLocaleString() : ""}</td></tr>
        </table>
        <div class="footer">Guatemala, ${new Date().toLocaleDateString('es-ES')}</div>
      </body>
    </html>
  `);
  ventana.document.close();
}



function exportarExcel() {
  const wb = XLSX.utils.book_new();
  const ws_data = [
    [
      "No. Orden", "Fecha", "Buque", "BL", "Placa", "Piloto", "Producto", "Bodega",
      "Cant. (qq)", "Cant. (ton)", "Estatus",
      "Fecha Generada", "Fecha Registrada", "Fecha Peso Inicial", "Fecha Finalizada", "Boleta"
    ]
  ];

  ordenes.filter(o => {
    const fecha = new Date(o.fecha_generada).toISOString().slice(0, 10);
    return (
      (!filtroEstatus.value || o.estatus === filtroEstatus.value) &&
      (!filtroInicio.value || fecha >= filtroInicio.value) &&
      (!filtroFin.value || fecha <= filtroFin.value) &&
      o.bodega.toLowerCase().includes(filtroBodega.value.toLowerCase()) &&
      o.producto.toLowerCase().includes(filtroProducto.value.toLowerCase()) &&
      o.placa.toLowerCase().includes(filtroPlaca.value.toLowerCase()) &&
      o.piloto.toLowerCase().includes(filtroPiloto.value.toLowerCase())
    );
  }).forEach(o => {
    ws_data.push([
      o.no_orden,
      new Date(o.fecha_generada).toLocaleString(),
      o.buque,
      o.bl,
      o.placa,
      o.piloto,
      o.producto,
      o.bodega,
      o.cantidad_qq,
      o.cantidad_ton.toFixed(2),
      o.estatus,
      o.fecha_generada ? new Date(o.fecha_generada).toLocaleString() : "",
      o.fecha_registrada ? new Date(o.fecha_registrada).toLocaleString() : "",
      o.fecha_peso_inicial ? new Date(o.fecha_peso_inicial).toLocaleString() : "",
      o.fecha_finalizada ? new Date(o.fecha_finalizada).toLocaleString() : "",
      o.boleta_final || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Ajustar ancho automático para cada columna
  const colWidths = ws_data[0].map((_, i) => {
    const maxLen = ws_data.reduce((acc, row) => Math.max(acc, String(row[i] || "").length), 10);
    return { wch: maxLen + 5 }; // +5 para espacio extra
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
  filtroInicio.value = "";
  filtroFin.value = "";
  filtroBodega.value = "";
  filtroProducto.value = "";
  filtroPlaca.value = "";
  filtroPiloto.value = "";
  mostrarOrdenes();
}

[filtroEstatus, filtroInicio, filtroFin, filtroBodega, filtroProducto, filtroPlaca, filtroPiloto]
  .forEach(f => f.addEventListener("input", mostrarOrdenes));

document.addEventListener("DOMContentLoaded", () => {
  const btnExportar = document.querySelector("button[onclick='exportarExcel()']");

  cargarOrdenes();
});
