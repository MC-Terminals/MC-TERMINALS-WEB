const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}


let buqueActual = null;
let productosDisponibles = [];
let empresasDisponibles = [];
let blsAgregados = [];

document.addEventListener("DOMContentLoaded", async () => {
  await cargarEmpresas();
  await cargarProductos();

  document.getElementById("btnGuardarBuque").addEventListener("click", guardarBuque);
  document.getElementById("btnAgregarBL").addEventListener("click", () => {
    document.getElementById("formAgregarBL").classList.remove("d-none");
  });
  document.getElementById("nombreBuque").addEventListener("input", (e) => {
    const btn = document.getElementById("btnAgregarBL");
    btn.disabled = e.target.value.trim() === "";
  });

  document.getElementById("btnVolver").addEventListener("click", () => {
    window.location.href = "ver_buques.html";
  });
if (!localStorage.getItem("nit")) {
  window.location.href = "login.html";
}


});

async function cargarEmpresas() {
  const { data, error } = await supabaseClient.from("usuarios").select("nit, empresa");
  if (data) {
    empresasDisponibles = data;
    const select = document.getElementById("empresaSelect");
    select.innerHTML = "";
    data.forEach(({ nit, empresa }) => {
      const option = document.createElement("option");
      option.value = nit;
      option.textContent = `${empresa} (${nit})`;
      select.appendChild(option);
    });
  }
}

async function cargarProductos() {
  const { data, error } = await supabaseClient.from("productos_buque").select("producto");
  if (data) {
    productosDisponibles = [...new Set(data.map(p => p.producto))];
    const select = document.getElementById("productoSelect");
    productosDisponibles.forEach(prod => {
      const option = document.createElement("option");
      option.value = prod;
      option.textContent = prod;
      select.appendChild(option);
    });
  }
}

function toggleProductoManual(select) {
  const input = document.getElementById("productoManual");
  input.classList.toggle("d-none", select.value !== "otro");
}

function agregarBL() {
  const bl = document.getElementById("blInput").value.trim();
  const nit = document.getElementById("empresaSelect").value;
  const productoSel = document.getElementById("productoSelect").value;
  const productoManual = document.getElementById("productoManual").value.trim();
  const producto = productoSel === "otro" ? productoManual : productoSel;

  if (!bl || !nit || !producto) {
    alert("Completa todos los campos de poliza.");
    return;
  }

  blsAgregados.push({ bl, nit_empresa: nit, producto });

  // Mostrar en pantalla
  const contenedor = document.getElementById("blsAgregados");
  const div = document.createElement("div");
  div.className = "bl-item";
  div.innerHTML = `<strong>BL:</strong> ${bl} | <strong>Empresa:</strong> ${nit} | <strong>Producto:</strong> ${producto}`;
  contenedor.appendChild(div);

  // Limpiar campos
  document.getElementById("blInput").value = "";
  document.getElementById("productoSelect").value = "";
  document.getElementById("productoManual").value = "";
  document.getElementById("productoManual").classList.add("d-none");
  document.getElementById("formAgregarBL").classList.add("d-none");
}

async function guardarBuque() {
  const nombre = document.getElementById("nombreBuque").value.trim();
  const mensaje = document.getElementById("mensaje");

  if (!nombre) {
    mensaje.textContent = "❗ Ingrese el nombre del buque.";
    mensaje.style.color = "orange";
    return;
  }

  if (blsAgregados.length === 0) {
    mensaje.textContent = "❗ Debe agregar al menos una poliza antes de guardar.";
    mensaje.style.color = "orange";
    return;
  }

  // ✅ Verificar si el nombre ya existe
  const { data: existente, error: errorExistencia } = await supabaseClient.from("buques")
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();

  if (errorExistencia) {
    console.error("Error al verificar nombre:", errorExistencia);
    mensaje.textContent = "❌ Error al validar nombre.";
    mensaje.style.color = "red";
    return;
  }

  if (existente) {
    mensaje.textContent = "⚠️ Ya existe un buque con ese nombre.";
    mensaje.style.color = "yellow";
    return;
  }

  // ✅ Insertar el buque
  const { data: buque, error } = await supabaseClient.from("buques")
    .insert([{ nombre }])
    .select()
    .single();

  if (error) {
    console.error("Error al guardar buque:", error);
    mensaje.textContent = "❌ Error al guardar el buque.";
    mensaje.style.color = "red";
    return;
  }

  // ✅ Insertar productos y BLs
  const productosCreados = {};
  for (const { bl, nit_empresa, producto } of blsAgregados) {
    let idProducto;

    if (productosCreados[producto]) {
      idProducto = productosCreados[producto];
    } else {
      const { data: productoData, error: errProd } = await supabaseClient.from("productos_buque")
        .insert([{ id_buque: buque.id, producto }])
        .select()
        .single();

      if (errProd) {
        console.error("Error al guardar producto:", errProd);
        mensaje.textContent = `❌ Error con el producto: ${producto}`;
        mensaje.style.color = "red";
        return;
      }

      idProducto = productoData.id;
      productosCreados[producto] = idProducto;
    }

    await supabaseClient.from("bls_producto").insert([
      {
        id_producto_buque: idProducto,
        nit_empresa,
        bl,
      },
    ]);
  }

  mensaje.textContent = "✅ Buque y BLs guardados correctamente.";
  mensaje.style.color = "lightgreen";

  // ✅ Limpiar todo
  document.getElementById("nombreBuque").value = "";
  document.getElementById("btnAgregarBL").disabled = true;
  document.getElementById("blsAgregados").innerHTML = "";
  blsAgregados = [];
}
