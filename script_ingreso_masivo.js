const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}



let datosExcel = [];
const rol = localStorage.getItem("rol");
const nit = localStorage.getItem("nit");
let todosBLs = [];


const excelInput = document.getElementById("excelInput");


excelInput.addEventListener("click", () => {
  excelInput.value = "";
});

document.addEventListener("DOMContentLoaded", async () => {
  await cargarBuques();

  document.getElementById("buque").addEventListener("change", mostrarBLsDelBuque);
  document.getElementById("bl").addEventListener("change", mostrarProductoDelBL);
});

async function cargarBuques() {
  try {
    const selectBuque = document.getElementById("buque");
    selectBuque.innerHTML = `<option value="">Seleccione un buque...</option>`;

    let buques = [];

    if (rol === "consignatario") {
     
      const { data: blsData, error: blsError } = await supabaseClient.from("bls_producto")
        .select("id_producto_buque")
        .eq("nit_empresa", nit);

      if (blsError) throw blsError;
      if (!blsData.length) return; 

      const idsProducto = [...new Set(blsData.map(bl => bl.id_producto_buque))];

      
      const { data: productosData, error: productosError } = await supabaseClient.from("productos_buque")
        .select("id_buque")
        .in("id", idsProducto);

      if (productosError) throw productosError;

      const idsBuques = [...new Set(productosData.map(p => p.id_buque))];

      
      const { data: buquesData, error: buquesError } = await supabaseClient.from("buques")
        .select("id, nombre")
        .in("id", idsBuques);

      if (buquesError) throw buquesError;

      buques = buquesData || [];
    } 
    else {
      
      const { data, error } = await supabaseClient.from("buques")
        .select("id, nombre");

      if (error) throw error;
      buques = data || [];
    }

    
    buques.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.nombre;
      selectBuque.appendChild(opt);
    });

  } catch (error) {
    console.error("Error cargando buques:", error.message);
  }
}

async function mostrarBLsDelBuque() {
  const buqueId = document.getElementById("buque").value;

  
  if (!buqueId) {
    document.getElementById("bl").innerHTML = `<option value="">Seleccione una poliza...</option>`;
    document.getElementById("producto").innerHTML = `<option value="">Seleccione un producto...</option>`;
    document.getElementById("producto").disabled = false;
    todosBLs = [];
    return;
  }

  
  const { data: productos, error: errorProd } = await supabaseClient.from("productos_buque")
    .select("id, producto")
    .eq("id_buque", buqueId);

  if (errorProd || !productos || !productos.length) {
    document.getElementById("bl").innerHTML = `<option value="">Seleccione una poliza...</option>`;
    document.getElementById("producto").innerHTML = `<option value="">Seleccione un producto...</option>`;
    document.getElementById("producto").disabled = false;
    todosBLs = [];
    return;
  }

  const idsProducto = productos.map(p => p.id);

  
  let query = supabaseClient.from("bls_producto")
    .select("bl, id_producto_buque, nit_empresa")
    .in("id_producto_buque", idsProducto);

  if (rol === "consignatario") {
    query = query.eq("nit_empresa", nit); 
  }

  const { data: bls, error: errorBls } = await query;

  
  todosBLs = (bls || []).map(bl => ({
    ...bl,
    producto: productos.find(p => p.id === bl.id_producto_buque)?.producto || ""
  }));

  
  const blSelect = document.getElementById("bl");
  const productoSelect = document.getElementById("producto");
  blSelect.innerHTML = `<option value="">Seleccione una poliza...</option>`;
  productoSelect.innerHTML = `<option value="">Seleccione un producto...</option>`;
  productoSelect.disabled = false;

  (todosBLs || []).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.bl;
    opt.textContent = b.bl;
    blSelect.appendChild(opt);
  });
}

function mostrarProductoDelBL() {
  const blSeleccionado = document.getElementById("bl").value;
  const producto = todosBLs.find(b => b.bl === blSeleccionado)?.producto;

  const prodSelect = document.getElementById("producto");
  prodSelect.innerHTML = `<option value="">Seleccione un producto...</option>`;

  if (producto) {
    const opt = document.createElement("option");
    opt.value = producto;
    opt.textContent = producto;
    prodSelect.appendChild(opt);
    prodSelect.value = producto;
  }

  prodSelect.disabled = true;
}


