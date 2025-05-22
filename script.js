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

    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("nit", nit)
      .single();

    if (error || !user) {
      mensaje.innerText = "Usuario no encontrado";
      return;
    }

if (password !== user.contraseña) {
  mensaje.innerText = "Contraseña incorrecta";
} else {
  mensaje.style.color = "green";
  mensaje.innerText = `¡Bienvenido, ${user.nombre}!`;

  localStorage.setItem("nit", user.nit);
  localStorage.setItem("rol", user.rol);
  localStorage.setItem("nombre", user.nombre);

  setTimeout(() => {
    window.location.href = "menu.html";
  }, 1500);
}

  });
}


// 📝 REGISTRO
if (path.includes("registro.html")) {
  document.getElementById("registroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nit = document.getElementById("nit").value.replace(/\D/g, "");
    const password = document.getElementById("password").value;
    const nombre = document.getElementById("nombre").value.trim();
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
    const rolesPermitidos = ["cliente", "consignatario"];
    const rolesEspeciales = ["admin", "bascula"];

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
  contraseña: password,
  nombre,
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

