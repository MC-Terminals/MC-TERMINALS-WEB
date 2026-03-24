const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}


  let usuarios = [];
  let usuarioActual = null;
  const tabla = document.getElementById("tablaUsuarios");
  const modalRol = new bootstrap.Modal(document.getElementById("modalRol"));
  const nuevoRol = document.getElementById("nuevoRol");

  // Utilidad: contraseña temporal
  function genTemp(len = 8) {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    return Array.from({length: len}, () => abc[Math.floor(Math.random()*abc.length)]).join("");
  }

  // Cargar usuarios (ahora pedimos 'bloqueado')
  async function cargarUsuarios() {
    const { data, error } = await supabaseClient.from("usuarios")
      .select("nit, empresa, rol, email, must_change_password, bloqueado")
      .order("empresa", { ascending: true });

    if (error) { console.error(error); return; }

    usuarios = data || [];
    mostrarUsuarios();
  }

  // Pintar tabla (con filtros)
  function mostrarUsuarios() {
    const fNit = (document.getElementById("filtroNIT").value || "").toLowerCase();
    const fEmp = (document.getElementById("filtroEmpresa").value || "").toLowerCase();
    tabla.innerHTML = "";

    usuarios
      .filter(u =>
        String(u.nit).toLowerCase().includes(fNit) &&
        String(u.empresa).toLowerCase().includes(fEmp)
      )
      .forEach(u => {
        const disabled = u.bloqueado ? "disabled" : "";
        const badge = u.bloqueado ? ' <span class="badge badge-bloqueado ms-2">Bloqueado</span>' : "";

        const tr = document.createElement("tr");
        if (u.bloqueado) tr.classList.add("table-danger", "table-opacity-75");

        tr.innerHTML = `
          <td>${u.nit}</td>
          <td>${u.empresa}</td>
          <td>${u.rol}${badge}</td>
          <td>${u.email ?? "-"}</td>
          <td>
            <button class="btn btn-sm btn-warning btn-action" ${disabled} onclick="abrirModalRol('${u.nit}')">Asignar Rol</button>
            <button class="btn btn-sm btn-info btn-action" ${disabled} onclick="cambiarEmail('${u.nit}')">Cambiar Email</button>
            <button class="btn btn-sm btn-primary btn-action" ${disabled} onclick="resetYCompartir('${u.nit}')">Reset & Compartir</button>
            <button class="btn btn-sm btn-secondary btn-action" ${disabled} onclick="cambiarContrasena('${u.nit}')">Cambiar Contraseña</button>
            ${
              u.bloqueado
              ? `<button class="btn btn-sm btn-success btn-action" onclick="desbloquearUsuario('${u.nit}')">Desbloquear</button>`
              : `<button class="btn btn-sm btn-danger btn-action" onclick="bloquearUsuario('${u.nit}')">Bloquear</button>`
            }
          </td>`;
        tabla.appendChild(tr);
      });
  }

  // Filtros
  document.getElementById("filtroNIT").addEventListener("input", mostrarUsuarios);
  document.getElementById("filtroEmpresa").addEventListener("input", mostrarUsuarios);

  // Abrir modal de rol
  function abrirModalRol(nit) {
    usuarioActual = nit;
    nuevoRol.value = "";
    modalRol.show();
  }

  // Confirmar rol
  document.getElementById("confirmarRol").addEventListener("click", async () => {
    if (!usuarioActual || !nuevoRol.value) return;

    const { error } = await supabaseClient.from("usuarios")
      .update({ rol: nuevoRol.value })
      .eq("nit", usuarioActual);

    if (error) {
      console.error("Error al asignar rol:", error);
      alert("No se pudo asignar el rol.");
    } else {
      modalRol.hide();
      alert("Rol asignado correctamente.");
      cargarUsuarios();
    }
  });

  // Cambiar Email
  async function cambiarEmail(nit) {
    const user = usuarios.find(u => u.nit === nit);
    const actual = user?.email || "";

    const resp = prompt("Nuevo email (deja vacío para eliminar):", actual);
    if (resp === null) return;           // canceló
    const nuevo = resp.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const valor = nuevo === "" ? null : nuevo;
    if (valor && !emailRegex.test(valor)) {
      alert("Ingrese un correo válido (ej: usuario@empresa.com).");
      return;
    }

    const { error } = await supabaseClient.from("usuarios")
      .update({ email: valor })
      .eq("nit", nit);

    if (error) {
      console.error(error);
      alert("No se pudo actualizar el email.");
    } else {
      alert(valor ? "Email actualizado." : "Email eliminado.");
      cargarUsuarios();
    }
  }

  // Reset + compartir (genera temporal y envía)
  async function resetYCompartir(nit) {
    const temporal = genTemp(8);

    const { data: u, error: e1 } = await supabaseClient.from("usuarios")
      .select("email, empresa")
      .eq("nit", nit)
      .maybeSingle();

    if (e1) { console.error(e1); alert("No se pudo obtener el usuario."); return; }

    const { error: e2 } = await supabaseClient.from("usuarios")
      .update({ password_hash: temporal, must_change_password: true, password_temporal: true })
      .eq("nit", nit);

    if (e2) { console.error(e2); alert("No se pudo resetear la contraseña."); return; }

    const asunto = encodeURIComponent("Acceso temporal | MC Terminals");
    const cuerpo = encodeURIComponent(
`Hola ${u?.empresa || "usuario"},

Se te asignó una nueva contraseña temporal para el sistema de órdenes.

🔐 NIT: ${nit}
🔑 Contraseña temporal: ${temporal}

Al ingresar, el sistema te pedirá cambiarla.

Acceso:
https://mct-web.mcterminals.com/login.html

-- Equipo MC Terminals`);
    const mailto = `mailto:${u?.email || ""}?subject=${asunto}&body=${cuerpo}`;
    window.location.href = mailto;
  }

  // Cambiar contraseña manual
  async function cambiarContrasena(nit) {
    const nueva = prompt("Ingrese la nueva contraseña temporal (4–15 caracteres):");
    if (!nueva) return;
    if (nueva.length < 4 || nueva.length > 15) { alert("Longitud inválida."); return; }

    const { error } = await supabaseClient.from("usuarios")
      .update({ password_hash: nueva, must_change_password: true, password_temporal: true })
      .eq("nit", nit);

    if (error) { console.error(error); alert("No se pudo actualizar la contraseña."); }
    else { alert("Contraseña actualizada. El usuario deberá cambiarla al ingresar."); }
  }

  // Bloquear / Desbloquear
  async function bloquearUsuario(nit) {
    if (!confirm(`¿Bloquear al usuario ${nit}?`)) return;
    const { error } = await supabaseClient.from("usuarios")
      .update({
        bloqueado: true,
        bloqueado_por_nit: localStorage.getItem("nit") || null,
        bloqueado_en: new Date().toISOString()
      })
      .eq("nit", nit);

    if (error) { console.error(error); alert("No se pudo bloquear."); }
    else { cargarUsuarios(); }
  }

  async function desbloquearUsuario(nit) {
    if (!confirm(`¿Desbloquear al usuario ${nit}?`)) return;
    const { error } = await supabaseClient.from("usuarios")
      .update({ bloqueado: false })
      .eq("nit", nit);

    if (error) { console.error(error); alert("No se pudo desbloquear."); }
    else { cargarUsuarios(); }
  }

  // Exponer para onclick
  window.abrirModalRol = abrirModalRol;
  window.cambiarEmail   = cambiarEmail;
  window.resetYCompartir = resetYCompartir;
  window.cambiarContrasena = cambiarContrasena;
  window.bloquearUsuario = bloquearUsuario;
  window.desbloquearUsuario = desbloquearUsuario;

  // Seguridad mínima
  if (!localStorage.getItem("nit")) window.location.replace("login.html");

  // Bloqueo de retroceso
  history.pushState(null, null, location.href);
  window.onpopstate = () => history.pushState(null, null, location.href);

  // Cargar
  document.addEventListener("DOMContentLoaded", cargarUsuarios);