const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}

    window.addEventListener("DOMContentLoaded", () => {
      const rolActual = localStorage.getItem("rol");
      const selectRol = document.getElementById("rol");
      selectRol.innerHTML = "";

      const opcionesPermitidas = ["cheque", "consignatario"];
      const opcionesEspeciales = ["admin", "bascula", "operador_externo"];
      const opcionesFinales = (rolActual === "ube_admin" || rolActual === "admin")
        ? [...opcionesPermitidas, ...opcionesEspeciales]
        : opcionesPermitidas;

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Seleccione...";
      selectRol.appendChild(defaultOption);

      opcionesFinales.forEach(rol => {
        const option = document.createElement("option");
        option.value = rol;
        option.textContent =
          rol === "bascula" ? "Báscula" :
          rol === "admin" ? "Administrador" :
          rol === "cheque" ? "Cheque" :
          rol === "operador_externo" ? "Operador Externo" :
          rol.charAt(0).toUpperCase() + rol.slice(1);
        selectRol.appendChild(option);
      });

      // Cambiar botón si viene del menú
      const volverBtn = document.getElementById("volverBtn");
      if (rolActual === "ube_admin" || rolActual === "admin") {
        volverBtn.href = "menu.html";
        volverBtn.textContent = "Volver al Menú";
      }
    });

    function togglePassword() {
      const passInput = document.getElementById("password");
      passInput.type = passInput.type === "password" ? "text" : "password";
    }
    // Seguridad: sesión obligatoria
    if (!localStorage.getItem("nit")) {
      window.location.replace("login.html");
    }
    // Bloqueo de retroceso
    history.pushState(null, null, location.href);
    window.onpopstate = function () { history.pushState(null, null, location.href); };