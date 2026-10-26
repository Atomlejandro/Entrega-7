// SIMULADOR DE COMPRAS (versión con DOM y eventos)

// ---------------------------------------------------------------
// 1. CLASE
// ---------------------------------------------------------------
class Producto {
    constructor(nombre, precio, stock, id) {
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
        this.id = id;
        this.ultimoResultado = "Sin compras todavía";
    }

    // Modifica el estado: resta stock si la compra es válida.
    // Devuelve true si la compra se aceptó y false si se rechazó.
    comprarProducto(cantidad) {
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            this.ultimoResultado = "Compra rechazada: la cantidad debe ser un número entero mayor a 0";
            return false;
        }
        if (cantidad > this.stock) {
            this.ultimoResultado = "Compra rechazada: no hay stock suficiente (disponibles: " + this.stock + ")";
            return false;
        }
        this.stock = this.stock - cantidad;
        this.ultimoResultado = "Compra aceptada";
        return true;
    }

    // Solo informa: lee lo que quedó guardado en el objeto.
    mostrarCompra() {
        return this.ultimoResultado + ". Quedan " + this.stock + " artículos de " + this.nombre + " en el inventario.";
    }
}

// ---------------------------------------------------------------
// 2. DATOS
// ---------------------------------------------------------------
const productos = [
    new Producto("Mouse", 100, 10, "001"),
    new Producto("Televisor", 500, 8, "002"),
    new Producto("Teclado", 150, 16, "003"),
    new Producto("Monitor", 300, 6, "004"),
    new Producto("Cargador", 40, 25, "005"),
    new Producto("Audífonos", 120, 0, "006")
];

const compras = [];      // registro de las compras realizadas
let idResaltado = null;  // producto que se resalta tras una acción

// ---------------------------------------------------------------
// 3. SELECCIÓN DE ELEMENTOS DEL DOM
// ---------------------------------------------------------------
const inputNombre = document.getElementById("nombre");
const inputPrecio = document.getElementById("precio");
const inputStock = document.getElementById("stock");
const btnAgregar = document.getElementById("agregar");

const contenedorProductos = document.getElementById("lista-productos");
const inputBuscar = document.getElementById("buscar");

const selectCompra = document.getElementById("compra");
const inputCantidad = document.getElementById("cantidad");
const btnComprar = document.getElementById("comprar");

const contenedorResumen = document.getElementById("resultado-compra");
const mensajeFeedback = document.getElementById("mensaje");

// ---------------------------------------------------------------
// 4. FUNCIONES AUXILIARES
// ---------------------------------------------------------------
const formatoPesos = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

// Evita que un nombre con símbolos como < o > rompa el HTML
function escaparHTML(texto) {
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// FEEDBACK VISUAL: muestra un mensaje en pantalla (exito, error o aviso)
let temporizadorMensaje;
function mostrarMensaje(texto, tipo) {
    mensajeFeedback.textContent = texto;
    mensajeFeedback.className = "mensaje " + tipo;

    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
        mensajeFeedback.textContent = "";
        mensajeFeedback.className = "mensaje";
    }, 6000);
}

// Descuento por volumen
function obtenerDescuento(cantidadComprada) {
    if (cantidadComprada >= 100) {
        return 0.20;
    } else if (cantidadComprada >= 50) {
        return 0.15;
    } else if (cantidadComprada >= 20) {
        return 0.10;
    }
    return 0;
}

function calculadoraPrecios(cantidadComprada, precioUnitario) {
    const precioSinDescuento = cantidadComprada * precioUnitario;
    return precioSinDescuento - (precioSinDescuento * obtenerDescuento(cantidadComprada));
}

// ---------------------------------------------------------------
// 5. RENDERIZADO DINÁMICO
// ---------------------------------------------------------------

// Dibuja las tarjetas de productos (filtradas por lo que escribe el usuario)
function renderizarProductos() {
    const termino = inputBuscar.value.trim().toLowerCase();

    if (productos.length === 0) {
        contenedorProductos.innerHTML = `<p class="vacio">No hay productos en el inventario.</p>`;
        return;
    }

    const visibles = productos.filter(producto => producto.nombre.toLowerCase().includes(termino));

    if (visibles.length === 0) {
        contenedorProductos.innerHTML = `<p class="vacio">Ningún producto coincide con "${escaparHTML(termino)}".</p>`;
        return;
    }

    contenedorProductos.innerHTML = visibles.map(producto => {
        let estado = "";
        if (producto.stock === 0) {
            estado = "agotado";
        } else if (producto.stock <= 3) {
            estado = "stock-bajo";
        }
        const resaltado = producto.id === idResaltado ? "nuevo" : "";
        const textoStock = producto.stock === 0 ? "Agotado" : "Stock: " + producto.stock;

        return `
            <article class="tarjeta ${estado} ${resaltado}">
                <h3>${escaparHTML(producto.nombre)}</h3>
                <p class="precio">${formatoPesos.format(producto.precio)}</p>
                <p class="stock">${textoStock}</p>
                <button class="btn-eliminar" data-id="${producto.id}">Eliminar</button>
            </article>
        `;
    }).join("");
}

