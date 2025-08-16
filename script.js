// 🔐 Conexión a Supabase
const SUPABASE_URL = "https://fpqnzqrdyxmhptosplos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 📌 Detectar si estás en login o registro
const path = window.location.pathname;

// 🔐 LOGIN
if (path.includes("login.html")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nit = document.getElementById("nit").value.trim();
    const password = document.getElementById("password").value.trim();
    const mensaje = document.getElementById("mensaje");

    const { data, error } = await supabase.rpc('login_por_nit', {
      p_nit: nit,
      p_password: password
    });

    if (error || !data || data.length === 0) {
      mensaje.innerText = "Usuario o contraseña incorrectos";
      return;
    }

    // ← NUEVO: verificar si está bloqueado
    const { nit: nitOK, rol, empresa, must_change_password } = data[0];
    const { data: uInfo, error: eInfo } = await supabase
      .from('usuarios')
      .select('bloqueado')
      .eq('nit', nitOK)
      .maybeSingle();

    if (eInfo) {
      console.error(eInfo);
      mensaje.innerText = "Error validando el estado del usuario.";
      return;
    }
    if (uInfo?.bloqueado) {
      mensaje.style.color = "tomato";
      mensaje.innerText = "Tu usuario está BLOQUEADO. Contacta a administración.";
      return; // No guardes nada en localStorage
    }
    // ← FIN NUEVO

    localStorage.setItem("nit", nitOK);
    localStorage.setItem("rol", rol);
    localStorage.setItem("nombre", empresa);

    if (must_change_password) {
      window.location.href = "cambiar_password.html";
      return;
    }

    mensaje.style.color = "green";
    mensaje.innerText = `¡Bienvenido, ${empresa}!`;
    setTimeout(() => { window.location.href = "menu.html"; }, 1200);
  });
}




// 📝 REGISTRO
  // —— REGISTRO DE USUARIO —— //
  if (location.pathname.includes("registro.html")) {
    document.getElementById("registroForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const nit     = document.getElementById("nit").value.replace(/\D/g, "");
      const passInp = document.getElementById("password");
      const cargo   = document.getElementById("cargo").value.trim();
      const empresa = document.getElementById("empresa").value.trim();
      const email   = (document.getElementById("email")?.value || "").trim().toLowerCase();
      const rol     = document.getElementById("rol").value;
      const mensaje = document.getElementById("mensaje");

      // Validaciones básicas
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;  // simple y efectivo
if (email && !emailRegex.test(email)) {
  mensaje.innerText = "Ingrese un correo electrónico válido (ej: usuario@empresa.com).";
  return;
}

      const rolActual = localStorage.getItem("rol");
      const rolesPermitidos = ["cheque", "consignatario"];
      const rolesEspeciales = ["admin", "bascula", "operador_externo"];
      if (rolesEspeciales.includes(rol) && rolActual !== "ube_admin" && rolActual !== "admin") {
        mensaje.innerText = "No tienes permiso para asignar este rol.";
        return;
      }
      if (![...rolesPermitidos, ...rolesEspeciales].includes(rol)) {
        mensaje.innerText = "Rol no permitido.";
        return;
      }

      // Generar temporal si el admin deja vacío el campo
      function genTemp(len = 8) {
        const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        return Array.from({length: len}, () => abc[Math.floor(Math.random()*abc.length)]).join("");
      }
      const chosen = (passInp?.value || "").trim();
      if (chosen && (chosen.length < 4 || chosen.length > 15)) {
        mensaje.innerText = "La contraseña debe tener entre 4 y 15 caracteres.";
        return;
      }
      const tempPassword = chosen || genTemp(8);

      // Verifica si ya existe el NIT
      const { data: existe, error: errEx } = await supabase
        .from("usuarios").select("nit").eq("nit", nit).maybeSingle();
      if (errEx) { mensaje.innerText = "Error al verificar NIT."; console.error(errEx); return; }
      if (existe) { mensaje.innerText = "El NIT ya está registrado."; return; }

      // Inserta usuario con temporal + flags
      const { error } = await supabase.from("usuarios").insert([{
        nit,
        password_hash: tempPassword,   // temporal en texto plano (tu decisión actual)
        cargo,
        empresa,
        rol,
        email: email || null,
        must_change_password: true,
        password_temporal: true
      }]);

      if (error) {
        console.error(error);
        mensaje.innerText = "Error al registrar el usuario.";
        return;
      }

      // Mostrar y/o compartir por correo
      mensaje.style.color = "lightgreen";
      mensaje.innerHTML = `
        Usuario creado.<br>
        <b>NIT:</b> ${nit}<br>
        <b>Contraseña temporal:</b> ${tempPassword}<br>
        <small>El sistema pedirá cambiarla al primer ingreso.</small>
      `;

      if (email) {
        const asunto = encodeURIComponent("Acceso de órdenes de carga | MC Terminals");
        const cuerpo = encodeURIComponent(
`Bienvenido/a al sistema de órdenes de carga de MC Terminals.

🔐 Usuario (NIT): ${nit}
🔑 Contraseña temporal: ${tempPassword}

Al ingresar por primera vez, el sistema te pedirá cambiar la contraseña.

Acceso:
https://mc-terminals.github.io/MC-TERMINALS-WEB

-- Equipo MC Terminals`);
        window.open(`mailto:${email}?subject=${asunto}&body=${cuerpo}`, "_blank");
      }

      const volverAlMenu = (rolActual === "ube_admin" || rolActual === "admin");
      setTimeout(()=>{ window.location.href = volverAlMenu ? "menu.html" : "login.html"; }, 3000);
    });
  }


