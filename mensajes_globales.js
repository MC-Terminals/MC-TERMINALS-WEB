document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.__supabaseClient;
  if (!supabase) return;

  // Obtener el mensaje activo más reciente
  const { data, error } = await supabase
    .from("mensajes_globales")
    .select("*")
    .eq("activo", true)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return;

  //  Si NO es fijo y ya venció → no mostrar
  if (!data.fijo && data.fin && new Date(data.fin) < new Date()) return;

  //  Clave ÚNICA por mensaje (permite mostrar nuevos mensajes)
  const vistoKey = `mensaje_global_visto_${data.id}`;
  if (sessionStorage.getItem(vistoKey)) return;

  /* =========================
      CONTENIDO DEL MENSAJE
     ========================= */

  //  Texto (con fallback si viene vacío)
  const textoHtml = (data.texto && data.texto.trim())
    ? data.texto.replace(/\n/g, "<br>")
    : "<em class='text-muted'>No se proporcionó descripción.</em>";

  let contenido = `
    <div class="mensaje-texto mb-4">
      ${textoHtml}
    </div>
  `;

  //  Archivo (imagen o PDF) SI existe
  if (data.archivo_url) {
    if (data.archivo_tipo === "pdf") {
      contenido += `
        <div class="mensaje-archivo">
          <iframe
            src="${data.archivo_url}"
            loading="lazy">
          </iframe>
        </div>
      `;
    } else {
      contenido += `
        <div class="mensaje-archivo text-center">
          <img
            src="${data.archivo_url}"
            class="img-fluid rounded"
            alt="Archivo del mensaje">
        </div>
      `;
    }
  }

  /* =========================
      MODAL
     ========================= */

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal fade" id="modalMensajeGlobal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
               ${data.titulo || "COMUNICADO"}
            </h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            ${contenido}
          </div>
        </div>
      </div>
    </div>
  `);

  //  Mostrar modal
  new bootstrap.Modal(
    document.getElementById("modalMensajeGlobal"),
    {
      backdrop: "static",
      keyboard: false
    }
  ).show();

  //  Marcar SOLO este mensaje como visto
  sessionStorage.setItem(vistoKey, "1");
});
