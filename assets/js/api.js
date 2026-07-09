/**
 * CAPA DE COMUNICACIÓN CON EL BACKEND (Google Apps Script)
 * -----------------------------------------------------------------------
 * Notas de CORS: el Web App de Apps Script no responde a peticiones
 * OPTIONS (preflight). Por eso:
 *   - Las lecturas van por GET con querystring (no disparan preflight).
 *   - Las escrituras van por POST con Content-Type "text/plain" y el
 *     JSON como texto en el body (se sigue considerando "simple request"
 *     por el navegador, así que tampoco dispara preflight).
 */

const Api = (function () {

  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  function construirQueryString(params) {
    return Object.keys(params)
      .filter(function (k) { return params[k] !== undefined && params[k] !== null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  /** Lecturas (dashboard, listados, catálogos...) */
  async function get(action, params) {
    params = params || {};
    params.action = action;
    params.token = getToken();

    const url = APP_CONFIG.API_URL + '?' + construirQueryString(params);
    const respuesta = await fetch(url, { method: 'GET' });
    return manejarRespuesta(respuesta);
  }

  /** Escrituras (login, crear/editar/eliminar, importar...) */
  async function post(action, payload) {
    const body = JSON.stringify({
      action: action,
      token: getToken(),
      payload: payload || {}
    });

    const respuesta = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    });
    return manejarRespuesta(respuesta);
  }

  async function manejarRespuesta(respuesta) {
    if (!respuesta.ok) {
      throw new Error('Error de red al comunicarse con el servidor (' + respuesta.status + ').');
    }
    const datos = await respuesta.json();
    if (!datos.ok) {
      // Sesión vencida o inválida: forzamos regreso al login
      if (datos.error === 'SESION_INVALIDA') {
        Auth.cerrarSesionLocal();
        window.location.href = 'index.html?expirada=1';
      }
      throw new Error(datos.mensaje || 'Ocurrió un error inesperado.');
    }
    return datos;
  }

  return { get: get, post: post, getToken: getToken };
})();
