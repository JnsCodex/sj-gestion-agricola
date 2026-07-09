/**
 * APP.JS - Orquesta la navegación, el dashboard y el módulo CRUD de ejemplo.
 * Para crear un módulo nuevo en un proyecto futuro: duplica la sección
 * "MÓDULO REGISTROS" (vista HTML + estas funciones) y ajusta los campos.
 */

// ----------------------------------------------------------------------------
// 0. GUARDA DE SESIÓN Y DEFINICIÓN DE MENÚ (dirigido por permisos / RBAC)
// ----------------------------------------------------------------------------

const sesion = Auth.requerirSesion();
if (!sesion) { /* Auth.requerirSesion ya redirige a index.html */ }

const MENU = [
  { id: 'dashboard', modulo: 'Dashboard', label: 'Dashboard', icono: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'registros', modulo: 'Registros', label: 'Registros', icono: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
  { id: 'configuracion', modulo: 'Configuracion', label: 'Configuración', icono: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
];

function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0].toUpperCase(); }).join('');
}

function construirSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  MENU.forEach(function (item) {
    if (!Auth.tienePermiso(sesion, item.modulo, 'lectura')) return;
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (item.id === 'dashboard' ? ' active' : '');
    btn.dataset.vista = item.id;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + item.icono + '"/></svg><span>' + item.label + '</span>';
    btn.addEventListener('click', function () { irAVista(item.id, item.label); });
    nav.appendChild(btn);
  });

  document.getElementById('nombreUsuario').textContent = sesion.nombreCompleto || sesion.usuario;
  document.getElementById('rolUsuario').textContent = sesion.rol;
  document.getElementById('avatarIniciales').textContent = iniciales(sesion.nombreCompleto || sesion.usuario);
}

let vistaActual = 'dashboard';

function irAVista(id, label) {
  vistaActual = id;
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.getElementById('view-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.vista === id); });
  document.getElementById('tituloVista').textContent = label;

  // Navegar entre módulos ya NO dispara peticiones al servidor: todos los
  // datos se sincronizaron de una sola vez al iniciar sesión (ver
  // sincronizarTodo). Aquí solo se pinta lo que ya está en memoria.
  if (id === 'dashboard' && dashboardData) pintarDashboard(dashboardData);
  if (id === 'registros' && registrosCache) renderizarTablaRegistros();
  if (id === 'configuracion') {
    if (configData) renderizarSubvistaActual();
    else cargarConfiguracion();
  }

  // En móvil, cerrar el sidebar tras navegar
  document.getElementById('appShell').classList.remove('mobile-open');
}

// ----------------------------------------------------------------------------
// 1. UTILIDADES DE UI: loading, toasts, sidebar toggle, logout
// ----------------------------------------------------------------------------

// Contador en vez de booleano: si hay varias operaciones simultáneas
// (ej. un refresco en curso + una acción nueva), el overlay solo se
// oculta cuando TODAS terminaron, evitando parpadeos o cierres prematuros.
let cargandoContador = 0;
function setCargando(activo) {
  cargandoContador = Math.max(0, cargandoContador + (activo ? 1 : -1));
  document.getElementById('loadingOverlay').classList.toggle('active', cargandoContador > 0);
}


function mostrarToast(mensaje, tipo) {
  const contenedor = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (tipo || 'success');
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3500);
}

document.getElementById('btnToggleSidebar').addEventListener('click', function () {
  const shell = document.getElementById('appShell');
  if (window.innerWidth <= 768) {
    shell.classList.toggle('mobile-open');
  } else {
    shell.classList.toggle('sidebar-collapsed');
  }
});

document.getElementById('btnLogout').addEventListener('click', function () {
  Auth.logout();
});

document.getElementById('btnSincronizar').addEventListener('click', function () {
  sincronizarTodo(false);
});

// ----------------------------------------------------------------------------
// 2. DASHBOARD
// ----------------------------------------------------------------------------

let chartLabores = null;
let dashboardData = null; // caché en memoria, poblada por sincronizarTodo()

function pintarDashboard(data) {
  pintarKpis(data.kpis);
  pintarGraficoLabores(data.graficoPorLabor);
  pintarTablaUltimos(data.ultimosRegistros);
}

function pintarKpis(kpis) {
  const tarjetas = [
    { label: 'Total de registros', valor: kpis.total, color: 'var(--color-primary)' },
    { label: 'Registros este mes', valor: kpis.registrosEsteMes, color: 'var(--color-info)' },
    { label: 'Labores pendientes', valor: kpis.pendientes, color: 'var(--color-warning)' },
    { label: 'Variedades activas', valor: kpis.variedadesActivas, color: 'var(--color-success)' }
  ];
  document.getElementById('kpiGrid').innerHTML = tarjetas.map(function (t) {
    return '<div class="card kpi-card" style="--kpi-accent:' + t.color + '">' +
      '<div class="kpi-label">' + t.label + '</div>' +
      '<div class="kpi-value">' + t.valor + '</div>' +
      '</div>';
  }).join('');
}

