# Plantilla — Herramienta interna de gestión y reportería

Esqueleto funcional mínimo para validar la arquitectura antes de construir el
sistema completo: **login → layout (sidebar/topbar) → dashboard → 1 módulo
CRUD de ejemplo ("Registros")**, con backend 100% en Google Apps Script +
Google Sheets como base de datos, y un frontend HTML/JS independiente.

## Decisiones de arquitectura ya tomadas

| Punto | Decisión |
|---|---|
| Frontend | HTML/JS independiente (no vive dentro de Apps Script). Se puede abrir localmente o alojar donde sea. |
| CORS | Lecturas por `GET` (sin preflight). Escrituras por `POST` con `Content-Type: text/plain` para evitar el preflight que Apps Script no soporta. |
| Contraseñas | Hash SHA-256 + salt (`Utilities.computeDigest`). No es bcrypt, pero es muy superior a texto plano. |
| Sesiones | Token aleatorio guardado en `CacheService` (máx. 6h) del lado del servidor; el cliente lo guarda en `localStorage` (si marcó "recordar sesión") o `sessionStorage`. |
| Permisos | RBAC por módulo (`lectura`, `creacion`, `edicion`, `eliminacion`), leído de la hoja `Permisos` y devuelto en el login. El sidebar se pinta solo con los módulos permitidos. |

## Estructura del proyecto

```
backend/
  Code.gs      -> doGet/doPost, autenticación, CRUD, RBAC, auditoría
  Setup.gs      -> inicializarBaseDeDatos() crea todas las hojas + usuario admin
frontend/
  index.html            -> login
  app.html               -> layout + dashboard + módulo Registros
  assets/css/styles.css  -> sistema de diseño (tokens, componentes)
  assets/js/config.js    -> URL del Web App (¡configurar!)
  assets/js/api.js       -> capa de comunicación con el backend
  assets/js/auth.js      -> login/logout/guardas de sesión
  assets/js/app.js       -> navegación, dashboard, CRUD, import/export Excel
```

## Pasos para desplegar

### 1. Google Sheet + Apps Script
1. Crea un Google Sheet nuevo. Copia su ID (está en la URL, entre `/d/` y `/edit`).
2. En el Sheet, ve a **Extensiones → Apps Script**.
3. Pega el contenido de `backend/Code.gs` en un archivo `Code.gs`, y el de
   `backend/Setup.gs` en otro archivo `Setup.gs`.
4. En `Code.gs`, reemplaza:
   - `SPREADSHEET_ID` por el ID copiado en el paso 1.
   - `PASSWORD_SALT` por una cadena propia (cualquier texto secreto).
5. En el editor, selecciona la función `inicializarBaseDeDatos` (de `Setup.gs`)
   y ejecútala (▶). Autoriza los permisos que pida Google.
   Esto crea todas las hojas y un usuario `admin` / contraseña `Admin123`.
6. **Implementar → Nueva implementación → Tipo: Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario** (o "Cualquiera dentro de tu
     organización" si usas Google Workspace y quieres restringir el acceso
     a nivel de red).
7. Copia la URL que termina en `/exec`.

### 2. Frontend
1. En `frontend/assets/js/config.js`, pega esa URL en `API_URL`.
2. Abre `frontend/index.html` en el navegador (localmente, con doble clic,
   o sirviéndolo desde cualquier hosting estático).
3. Ingresa con `admin` / `Admin123` y cambia la contraseña cuanto antes
   (por ahora, actualiza el hash manualmente en la hoja `Usuarios`; el
   módulo de "cambiar contraseña" propio se agrega en la siguiente
   iteración, junto con el resto de Configuración).

### 3. Publicar el frontend en una URL única (Cloudflare Pages + GitHub)

Hasta ahora el frontend se abría como archivos sueltos (`file://...`), lo
cual es frágil para compartir con el equipo: cada persona necesita la
carpeta completa (`assets/` incluida) en su propia PC. La solución es
alojarlo como sitio estático con **una sola URL** que todos usan por igual.

Se usa Cloudflare Pages en vez de Netlify porque tu sitio es 100% estático
(sin funciones serverless — toda la lógica vive en Apps Script) y el plan
gratuito de Cloudflare permite uso interno/comercial sin ambigüedad, con
ancho de banda ilimitado.

⚠️ **Importante:** Cloudflare tiene dos rutas distintas para desplegar un
sitio, y dan URLs muy diferentes:
- **Pages** (conectando un repositorio de Git) → URL limpia:
  `https://tu-proyecto.pages.dev`.
- **Workers con "static assets"** (la ruta que Cloudflare sugiere por
  defecto ahora) → URL con tu subdominio de cuenta:
  `https://tu-proyecto.tu-cuenta.workers.dev`.

Para obtener la URL limpia, hay que elegir explícitamente **Pages** y
conectar un repositorio de Git (no "Upload assets" ni el flujo genérico de
"Import a repository" de Workers).

1. **Antes de subir nada**, confirma que `frontend/assets/js/config.js` ya
   tiene la URL correcta de tu Web App de Apps Script (paso 1.7 de arriba).
2. Crea un repositorio en GitHub y sube ahí el **contenido** de la carpeta
   `frontend/` (es decir, `index.html`, `app.html` y `assets/` deben quedar
   en la **raíz** del repositorio, no dentro de una subcarpeta `frontend/`).
