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

    // 👇 Ya NO hacemos select a usuarios ni comparamos en el cliente
    const { data, error } = await supabase.rpc('login_por_nit', {
      p_nit: nit,
      p_password: password
    });

    if (error || !data || data.length === 0) {
      mensaje.innerText = "Usuario o contraseña incorrectos";
      return;
    }

    const { nit: nitOK, rol, empresa } = data[0];
    mensaje.style.color = "green";
    mensaje.innerText = `¡Bienvenido, ${empresa}!`;

    localStorage.setItem("nit", nitOK);
    localStorage.setItem("rol", rol);
    localStorage.setItem("nombre", empresa);

    // (opcional) desbloqueo de audio
    const sonidoLogin = new Audio("notificacion.mp3");
    sonidoLogin.play().then(()=>{ sonidoLogin.pause(); sonidoLogin.currentTime=0; });

    setTimeout(() => { window.location.href = "menu.html"; }, 1500);
  });
}



// 📝 REGISTRO
if (path.includes("registro.html")) {
  document.getElementById("registroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nit = document.getElementById("nit").value.replace(/\D/g, "");
    const password = document.getElementById("password").value;
    const cargo = document.getElementById("cargo").value.trim();
    const empresa = document.getElementById("empresa").value.trim();
    const rol = document.getElementById("rol").value;
    const mensaje = document.getElementById("mensaje");

     // ✅ Validación de longitud de contraseña
    if (password.length < 4 || password.length > 15) {
      mensaje.innerText = "La contraseña debe tener entre 4 y 15 caracteres.";
      return;
    }

    // Rol del usuario que está creando (desde localStorage)
    const rolActual = localStorage.getItem("rol");

    // Validar roles permitidos
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


    const { data: existe, error: errorExistencia } = await supabase
      .from("usuarios")
      .select("nit")
      .eq("nit", nit)
      .maybeSingle();

    if (errorExistencia) {
      mensaje.innerText = "Error al verificar existencia del NIT.";
      console.error("Error al verificar existencia:", errorExistencia);
      return;
    }

    if (existe) {
      mensaje.innerText = "El NIT ya está registrado.";
      return;
    }

const { data, error } = await supabase.from("usuarios").insert([{
  nit,
  password_hash: password,   // 👈 el trigger en la BD la hashea automático
  cargo,
  empresa,
  rol,
}]);



    console.log("Respuesta Supabase:", data, error);

    if (error) {
      mensaje.innerText = "Error al registrar el usuario.";
      console.error("Error Supabase:", error);
    } else {
      mensaje.style.color = "green";
      mensaje.innerText = "Usuario creado exitosamente. Redirigiendo...";
      if (rolActual === "ube_admin" || rolActual === "admin") {
  setTimeout(() => {
    window.location.href = "menu.html";
  }, 2500);
} else {
  localStorage.clear(); // limpiar datos de localStorage en caso de registro externo
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2500);
}
    }
  }
);

}

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