function pintarGraficoLabores(datos) {
  const ctx = document.getElementById('chartLabores');
  if (chartLabores) chartLabores.destroy();
  chartLabores = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.etiquetas,
      datasets: [{
        label: 'Registros',
        data: datos.valores,
        backgroundColor: '#4F46E5',
        borderRadius: 6,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function pintarTablaUltimos(filas) {
  const tbody = document.querySelector('#tablaUltimos tbody');
  if (!filas.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aún no hay registros.</td></tr>';
    return;
  }
  tbody.innerHTML = filas.map(function (f) {
    return '<tr><td>' + formatearFecha(f.Fecha) + '</td><td>' + f.Variedad + '</td><td>' + f.Labor + '</td><td>' + badgeEstado(f.Estado) + '</td></tr>';
  }).join('');
}

// ----------------------------------------------------------------------------
// 3. MÓDULO REGISTROS (CRUD de ejemplo: listar, buscar, ordenar, paginar,
//    crear, editar, eliminar, importar y exportar)
// ----------------------------------------------------------------------------

let registrosCache = null; // null = aún no se cargó ni una vez
let catalogosCache = null; // los catálogos (Variedades/Labores/Estados) cambian poco:
                            // se cargan una sola vez por sesión, no en cada refresco
let ordenActual = { campo: 'Fecha', asc: false };
let paginaActual = 1;
const FILAS_POR_PAGINA = 8;

/**
 * SINCRONIZACIÓN ÚNICA - se ejecuta una vez al entrar (esCargaInicial=true,
 * usa el overlay de pantalla completa) y cada vez que el usuario pulsa el
 * botón "Sincronizar" del topbar (esCargaInicial=false, usa solo el ícono
 * girando, sin bloquear la pantalla). Trae en una sola llamada al backend
 * el dashboard, el historial de registros y los catálogos.
 */
async function sincronizarTodo(esCargaInicial) {
  if (esCargaInicial) setCargando(true);
  else setSincronizando(true);

  try {
    const resp = await Api.get('sincronizarTodo');
    dashboardData = resp.data.dashboard;
    registrosCache = resp.data.registros;
    catalogosCache = resp.data.catalogos;
    llenarSelectsCatalogo();

    if (vistaActual === 'dashboard') pintarDashboard(dashboardData);
    if (vistaActual === 'registros') renderizarTablaRegistros();

    if (!esCargaInicial) mostrarToast('Datos sincronizados correctamente.', 'success');
  } catch (err) {
    mostrarToast(err.message, 'danger');
  } finally {
    if (esCargaInicial) setCargando(false);
    else setSincronizando(false);
  }
}

function setSincronizando(activo) {
  const btn = document.getElementById('btnSincronizar');
  btn.disabled = activo;
  btn.classList.toggle('spinning', activo);
}

function llenarSelectsCatalogo() {
  const c = catalogosCache || { variedades: [], labores: [], estados: [] };
  const opciones = function (lista) { return lista.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join(''); };
  document.getElementById('campo_variedad').innerHTML = opciones(c.variedades);
  document.getElementById('campo_labor').innerHTML = opciones(c.labores);
  document.getElementById('campo_estado').innerHTML = opciones(c.estados);
}

function badgeEstado(estado) {
  const clase = estado === 'Completado' ? 'badge-completado' : (estado === 'En proceso' ? 'badge-proceso' : 'badge-pendiente');
  return '<span class="badge ' + clase + '">' + estado + '</span>';
}

function formatearFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-PE');
}

function obtenerRegistrosFiltrados() {
  const termino = document.getElementById('inputBuscar').value.toLowerCase();
  let datos = (registrosCache || []).filter(function (r) {
    if (!termino) return true;
    return Object.keys(r).some(function (k) { return String(r[k]).toLowerCase().indexOf(termino) > -1; });
  });

  datos.sort(function (a, b) {
    const va = a[ordenActual.campo], vb = b[ordenActual.campo];
    if (va < vb) return ordenActual.asc ? -1 : 1;
    if (va > vb) return ordenActual.asc ? 1 : -1;
    return 0;
  });

  return datos;
}

function renderizarTablaRegistros() {
  const datos = obtenerRegistrosFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(datos.length / FILAS_POR_PAGINA));
  paginaActual = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const pagina = datos.slice(inicio, inicio + FILAS_POR_PAGINA);

  const tbody = document.querySelector('#tablaRegistros tbody');
  if (!pagina.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron registros.</td></tr>';
  } else {
    tbody.innerHTML = pagina.map(function (r) {
      return '<tr>' +
        '<td>' + formatearFecha(r.Fecha) + '</td>' +
        '<td>' + r.Variedad + '</td>' +
        '<td>' + r.Labor + '</td>' +
        '<td>' + r.Responsable + '</td>' +
        '<td class="font-mono">' + (r.Cantidad || '-') + '</td>' +
        '<td>' + badgeEstado(r.Estado) + '</td>' +
        '<td class="table-actions">' +
          botonAccion('editar', r._fila) +
          botonAccion('eliminar', r._fila) +
        '</td>' +
      '</tr>';
    }).join('');
  }

  document.getElementById('paginacionInfo').textContent =
    'Mostrando ' + pagina.length + ' de ' + datos.length + ' registros';
  renderizarPaginacion(totalPaginas);
}

function botonAccion(tipo, fila) {
  if (tipo === 'editar' && !Auth.tienePermiso(sesion, 'Registros', 'edicion')) return '';
  if (tipo === 'eliminar' && !Auth.tienePermiso(sesion, 'Registros', 'eliminacion')) return '';
  const icono = tipo === 'editar'
    ? '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>'
    : '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>';
  return '<button class="btn-plain" title="' + tipo + '" onclick="' + (tipo === 'editar' ? 'abrirModalEditar' : 'confirmarEliminar') + '(' + fila + ')">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + icono + '</svg></button>';
}

function renderizarPaginacion(totalPaginas) {
  const cont = document.getElementById('paginacionBotones');
  let html = '<button ' + (paginaActual === 1 ? 'disabled' : '') + ' onclick="cambiarPagina(' + (paginaActual - 1) + ')">‹</button>';
  for (let i = 1; i <= totalPaginas; i++) {
    html += '<button class="' + (i === paginaActual ? 'active' : '') + '" onclick="cambiarPagina(' + i + ')">' + i + '</button>';
  }
  html += '<button ' + (paginaActual === totalPaginas ? 'disabled' : '') + ' onclick="cambiarPagina(' + (paginaActual + 1) + ')">›</button>';
  cont.innerHTML = html;
}

function cambiarPagina(p) { paginaActual = p; renderizarTablaRegistros(); }

document.getElementById('inputBuscar').addEventListener('input', function () { paginaActual = 1; renderizarTablaRegistros(); });

document.querySelectorAll('#tablaRegistros thead th[data-campo]').forEach(function (th) {
  th.addEventListener('click', function () {
    const campo = th.dataset.campo;
    ordenActual.asc = ordenActual.campo === campo ? !ordenActual.asc : true;
    ordenActual.campo = campo;
    renderizarTablaRegistros();
  });
});

// --- Modal crear / editar -----------------------------------------------

const modalRegistro = document.getElementById('modalRegistro');

document.getElementById('btnNuevoRegistro').addEventListener('click', function () {
  document.getElementById('formRegistro').reset();
  document.getElementById('campo_fila').value = '';
  document.getElementById('campo_id').value = '';
  document.getElementById('modalRegistroTitulo').textContent = 'Nuevo registro';
  document.getElementById('alertModal').innerHTML = '';
  modalRegistro.classList.add('active');
});

function abrirModalEditar(fila) {
  const registro = (registrosCache || []).find(function (r) { return r._fila === fila; });
  if (!registro) return;
  document.getElementById('campo_fila').value = registro._fila;
  document.getElementById('campo_id').value = registro.ID;
  document.getElementById('campo_fecha').value = toInputDate(registro.Fecha);
  document.getElementById('campo_variedad').value = registro.Variedad;
  document.getElementById('campo_labor').value = registro.Labor;
  document.getElementById('campo_estado').value = registro.Estado;
  document.getElementById('campo_responsable').value = registro.Responsable;
  document.getElementById('campo_cantidad').value = registro.Cantidad;
  document.getElementById('campo_observaciones').value = registro.Observaciones;
  document.getElementById('modalRegistroTitulo').textContent = 'Editar registro';
  document.getElementById('alertModal').innerHTML = '';
  modalRegistro.classList.add('active');
}

function toInputDate(valor) {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function cerrarModalRegistro() { modalRegistro.classList.remove('active'); }
document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalRegistro);
document.getElementById('btnCancelarModal').addEventListener('click', cerrarModalRegistro);

document.getElementById('formRegistro').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fila = document.getElementById('campo_fila').value;
  const payload = {
    Fecha: document.getElementById('campo_fecha').value,
    Variedad: document.getElementById('campo_variedad').value,
    Labor: document.getElementById('campo_labor').value,
    Estado: document.getElementById('campo_estado').value,
    Responsable: document.getElementById('campo_responsable').value,
    Cantidad: document.getElementById('campo_cantidad').value,
    Observaciones: document.getElementById('campo_observaciones').value
  };

  setCargando(true);
  try {
    if (fila) {
      payload._fila = Number(fila);
      payload.ID = document.getElementById('campo_id').value;
      await Api.post('editarRegistro', payload);
      mostrarToast('Registro actualizado correctamente.', 'success');
    } else {
      await Api.post('crearRegistro', payload);
      mostrarToast('Registro creado correctamente.', 'success');
    }
    cerrarModalRegistro();
    sincronizarTodo(false); // refresco silencioso: actualiza dashboard + tabla + catálogos
  } catch (err) {
    document.getElementById('alertModal').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
  } finally {
    setCargando(false);
  }
});

