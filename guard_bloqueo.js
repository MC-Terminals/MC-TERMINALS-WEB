// guard_bloqueo.js
(function () {
  const nit = localStorage.getItem("nit");
  if (!nit) return; // no hay sesión, no hacemos nada

  // 1) Chequeo inmediato (por si ya está bloqueado antes de suscribirse)
  supabase
    .from("usuarios")
    .select("bloqueado")
    .eq("nit", nit)
    .maybeSingle()
    .then(({ data, error }) => {
      if (!error && data?.bloqueado) {
        localStorage.clear();
        alert("Tu usuario está bloqueado. Se cerrará la sesión.");
        location.href = "login.html";
      }
    });

  // 2) Suscripción Realtime a cambios de 'bloqueado' de ESTE usuario
  const ch = supabase
    .channel("rt_bloqueo_" + nit)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "usuarios", filter: `nit=eq.${nit}` },
      (payload) => {
        if (payload?.new?.bloqueado) {
          localStorage.clear();
          alert("Tu usuario fue bloqueado. Se cerrará la sesión.");
          location.href = "login.html";
        }
      }
    )
    .subscribe();

  // 3) Limpieza opcional del canal al salir o recargar
  window.addEventListener("beforeunload", () => {
    try { supabase.removeChannel(ch); } catch (_) {}
  });

  // 4) (Opcional) Fallback: re-check cada 2 min por si se pierde Realtime
  // setInterval(async () => {
  //   const { data } = await supabase.from("usuarios").select("bloqueado").eq("nit", nit).maybeSingle();
  //   if (data?.bloqueado) { localStorage.clear(); location.href = "login.html"; }
  // }, 120000);
})();