3. En el dashboard de Cloudflare, ve a **Workers & Pages → Create application**.
4. Busca la pestaña **Pages** (no "Workers") y elige **Connect to Git**.
5. Selecciona el repositorio que acabas de crear.
6. En la configuración de build:
   - **Framework preset**: None.
   - **Build command**: déjalo vacío (no hay build, son archivos estáticos).
   - **Build output directory**: déjalo **vacío también** (no escribas `/`
     — Cloudflare ya asume la raíz del repo cuando no hay framework/build).
7. **Save and Deploy**. Cloudflare te da una URL tipo
   `https://tu-proyecto.pages.dev`.
8. **Comparte esa única URL con tu equipo.**

**Para actualizar el sitio**: simplemente haz `git push` con tus cambios al
repositorio — Cloudflare vuelve a desplegar automáticamente en cada push,
sin que tengas que subir archivos manualmente.

**Nota de seguridad:** con este plan gratuito, cualquiera con el link
puede llegar a la pantalla de login (no hay restricción por red o IP por
defecto). Eso no es un hueco de seguridad grave por sí solo — sin usuario
y contraseña válidos en la hoja `Usuarios` no se entra a ningún dato —
pero si más adelante quieres restringir incluso quién *ve* el login (por
ejemplo, solo gente en la red de la oficina), Cloudflare ofrece **Cloudflare
Access** (parte de su capa Zero Trust, con un nivel gratuito para pocos
usuarios) para exigir un login de Google/Microsoft antes de llegar siquiera
a tu página. Es una capa adicional opcional, no necesaria para que el
esqueleto funcione.

## Qué valida este esqueleto

- Login real contra Google Sheets con contraseña hasheada.
- Sesión persistente vía token + `CacheService`.
- Sidebar dinámico según permisos (RBAC).
- Dashboard con KPIs, gráfico (Chart.js) y tabla resumen, alimentado desde Sheets.
- CRUD completo (crear/editar/eliminar) con validaciones, confirmaciones y modal.
- Búsqueda, ordenamiento y paginación en la tabla histórica.
- Importación de Excel (SheetJS) con resumen de insertados/omitidos/errores.
- Exportación a Excel respetando el filtro/búsqueda activa.
- **Configuración > Usuarios**: crear, editar, restablecer contraseña y
  eliminar usuarios (con protección para no eliminar tu propio usuario).
- **Configuración > Roles**: crear, editar descripción y eliminar roles
  (bloqueado si algún usuario todavía tiene ese rol asignado).
- **Configuración > Permisos**: matriz de lectura/creación/edición/
  eliminación por módulo y rol — aplican en el próximo inicio de sesión.
- **Configuración > Catálogos**: CRUD de Variedades y Labores, con un solo
  modal/lógica reutilizado para ambos (misma forma de datos).
- Diseño responsive (desktop, tablet, móvil) con sidebar colapsable.

## Qué falta para el sistema completo (siguiente iteración)

- Cambio de contraseña propio desde el perfil del usuario (hoy solo un
  administrador puede restablecer la de otro, desde Configuración > Usuarios).
- Exportación a PDF.
- Hoja/registro de Auditoría visible en la UI (el backend ya la escribe en
  la hoja `Auditoria` en cada creación/edición/eliminación).
- Módulo de Parámetros y Conexiones (para apuntar a distintos Google Sheets
  por proyecto) — quedaron como hojas creadas en `Setup.gs` pero sin UI.

## Rendimiento percibido: sincronización única + botón manual

Cada llamada al backend es una petición HTTP a Apps Script, con una latencia
perceptible (uno o varios segundos) que **no se puede eliminar** desde el
frontend — es una limitación de la plataforma, ya advertida en la sección de
arquitectura. Lo que sí se puede controlar es cuántas veces se paga esa
latencia:

- **Una sola sincronización al entrar**: al cargar `app.html` (login o
  recarga de página), se hace **una única llamada** (`sincronizarTodo`) que
  trae de un solo golpe el dashboard, el historial de registros y los
  catálogos. El backend arma esa respuesta combinada en `Code.gs`.
- **Navegar entre módulos ya no toca el servidor**: el sidebar solo pinta
  lo que ya está en memoria (`dashboardData`, `registrosCache`,
  `catalogosCache`). Cambiar de vista es instantáneo.
- **Botón "Sincronizar" en el topbar**: como los datos ya no se refrescan
  solos al navegar, este botón (ícono de refresco junto al de cerrar
  sesión) vuelve a pedir todo de nuevo — útil si otra persona editó el
  Google Sheet mientras tú tenías la sesión abierta. Muestra un ícono
  girando (no bloquea la pantalla) y un toast de confirmación al terminar.
- **Guardar/editar/eliminar/importar** siguen bloqueando con el overlay
  mientras dura la escritura (es una acción explícita del usuario que
  necesita confirmación), pero al terminar disparan la misma
  sincronización completa en segundo plano, sin volver a bloquear.

Si el volumen de datos crece mucho, el siguiente paso natural es paginar
también del lado del servidor (hoy `listarRegistros` trae todo el
historial de una vez).

## Advertencias a tener presentes (no se resuelven solas al copiar el código)

- **Concurrencia**: si varias personas editan el mismo registro al mismo
  tiempo, gana la última escritura. Para uso interno moderado no suele ser
  un problema, pero no lo trates como una base de datos transaccional.
- **Volumen de datos**: el rendimiento de Sheets se degrada con miles de
  filas. Si el histórico crece mucho, habrá que paginar también en el
  backend (hoy `listarRegistros` trae todo y pagina en el cliente).
- **Cuotas de Apps Script**: hay límites de ejecuciones/tiempo por día.
  Para uso interno normal no debería ser un problema, pero conviene
  monitorearlo si el equipo crece.
