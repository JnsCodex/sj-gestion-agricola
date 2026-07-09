/**
 * CONFIGURACION.JS - Submódulos de administración: Usuarios, Roles,
 * Permisos y Catálogos (Variedades/Labores).
 *
 * Sigue el mismo patrón que "Registros" en app.js (tabla + modal +
 * Api.get/Api.post), separado en su propio archivo para no inflar app.js.
 * Todas estas acciones requieren permiso sobre el módulo "Usuarios" (solo
 * para Usuarios) o "Configuracion" (Roles, Permisos, Variedades, Labores).
 */

// ----------------------------------------------------------------------------
// 0. ESTADO Y CARGA
// ----------------------------------------------------------------------------

let configData = null; // { usuarios, roles, permisos, variedades, labores }
let subvistaActual = 'usuarios';

async function cargarConfiguracion() {
  setCargando(true);
  try {
    const resp = await Api.get('cargarConfiguracion');
    configData = resp.data;
    renderizarSubvistaActual();
  } catch (err) {
    mostrarToast(err.message, 'danger');
  } finally {
    setCargando(false);
  }
}

function renderizarSubvistaActual() {
  if (!configData) return;
  if (subvistaActual === 'usuarios') renderizarTablaUsuarios();
  if (subvistaActual === 'roles') renderizarTablaRoles();
  if (subvistaActual === 'permisos') renderizarSelectRolPermisos();
  if (subvistaActual === 'catalogos') { renderizarTablaCatalogo('variedades'); renderizarTablaCatalogo('labores'); }
}

document.querySelectorAll('.subtab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    subvistaActual = btn.dataset.subtab;
    document.querySelectorAll('.subtab-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
    document.querySelectorAll('.subview').forEach(function (v) { v.classList.remove('active'); });
    document.getElementById('subview-' + subvistaActual).classList.add('active');
    renderizarSubvistaActual();
  });
});

/** Badge Activo/Inactivo, reutilizado por Usuarios, Variedades y Labores. */
function badgeEstadoGenerico(estado) {
  const clase = estado === 'Activo' ? 'badge-completado' : 'badge-pendiente';
  return '<span class="badge ' + clase + '">' + estado + '</span>';
}

function iconoEditar() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
}
function iconoEliminar() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>';
}

// ----------------------------------------------------------------------------
// 1. USUARIOS
// ----------------------------------------------------------------------------

function renderizarTablaUsuarios() {
  const tbody = document.querySelector('#tablaUsuarios tbody');
  if (!configData.usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay usuarios.</td></tr>';
    return;
  }
  tbody.innerHTML = configData.usuarios.map(function (u) {
    return '<tr>' +
      '<td>' + u.Usuario + '</td>' +
      '<td>' + u.NombreCompleto + '</td>' +
      '<td>' + u.Rol + '</td>' +
      '<td>' + badgeEstadoGenerico(u.Estado) + '</td>' +
      '<td>' + (u.UltimoAcceso ? formatearFecha(u.UltimoAcceso) : '—') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn-plain" title="Editar" onclick="abrirModalEditarUsuario(' + u._fila + ')">' + iconoEditar() + '</button>' +
        '<button class="btn-plain" title="Restablecer contraseña" onclick="abrirModalResetPassword(' + u._fila + ')">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' +
        '</button>' +
        '<button class="btn-plain" title="Eliminar" onclick="confirmarEliminarUsuario(' + u._fila + ')">' + iconoEliminar() + '</button>' +
      '</td></tr>';
  }).join('');
}

function llenarSelectRoles(selectId, valorSeleccionado) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = configData.roles.map(function (r) { return '<option value="' + r.Rol + '">' + r.Rol + '</option>'; }).join('');
  if (valorSeleccionado) sel.value = valorSeleccionado;
}

const modalUsuario = document.getElementById('modalUsuario');

