/**
 * AUTENTICACIÓN Y GUARDA DE SESIÓN
 * -----------------------------------------------------------------------
 * El token vive en localStorage (si el usuario marcó "recordar sesión")
 * o en sessionStorage (se pierde al cerrar la pestaña). Los datos de la
 * sesión (nombre, rol, permisos) se guardan junto al token para pintar
 * el sidebar y controlar el acceso sin llamadas extra al servidor.
 */

const Auth = (function () {

  async function login(usuario, password, recordar) {
    const respuesta = await Api.post('login', { usuario: usuario, password: password });
    const storage = recordar ? localStorage : sessionStorage;
    storage.setItem('token', respuesta.token);
    storage.setItem('sesion', JSON.stringify(respuesta.sesion));
    return respuesta.sesion;
  }

  function obtenerSesion() {
    const datos = localStorage.getItem('sesion') || sessionStorage.getItem('sesion');
    return datos ? JSON.parse(datos) : null;
  }

  async function logout() {
    try { await Api.post('logout', {}); } catch (e) { /* no bloquear el logout local */ }
    cerrarSesionLocal();
    window.location.href = 'index.html';
  }

  function cerrarSesionLocal() {
    localStorage.removeItem('token');
    localStorage.removeItem('sesion');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('sesion');
  }

  /** Llamar al inicio de cualquier página protegida. Redirige si no hay sesión. */
  function requerirSesion() {
    if (!Api.getToken()) {
      window.location.href = 'index.html';
      return null;
    }
    return obtenerSesion();
  }

  /** Verifica si la sesión actual tiene un permiso dado sobre un módulo. */
  function tienePermiso(sesion, modulo, accion) {
    return !!(sesion.permisos && sesion.permisos[modulo] && sesion.permisos[modulo][accion]);
  }

  return {
    login: login,
    logout: logout,
    obtenerSesion: obtenerSesion,
    cerrarSesionLocal: cerrarSesionLocal,
    requerirSesion: requerirSesion,
    tienePermiso: tienePermiso
  };
})();