excelInput.addEventListener("change", function (e) {
  if (!e.target.files || !e.target.files[0]) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    
    datosExcel = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    
    const mensaje = document.getElementById("mensaje");
    mensaje.innerText = "";
    renderTablaPreview();
  };
  reader.readAsArrayBuffer(e.target.files[0]);
});

function descargarPlantilla() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Piloto", "Placa", "Cantidad (qq)", "Nombre Transporte", "No. Orden Interna", "Observación"]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  XLSX.writeFile(wb, "plantilla_ingreso_masivo.xlsx");
}

function limpiarFormulario() {
 
  document.getElementById("fecha").value = "";
  document.getElementById("bodega").selectedIndex = 0;
  document.getElementById("tipo_unidad").selectedIndex = 0;
  document.getElementById("buque").selectedIndex = 0;
  document.getElementById("bl").innerHTML = `<option value="">Seleccione una poliza...</option>`;
  document.getElementById("producto").innerHTML = `<option value="">Seleccione un producto...</option>`;
  document.getElementById("producto").disabled = false;

  
  document.getElementById("excelInput").value = "";

  
  datosExcel = [];
  document.querySelector("#tablaPreview tbody").innerHTML = "";


  document.getElementById("mensaje").innerText = "";
}

function validarYNormalizarPlaca(raw) {
  if (raw === undefined || raw === null) {
    return { ok: false, error: "Placa vacía." };
  }

  let s = String(raw).toUpperCase().trim();

 
  s = s.replace(/\s+/g, "");

  
  s = s.replace(/^C-?/, "");

 
  s = s.replace(/[^A-Z0-9]/g, "");

  
  const cuerpo = s;
  const esValida = /^\d{3}[A-Z]{3}$/.test(cuerpo);

  if (!esValida) {
    
    let razon = "";
    if (cuerpo.length !== 6) {
      razon = `Debe tener 6 caracteres (tiene ${cuerpo.length || 0}).`;
    } else if (!/^\d{3}/.test(cuerpo)) {
      razon = "Los primeros 3 deben ser números.";
    } else if (!/[A-Z]{3}$/.test(cuerpo)) {
      razon = "Los últimos 3 deben ser letras.";
    } else {
      razon = "Formato inválido.";
    }
    return { ok: false, error: razon, valorVisto: cuerpo };
  }

  return { ok: true, placa: `C-${cuerpo}` };
}

const toStr = (v) => (v == null ? "" : String(v).trim());

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
    if (lastComma > lastDot) {
      
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
     
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    
    s = s.replace(",", ".");
  }
 

  const n = parseFloat(s);
  if (!isFinite(n)) return { ok: false, error: "Cantidad inválida" };
  if (n < 1) return { ok: false, error: "debe ser ≥ 1" };

  return { ok: true, valor: Number(n.toFixed(4)) }; 
}

function renderTablaPreview() {
  const tbody = document.querySelector("#tablaPreview tbody");
  tbody.innerHTML = "";

  datosExcel.forEach((row) => {
    const placaRaw = toStr(row["Placa"]);
    const res = validarYNormalizarPlaca(placaRaw);
    const estado = res.ok ? `OK → ${res.placa}` : `Error → ${res.error}`;
    const trStyle = res.ok ? "" : ' style="background:#4b1a1a"';

    tbody.innerHTML += `
      <tr${trStyle}>
        <td>${toStr(row["Piloto"])}</td>
        <td>${placaRaw}</td>
        <td>${toStr(row["Cantidad (qq)"])}</td>
        <td>${toStr(row["Nombre Transporte"])}</td>
        <td>${toStr(row["No. Orden Interna"])}</td>
        <td>${toStr(row["Observación"])}</td>
        <td>${estado}</td>
      </tr>
    `;
  });
}