document.getElementById('btnNuevoUsuario').addEventListener('click', function () {
  document.getElementById('formUsuario').reset();
  document.getElementById('usr_fila').value = '';
  document.getElementById('usr_usuario').disabled = false;
  document.getElementById('grupoPasswordUsuario').style.display = '';
  document.getElementById('usr_password').required = true;
  document.getElementById('modalUsuarioTitulo').textContent = 'Nuevo usuario';
  llenarSelectRoles('usr_rol');
  document.getElementById('alertModalUsuario').innerHTML = '';
  modalUsuario.classList.add('active');
});

function abrirModalEditarUsuario(fila) {
  const u = configData.usuarios.find(function (x) { return x._fila === fila; });
  if (!u) return;
  document.getElementById('formUsuario').reset();
  llenarSelectRoles('usr_rol', u.Rol);
  document.getElementById('usr_fila').value = u._fila;
  document.getElementById('usr_usuario').value = u.Usuario;
  document.getElementById('usr_usuario').disabled = true; // el nombre de usuario no se puede cambiar
  document.getElementById('usr_nombre').value = u.NombreCompleto;
  document.getElementById('usr_estado').value = u.Estado;
  document.getElementById('grupoPasswordUsuario').style.display = 'none';
  document.getElementById('usr_password').required = false;
  document.getElementById('modalUsuarioTitulo').textContent = 'Editar usuario';
  document.getElementById('alertModalUsuario').innerHTML = '';
  modalUsuario.classList.add('active');
}

document.getElementById('btnCerrarModalUsuario').addEventListener('click', function () { modalUsuario.classList.remove('active'); });
document.getElementById('btnCancelarModalUsuario').addEventListener('click', function () { modalUsuario.classList.remove('active'); });

document.getElementById('formUsuario').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fila = document.getElementById('usr_fila').value;
  const payload = {
    Usuario: document.getElementById('usr_usuario').value.trim(),
    NombreCompleto: document.getElementById('usr_nombre').value.trim(),
    Rol: document.getElementById('usr_rol').value,
    Estado: document.getElementById('usr_estado').value
  };

  setCargando(true);
  try {
    if (fila) {
      payload._fila = Number(fila);
      await Api.post('editarUsuario', payload);
      mostrarToast('Usuario actualizado.', 'success');
    } else {
      payload.Password = document.getElementById('usr_password').value;
      await Api.post('crearUsuario', payload);
      mostrarToast('Usuario creado.', 'success');
    }
    modalUsuario.classList.remove('active');
    await cargarConfiguracion();
  } catch (err) {
    document.getElementById('alertModalUsuario').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
  } finally {
    setCargando(false);
  }
});

// --- Restablecer contraseña ---

let filaUsuarioReset = null;
const modalResetPassword = document.getElementById('modalResetPassword');

function abrirModalResetPassword(fila) {
  filaUsuarioReset = fila;
  document.getElementById('formResetPassword').reset();
  document.getElementById('alertModalReset').innerHTML = '';
  modalResetPassword.classList.add('active');
}
document.getElementById('btnCerrarModalReset').addEventListener('click', function () { modalResetPassword.classList.remove('active'); });
document.getElementById('btnCancelarModalReset').addEventListener('click', function () { modalResetPassword.classList.remove('active'); });

document.getElementById('formResetPassword').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nueva = document.getElementById('reset_password').value;
  setCargando(true);
  try {
    await Api.post('resetearPasswordUsuario', { _fila: filaUsuarioReset, NuevaPassword: nueva });
    mostrarToast('Contraseña restablecida correctamente.', 'success');
    modalResetPassword.classList.remove('active');
  } catch (err) {
    document.getElementById('alertModalReset').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
  } finally {
    setCargando(false);
  }
});

