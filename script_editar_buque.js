const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c" // tu clave real
);

let empresas = [];
let productos = [];
let bls = [];
let idBuque = new URLSearchParams(window.location.search).get("id");

// ... (todas las funciones anteriores intactas)

document.addEventListener("DOMContentLoaded", async () => {
  if (!idBuque) {
    alert("❌ ID de buque no proporcionado.");
    window.location.href = "ver_buques.html";
    return;
  }
  if (!localStorage.getItem("nit")) {
  window.location.href = "login.html";
}


  await cargarEmpresas();
  await cargarProductos();
  await cargarDatosBuque();

  document.getElementById("btnActualizar").addEventListener("click", actualizarBuque);
  document.getElementById("btnRegresar").addEventListener("click", () => {
    window.location.href = "ver_buques.html";
  });

  // ✅ Activar botón Agregar BL
  document.getElementById("btnAgregarBL").addEventListener("click", () => {
    document.getElementById("formAgregarBL").classList.remove("d-none");
  });

  // ✅ Mostrar opciones de productos
  const productoSelect = document.getElementById("productoSelect");
  productos.forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    productoSelect.appendChild(option);
  });

  // ✅ Mostrar opciones de empresas
  const empresaSelect = document.getElementById("empresaSelect");
  empresas.forEach(e => {
    const option = document.createElement("option");
    option.value = e.nit;
    option.textContent = `${e.nit} - ${e.empresa}`;
    empresaSelect.appendChild(option);
  });
});

window.toggleProductoManual = function (select) {
  document.getElementById("productoManual").classList.toggle("d-none", select.value !== "otro");
};

window.agregarBL = function () {
  const bl = document.getElementById("blInput").value.trim();
  const empresa = document.getElementById("empresaSelect").value;
  const productoSel = document.getElementById("productoSelect").value;
  const productoManual = document.getElementById("productoManual").value.trim();
  const producto = productoSel === "otro" ? productoManual : productoSel;

  if (!bl || !empresa || !producto) {
    alert("⚠️ Completa todos los campos del BL.");
    return;
  }

  bls.push({ bl, nit_empresa: empresa, producto });

  // Limpiar formulario
  document.getElementById("blInput").value = "";
  document.getElementById("productoManual").value = "";
  document.getElementById("productoManual").classList.add("d-none");
  document.getElementById("productoSelect").value = "";
  document.getElementById("empresaSelect").value = "";

  document.getElementById("formAgregarBL").classList.add("d-none");
  mostrarBLs();
};


async function cargarEmpresas() {
  const { data, error } = await supabase.from("usuarios").select("nit, empresa");
  if (!error) empresas = data;
}

async function cargarProductos() {
  const { data, error } = await supabase.from("productos_buque").select("producto");
  if (!error) productos = [...new Set(data.map(p => p.producto))];
}

async function cargarDatosBuque() {
  const { data: buque, error: buqueError } = await supabase.from("buques").select("*").eq("id", idBuque).single();
  if (buqueError || !buque) {
    alert("❌ Error al obtener buque.");
    return;
  }

  document.getElementById("nombreBuque").value = buque.nombre;

  const { data: productosData } = await supabase
    .from("productos_buque")
    .select("id, producto")
    .eq("id_buque", idBuque);

  const productoIds = productosData.map(p => p.id);

  const { data: blsData } = await supabase
    .from("bls_producto")
    .select("*")
    .in("id_producto_buque", productoIds);

  bls = blsData.map(bl => {
    const producto = productosData.find(p => p.id === bl.id_producto_buque)?.producto || "";
    return { ...bl, producto };
  });

  mostrarBLs();
}

function mostrarBLs() {
  const cont = document.getElementById("listaBLs");
  cont.innerHTML = ""; // limpio el contenido para no duplicar

  bls.forEach((bl, i) => {
    const div = document.createElement("div");
    div.className = "bl-item d-flex justify-content-between align-items-center";
    div.innerHTML = `
      <div>
        <strong>BL:</strong> ${bl.bl} |
        <strong>Empresa:</strong> ${bl.nit_empresa} |
        <strong>Producto:</strong> ${bl.producto}
      </div>
      <div>
        <button class="btn btn-warning btn-sm me-2" onclick="editarBL(${i})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarBL(${i})">Eliminar</button>
      </div>
    `;
    cont.appendChild(div);
  });
}

