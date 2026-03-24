const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}
    // Tomamos el NIT guardado tras el login
    const nit = (localStorage.getItem("nit") || "").trim();
    const out = (x)=> document.getElementById("salida").textContent =
      typeof x==='string' ? x : JSON.stringify(x,null,2);

    // Habilitar/deshabilitar minutos según “Fijo”
    const chkFijo   = document.getElementById('chkFijo');
    const duracion  = document.getElementById('duracion');
    const toggleDuration = ()=> duracion.disabled = chkFijo.checked;
    chkFijo.addEventListener('change', toggleDuration); toggleDuration();

    // 🟢 Publicar (via RPC: publicar_mensaje)
async function publicarMensaje() {
  if (!nit) return out("No hay NIT en localStorage.");

  const titulo  = document.getElementById("titulo").value.trim();
  const texto   = document.getElementById("mensajeTexto").value.trim();
  const fijo    = chkFijo.checked;
  const minutos = Number(duracion.value || 30);
  const archivoInput = document.getElementById("archivo");

  let archivo_url = null;
  let archivo_tipo = null;

  // 📎 Subir archivo si existe
  if (archivoInput.files.length > 0) {
    const file = archivoInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    archivo_tipo = file.type.includes("pdf") ? "pdf" : "imagen";

    const path = `mensaje_${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseClient.storage
      .from("mensajes")
      .upload(path, file, { upsert: true });

    if (upErr) return out({ error: upErr.message });

    const { data: urlData } = supabaseClient.storage
      .from("mensajes")
      .getPublicUrl(path);

    archivo_url = urlData.publicUrl;
  }

  // 🟢 Llamar RPC
  const { data, error } = await supabaseClient.rpc("publicar_mensaje", {
    p_titulo: titulo,
    p_texto: texto,
    p_fijo: fijo,
    p_minutos: minutos,
    p_nit: nit,
    p_archivo_url: archivo_url,
    p_archivo_tipo: archivo_tipo
  });

  if (error) return out({ error: error.message });
  out({ ok: true, id: data });
}


    // 🟠 Cerrar (via RPC: cerrar_mensaje)
    async function cerrarMensaje() {
      if (!nit) return out("No hay NIT en localStorage. Inicia sesión.");

      const id = document.getElementById("idCerrar").value.trim();
      if (!id) return out("Ingresa un UUID válido.");

      const { error } = await supabaseClient.rpc("cerrar_mensaje", { p_id: id, p_nit: nit });
      if (error) return out({ error: error.message });
      out({ ok: true });
    }

    // 📄 Listar mensajes activos (solo lectura directa con RLS)
    async function listarActivos() {
  const cont = document.getElementById("listaMensajes");
  cont.innerHTML = "Cargando mensajes...";

  const { data, error } = await supabaseClient
    .from("mensajes_globales")
    .select("*")
    .order("inicio", { ascending: false });

  if (error) {
    cont.innerHTML = "Error cargando mensajes";
    return;
  }

  if (!data || data.length === 0) {
    cont.innerHTML = "<p class='muted'>No hay mensajes.</p>";
    return;
  }

  cont.innerHTML = data.map(m => `
    <div class="card mb-3" style="background:#0f0f2a">
      <div class="card-body">
        <h5>📢 ${m.titulo || "SIN TÍTULO"}</h5>

        <p class="muted">
          ${m.fijo ? "📌 Fijo" : "⏱ Temporal"} |
          ${new Date(m.inicio).toLocaleString()}
        </p>

        ${
          m.archivo_url
            ? `<a href="${m.archivo_url}" target="_blank">📎 Ver archivo</a>`
            : `<p>${(m.texto || "").slice(0,200)}</p>`
        }

        <button class="btn btn-sm btn-danger mt-2"
          onclick="cerrarMensajeDirecto('${m.id}')">
          ❌ Cerrar mensaje
        </button>
      </div>
    </div>
  `).join("");
}


async function cerrarMensajeDirecto(id) {
  if (!confirm("¿Cerrar este mensaje?")) return;

  const { error } = await supabaseClient.rpc("cerrar_mensaje", {
    p_id: id,
    p_nit: nit
  });

  if (error) {
    alert("No se pudo cerrar");
    return;
  }

  listarActivos();
}
