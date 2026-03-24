// guard_bloqueo.js
document.addEventListener("DOMContentLoaded", () => {

  const supabase = window.__supabaseClient;
  const nit = localStorage.getItem("nit");

  // Validaciones básicas
  if (!supabase) {
    console.error("Supabase no inicializado en guard_bloqueo.js");
    return;
  }
  if (!nit) return; // no hay sesión

  //  Chequeo inmediato (por si ya estaba bloqueado)
  supabase
    .from("usuarios")
    .select("bloqueado")
    .eq("nit", nit)
    .maybeSingle()
    .then(({ data, error }) => {
      if (!error && data?.bloqueado) {
        localStorage.clear();
        alert("Tu usuario está bloqueado. Se cerrará la sesión.");
        window.location.href = "login.html";
      }
    })
    .catch(err => console.error("Error chequeo bloqueo:", err));

  //  Suscripción Realtime al bloqueo del usuario
  const channel = supabase
    .channel("rt_bloqueo_" + nit)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "usuarios",
        filter: `nit=eq.${nit}`
      },
      (payload) => {
        if (payload?.new?.bloqueado) {
          localStorage.clear();
          alert("Tu usuario fue bloqueado. Se cerrará la sesión.");
          window.location.href = "login.html";
        }
      }
    )
    .subscribe();

  // Limpieza del canal al salir
  window.addEventListener("beforeunload", () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      console.warn("No se pudo cerrar el canal:", e);
    }
  });

});
