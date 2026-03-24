// ===============================
// 🔗 SUPABASE CLIENT
// ===============================
const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}

// ===============================
// 🚀 DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // =====================================================
  // 🔐 LOGIN
  // =====================================================
  if (path.includes("login.html")) {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nit = document.getElementById("nit").value.trim();
      const password = document.getElementById("password").value.trim();
      const mensaje = document.getElementById("mensaje");

      const { data, error } = await supabaseClient.rpc("login_por_nit", {
        p_nit: nit,
        p_password: password
      });

      if (error || !data || data.length === 0) {
        mensaje.innerText = "Usuario o contraseña incorrectos";
        return;
      }

      const { nit: nitOK, rol, empresa, must_change_password } = data[0];

      const { data: uInfo } = await supabaseClient
        .from("usuarios")
        .select("bloqueado")
        .eq("nit", nitOK)
        .maybeSingle();

      if (uInfo?.bloqueado) {
        mensaje.style.color = "tomato";
        mensaje.innerText = "Tu usuario está BLOQUEADO.";
        return;
      }

      localStorage.setItem("nit", nitOK);
      localStorage.setItem("rol", rol);
      localStorage.setItem("nombre", empresa);

      if (must_change_password) {
        window.location.href = "cambiar_password.html";
        return;
      }

      mensaje.style.color = "lightgreen";
      mensaje.innerText = `¡Bienvenido, ${empresa}!`;
      setTimeout(() => window.location.href = "menu.html", 1200);
    });
  }

  // =====================================================
  // 📝 REGISTRO
  // =====================================================
  if (path.includes("registro.html")) {

    // 🔐 seguridad: solo usuarios logueados crean usuarios
    if (!localStorage.getItem("nit")) {
      window.location.replace("login.html");
      return;
    }

    cargarRoles();

    const form = document.getElementById("registroForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nitInput = document.getElementById("nit");
      const passInp  = document.getElementById("password");

      const nit     = nitInput.value.replace(/\D/g, "");
      const cargo   = document.getElementById("cargo").value.trim();
      const empresa = document.getElementById("empresa").value.trim();
      const email   = document.getElementById("email").value.trim().toLowerCase();
      const rol     = document.getElementById("rol").value;
      const mensaje = document.getElementById("mensaje");

      // ===============================
      // 🔑 CONTRASEÑA (FIX DEFINITIVO)
      // ===============================
      const chosen = passInp.value.trim();

      const generarPassword = (len = 8) => {
        const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        return Array.from({ length: len }, () =>
          abc[Math.floor(Math.random() * abc.length)]
        ).join("");
      };

      if (chosen && (chosen.length < 4 || chosen.length > 15)) {
        mensaje.innerText = "La contraseña debe tener entre 4 y 15 caracteres.";
        return;
      }

      const tempPassword = chosen || generarPassword();

      // ===============================
      // 🔍 VALIDAR NIT EXISTENTE
      // ===============================
      const { data: existe } = await supabaseClient
        .from("usuarios")
        .select("nit")
        .eq("nit", nit)
        .maybeSingle();

      if (existe) {
        mensaje.innerText = "El NIT ya está registrado.";
        return;
      }

      // ===============================
      // 💾 INSERTAR USUARIO
      // ===============================
      const { error } = await supabaseClient.from("usuarios").insert([{
        nit,
        password_hash: tempPassword,
        cargo,
        empresa,
        rol,
        email: email || null,
        must_change_password: true,
        password_temporal: !chosen,
        bloqueado: false
      }]);

      if (error) {
        console.error(error);
        mensaje.innerText = "Error al registrar usuario.";
        return;
      }

      mensaje.style.color = "lightgreen";
      mensaje.innerHTML = `
        Usuario creado correctamente.<br>
        <b>NIT:</b> ${nit}<br>
        <b>Contraseña:</b> ${tempPassword}
      `;

      setTimeout(() => window.location.href = "login.html", 3000);
    });
  }
});

// =====================================================
// 👁️ VER / OCULTAR CONTRASEÑA
// =====================================================
function togglePassword() {
  const input = document.getElementById("password");
  if (input) {
    input.type = input.type === "password" ? "text" : "password";
  }
}

// =====================================================
// 🎭 CARGAR ROLES
// =====================================================
function cargarRoles() {
  const selectRol = document.getElementById("rol");
  if (!selectRol) return;

  const rolActual = localStorage.getItem("rol");
  selectRol.innerHTML = "";

  const permitidos = ["cheque", "consignatario"];
  const especiales = ["admin", "bascula", "operador_externo"];

  const roles =
    (rolActual === "ube_admin" || rolActual === "admin")
      ? [...permitidos, ...especiales]
      : permitidos;

  selectRol.appendChild(new Option("Seleccione...", ""));

  roles.forEach(r => {
    const label =
      r === "admin" ? "Administrador" :
      r === "bascula" ? "Báscula" :
      r === "operador_externo" ? "Operador Externo" :
      r.charAt(0).toUpperCase() + r.slice(1);

    selectRol.appendChild(new Option(label, r));
  });
}