// --- Confirmación genérica (la reutilizan Registros, Usuarios, Roles y Catálogos) ---

const modalConfirmar = document.getElementById('modalConfirmar');
let accionConfirmarPendiente = null;

/**
 * Abre el modal de confirmación con un mensaje a medida y ejecuta
 * `callback` (async) solo si el usuario confirma. Así cada módulo define
 * QUÉ eliminar sin duplicar el modal ni los botones.
 */
function pedirConfirmacion(mensaje, callback) {
  document.getElementById('mensajeConfirmar').textContent = mensaje;
  accionConfirmarPendiente = callback;
  modalConfirmar.classList.add('active');
}

document.getElementById('btnCancelarEliminar').addEventListener('click', function () {
  modalConfirmar.classList.remove('active');
  accionConfirmarPendiente = null;
});

document.getElementById('btnConfirmarEliminar').addEventListener('click', async function () {
  if (!accionConfirmarPendiente) return;
  const accion = accionConfirmarPendiente;
  accionConfirmarPendiente = null;
  await accion();
});

function confirmarEliminar(fila) {
  pedirConfirmacion('¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.', async function () {
    const registro = (registrosCache || []).find(function (r) { return r._fila === fila; });
    setCargando(true);
    try {
      await Api.post('eliminarRegistro', { _fila: fila, ID: registro ? registro.ID : '' });
      mostrarToast('Registro eliminado.', 'success');
      modalConfirmar.classList.remove('active');
      sincronizarTodo(false); // refresco silencioso: actualiza dashboard + tabla + catálogos
    } catch (err) {
      mostrarToast(err.message, 'danger');
    } finally {
      setCargando(false);
    }
  });
}

