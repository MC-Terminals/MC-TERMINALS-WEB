const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}


document.addEventListener("DOMContentLoaded", async () => {
  await cargarBuques();

  document.getElementById("filtroNombre").addEventListener("input", (e) => {
    const filtro = e.target.value.toLowerCase();
    mostrarBuques(filtro);
  });
if (!localStorage.getItem("nit")) {
  window.location.href = "login.html";
}


});

let buques = [];

async function cargarBuques() {
  const { data, error } = await supabaseClient.from("buques")
    .select("*")
    .order("fecha_agregado", { ascending: false });

  if (error) {
    console.error("Error al cargar buques", error);
    return;
  }

  buques = data;
  mostrarBuques();
}

function mostrarBuques(filtro = "") {
  const tbody = document.getElementById("tbodyBuques");
  tbody.innerHTML = "";

  buques
    .filter(b => b.nombre.toLowerCase().includes(filtro))
    .forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
  <td class="text-white">${b.nombre}</td>
  <td class="text-white">${new Date(b.fecha_agregado).toLocaleString()}</td>
  <td>
    <div class="d-flex gap-2 flex-wrap">
      <a href="editar_buque.html?id=${b.id}" class="btn btn-info btn-sm">🔍 Ver / Editar</a>
      <button class="btn btn-danger btn-sm" onclick="confirmarEliminacion('${b.id}', '${b.nombre}')">🗑️ Eliminar</button>
    </div>
  </td>
`;
tbody.appendChild(tr);
});
}

async function confirmarEliminacion(id, nombre) {
  const clave = prompt(`🔐 Ingresa tu contraseña para eliminar el buque: "${nombre}"`);
  const nit = localStorage.getItem("nit");
  if (!clave || !nit) { alert("Cancelado."); return; }

  const { data: ok, error } = await supabaseClient.rpc('eliminar_buque_seguro', {
    p_nit: nit,
    p_password: clave,
    p_buque_id: id
  });

  if (error) {
    console.error(error);
    alert("❌ Error al intentar eliminar.");
    return;
  }
  if (!ok) {
    alert("❌ Contraseña incorrecta o no tienes permiso.");
    return;
  }
  alert("✅ Buque eliminado.");
  await cargarBuques();
}