window.editarBL = function(i) {
  const { bl, nit_empresa, producto } = bls[i];

  const form = document.createElement("div");
  form.innerHTML = `
    <div class="mb-2">
      <label><strong>Número de BL</strong></label>
      <input type="text" id="editBlInput" class="form-control" value="${bl}" />
    </div>
    <div class="mb-2">
      <label><strong>Empresa (NIT)</strong></label>
      <select id="editEmpresaSelect" class="form-select">
        ${empresas.map(e => `<option value="${e.nit}" ${e.nit === nit_empresa ? "selected" : ""}>${e.nit} - ${e.empresa}</option>`).join("")}
      </select>
    </div>
    <div class="mb-2">
      <label><strong>Producto</strong></label>
      <select id="editProductoSelect" class="form-select">
        <option value="">Seleccionar producto</option>
        ${productos.map(p => `<option value="${p}" ${p === producto ? "selected" : ""}>${p}</option>`).join("")}
        <option value="otro">🆕 Otro...</option>
      </select>
      <input type="text" id="editProductoManual" class="form-control mt-2 d-none" placeholder="Nuevo producto" />
    </div>
  `;

  const modal = document.createElement("div");
  modal.className = "modal fade show d-block";
  modal.style.backgroundColor = "rgba(0,0,0,0.5)";
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content bg-dark text-white p-3">
        <div class="modal-header">
          <h5 class="modal-title">Editar BL</h5>
        </div>
        <div class="modal-body">${form.innerHTML}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'))">Cancelar</button>
          <button class="btn btn-primary" onclick="guardarEdicion(${i})">Guardar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  setTimeout(() => {
    const productoSelect = document.getElementById("editProductoSelect");
    const productoManual = document.getElementById("editProductoManual");
    productoSelect.addEventListener("change", () => {
      productoManual.classList.toggle("d-none", productoSelect.value !== "otro");
    });
    if (!productos.includes(producto)) {
      productoSelect.value = "otro";
      productoManual.classList.remove("d-none");
      productoManual.value = producto;
    }
  }, 50);
};

window.guardarEdicion = function(i) {
  const bl = document.getElementById("editBlInput").value.trim();
  const nit_empresa = document.getElementById("editEmpresaSelect").value;
  const productoSel = document.getElementById("editProductoSelect").value;
  const productoManual = document.getElementById("editProductoManual").value.trim();
  const producto = productoSel === "otro" ? productoManual : productoSel;

  if (!bl || !nit_empresa || !producto) {
    alert("Completa todos los campos.");
    return;
  }

  bls[i] = { bl, nit_empresa, producto };
  document.querySelector(".modal.show").remove();
  mostrarBLs();
};


window.eliminarBL = function(i) {
  if (confirm("¿Eliminar este BL?")) {
    bls.splice(i, 1);
    mostrarBLs();
  }
};

async function actualizarBuque() {
  const nuevoNombre = document.getElementById("nombreBuque").value.trim();
  if (!nuevoNombre) return alert("⚠️ Ingresa un nombre para el buque.");
  if (bls.length === 0) return alert("⚠️ Debes agregar al menos un BL.");

  const { data: existe } = await supabase
    .from("buques")
    .select("id")
    .eq("nombre", nuevoNombre)
    .neq("id", idBuque)
    .maybeSingle();

  if (existe) {
    alert("❌ Ya existe un buque con ese nombre.");
    return;
  }

  await supabase.from("buques").update({ nombre: nuevoNombre }).eq("id", idBuque);

  const { data: productosOld } = await supabase
    .from("productos_buque")
    .select("id")
    .eq("id_buque", idBuque);

  const idsOld = productosOld.map(p => p.id);
  if (idsOld.length) {
    await supabase.from("bls_producto").delete().in("id_producto_buque", idsOld);
    await supabase.from("productos_buque").delete().eq("id_buque", idBuque);
  }

  const productosCreados = {};
  for (const bl of bls) {
    let idProducto;
    if (productosCreados[bl.producto]) {
      idProducto = productosCreados[bl.producto];
    } else {
      const { data: prod } = await supabase
        .from("productos_buque")
        .insert([{ id_buque: idBuque, producto: bl.producto }])
        .select()
        .single();
      idProducto = prod.id;
      productosCreados[bl.producto] = idProducto;
    }

    await supabase.from("bls_producto").insert([{
      id_producto_buque: idProducto,
      nit_empresa: bl.nit_empresa,
      bl: bl.bl,
    }]);
  }

  alert("✅ Buque actualizado correctamente.");
  window.location.href = "ver_buques.html";
}