function confirmarEliminarUsuario(fila) {
  const u = configData.usuarios.find(function (x) { return x._fila === fila; });
  pedirConfirmacion('¿Eliminar al usuario "' + (u ? u.Usuario : '') + '"? Esta acción no se puede deshacer.', async function () {
    setCargando(true);
    try {
      await Api.post('eliminarUsuario', { _fila: fila });
      mostrarToast('Usuario eliminado.', 'success');
      modalConfirmar.classList.remove('active');
      await cargarConfiguracion();
    } catch (err) {
      mostrarToast(err.message, 'danger');
    } finally {
      setCargando(false);
    }
  });
}

// ----------------------------------------------------------------------------
// 2. ROLES
// ----------------------------------------------------------------------------

function renderizarTablaRoles() {
  const tbody = document.querySelector('#tablaRoles tbody');
  if (!configData.roles.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No hay roles.</td></tr>';
    return;
  }
  tbody.innerHTML = configData.roles.map(function (r) {
    return '<tr>' +
      '<td>' + r.Rol + '</td>' +
      '<td>' + (r.Descripcion || '—') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn-plain" title="Editar" onclick="abrirModalEditarRol(' + r._fila + ')">' + iconoEditar() + '</button>' +
        '<button class="btn-plain" title="Eliminar" onclick="confirmarEliminarRol(' + r._fila + ', \'' + r.Rol.replace(/'/g, "\\'") + '\')">' + iconoEliminar() + '</button>' +
      '</td></tr>';
  }).join('');
}

const modalRol = document.getElementById('modalRol');

document.getElementById('btnNuevoRol').addEventListener('click', function () {
  document.getElementById('formRol').reset();
  document.getElementById('rol_fila').value = '';
  document.getElementById('rol_nombre').disabled = false;
  document.getElementById('modalRolTitulo').textContent = 'Nuevo rol';
  document.getElementById('alertModalRol').innerHTML = '';
  modalRol.classList.add('active');
});

function abrirModalEditarRol(fila) {
  const r = configData.roles.find(function (x) { return x._fila === fila; });
  if (!r) return;
  document.getElementById('rol_fila').value = r._fila;
  document.getElementById('rol_nombre').value = r.Rol;
  document.getElementById('rol_nombre').disabled = true; // ver nota en editarRol() del backend
  document.getElementById('rol_descripcion').value = r.Descripcion || '';
  document.getElementById('modalRolTitulo').textContent = 'Editar rol';
  document.getElementById('alertModalRol').innerHTML = '';
  modalRol.classList.add('active');
}

document.getElementById('btnCerrarModalRol').addEventListener('click', function () { modalRol.classList.remove('active'); });
document.getElementById('btnCancelarModalRol').addEventListener('click', function () { modalRol.classList.remove('active'); });

document.getElementById('formRol').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fila = document.getElementById('rol_fila').value;
  setCargando(true);
  try {
    if (fila) {
      await Api.post('editarRol', {
        _fila: Number(fila),
        Rol: document.getElementById('rol_nombre').value,
        Descripcion: document.getElementById('rol_descripcion').value
      });
      mostrarToast('Rol actualizado.', 'success');
    } else {
      await Api.post('crearRol', {
        Rol: document.getElementById('rol_nombre').value.trim(),
        Descripcion: document.getElementById('rol_descripcion').value
      });
      mostrarToast('Rol creado.', 'success');
    }
    modalRol.classList.remove('active');
    await cargarConfiguracion();
  } catch (err) {
    document.getElementById('alertModalRol').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
  } finally {
    setCargando(false);
  }
});

function confirmarEliminarRol(fila, nombreRol) {
  pedirConfirmacion('¿Eliminar el rol "' + nombreRol + '"? Solo se puede eliminar si ningún usuario lo tiene asignado.', async function () {
    setCargando(true);
    try {
      await Api.post('eliminarRol', { _fila: fila, Rol: nombreRol });
      mostrarToast('Rol eliminado.', 'success');
      modalConfirmar.classList.remove('active');
      await cargarConfiguracion();
    } catch (err) {
      mostrarToast(err.message, 'danger');
    } finally {
      setCargando(false);
    }
  });
}

// ----------------------------------------------------------------------------
// 3. PERMISOS (matriz por rol)
// ----------------------------------------------------------------------------