// --- Exportar a Excel (respeta lo filtrado/mostrado en pantalla) -------

document.getElementById('btnExportar').addEventListener('click', function () {
  const datos = obtenerRegistrosFiltrados().map(function (r) {
    return {
      Fecha: formatearFecha(r.Fecha), Variedad: r.Variedad, Labor: r.Labor,
      Responsable: r.Responsable, Cantidad: r.Cantidad, Estado: r.Estado, Observaciones: r.Observaciones
    };
  });
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Registros');
  XLSX.writeFile(libro, 'registros_' + new Date().toISOString().slice(0, 10) + '.xlsx');
});

// --- Importar desde Excel ------------------------------------------------

document.getElementById('btnImportar').addEventListener('click', function () {
  document.getElementById('inputImportar').click();
});

document.getElementById('inputImportar').addEventListener('change', async function (e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  setCargando(true);
  try {
    const filas = await leerArchivoExcel(archivo);
    const resp = await Api.post('importarRegistros', { filas: filas });
    mostrarToast(
      resp.data.insertados + ' insertados, ' + resp.data.omitidos + ' omitidos.',
      resp.data.omitidos > 0 ? 'warning' : 'success'
    );
    if (resp.data.errores.length) console.warn('Errores de importación:', resp.data.errores);
    sincronizarTodo(false); // refresco silencioso: actualiza dashboard + tabla + catálogos
  } catch (err) {
    mostrarToast(err.message, 'danger');
  } finally {
    setCargando(false);
    e.target.value = '';
  }
});

function leerArchivoExcel(archivo) {
  return new Promise(function (resolve, reject) {
    const lector = new FileReader();
    lector.onload = function (e) {
      try {
        const libro = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(hoja));
      } catch (err) { reject(new Error('No se pudo leer el archivo. Verifica que sea un Excel válido.')); }
    };
    lector.onerror = function () { reject(new Error('Error al leer el archivo.')); };
    lector.readAsArrayBuffer(archivo);
  });
}

// ----------------------------------------------------------------------------
// 4. INICIO
// ----------------------------------------------------------------------------

construirSidebar();
sincronizarTodo(true); // primera sincronización: trae TODO de una sola vez (dashboard + registros + catálogos)
