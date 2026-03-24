const supabaseClient = window.__supabaseClient;

if (!supabaseClient) {
  console.error("❌ Supabase no inicializado");
  alert("Error de conexión. Recarga la página.");
  throw new Error("Supabase no inicializado");
}


    const form = document.getElementById("ordenForm");
    const mensaje = document.getElementById("mensaje");

    const blSelect = document.getElementById("bl");
    const productoSelect = document.getElementById("producto");

    blSelect.addEventListener("mousedown", (e) => {
      const buque = document.getElementById("buque").value;
      if (!buque) {
        e.preventDefault();
        mensaje.innerText = "⚠️ Primero debes seleccionar un buque.";
        mensaje.style.color = "orange";
      }
    });

    productoSelect.addEventListener("mousedown", (e) => {
      const bl = document.getElementById("bl").value;
      if (!bl) {
        e.preventDefault();
        mensaje.innerText = "⚠️ Primero debes seleccionar una poliza.";
        mensaje.style.color = "orange";
      }
    });

    function parseCantidadQQ(v) {
      if (v == null || v === "") return { ok: false, error: "Cantidad vacía" };
      let s = String(v).trim().replace(/\s/g, "");
      const hasDot = s.includes(".");
      const hasComma = s.includes(",");
      if (hasDot && hasComma) {
        const lastDot = s.lastIndexOf(".");
        const lastComma = s.lastIndexOf(",");
        if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
      } else if (hasComma && !hasDot) {
        s = s.replace(",", ".");
      }
      const n = parseFloat(s);
      if (!isFinite(n)) return { ok: false, error: "Cantidad inválida" };
      if (n < 1) return { ok: false, error: "La cantidad debe ser ≥ 1" };
      return { ok: true, valor: Number(n.toFixed(4)) };
    }

    // Helpers de fecha/hora en Guatemala (UTC-06:00) 
    function isoAhoraGuatemala() {
      const tz = "America/Guatemala";
      const s = new Intl.DateTimeFormat("sv-SE", {
        timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit",
        hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false
      }).format(new Date());
      return s.replace(" ", "T") + "-06:00";
    }
    function hoyGuatemalaYYYYMMDD() {
      const tz = "America/Guatemala";
      const s = new Intl.DateTimeFormat("sv-SE", {
        timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit"
      }).format(new Date());
      return s.split(" ")[0];
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre_transporte = document.getElementById("nombre_transporte").value.trim();
      const no_orden_interna = document.getElementById("orden_interna").value.trim();

      const inputFecha = document.getElementById("fecha_programada").value;
      if (inputFecha) {
        const hoyGT = hoyGuatemalaYYYYMMDD();
        if (inputFecha < hoyGT) {
          mensaje.innerText = "⚠️ No se permiten fechas pasadas.";
          mensaje.style.color = "orange";
          return;
        }
      }

      const fecha_generada = inputFecha || hoyGuatemalaYYYYMMDD();  
      const fecha_creada   = isoAhoraGuatemala();                   

      const nit_usuario = localStorage.getItem("nit");
      const piloto = document.getElementById("piloto").value.trim();
      const placaRaw = document.getElementById("placa").value.trim().toUpperCase();
      if (!/^\d{3}[A-Z]{3}$/.test(placaRaw)) {
        mensaje.innerText = "Placa inválida. Debe escribir 3 números seguidos de 3 letras, por ejemplo: 123ABC. El sistema agregará C- automáticamente.";
        mensaje.style.color = "orange";
        return;
      }
      const placa = `C-${placaRaw}`;

      const tipo_unidad = document.getElementById("tipo_unidad").value;
      const producto = document.getElementById("producto").value;
      const bodega = document.getElementById("bodega").value;

      const cantRes = parseCantidadQQ(document.getElementById("cantidad_qq").value);
      if (!cantRes.ok) {
        mensaje.innerText = `⚠️ ${cantRes.error}`;
        mensaje.style.color = "orange";
        return;
      }
      const cantidad_qq = cantRes.valor;

      const buque = document.getElementById("buque").value.trim();
      const bl = document.getElementById("bl").value.trim();
      const observacion = document.getElementById("observacion").value.trim();

      if (!piloto || !placa || !tipo_unidad || !producto || !bodega || !buque || !bl) {
        mensaje.innerText = "Por favor llena todos los campos requeridos.";
        mensaje.style.color = "orange";
        return;
      }
      if (!nit_usuario) {
        mensaje.innerText = "Error: Usuario no autenticado.";
        return;
      }

      const payload = {
        nit_usuario, piloto, placa, tipo_unidad, producto, bodega,
        cantidad_qq, buque, bl, nombre_transporte, no_orden_interna,
        observacion, fecha_generada, fecha_creada
      };

      const { error } = await supabaseClient.from("ordenes").insert([payload]);
      if (error) {
        console.error("Error al crear orden:", error);
        mensaje.innerText = "No se pudo crear la orden.";
      } else {
        mensaje.style.color = "lightgreen";
        mensaje.innerText = "¡Orden creada exitosamente!";
        setTimeout(() => { window.location.href = "menu.html"; }, 2000);
      }
    });


  
    const rol = localStorage.getItem("rol");
    const nit_usuario = localStorage.getItem("nit");
    let todosBLs = [];

    document.addEventListener("DOMContentLoaded", async () => {
      await cargarBuques();
      document.getElementById("buque").addEventListener("change", mostrarBLsDelBuque);
      document.getElementById("bl").addEventListener("change", mostrarProductoDelBL);
    });

    async function cargarBuques() {
      const selectBuque = document.getElementById("buque");
      const blSelect = document.getElementById("bl");
      const productoSelect = document.getElementById("producto");

      selectBuque.innerHTML = `<option value="">Seleccione un buque...</option>`;
      blSelect.innerHTML = `<option value="">Seleccione una poliza...</option>`;
      productoSelect.innerHTML = `<option value="">Seleccione un producto...</option>`;
      selectBuque.disabled = false;
      blSelect.disabled = true;
      productoSelect.disabled = true;

      try {
        let buques = [];

        if (rol === "consignatario") {
          const { data: blsData, error: e1 } = await supabaseClient.from("bls_producto")
            .select("id_producto_buque")
            .eq("nit_empresa", nit_usuario);
          if (e1) throw e1;

          const idsProducto = [...new Set((blsData || []).map(b => b.id_producto_buque))];
          if (idsProducto.length === 0) {
            selectBuque.disabled = true;
            blSelect.disabled = true;
            productoSelect.disabled = true;
            const mensaje = document.getElementById("mensaje");
            mensaje.textContent = "No tiene pólizas (BL) asignadas.";
            mensaje.style.color = "orange";
            return;
          }

          const { data: productosData, error: e2 } = await supabaseClient.from("productos_buque")
            .select("id, id_buque")
            .in("id", idsProducto);
          if (e2) throw e2;

          const idsBuques = [...new Set((productosData || []).map(p => p.id_buque))];
          if (idsBuques.length === 0) {
            selectBuque.disabled = true;
            blSelect.disabled = true;
            productoSelect.disabled = true;
            const mensaje = document.getElementById("mensaje");
            mensaje.textContent = "No hay buques disponibles para sus BL.";
            mensaje.style.color = "orange";
            return;
          }

          const { data: buquesData, error: e3 } = await supabaseClient.from("buques")
            .select("id, nombre")
            .in("id", idsBuques)
            .order("nombre", { ascending: true });
          if (e3) throw e3;

          buques = buquesData || [];
        } else {
          const { data, error } = await supabaseClient.from("buques")
            .select("id, nombre")
            .order("nombre", { ascending: true });
          if (error) throw error;
          buques = data || [];
        }

        buques.forEach(b => {
          const opt = document.createElement("option");
          opt.value = b.id;
          opt.textContent = b.nombre;
          selectBuque.appendChild(opt);
        });

        blSelect.disabled = false;
      } catch (err) {
        console.error("Error cargando buques:", err);
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "Error cargando buques.";
        mensaje.style.color = "orange";
      }
    }

    async function mostrarBLsDelBuque() {
      const buqueId = document.getElementById("buque").value;
      const blSelect = document.getElementById("bl");
      const productoSelect = document.getElementById("producto");

      blSelect.innerHTML = `<option value="">Seleccione una poliza...</option>`;
      productoSelect.innerHTML = `<option value="">Seleccione un producto...</option>`;
      productoSelect.disabled = true;

      if (!buqueId) { blSelect.disabled = true; return; }

      try {
        const { data: productos, error: eProd } = await supabaseClient.from("productos_buque")
          .select("id, producto")
          .eq("id_buque", buqueId);
        if (eProd) throw eProd;

        const idsProducto = (productos || []).map(p => p.id);
        if (idsProducto.length === 0) {
          blSelect.disabled = true;
          const mensaje = document.getElementById("mensaje");
          mensaje.textContent = "Este buque no tiene productos disponibles.";
          mensaje.style.color = "orange";
          return;
        }

        let query = supabaseClient.from("bls_producto")
          .select("bl, id_producto_buque, nit_empresa")
          .in("id_producto_buque", idsProducto);

        const rol = localStorage.getItem("rol");
        const nit_usuario = localStorage.getItem("nit");
        if (rol === "consignatario") {
          query = query.eq("nit_empresa", nit_usuario);
        }

        const { data: bls, error: eBL } = await query;
        if (eBL) throw eBL;

        window.todosBLs = (bls || []).map(b => ({
          bl: b.bl,
          id_producto_buque: b.id_producto_buque,
          producto: (productos.find(p => p.id === b.id_producto_buque) || {}).producto || ""
        }));

        if (rol === "consignatario" && window.todosBLs.length === 0) {
          blSelect.disabled = true;
          const mensaje = document.getElementById("mensaje");
          mensaje.textContent = "Este buque no tiene pólizas (BL) asignadas a su empresa.";
          mensaje.style.color = "orange";
          return;
        }

        blSelect.disabled = false;
        window.todosBLs.forEach(b => {
          const opt = document.createElement("option");
          opt.value = b.bl;
          opt.textContent = b.bl;
          blSelect.appendChild(opt);
        });
      } catch (err) {
        console.error("Error listando BL:", err);
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "Error cargando pólizas.";
        mensaje.style.color = "orange";
      }
    }

    function mostrarProductoDelBL() {
      const blSeleccionado = document.getElementById("bl").value;
      const prodSelect = document.getElementById("producto");

      prodSelect.innerHTML = `<option value="">Seleccione un producto...</option>`;
      prodSelect.disabled = true;

      const producto = (window.todosBLs || []).find(b => b.bl === blSeleccionado)?.producto;
      if (producto) {
        const opt = document.createElement("option");
        opt.value = producto;
        opt.textContent = producto;
        prodSelect.appendChild(opt);
        prodSelect.value = producto;
        prodSelect.disabled = true;
      }
    }

    const placaInput = document.getElementById("placa");
    placaInput.addEventListener("input", (e) => {
      let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const numeros = v.slice(0, 3).replace(/\D/g, "");
      const letras  = v.slice(3, 6).replace(/[^A-Z]/g, "");
      e.target.value = (numeros + letras).slice(0, 6);
    });
    placaInput.addEventListener("blur", () => {
      const ok = /^\d{3}[A-Z]{3}$/.test(placaInput.value);
      const mensaje = document.getElementById("mensaje");
      if (placaInput.value && !ok) {
        mensaje.innerText = "Placa inválida. Formato requerido: C-123ABC (usted solo escribe 123ABC).";
        mensaje.style.color = "orange";
        placaInput.focus();
      } else if (ok) {
        mensaje.innerText = "";
      }
    });

    if (!localStorage.getItem("nit")) {
      window.location.replace("login.html");
    }
    history.pushState(null, null, location.href);
    window.onpopstate = function () { history.pushState(null, null, location.href); };