// Debe reflejar los mismos módulos que MODULOS_BASE en el backend (Code.gs).
const MODULOS_UI = [
  { modulo: 'Dashboard', label: 'Dashboard' },
  { modulo: 'Registros', label: 'Registros' },
  { modulo: 'Usuarios', label: 'Usuarios' },
  { modulo: 'Configuracion', label: 'Configuración' }
];

function renderizarSelectRolPermisos() {
  const sel = document.getElementById('selectRolPermisos');
  const valorPrevio = sel.value;
  sel.innerHTML = '<option value="">Selecciona...</option>' +
    configData.roles.map(function (r) { return '<option value="' + r.Rol + '">' + r.Rol + '</option>'; }).join('');
  if (valorPrevio) { sel.value = valorPrevio; sel.dispatchEvent(new Event('change')); }
  else { document.getElementById('matrizPermisos').innerHTML = ''; document.getElementById('btnGuardarPermisos').disabled = true; }
}

document.getElementById('selectRolPermisos').addEventListener('change', function () {
  const rol = this.value;
  const contenedor = document.getElementById('matrizPermisos');
  const btnGuardar = document.getElementById('btnGuardarPermisos');
  if (!rol) { contenedor.innerHTML = ''; btnGuardar.disabled = true; return; }

  const permisosDelRol = configData.permisos.filter(function (p) { return p.Rol === rol; });
  const filaHeader = '<div class="matriz-permisos-row header"><div></div><div>Lectura</div><div>Crear</div><div>Editar</div><div>Eliminar</div></div>';
  const filas = MODULOS_UI.map(function (m) {
    const p = permisosDelRol.find(function (x) { return x.Modulo === m.modulo; }) || {};
    return '<div class="matriz-permisos-row" data-modulo="' + m.modulo + '">' +
      '<div>' + m.label + '</div>' +
      '<div><input type="checkbox" data-permiso="lectura" ' + (p.Lectura ? 'checked' : '') + '></div>' +
      '<div><input type="checkbox" data-permiso="creacion" ' + (p.Creacion ? 'checked' : '') + '></div>' +
      '<div><input type="checkbox" data-permiso="edicion" ' + (p.Edicion ? 'checked' : '') + '></div>' +
      '<div><input type="checkbox" data-permiso="eliminacion" ' + (p.Eliminacion ? 'checked' : '') + '></div>' +
      '</div>';
  }).join('');
  contenedor.innerHTML = filaHeader + filas;
  btnGuardar.disabled = false;
});

document.getElementById('btnGuardarPermisos').addEventListener('click', async function () {
  const rol = document.getElementById('selectRolPermisos').value;
  if (!rol) return;

  const permisos = {};
  document.querySelectorAll('#matrizPermisos .matriz-permisos-row[data-modulo]').forEach(function (fila) {
    const modulo = fila.dataset.modulo;
    permisos[modulo] = {
      lectura: fila.querySelector('[data-permiso="lectura"]').checked,
      creacion: fila.querySelector('[data-permiso="creacion"]').checked,
      edicion: fila.querySelector('[data-permiso="edicion"]').checked,
      eliminacion: fila.querySelector('[data-permiso="eliminacion"]').checked
    };
  });

  setCargando(true);
  try {
    await Api.post('guardarPermisos', { Rol: rol, permisos: permisos });
    mostrarToast('Permisos guardados. Aplicarán en el próximo inicio de sesión de cada usuario.', 'success');
    await cargarConfiguracion();
  } catch (err) {
    mostrarToast(err.message, 'danger');
  } finally {
    setCargando(false);
  }
});

// ----------------------------------------------------------------------------
// 4. CATÁLOGOS (Variedades y Labores comparten un solo modal/lógica)
// ----------------------------------------------------------------------------

let catalogoActivo = null;   // 'variedades' | 'labores'
let filaCatalogoEditar = null;

