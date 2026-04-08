
  
const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}

  const LOGO_URL = "https://fpqnzqrdyxmhptosplos.supabase.co/storage/v1/object/public/logos/logo_1.png";

  const fmtTon = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtQQ  = new Intl.NumberFormat("es-GT",{ minimumFractionDigits:0, maximumFractionDigits:4 });

  const $status = (t)=>{ const el=document.getElementById('status'); if(el) el.textContent=t||''; };

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

  async function buildAndAutoDownloadPDF(meta) {
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [140, 216], orientation: 'portrait' });

    const pages = Array.from(document.querySelectorAll('.page'));
    if (!pages.length) return;

    $status('Generando PDF…');

    for (let i = 0; i < pages.length; i++) {
      const node = pages[i];

      
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const img = canvas.toDataURL('image/png');

      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      if (i > 0) doc.addPage();
      doc.addImage(img, 'PNG', 0, 0, w, h);
    }

    const fecha = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g,'-');
    const empresa = sanitizeForFilename(meta.empresa || 'Empresa');
    const producto = sanitizeForFilename(meta.producto || 'Producto');
    const fileName = `Ordenes_de_Carga_${empresa}_${producto}_${fecha}.pdf`;

    doc.save(fileName);
    $status('Descargado.');
  }

  async function main() {
    const ids = getQueryIds();
    if (!ids.length) {
      document.getElementById("contenedor").innerHTML =
        '<div class="alert alert-warning m-3">No se recibieron órdenes para imprimir.</div>';
      return;
    }

    
    const { data: ordenes, error } = await supabaseClient.from("ordenes")
      .select("*")
      .in("no_orden", ids);

    if (error) {
      console.error(error);
      document.getElementById("contenedor").innerHTML =
        '<div class="alert alert-danger m-3">Error cargando órdenes.</div>';
      return;
    }

    
    const nits = [...new Set(ordenes.map(o => o.nit_usuario))];
    const { data: usuarios } = await supabaseClient.from("usuarios")
      .select("nit, empresa")
      .in("nit", nits);

    const empresaPorNit = {};
    (usuarios || []).forEach(u => empresaPorNit[u.nit] = u.empresa);

    const buqueIds = [...new Set(ordenes.map(o => o.buque))];
    const { data: buques } = await supabaseClient.from("buques")
      .select("id, nombre")
      .in("id", buqueIds);

    const buquePorId = {};
    (buques || []).forEach(b => buquePorId[b.id] = b.nombre);

    
    const cont = document.getElementById("contenedor");
    cont.innerHTML = ordenes
      .sort((a,b) => a.no_orden - b.no_orden)
      .map(o => {
        const empresa = empresaPorNit[o.nit_usuario] || "Empresa Desconocida";
        const buque   = buquePorId[o.buque] || o.buque;
        const ton     = (typeof o.cantidad_ton === "number")
                        ? o.cantidad_ton
                        : (Number(o.cantidad_qq || 0) / 22.046);
        const fechaGen = o.fecha_generada ? new Date(o.fecha_generada).toLocaleString() : "";

       
        return `
          <div class="page">
            <div class="header">
              <div class="empresa">${empresa}</div>
              <img class="logo" src="${LOGO_URL}" crossorigin="anonymous" />
            </div>
            <h2>Orden de Carga</h2>

            <table class="mb-2">
              <tr><th>No. Orden</th><td>${o.no_orden}</td></tr>
              <tr><th>Empresa</th><td>${empresa}</td></tr>
              <tr><th>Piloto</th><td>${o.piloto || ""}</td></tr>
              <tr><th>Placa</th><td>${o.placa || ""}</td></tr>
              <tr><th>Buque</th><td>${buque}</td></tr>
              <tr><th>Poliza</th><td>${o.bl || ""}</td></tr>
              <tr><th>Tipo Unidad</th><td>${o.tipo_unidad || ""}</td></tr>
              <tr><th>Producto</th><td>${o.producto || ""}</td></tr>
              <tr><th>Bodega</th><td>${o.bodega || ""}</td></tr>
              <tr><th>Cantidad (qq)</th><td>${fmtQQ.format(Number(o.cantidad_qq || 0))}</td></tr>
              <tr><th>Cantidad (ton)</th><td>${fmtTon.format(Number(ton))}</td></tr>
              <tr><th>Estatus</th><td>${o.estatus || ""}</td></tr>
              <tr><th>Nombre Transporte</th><td>${o.nombre_transporte || ""}</td></tr>
              <tr><th>No. Orden Interna</th><td>${o.no_orden_interna || ""}</td></tr>
              <tr><th>Observación</th><td>${o.observacion || ""}</td></tr>
              <tr><th>Turno</th><td>${o.turno || ""}</td></tr>
              <tr><th>Fecha Generada</th><td>${fechaGen}</td></tr>
            </table>
          </div>
        `;
      })
      .join("");

    
    const metaPrimera = {
      empresa: empresaPorNit[ordenes[0].nit_usuario] || 'Empresa',
      producto: ordenes[0].producto || 'Producto',
    };
    await buildAndAutoDownloadPDF(metaPrimera);
  }


  if (!localStorage.getItem("nit")) {
    window.location.replace("login.html");
  } else {
    main().catch(err => { console.error(err); $status('Error generando PDF'); });
  }
