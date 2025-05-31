const supabase = window.supabase.createClient(
  "https://fpqnzqrdyxmhptosplos.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcW56cXJkeXhtaHB0b3NwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjMyNDYsImV4cCI6MjA2MzMzOTI0Nn0.tcz7BdDovKPS-KoPk_LxRJW8ZfJpgjN8fKQ7h6NdR6c"
);

const params = new URLSearchParams(window.location.search);
const ordenId = params.get("orden");

const form = document.getElementById("formEditarOrden");
const mensaje = document.getElementById("mensaje");

// Referencias a los campos del formulario
const placaInput = document.getElementById("placa");
const pilotoInput = document.getElementById("piloto");
const productoSelect = document.getElementById("producto");
const bodegaSelect = document.getElementById("bodega");
const tipoUnidadSelect = document.getElementById("tipo_unidad");
const cantidadInput = document.getElementById("cantidad_qq");
const buqueInput = document.getElementById("buque");
const blInput = document.getElementById("bl");
const observacionInput = document.getElementById("observacion");

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

  // Llenar el formulario
  placaInput.value = data.placa;
  pilotoInput.value = data.piloto;
  productoSelect.value = data.producto;
  bodegaSelect.value = data.bodega;
  tipoUnidadSelect.value = data.tipo_unidad;
  cantidadInput.value = data.cantidad_qq;
  buqueInput.value = data.buque;
  blInput.value = data.bl;
  observacionInput.value = data.observacion || "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const camposActualizados = {
    placa: placaInput.value.trim(),
    piloto: pilotoInput.value.trim(),
    producto: productoSelect.value,
    bodega: bodegaSelect.value,
    tipo_unidad: tipoUnidadSelect.value,
    cantidad_qq: parseInt(cantidadInput.value),
    buque: buqueInput.value.trim(),
    bl: blInput.value.trim(),
    observacion: observacionInput.value.trim(),
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

// Cargar datos al iniciar
document.addEventListener("DOMContentLoaded", cargarDatosOrden);