(function initGlobalBanner(){
  if (window.__globalBannerInit) return;  // evita doble init
  window.__globalBannerInit = true;

  // --- Barra visual superior ---
  const bar = document.createElement("div");
  bar.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:99999;
    background:#1b1b3a; color:#fff; border-bottom:2px solid #3f3f91;
    padding:10px 16px; display:none; font-family:Segoe UI, sans-serif;
  `;
  bar.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;justify-content:space-between">
      <div>
        <div id="msg-title" style="font-weight:700"></div>
        <div id="msg-body"  style="margin-top:4px;opacity:.95"></div>
      </div>
      <a id="msg-close" style="color:#fff;cursor:pointer;font-weight:700;text-decoration:none">✕</a>
    </div>
  `;
  document.body.appendChild(bar);

  // Empuja el contenido para que el banner no lo tape
  const pushDown = () => { document.body.style.paddingTop = bar.style.display === "block" ? "54px" : "0px"; };

  // --- Sonido opcional ---
  const audio = document.createElement("audio");
  audio.src = "notificacion.mp3"; // opcional
  audio.preload = "auto";
  document.body.appendChild(audio);

  // Guardamos por usuario quién ya cerró qué mensaje
  const nitUser = localStorage.getItem("nit") || "_anon";
  const LS_KEY  = `dismissed_msgs_${nitUser}`;

  const getDismissed = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  };
  const setDismissed = (id) => {
    const d = getDismissed();
    d[id] = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  };

  let current = null;        // { id, fin }
  let hideTimer = null;

  function scheduleAutoHide(finISO) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (!finISO) return;
    const ms = new Date(finISO).getTime() - Date.now();
    if (ms > 0) {
      hideTimer = setTimeout(() => { if (current?.fin === finISO) hide(); }, ms + 1000);
    }
  }

  function show(m) {
    if (!m) return;
    const gone = getDismissed();
    if (gone[m.id]) return; // este user ya lo cerró

    current = { id: m.id, fin: m.fin || null };
    bar.querySelector("#msg-title").textContent = m.titulo || "Aviso";
    // *********** CAMBIO IMPORTANTE: usar 'texto' (no 'cuerpo') ***********
    bar.querySelector("#msg-body").textContent  = m.texto || "";
    bar.style.display = "block";
    pushDown();
    scheduleAutoHide(m.fin);
    audio.play().catch(()=>{}); // no interrumpe si falla
  }

  function hide() {
    bar.style.display = "none";
    pushDown();
    if (current?.id) setDismissed(current.id);
    current = null;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }
  bar.querySelector("#msg-close").addEventListener("click", hide);

  // 1) Cargar el último activo al entrar (y que no esté expirado)
  async function loadInitial() {
    // Si ya tienes la policy de SELECT que filtra por activo/fin, basta con .eq('activo',true)
    // Si prefieres filtrar también desde el cliente:
    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from("mensajes_globales")
      .select("id,titulo,texto,fin,inicio,activo")
      .eq("activo", true)
      .order("inicio", { ascending: false })
      .limit(5); // trae unos cuantos por si alguno está expirado/descartado

    if (!error && data?.length) {
      // escoge el más reciente no expirado y no descartado
      const visible = data.find(m =>
        !getDismissed()[m.id] &&
        (m.fin === null || m.fin === undefined || m.fin >= nowISO)
      );
      if (visible) show(visible);
    }
  }

  // 2) Realtime: INSERT/UPDATE
  supabase
    .channel("rt:mensajes_globales")
    .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes_globales" },
        (payload) => {
          const m = payload.new;
          if (m?.activo) show(m);
        })
    .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "mensajes_globales" },
        (payload) => {
          const m = payload.new;
          // si desactivan el que estaba visible, ciérralo
          if (m?.activo === false && current?.id === m.id) hide();
          // si activan/actualizan uno, muéstralo (respetando dismiss por user)
          if (m?.activo === true) show(m);
        })
    .subscribe();

  loadInitial();
})();



// 🌐 REDIRECCIÓN DESDE EL MENÚ AL FORMULARIO DE REGISTRO
if (path.includes("menu.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    const btnCrearUsuario = document.getElementById("btnCrearUsuario");
    if (btnCrearUsuario) {
      btnCrearUsuario.addEventListener("click", () => {
        window.location.href = "registro.html";
      });
    }
  });
}

