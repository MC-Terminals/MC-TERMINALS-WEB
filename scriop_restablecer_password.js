const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}
    const qs = new URLSearchParams(location.search);
    const nit   = (qs.get("nit") || "").trim();
    const token = (qs.get("token") || "").trim();

    const form = document.getElementById("formReset");
    const msg  = document.getElementById("msg");

    function showMsg(text, ok=false){
      msg.className = "text-center mt-3 " + (ok ? "msg-ok" : "msg-err");
      msg.textContent = text;
    }

    if (!nit || !token) {
      showMsg("Enlace inválido. Solicite uno nuevo.");
      form.style.display = "none";
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const n1 = document.getElementById("new1").value.trim();
      const n2 = document.getElementById("new2").value.trim();

      if (n1.length < 4 || n1.length > 15){ showMsg("La contraseña debe tener entre 4 y 15 caracteres."); return; }
      if (n1 !== n2){ showMsg("Las contraseñas no coinciden."); return; }

      const { data, error } = await supabaseClient.rpc("aplicar_reset_password", {
        p_nit: nit, p_token: token, p_new: n1
      });

      if (error){ console.error(error); showMsg("No se pudo restablecer la contraseña."); return; }
      if (data !== true){ showMsg("Enlace inválido o expirado. Solicite uno nuevo."); return; }

      showMsg("Contraseña actualizada. Ya puedes iniciar sesión.", true);
      setTimeout(()=> location.href = "login.html", 1500);
    });