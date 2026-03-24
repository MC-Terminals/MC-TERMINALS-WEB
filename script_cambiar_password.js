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
// 🔐 SESIÓN
// ===============================
const nit = localStorage.getItem("nit");
if (!nit) {
  location.replace("login.html");
}

// ===============================
// 📣 MENSAJES
// ===============================
const msg = document.getElementById("msg");

function showMsg(text, ok = false) {
  msg.className = "text-center mt-3 " + (ok ? "text-success" : "text-danger");
  msg.textContent = text;
}

// ===============================
// 🔑 CAMBIAR CONTRASEÑA
// ===============================
document.getElementById("formCambiar").addEventListener("submit", async (e) => {
  e.preventDefault();

  const n1 = document.getElementById("new1").value.trim();
  const n2 = document.getElementById("new2").value.trim();

  // Validaciones
  if (n1.length < 4 || n1.length > 15) {
    showMsg("La contraseña debe tener entre 4 y 15 caracteres.");
    return;
  }

  if (n1 !== n2) {
    showMsg("Las contraseñas no coinciden.");
    return;
  }

  // Update REAL con verificación
  const { data, error } = await supabaseClient
    .from("usuarios")
    .update({
      password_hash: n1,
      must_change_password: false,
      password_temporal: false
    })
    .eq("nit", nit)
    .select()
    .single();

  if (error || !data) {
    console.error(error);
    showMsg("No se pudo actualizar la contraseña.");
    return;
  }

  // Éxito
  showMsg("Contraseña actualizada. Vuelve a iniciar sesión.", true);

  // Limpiar sesión y redirigir
  localStorage.clear();

  setTimeout(() => {
    location.replace("login.html");
  }, 1500);
});
