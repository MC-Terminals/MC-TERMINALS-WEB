// Crea el contenedor visual para mostrar el mensaje
const emergente = document.createElement("div");
emergente.id = "mensajeEmergente";
emergente.style.cssText = `
  display: none;
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff4c4c;
  color: white;
  padding: 20px;
  border-radius: 10px;
  z-index: 10000;
  font-size: 1.2rem;
  text-align: center;
`;
emergente.innerHTML = `
  <span id="textoMensaje">Mensaje del sistema...</span><br>
  <small>Se cerrará en <span id="contador">20</span> segundos</small>
`;
document.body.appendChild(emergente);

// Crea el audio para notificación
const audio = document.createElement("audio");
audio.id = "audioNotificacion";
audio.src = "sonidos/notificacion.mp3";  // Ruta local al sonido
audio.preload = "auto";
document.body.appendChild(audio);

// Canal de mensajes globales
const canal = new BroadcastChannel("mensajes_sistema");
canal.onmessage = (e) => mostrarMensajeEmergente(e.data.texto, e.data.duracion || 20);

function mostrarMensajeEmergente(texto, duracion = 20) {
  const contenedor = document.getElementById("mensajeEmergente");
  const textoElem = document.getElementById("textoMensaje");
  const contador = document.getElementById("contador");

  textoElem.innerText = texto;
  contenedor.style.display = "block";
  contador.innerText = duracion;

  // Intenta reproducir el sonido
  audio.play().catch((err) => {
    console.warn("No se pudo reproducir el audio:", err);
  });

  let segundos = duracion;
  const intervalo = setInterval(() => {
    segundos--;
    contador.innerText = segundos;
    if (segundos <= 0) {
      clearInterval(intervalo);
      contenedor.style.display = "none";
    }
  }, 1000);
}
