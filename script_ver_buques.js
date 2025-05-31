const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

document.addEventListener("DOMContentLoaded", async () => {
  await cargarBuques();

  document.getElementById("filtroNombre").addEventListener("input", (e) => {
    const filtro = e.target.value.toLowerCase();
    mostrarBuques(filtro);
  });
});

let buques = [];

async function cargarBuques() {
  const { data, error } = await supabase
    .from("buques")
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
          <a href="editar_buque.html?id=${b.id}" class="btn btn-info btn-sm me-2">🔍 Ver / Editar</a>
          <button class="btn btn-danger btn-sm" onclick="confirmarEliminacion('${b.id}', '${b.nombre}')">🗑️ Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

async function confirmarEliminacion(id, nombre) {
  const clave = prompt(`🔐 Ingresa tu contraseña para eliminar el buque: "${nombre}"`);
  const nit = localStorage.getItem("nit");

  if (!clave || !nit) {
    alert("Cancelado.");
    return;
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("contraseña")
    .eq("nit", nit)
    .single();

  if (error || usuario.contraseña !== clave) {
    alert("❌ Contraseña incorrecta.");
    return;
  }

  await supabase.from("buques").delete().eq("id", id);
  alert("✅ Buque eliminado.");
  await cargarBuques();
}
