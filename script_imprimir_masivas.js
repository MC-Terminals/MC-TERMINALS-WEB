
const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}

  const LOGO_URL = "https://fpqnzqrdyxmhptosplos.supabase.co/storage/v1/object/public/logos//logo_1.png";
  const MAX_MASIVO = 100; 

  const fmtTon = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtQQ  = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:0, maximumFractionDigits:4 });
  const $s = t => { const el = document.getElementById('status'); if (el) el.textContent = t || ''; };

  function getQueryIds() {
    const p = new URLSearchParams(location.search);
    const raw = (p.get("ids") || "").trim();
    if (!raw) return [];
    return raw.split(",").map(x => Number(x)).filter(x => Number.isFinite(x));
  }

  function sanitizeForFilename(s='') {
    return String(s).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^\w\s-]/g,'')
      .trim().replace(/\s+/g,'_');
  }

  function validacionConjunto(ordenes) {
    if (!ordenes.length) return {ok:false, msg:"No hay órdenes."};
    if (ordenes.length > MAX_MASIVO) {
      return {ok:false, msg:`Máximo permitido: ${MAX_MASIVO} unidades para masivo.`};
    }
    const s0 = { buque: ordenes[0].buque, bl: ordenes[0].bl, producto: ordenes[0].producto };
    const bad = ordenes.some(o => o.buque !== s0.buque || o.bl !== s0.bl || o.producto !== s0.producto);
    if (bad) {
      return {ok:false, msg:"Selección inválida. Deben ser del mismo buque/BL/producto."};
    }
    return {ok:true};
  }

  async function build() {
    const ids = getQueryIds();
    if (!ids.length) { document.getElementById("sheet").innerHTML = '<div class="alert alert-warning m-3">No se recibieron órdenes.</div>'; return null; }

    
    const { data: ordenes, error } = await supabaseClient.from("ordenes").select("*").in("no_orden", ids);
    if (error) { console.error(error); document.getElementById("sheet").innerHTML = '<div class="alert alert-danger m-3">Error cargando órdenes.</div>'; return null; }

    
    const val = validacionConjunto(ordenes);
    if (!val.ok) { document.getElementById("sheet").innerHTML = `<div class="alert alert-warning m-3">${val.msg}</div>`; return null; }

    
    const nits = [...new Set(ordenes.map(o => o.nit_usuario))];
    const { data: usuarios } = await supabaseClient.from("usuarios").select("nit, empresa").in("nit", nits);
    const empresaPorNit = {}; (usuarios || []).forEach(u => empresaPorNit[u.nit] = u.empresa);

    const buqueIds = [...new Set(ordenes.map(o => o.buque))];
    const { data: buques } = await supabaseClient.from("buques").select("id, nombre").in("id", buqueIds);
    const buquePorId = {}; (buques || []).forEach(b => buquePorId[b.id] = b.nombre);

    
    ordenes.sort((a,b)=>a.no_orden-b.no_orden);
    const ref = ordenes[0];
    const empresaNombre = empresaPorNit[ref.nit_usuario] || "Empresa Desconocida";
    const buqueNombre   = buquePorId[ref.buque] || ref.buque;

    
    const totalQQ  = ordenes.reduce((a,o)=> a + Number(o.cantidad_qq || 0), 0);
    const totalTon = ordenes.reduce((a,o)=> a + Number((o.cantidad_ton!=null)?o.cantidad_ton:(o.cantidad_qq||0)/22.046), 0);

    
    const rows = ordenes.map((o,i)=>`
      <tr>
        <td class="nowrap">${i+1}</td>
        <td class="nowrap">${o.no_orden}</td>
        <td>${o.piloto||""}</td>
        <td class="nowrap">${o.placa||""}</td>
        <td>${o.nombre_transporte||""}</td>
        <td class="nowrap">${o.no_orden_interna||""}</td>
        <td class="nowrap">${fmtQQ.format(Number(o.cantidad_qq||0))}</td>
        <td class="nowrap">${fmtTon.format(Number(o.cantidad_ton!=null?o.cantidad_ton:(o.cantidad_qq||0)/22.046))}</td>
        <td>${o.observacion||""}</td>
      </tr>
    `).join("");

    document.getElementById("sheet").innerHTML = `
      <div class="header">
        <div>
          <div><strong>${empresaNombre}</strong></div>
          <table class="meta">
            <tr><td><strong>Buque:</strong> ${buqueNombre}</td></tr>
            <tr><td><strong>BL:</strong> ${ref.bl}</td></tr>
            <tr><td><strong>Producto:</strong> ${ref.producto}</td></tr>
            <tr><td><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</td></tr>
          </table>
        </div>
        <img src="${LOGO_URL}" class="logo" />
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
        <tbody>${rows}</tbody>
      </table>

      <div class="totales">
        <div><strong>Unidades:</strong> ${ordenes.length}</div>
        <div><strong>Total Cantidad (qq):</strong> ${fmtQQ.format(totalQQ)}</div>
        <div><strong>Total Cantidad (ton):</strong> ${fmtTon.format(totalTon)}</div>
      </div>
    `;

    return {empresa: empresaNombre, producto: ref.producto};
  }

async function downloadPDF(meta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  $s('Generando PDF…');

  await doc.html(document.getElementById('sheet'), {
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 900,
    autoPaging: 'text',
    html2canvas: window.html2canvas,    
    
  });

  const fecha = new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
  const empresa = sanitizeForFilename(meta?.empresa || 'Empresa');
  const producto = sanitizeForFilename(meta?.producto || 'Producto');
  doc.save(`Orden_Masiva_${empresa}_${producto}_${fecha}.pdf`);
  $s('Descargado.');
}


  
  if (!localStorage.getItem("nit")) {
    window.location.replace("login.html");
  } else {
    build().then(meta => {
      if (!meta) return;
      document.getElementById('btnDescargar').onclick = () => downloadPDF(meta);
    }).catch(err => { console.error(err); $s('Error generando PDF'); });
  }