function renderizarTablaCatalogo(tipo) {
  const lista = configData[tipo];
  const tablaId = tipo === 'variedades' ? 'tablaVariedades' : 'tablaLabores';
  const tbody = document.querySelector('#' + tablaId + ' tbody');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Sin registros.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(function (item) {
    return '<tr>' +
      '<td>' + item.Nombre + '</td>' +
      '<td>' + badgeEstadoGenerico(item.Estado) + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn-plain" title="Editar" onclick="abrirModalCatalogo(\'' + tipo + '\', ' + item._fila + ')">' + iconoEditar() + '</button>' +
        '<button class="btn-plain" title="Eliminar" onclick="confirmarEliminarCatalogo(\'' + tipo + '\', ' + item._fila + ', \'' + item.Nombre.replace(/'/g, "\\'") + '\')">' + iconoEliminar() + '</button>' +
      '</td></tr>';
  }).join('');
}

const modalCatalogo = document.getElementById('modalCatalogo');

document.getElementById('btnNuevaVariedad').addEventListener('click', function () { abrirModalCatalogo('variedades', null); });
document.getElementById('btnNuevaLabor').addEventListener('click', function () { abrirModalCatalogo('labores', null); });

function abrirModalCatalogo(tipo, fila) {
  catalogoActivo = tipo;
  filaCatalogoEditar = fila;
  document.getElementById('formCatalogo').reset();
  document.getElementById('alertModalCatalogo').innerHTML = '';
  const etiqueta = tipo === 'variedades' ? 'variedad' : 'labor';

  if (fila) {
    const item = configData[tipo].find(function (x) { return x._fila === fila; });
    document.getElementById('cat_nombre').value = item.Nombre;
    document.getElementById('cat_estado').value = item.Estado;
    document.getElementById('modalCatalogoTitulo').textContent = 'Editar ' + etiqueta;
  } else {
    document.getElementById('modalCatalogoTitulo').textContent = 'Nueva ' + etiqueta;
  }
  modalCatalogo.classList.add('active');
}

document.getElementById('btnCerrarModalCatalogo').addEventListener('click', function () { modalCatalogo.classList.remove('active'); });
document.getElementById('btnCancelarModalCatalogo').addEventListener('click', function () { modalCatalogo.classList.remove('active'); });

document.getElementById('formCatalogo').addEventListener('submit', async function (e) {
  e.preventDefault();
  const payload = { Nombre: document.getElementById('cat_nombre').value.trim(), Estado: document.getElementById('cat_estado').value };
  const accionCrear = catalogoActivo === 'variedades' ? 'crearVariedad' : 'crearLabor';
  const accionEditar = catalogoActivo === 'variedades' ? 'editarVariedad' : 'editarLabor';

  setCargando(true);
  try {
    if (filaCatalogoEditar) {
      payload._fila = filaCatalogoEditar;
      await Api.post(accionEditar, payload);
      mostrarToast('Actualizado correctamente.', 'success');
    } else {
      await Api.post(accionCrear, payload);
      mostrarToast('Agregado correctamente.', 'success');
    }
    modalCatalogo.classList.remove('active');
    await cargarConfiguracion();
    sincronizarTodo(false); // los catálogos también alimentan el formulario de Registros
  } catch (err) {
    document.getElementById('alertModalCatalogo').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
  } finally {
    setCargando(false);
  }
});

function confirmarEliminarCatalogo(tipo, fila, nombre) {
  pedirConfirmacion('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.', async function () {
    const accionEliminar = tipo === 'variedades' ? 'eliminarVariedad' : 'eliminarLabor';
    setCargando(true);
    try {
      await Api.post(accionEliminar, { _fila: fila });
      mostrarToast('Eliminado.', 'success');
      modalConfirmar.classList.remove('active');
      await cargarConfiguracion();
      sincronizarTodo(false);
    } catch (err) {
      mostrarToast(err.message, 'danger');
    } finally {
      setCargando(false);
    }
  });
}
