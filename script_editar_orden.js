const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const params = new URLSearchParams(window.location.search);
const ordenId = params.get("orden");

const form = document.getElementById("formEditarOrden");
const mensaje = document.getElementById("mensaje");
const fechaInput = document.getElementById("fecha_programada");


const placaInput = document.getElementById("placa");
const pilotoInput = document.getElementById("piloto");
const productoSelect = document.getElementById("producto");
const bodegaSelect = document.getElementById("bodega");
const tipoUnidadSelect = document.getElementById("tipo_unidad");
const cantidadInput = document.getElementById("cantidad_qq");
const buqueSelect = document.getElementById("buque");
const blSelect = document.getElementById("bl");
const observacionInput = document.getElementById("observacion");

let todosLosBuques = [];
let buqueBLProducto = {}; // buque → bl → producto

async function cargarBuques() {
  const { data, error } = await supabase
    .from("buques")
    .select("id, nombre, productos_buque (producto, bls_producto (bl))");

  if (error) {
    console.error("Error al cargar buques:", error);
    return;
  }

  todosLosBuques = data;
  buqueSelect.innerHTML = '<option value="">Seleccione un buque</option>';

  data.forEach(buque => {
    const option = document.createElement("option");
    option.value = buque.id;
    option.textContent = buque.nombre;
    buqueSelect.appendChild(option);

    // Estructura: buque -> { bl1: prod1, bl2: prod2, ... }
    const blProducto = {};
    buque.productos_buque.forEach(p => {
      p.bls_producto.forEach(bl => {
        blProducto[bl.bl] = p.producto;
      });
    });

    buqueBLProducto[buque.id] = blProducto;
  });
}

buqueSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  productoSelect.innerHTML = '<option value="">Seleccione producto</option>';
  blSelect.innerHTML = '<option value="">Seleccione BL</option>';

  if (buqueBLProducto[buqueId]) {
    const bls = Object.keys(buqueBLProducto[buqueId]);
    const productosUnicos = [...new Set(Object.values(buqueBLProducto[buqueId]))];

    productosUnicos.forEach(prod => {
      const opt = document.createElement("option");
      opt.value = prod;
      opt.textContent = prod;
      productoSelect.appendChild(opt);
    });

    bls.forEach(bl => {
      const opt = document.createElement("option");
      opt.value = bl;
      opt.textContent = bl;
      blSelect.appendChild(opt);
    });
  }
  productoSelect.value = '';
blSelect.value = '';

});

blSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  const blValue = blSelect.value;

  if (buqueBLProducto[buqueId] && buqueBLProducto[buqueId][blValue]) {
    const productoRelacionado = buqueBLProducto[buqueId][blValue];

    // Filtrar productos válidos para el buque
    const productosUnicos = [...new Set(Object.values(buqueBLProducto[buqueId]))];

    productoSelect.innerHTML = '<option value="">Seleccione producto</option>';
    productosUnicos.forEach(prod => {
      const opt = document.createElement("option");
      opt.value = prod;
      opt.textContent = prod;
      productoSelect.appendChild(opt);
    });

    // Seleccionamos automáticamente el relacionado
    productoSelect.value = productoRelacionado;
  }
});


productoSelect.addEventListener("change", () => {
  const buqueId = buqueSelect.value;
  const productoSeleccionado = productoSelect.value;

  if (buqueBLProducto[buqueId]) {
    const blsRelacionados = Object.entries(buqueBLProducto[buqueId])
      .filter(([bl, prod]) => prod === productoSeleccionado)
      .map(([bl]) => bl);

    blSelect.innerHTML = '<option value="">Seleccione BL</option>';
    blsRelacionados.forEach(bl => {
      const opt = document.createElement("option");
      opt.value = bl;
      opt.textContent = bl;
      blSelect.appendChild(opt);
    });

    // Si el BL actual no es válido, lo limpiamos
    if (!blsRelacionados.includes(blSelect.value)) {
      blSelect.value = '';
    }
  }
});




async function cargarDatosOrden() {
  if (!ordenId) {
    mensaje.innerText = "Orden no especificada.";
    return;
  }

  const { data, error } = await supabase
    .from("ordenes")
    .select("*")
    .eq("no_orden", ordenId)
    .single();

  if (error || !data) {
    mensaje.innerText = "Error al cargar los datos de la orden.";
    console.error(error);
    return;
  }

  placaInput.value = data.placa;
  pilotoInput.value = data.piloto;
  bodegaSelect.value = data.bodega;
  tipoUnidadSelect.value = data.tipo_unidad;
  cantidadInput.value = data.cantidad_qq;
  fechaInput.value = data.fecha_generada ? data.fecha_generada.split("T")[0] : "";
  observacionInput.value = data.observacion || "";

  await cargarBuques();

  buqueSelect.value = data.buque;
  buqueSelect.dispatchEvent(new Event("change"));

  productoSelect.value = data.producto;
  productoSelect.dispatchEvent(new Event("change"));

  blSelect.value = data.bl;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fechaSeleccionada = fechaInput.value;
  const hoy = new Date().toISOString().split("T")[0];

  if (fechaSeleccionada < hoy) {
    alert("No se permiten fechas pasadas.");
    return;
  }

  const camposActualizados = {
    placa: placaInput.value.trim(),
    piloto: pilotoInput.value.trim(),
    producto: productoSelect.value,
    bodega: bodegaSelect.value,
    tipo_unidad: tipoUnidadSelect.value,
    cantidad_qq: parseInt(cantidadInput.value),
    buque: buqueSelect.value,
    bl: blSelect.value,
    observacion: observacionInput.value.trim(),
    fecha_generada: fechaSeleccionada + " 00:00:00",
  };

  const { error } = await supabase
    .from("ordenes")
    .update(camposActualizados)
    .eq("no_orden", ordenId);

  if (error) {
    mensaje.innerText = "Error al actualizar la orden.";
    console.error(error);
  } else {
    mensaje.style.color = "lightgreen";
    mensaje.innerText = "Orden actualizada correctamente.";
    setTimeout(() => {
      window.location.href = "ver_estatus.html";
    }, 2000);
  }
});


document.addEventListener("DOMContentLoaded", cargarDatosOrden);