async function crearMasivas() {
  const mensaje = document.getElementById("mensaje");
  mensaje.innerText = "";

  const buque = document.getElementById("buque").value;
  const bl = document.getElementById("bl").value;
  const producto = document.getElementById("producto").value;
  const bodega = document.getElementById("bodega").value;
  const tipo_unidad = document.getElementById("tipo_unidad").value;
  const fechaInput = document.getElementById("fecha").value;

  if (!buque || !bl || !producto || !bodega || !tipo_unidad) {
    mensaje.innerText = "⚠️ Complete todos los campos generales.";
    mensaje.style.color = "orange";
    return;
  }

  
  let fecha_generada;
  if (fechaInput) {
    const hoy = new Date().toISOString().split("T")[0]; 
    if (fechaInput >= hoy) {
      fecha_generada = new Date(fechaInput + "T00:00:00").toLocaleString("sv-SE");
    } else {
      mensaje.innerText = "⚠️ No se permiten fechas pasadas.";
      mensaje.style.color = "orange";
      return;
    }
  } else {
    fecha_generada = new Date().toLocaleString("sv-SE"); 
  }

  const fecha_creada = new Date().toLocaleString("sv-SE");

  const errores = [];
  const ordenes = [];

  datosExcel.forEach((row, idx) => {
    const fila = idx + 2; 

    
    const placaRaw = toStr(row["Placa"]);
    const res = validarYNormalizarPlaca(placaRaw);

    if (!res.ok) {
      errores.push(`Fila ${fila}: "${placaRaw}" → ${res.error}`);
      return;
    }

    const cantRes = parseCantidadQQ(row["Cantidad (qq)"]);
    if (!cantRes.ok) {
      errores.push(`Fila ${fila}: Cantidad (qq) ${cantRes.error}. Valor: "${row["Cantidad (qq)"]}"`);
      return;
    }
    const cantidad = cantRes.valor;

    ordenes.push({
      nit_usuario: nit,
      piloto: toStr(row["Piloto"]),
      placa: res.placa, 
      tipo_unidad,
      producto,
      buque,
      bl,
      bodega,
      cantidad_qq: cantidad,
      nombre_transporte: toStr(row["Nombre Transporte"]),
      no_orden_interna: toStr(row["No. Orden Interna"]),
      observacion: toStr(row["Observación"]),
      fecha_generada,
      fecha_creada
    });
  });

  if (errores.length > 0) {
    mensaje.style.color = "orange";
    mensaje.innerHTML = "⚠️ Corrige las placas antes de continuar:<br>" +
      errores.map(e => "• " + e).join("<br>");
    return;
  }


  const { data: insertadas, error } = await supabaseClient
    .from("ordenes")
    .insert(ordenes)
    .select("no_orden"); 

  if (error) {
    console.error(error);
    mensaje.innerText = "❌ Error al crear las órdenes.";
    mensaje.style.color = "red";
    return;
  }

  const ids = (insertadas || []).map(r => r.no_orden);


mensaje.style.color = "lightgreen";

if (!ids || !ids.length) {
  mensaje.innerText = "✅ Órdenes creadas, pero no se recibieron IDs para imprimir.";
  setTimeout(() => (window.location.href = "menu.html"), 1500);
} else {
  const qs = encodeURIComponent(ids.join(","));

  mensaje.innerHTML = `
    <div class="mt-2">
      ✅ Órdenes creadas exitosamente (${ids.length}).
    </div>
    <div class="mt-3 p-3 rounded" style="background:rgba(255,255,255,.08);display:inline-block">
      <div class="mb-2">
        ¿Desea descargar el PDF con las órdenes <strong>individuales</strong> o <strong>masivas</strong>?
      </div>
      <div class="d-grid gap-2 d-md-flex">
        <button id="btnPDFInd" class="btn btn-outline-light btn-sm">PDF individuales</button>
        <button id="btnPDFMas" class="btn btn-outline-light btn-sm">PDF masivas</button>
        <button id="btnNoPDF"  class="btn btn-secondary btn-sm">No, regresar al menú</button>
      </div>
    </div>
  `;

  
  document.getElementById("btnPDFInd").onclick = () => {
    window.location.href = `imprimir_individuales.html?ids=${qs}`;
  };
  document.getElementById("btnPDFMas").onclick = () => {
   
    window.location.href = `imprimir_masivas.html?ids=${qs}`;
  };
  document.getElementById("btnNoPDF").onclick = () => {
    window.location.href = "menu.html";
  };
}

}


if (!localStorage.getItem("nit")) {
  window.location.replace("login.html");
}