// Llena el select de compra solo con productos que tienen stock
function renderizarSelect() {
    const seleccionado = selectCompra.value;
    const disponibles = productos.filter(producto => producto.stock > 0);

    selectCompra.innerHTML = `<option value="">Selecciona un producto</option>` +
        disponibles.map(producto => `
            <option value="${producto.id}">${escaparHTML(producto.nombre)} — ${formatoPesos.format(producto.precio)} (stock: ${producto.stock})</option>
        `).join("");

    // Conserva la selección si el producto sigue disponible
    if (disponibles.some(producto => producto.id === seleccionado)) {
        selectCompra.value = seleccionado;
    }
}

// Dibuja el resumen de la compra con el total
function renderizarResumen() {
    if (compras.length === 0) {
        contenedorResumen.innerHTML = `<p class="vacio">Aún no has registrado compras.</p>`;
        return;
    }

    const totalUnidades = compras.reduce((acumulado, compra) => acumulado + compra.cantidad, 0);
    const totalAPagar = compras.reduce((acumulado, compra) => acumulado + compra.subtotal, 0);

    const filas = compras.map(compra => {
        const descuento = Math.round(obtenerDescuento(compra.cantidad) * 100);
        const etiqueta = descuento > 0 ? `<span class="etiqueta">-${descuento} %</span>` : "";
        return `
            <li>
                <span>${escaparHTML(compra.nombre)} × ${compra.cantidad} ${etiqueta}</span>
                <strong>${formatoPesos.format(compra.subtotal)}</strong>
            </li>
        `;
    }).join("");

    contenedorResumen.innerHTML = `
        <ul class="resumen-lista">${filas}</ul>
        <p class="total">Unidades: ${totalUnidades} · Total a pagar: ${formatoPesos.format(totalAPagar)}</p>
    `;
}

// Vuelve a dibujar todo lo que depende de los datos
function actualizarVista() {
    renderizarProductos();
    renderizarSelect();
    renderizarResumen();
}

// ---------------------------------------------------------------
// 6. EVENTOS
// ---------------------------------------------------------------

// Click en "Agregar": lee el formulario, valida y crea un Producto
function agregarProducto() {
    const nombre = inputNombre.value.trim();
    const precio = Number(inputPrecio.value);
    const stock = Number(inputStock.value);

    if (nombre === "") {
        mostrarMensaje("Escribe el nombre del producto.", "error");
        return;
    }
    if (!(precio > 0)) {
        mostrarMensaje("El precio debe ser un número mayor a 0.", "error");
        return;
    }
    if (!Number.isInteger(stock) || stock <= 0) {
        mostrarMensaje("La cantidad debe ser un número entero mayor a 0.", "error");
        return;
    }
    if (productos.some(producto => producto.nombre.toLowerCase() === nombre.toLowerCase())) {
        mostrarMensaje("Ya existe un producto llamado \"" + nombre + "\".", "error");
        return;
    }

    // Nuevo id: el mayor id actual + 1, con ceros a la izquierda ("007")
    const nuevoId = String(productos.reduce((mayor, producto) => Math.max(mayor, Number(producto.id)), 0) + 1).padStart(3, "0");
    const nuevoProducto = new Producto(nombre, precio, stock, nuevoId);

    productos.push(nuevoProducto);
    idResaltado = nuevoProducto.id;

    inputNombre.value = "";
    inputPrecio.value = "";
    inputStock.value = "";
    inputNombre.focus();

    actualizarVista();
    mostrarMensaje("\"" + nombre + "\" se agregó al inventario.", "exito");
}

// Click en "Comprar": usa el método comprarProducto de la clase
function registrarCompra() {
    const producto = productos.find(item => item.id === selectCompra.value);
    const cantidad = Number(inputCantidad.value);

    if (producto === undefined) {
        mostrarMensaje("Selecciona un producto para comprar.", "error");
        return;
    }

    if (producto.comprarProducto(cantidad)) {
        const existente = compras.find(compra => compra.id === producto.id);

        if (existente !== undefined) {
            // Si ya compró este producto, se acumulan las unidades y se recalcula el descuento
            existente.cantidad += cantidad;
            existente.subtotal = calculadoraPrecios(existente.cantidad, producto.precio);
        } else {
            compras.push({
                id: producto.id,
                nombre: producto.nombre,
                cantidad: cantidad,
                subtotal: calculadoraPrecios(cantidad, producto.precio)
            });
        }

        idResaltado = producto.id;
        inputCantidad.value = "";
        mostrarMensaje(producto.mostrarCompra(), "exito");
    } else {
        mostrarMensaje(producto.ultimoResultado, "error");
    }

    actualizarVista();
}

// Click en "Eliminar": un solo evento en el contenedor atiende a todos los botones
// (los botones se crean dinámicamente, así que se delega el evento)
function eliminarProducto(evento) {
    const boton = evento.target.closest(".btn-eliminar");
    if (boton === null) {
        return;
    }

    const indice = productos.findIndex(producto => producto.id === boton.dataset.id);
    if (indice === -1) {
        return;
    }

    const eliminado = productos.splice(indice, 1)[0];
    idResaltado = null;

    actualizarVista();
    mostrarMensaje("\"" + eliminado.nombre + "\" se eliminó del inventario.", "aviso");
}

// Evento de teclado: filtra la lista mientras el usuario escribe
function filtrarProductos() {
    idResaltado = null;
    renderizarProductos();
}

btnAgregar.addEventListener("click", agregarProducto);
btnComprar.addEventListener("click", registrarCompra);
contenedorProductos.addEventListener("click", eliminarProducto);
inputBuscar.addEventListener("keyup", filtrarProductos);

// ---------------------------------------------------------------
// 7. INICIO
// ---------------------------------------------------------------
actualizarVista();