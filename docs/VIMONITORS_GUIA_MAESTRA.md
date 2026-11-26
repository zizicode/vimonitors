# VIMONITORS --- Guía maestra de construcción del sistema

**Documento de implementación \| Basado en**
`VIMONITORS — Decisiones de Arquitectura para el MVP v1.1.0` **y**
`Esquema PostgreSQL para Supabase v1.2.0`\
**Objetivo:** convertir las decisiones de arquitectura y el esquema SQL
en una secuencia de trabajo concreta: qué construir primero, qué vistas
necesita cada frontend, cómo se comunican con la API y qué condiciones
deben cumplirse antes de avanzar.

------------------------------------------------------------------------

## 1. Cómo usar esta guía

Esta guía es el orden recomendado de implementación. No intentes
construir todas las pantallas al mismo tiempo ni conectar los frontends
directamente a PostgreSQL.

El proyecto tiene tres aplicaciones:

1.  **Tienda pública (`apps/store`)**: Next.js App Router. Presenta el
    catálogo, permite comprar y ofrece el área del cliente.
2.  **Dashboard (`apps/dashboard`)**: React + Vite. Es la consola
    privada de operación y administración.
3.  **API (`apps/api`)**: Hono + Prisma. Centraliza reglas comerciales,
    permisos, validaciones, cálculos y acceso a datos.

Supabase aporta PostgreSQL, Auth y Storage. PayPal procesa los pagos y
Resend envía correos.

### Regla arquitectónica principal

-   Tienda y dashboard **no consultan las tablas de Supabase**.
-   Ambos frontends llaman a la API para leer y modificar datos
    comerciales.
-   Supabase Auth se utiliza desde los frontends para iniciar/cerrar
    sesión y obtener el JWT.
-   El JWT se envía a la API como `Authorization: Bearer <token>`.
-   La API verifica el JWT, consulta el perfil y obtiene el rol real
    desde `profiles.role`.
-   La API accede a PostgreSQL mediante Prisma.
-   Para imágenes, el dashboard solicita una URL firmada a la API y
    luego el navegador sube el archivo directamente a Supabase Storage.
-   La clave `SUPABASE_SERVICE_ROLE_KEY` y las credenciales privadas de
    PayPal solo existen en el entorno de la API.

**No dupliques reglas de negocio en los frontends.** La tienda puede
calcular una estimación visual, pero el precio definitivo, stock,
impuestos, envío, descuentos y total se determinan en el servidor.

------------------------------------------------------------------------

## 2. Resultado final que debes construir

### 2.1 Tienda pública

Rutas principales:

  ---------------------------------------------------------------------------------
  Ruta                              Vista                   Objetivo
  --------------------------------- ----------------------- -----------------------
  `/`                               Inicio                  Presentar la tienda,
                                                            categorías, destacados,
                                                            ofertas y beneficios

  `/categoria/[slug]`               Categoría               Listar productos y
                                                            filtros dinámicos

  `/producto/[slug]`                Producto                Mostrar ficha completa
                                                            y permitir agregar al
                                                            carrito

  `/buscar`                         Resultados de búsqueda  Mostrar resultados y
                                                            filtros de búsqueda

  `/carrito`                        Carrito                 Revisar artículos,
                                                            cantidades, precio y
                                                            disponibilidad

  `/checkout`                       Checkout                Dirección, método de
                                                            envío y pago

  `/checkout/exito/[orderNumber]`   Confirmación            Mostrar resultado de
                                                            una compra confirmada

  `/cuenta`                         Resumen de cuenta       Datos y accesos del
                                                            cliente

  `/cuenta/perfil`                  Perfil                  Editar nombre y
                                                            teléfono

  `/cuenta/direcciones`             Direcciones             Administrar hasta 10
                                                            direcciones

  `/cuenta/pedidos`                 Pedidos                 Consultar historial
                                                            propio

  `/cuenta/pedidos/[orderNumber]`   Detalle de pedido       Ver artículos, estados
                                                            y seguimiento

  `/auth/login`                     Inicio de sesión        Correo/contraseña o
                                                            Google

  `/auth/register`                  Registro                Crear cuenta

  `/auth/forgot-password`           Recuperación            Solicitar enlace de
                                                            recuperación

  `/auth/reset-password`            Nueva contraseña        Actualizar contraseña
                                                            tras el enlace
  ---------------------------------------------------------------------------------

Las páginas de checkout y cuenta no deben indexarse. Los productos y
categorías sí deben ser indexables cuando estén activos.

### 2.2 Dashboard administrativo

El dashboard es una SPA privada, separada de la tienda y configurada con
`noindex`.

  -----------------------------------------------------------------------------------
  Ruta sugerida                       Vista                   Funcionalidad
  ----------------------------------- ----------------------- -----------------------
  `/login`                            Login administrativo    Acceso con Supabase
                                                              Auth

  `/`                                 Resumen                 KPIs, ventas, pedidos,
                                                              stock bajo y productos
                                                              principales

  `/products`                         Productos               Listado, búsqueda,
                                                              filtros y acciones

  `/products/new`                     Crear producto          Formulario por pestañas

  `/products/:id`                     Editar producto         Datos, variantes,
                                                              precios, imágenes,
                                                              specs y SEO

  `/categories`                       Categorías              Árbol de categorías y
                                                              subcategorías

  `/categories/:id`                   Categoría y             Definir atributos y
                                      especificaciones        filtros de la categoría

  `/brands`                           Marcas                  CRUD de marcas y logos

  `/inventory`                        Inventario              Existencias, reservas,
                                                              stock bajo y ajustes

  `/inventory/:variantId/movements`   Historial de inventario Libro de movimientos de
                                                              una variante

  `/orders`                           Pedidos                 Listado y filtros

  `/orders/:id`                       Detalle de pedido       Estado, pago,
                                                              artículos, envío,
                                                              tracking y reembolso

  `/customers`                        Clientes                Listado y búsqueda

  `/customers/:id`                    Cliente                 Perfil, direcciones,
                                                              pedidos y notas
                                                              internas

  `/shipping/methods`                 Métodos de envío        Tarifas, tipo y países

  `/shipping/carriers`                Transportistas          Couriers y plantillas
                                                              de tracking

  `/settings`                         Configuración           Datos de tienda,
                                                              impuesto, umbral de
                                                              stock, reservas,
                                                              banners y checkout

  `/users`                            Usuarios internos       Invitar administradores
                                                              y asignar roles

  `/audit-logs`                       Auditoría               Consultar acciones
                                                              administrativas

  `/reports`                          Exportaciones           CSV de pedidos e
                                                              inventario
  -----------------------------------------------------------------------------------

La matriz de permisos real se implementa en la API. El guard del
dashboard sirve para experiencia de usuario, pero nunca sustituye la
autorización del servidor.

### 2.3 API

La API se publica bajo `/api/v1` y se organiza en módulos. Cada módulo
debe mantener una estructura sencilla:

``` text
modules/
  catalog/
    routes.ts
    service.ts
    schemas.ts
```

-   `routes.ts`: HTTP, validación de entrada y respuesta.
-   `service.ts`: reglas de negocio y coordinación de operaciones.
-   `schemas.ts`: esquemas Zod del módulo, preferiblemente compartidos
    cuando correspondan.

No añadas una capa repository: Prisma ya cumple el papel de acceso a
datos.

------------------------------------------------------------------------

## 3. Estructura del repositorio

Crea el monorepo antes de construir funcionalidades:

``` text
vimonitors/
├── apps/
│   ├── store/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   └── lib/
│   ├── dashboard/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       └── lib/
│   └── api/
│       └── src/
│           ├── app.ts
│           ├── server.ts
│           ├── env.ts
│           ├── middlewares/
│           ├── lib/
│           └── modules/
├── packages/
│   └── shared/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── sql/
├── docs/
├── .github/workflows/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── README.md
```

### 3.1 Paquete compartido

`packages/shared` contiene:

-   Enums de negocio.
-   Esquemas Zod compartidos.
-   Tipos auxiliares.
-   Utilidades monetarias.
-   Constantes de límites y reglas que deban ser compartidas.

Los tipos de llamadas HTTP de los clientes deben derivarse de Hono RPC
mediante `hc<AppType>`, no mantenerse manualmente en dos frontends.

### 3.2 Configuración del monorepo

1.  Configura pnpm workspaces.
2.  Define TypeScript base.
3.  Configura scripts de `dev`, `build`, `lint`, `typecheck` y `test`.
4.  Configura ESLint/Prettier.
5.  Añade un workflow de GitHub Actions.
6.  Crea `.env.example` para cada aplicación.
7.  Comprueba que las tres aplicaciones compilan aunque todavía no
    tengan funcionalidades.

------------------------------------------------------------------------

## 4. Orden de construcción: fases de principio a fin

La secuencia siguiente amplía los sprints definidos en la arquitectura.
Mantén el alcance del MVP: no agregues cupones, wishlist, reseñas,
multi-moneda, checkout de invitado, integración automática con couriers
o funciones de fase 2.

## Fase 0 --- Decisiones comerciales que bloquean el desarrollo

Antes de escribir checkout, confirma:

-   País principal de operación (el documento asume República
    Dominicana).
-   Moneda de cobro y contable (el documento propone USD).
-   Disponibilidad de PayPal para tu cuenta Business, moneda y pagos con
    tarjeta.
-   Tratamiento fiscal del ITBIS y presentación del desglose.
-   Si realmente existirá retiro en tienda (`pickup`).
-   Categorías iniciales según inventario real.
-   Dominio de tienda, dashboard y API.
-   Logo, color de acento e identidad visual.
-   Correo de contacto y páginas legales.

No bloquees el desarrollo del catálogo por detalles visuales que pueden
definirse después. Sí bloquea la implementación del checkout real hasta
validar PayPal y las decisiones fiscales.

**Salida de la fase:** lista de decisiones confirmadas y pendientes, con
responsable y fecha.

## Fase 1 --- Infraestructura, monorepo y despliegue mínimo

### Trabajo

1.  Crear el repositorio y workspaces.
2.  Crear un proyecto Supabase exclusivo para desarrollo.
3.  Configurar PostgreSQL y conexiones.
4.  Configurar Prisma.
5.  Preparar la API Hono con `GET /health`.
6.  Preparar una página mínima en Next.js.
7.  Preparar una página mínima en Vite.
8.  Configurar CORS con orígenes explícitos.
9.  Desplegar las tres aplicaciones aunque aún no tengan
    funcionalidades.
10. Configurar CI para typecheck, lint, test y build.

### Conexiones de base de datos

-   `DATABASE_URL`: pooler de Supabase para runtime, con configuración
    compatible con PgBouncer.
-   `DIRECT_URL`: conexión directa para migraciones.
-   No ejecutes `prisma db push` ni `migrate dev` en producción.
-   En producción se utiliza `prisma migrate deploy`.

### Criterio de salida

-   API desplegada y `/health` responde.
-   Tienda y dashboard cargan desde Vercel.
-   CI pasa.
-   Ninguna clave privada está en Git ni en bundles del navegador.

## Fase 2 --- Base de datos y reglas SQL

Esta fase debe completarse antes de construir módulos comerciales.

### 2.1 Aplicar el esquema

El archivo SQL entregado es una migración inicial, no re-ejecutable.
Debes:

1.  Revisarlo en el proyecto Supabase de desarrollo.
2.  Ejecutarlo con el rol `postgres`.
3.  Comprobar enums, tablas, índices, funciones, triggers, RLS,
    privilegios, Storage, datos iniciales y jobs.
4.  Guardar la migración versionada en `prisma/migrations` o en el
    sistema de migraciones acordado.
5.  No editar una migración ya aplicada: crea una nueva migración para
    cambios posteriores.

### 2.2 Entender los grupos de tablas

  ------------------------------------------------------------------------------
  Dominio                 Tablas principales             Responsabilidad
  ----------------------- ------------------------------ -----------------------
  Identidad               `profiles`, `addresses`        Perfil, roles y
                                                         direcciones

  Catálogo                `brands`, `categories`,        Productos, variantes y
                          `category_spec_definitions`,   atributos
                          `products`,                    
                          `product_variants`,            
                          `product_images`               

  Inventario              `inventory_levels`,            Saldo, libro de
                          `stock_movements`,             movimientos y reservas
                          `stock_reservations`           

  Carrito                 `carts`, `cart_items`          Carrito de usuarios
                                                         autenticados

  Pedidos                 `orders`, `order_items`,       Orden y snapshot
                          `order_status_history`         histórico

  Pagos                   `payments`, `refunds`,         Pagos, reembolsos y
                          `payment_events`               eventos

  Logística               `shipping_methods`,            Envíos y seguimiento
                          `carriers`, `shipments`        

  Configuración           `settings`                     Parámetros comerciales

  Auditoría               `audit_logs`                   Acciones
                                                         administrativas
  ------------------------------------------------------------------------------

### 2.3 Reglas que no debes duplicar en el frontend

-   El dinero se almacena como enteros en centavos, nunca `FLOAT` o
    `REAL`.
-   El precio y stock vendible pertenecen a `product_variants` e
    `inventory_levels`, no a `products`.
-   `available = on_hand - reserved`.
-   Las órdenes guardan snapshots de dirección, método de envío y
    artículos.
-   Los movimientos de inventario, historial de estado y auditoría son
    append-only.
-   Los estados de pedido solo pueden cambiar mediante transiciones
    válidas.
-   Las reservas de stock se crean y liberan mediante funciones
    transaccionales.
-   Los reembolsos no pueden superar el monto capturado.
-   `products.specs` debe validarse contra las definiciones de
    especificaciones de su categoría.
-   El slug del producto publicado es inmutable salvo procedimiento
    controlado.

### 2.4 Funciones y triggers que la API debe utilizar correctamente

Entre las funciones SQL del esquema están:

-   `reserve_order_stock(...)`: reserva stock de forma atómica.
-   `release_stock_reservation(...)`: libera una reserva.
-   `release_order_reservations(...)`: libera las reservas de una orden.
-   `get_order_reservation_gaps(...)`: identifica faltantes tras una
    expiración.
-   `confirm_order_after_payment(...)`: confirma el pedido y consume
    reservas.
-   `adjust_inventory(...)`: realiza ajustes y registra movimientos.
-   `release_expired_stock_reservations()`: libera reservas vencidas.
-   `purge_stale_carts(...)`: limpia carritos antiguos.
-   `compute_product_search_vector(...)`: prepara búsqueda textual.

Los triggers mantienen `updated_at`, búsqueda, historial de estados,
creación de inventario para nuevas variantes y consistencia de
reembolsos. No intentes reproducir manualmente estas tareas cuando ya
están garantizadas por SQL.

### 2.5 Contexto de auditoría para operaciones

Dentro de la transacción, cuando aplique:

``` sql
select set_config('app.actor_id', '<uuid del usuario>', true);
select set_config('app.status_note', '<motivo del cambio>', true);
```

Esto permite que el historial de pedidos registre actor y nota. Debe
establecerse desde el servicio de API con el usuario autenticado, no
desde un valor enviado libremente por el cliente.

### Criterio de salida

-   La migración se aplica en una base limpia.
-   Se verifican restricciones y triggers.
-   Una variante nueva crea su fila de inventario.
-   Un movimiento append-only no puede actualizarse ni borrarse.
-   Una reserva concurrente no permite sobreventa.
-   RLS está activo y `anon`/`authenticated` no tienen acceso a las
    tablas.

## Fase 3 --- API base y contrato de comunicación

Antes de desarrollar pantallas completas, implementa el esqueleto de
API.

### 3.1 Middleware global

Ordena los middlewares para cubrir:

1.  `requestId`: crea o propaga `X-Request-Id`.
2.  Logger Pino: registra método, ruta, duración y request ID.
3.  CORS: lista exacta de dominios permitidos.
4.  `secureHeaders`.
5.  Rate limit.
6.  Autenticación opcional u obligatoria según la ruta.
7.  Manejo uniforme de errores.

Los clientes envían `X-Client: store` o `X-Client: dashboard`.

### 3.2 Respuesta estándar

Respuesta correcta:

``` json
{
  "data": {},
  "meta": {}
}
```

Respuesta de error:

``` json
{
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "No hay suficiente inventario disponible.",
    "details": {},
    "requestId": "..."
  }
}
```

Usa códigos HTTP coherentes: `400`, `401`, `403`, `404`, `409`, `422`,
`429` y `500`.

Crea `AppError(code, status, message, details)` y un `app.onError`
central. Los errores de validación Zod deben devolver `422` con detalles
por campo.

### 3.3 Validación

-   Valida body, query params y path params con Zod.
-   Limita el body general a 1 MB.
-   Reutiliza los esquemas compartidos.
-   Nunca confíes en `role`, precio, stock, total, `userId` o estado
    enviados por el navegador.
-   En ordenamientos, utiliza una lista blanca de columnas y direcciones
    permitidas.

### 3.4 Autenticación de API

Flujo:

1.  El frontend inicia sesión con Supabase Auth.
2.  Obtiene el access token.
3.  Envía `Authorization: Bearer <JWT>`.
4.  La API verifica la firma con `jose` y el JWKS del proyecto.
5.  La API comprueba que el usuario esté activo.
6.  La API carga `profiles.role`.
7.  Para endpoints administrativos, `requireRole(...)` verifica el rol
    desde PostgreSQL.

**Nunca uses `user_metadata` para decidir permisos.** El usuario puede
modificar esos metadatos. El rol autorizado está en `profiles.role`.

### 3.5 Cliente HTTP tipado en ambos frontends

Crea un cliente compartido basado en Hono RPC, pero con wrappers
específicos:

-   Tienda: llamadas públicas sin token y llamadas autenticadas con
    token cuando haya sesión.
-   Dashboard: llamadas autenticadas y manejo de expiración de sesión.
-   Ambos deben centralizar `baseUrl`, headers, errores y request ID.
-   No escribas `fetch()` aislados por toda la aplicación.

### 3.6 Orden de módulos API

Implementa los módulos en este orden:

1.  `auth` y `addresses`
2.  `catalog`
3.  `search`
4.  `shipping`
5.  `uploads`
6.  `inventory`
7.  `cart`
8.  `checkout`
9.  `payments`
10. `orders`
11. `admin` y `settings`

Los servicios de checkout, pagos, inventario y pedidos necesitan lógica
transaccional desde el comienzo.

------------------------------------------------------------------------

## 5. Construcción del dashboard: vistas y comportamiento

El dashboard se construye primero en su estructura visual y luego se
conecta módulo por módulo. Mantén una interfaz administrativa
consistente: navegación lateral, encabezado, breadcrumbs, tablas,
filtros, formularios, confirmaciones y notificaciones.

### 5.1 Login

**Vista:** formulario de acceso.

**Debe incluir:** - Email y contraseña. - Acceso mediante Supabase
Auth. - Mensajes de error. - Recuperación de sesión. - Redirección al
dashboard si el usuario tiene permiso. - Bloqueo de acceso visual si no
está autenticado.

La API debe volver a validar el rol. Un usuario `customer` no se
convierte en administrador porque pueda abrir una URL del dashboard.

### 5.2 Resumen / Dashboard home

**Vista:** panel de indicadores.

**Componentes:** - Ventas de hoy, últimos 7 días y últimos 30 días. -
Pedidos por estado. - Ticket promedio. - Pedidos pendientes de envío. -
Productos con stock bajo. - Top 5 productos. - Gráfica diaria de ventas.

**Comunicación:** `GET /admin/dashboard/summary`.

La API agrega y devuelve los datos. El dashboard no debe descargar todas
las órdenes para calcular los indicadores en el navegador.

### 5.3 Productos

**Listado:** - Tabla con imagen, nombre, SKU principal, marca,
categoría, estado y precio. - Búsqueda y filtros por
estado/categoría/marca. - Paginación. - Acciones crear, editar y
archivar.

**Formulario de producto por pestañas:**

1.  **General:** nombre, slug, marca, categoría, modelo, condición,
    descripción corta y larga, garantía.
2.  **Precio y variantes:** SKU, nombre de variante, opciones, precio,
    precio anterior, moneda, límite por pedido, seguimiento de
    inventario.
3.  **Imágenes:** galería, imagen principal, texto alt, orden y variante
    asociada.
4.  **Especificaciones:** campos generados según
    `category_spec_definitions`.
5.  **SEO:** `seo_title` y `seo_description`.

**Reglas:** - Todo producto debe tener al menos una variante
predeterminada. - No se guarda precio ni stock directamente en
`products`. - Eliminar equivale a archivar, salvo borradores sin ventas
que puedan eliminarse físicamente de acuerdo con las reglas. - Al
publicar, el slug queda inmutable. - Máximo 8 imágenes por producto.

**Comunicación:** endpoints administrativos de productos, categorías,
marcas, definiciones de specs y uploads. El documento de arquitectura
define estos grupos, pero deja el detalle de métodos de CRUD para la
implementación del módulo.

### 5.4 Categorías y especificaciones

**Vista de categorías:** - Árbol padre/subcategoría. - Orden manual. -
Activar/desactivar. - Slug y descripción. - Imagen. - Destacada. - SEO.

**Vista de definiciones de specs:** - Clave (`key`), etiqueta (`label`),
tipo, unidad, grupo, opciones. - `is_filterable`. - `is_required`. -
Posición.

La API valida el JSON `products.specs` contra las definiciones. Las
subcategorías heredan las definiciones de su padre en la capa de
servicio. La jerarquía se limita a dos niveles en el MVP.

### 5.5 Marcas

**Vista:** - Listado con nombre, slug, logo y estado. -
Crear/editar/activar. - Subir logo y guardar `logo_path`.

La tabla almacena la ruta de Storage, no una URL firmada.

### 5.6 Inventario

**Vista principal:** - Producto, variante, SKU. - `on_hand`, `reserved`
y disponible. - Indicador de stock bajo. - Búsqueda por producto/SKU. -
Filtro de bajo stock.

**Vista de ajuste:** - Variante. - Tipo: recepción, ajuste, merma,
devolución o reposición por cancelación. - Cantidad delta. - Motivo
obligatorio.

**Vista de movimientos:** - Fecha, tipo, cantidad con signo, motivo,
pedido y actor.

**Comunicación:** - `GET /admin/inventory` -
`POST /admin/inventory/adjustments` -
`GET /admin/inventory/:variantId/movements`

La API llama a `adjust_inventory(...)` dentro de una transacción. El
frontend nunca actualiza `inventory_levels` directamente.

### 5.7 Pedidos

**Listado:** - Número de pedido. - Cliente/email. - Fecha. - Total. -
Estado de orden. - Estado de pago. - Estado de envío. - Filtros por
estado, fecha, número y correo.

**Detalle:** - Datos del cliente. - Snapshot de dirección y método de
envío. - Líneas compradas y precios históricos. - Resumen de importes. -
Estado de pago y referencias PayPal. - Historial de cambios. - Envío y
tracking. - Nota interna. - Acciones permitidas según estado.

**Acciones:** - Cambiar estado mediante transiciones válidas. -
Registrar transportista y tracking. - Marcar envío como
despachado/entregado. - Cancelar cuando esté permitido. - Reembolsar
total o parcialmente. - Imprimir hoja de empaque.

**Comunicación:** - `GET /admin/orders` - `GET /admin/orders/:id` -
`PATCH /admin/orders/:id/status` - `POST /admin/orders/:id/shipments` -
`POST /admin/orders/:id/refunds` - `POST /admin/orders/:id/cancel`

La API ejecuta las acciones y escribe auditoría. El dashboard solo
ofrece las acciones permitidas por el estado actual.

### 5.8 Clientes

**Listado:** nombre, email, teléfono, fecha de registro, estado y total
de pedidos.

**Detalle:** - Datos de perfil. - Direcciones en modo lectura. -
Pedidos. - Total gastado y último pedido. - Notas internas. - Estado
activo/inactivo.

La API limita la edición a los campos autorizados. Las direcciones
copiadas en un pedido no se alteran al editar la libreta del cliente.

### 5.9 Envíos y transportistas

Configura: - Métodos `delivery`, `courier_hub` y `pickup` solo si existe
retiro real. - Precio fijo. - Umbral opcional de envío gratis. - Países
admitidos. - Orden y activación. - Couriers y `tracking_url_template`,
usando `{tracking}` como marcador.

La API valida compatibilidad entre `addresses.kind` y
`shipping_methods.kind`.

### 5.10 Configuración

Administra: - Nombre de tienda. - Correo de contacto. - Tasa fiscal
(`tax_rate_bps`). - Umbral de stock bajo. - Minutos de reserva. - Envío
gratis desde. - Banners del hero. - Redes sociales. -
`checkout_enabled`.

Mantén `checkout_enabled = false` hasta validar completamente el proceso
de pago y operación. Debe poder apagarse como interruptor de emergencia.

### 5.11 Usuarios y auditoría

-   El primer admin se prepara mediante seed controlado.
-   Los siguientes usuarios internos se invitan con Supabase Auth.
-   Roles: `admin`, `sales`, `inventory`; `customer` es el rol por
    defecto.
-   `admin` consulta auditoría y gestiona usuarios/configuración.
-   `sales` trabaja pedidos y clientes.
-   `inventory` trabaja catálogo e inventario según la matriz de
    permisos.

La auditoría registra actor, acción, entidad, valores anteriores/nuevos
y contexto de solicitud. El registro es append-only.

------------------------------------------------------------------------

## 6. Construcción de la tienda: vistas y comportamiento

La tienda debe priorizar SEO, rendimiento móvil y claridad de compra.
Utiliza Next.js App Router con Server Components para páginas públicas
cuando sea posible y componentes cliente solo donde haya interacción.

### 6.1 Layout global

**Header:** - Logo. - Buscador. - Mega-menú de categorías. - Cuenta. -
Carrito.

**Footer:** - Políticas. - Contacto. - Redes sociales. - Información
comercial.

**Móvil:** - Menú en drawer. - Buscador desplegable. - Filtros en panel
inferior. - Carrito en drawer. - Botón de compra fijo en la ficha.

Tema claro por defecto y oscuro opcional.

### 6.2 Inicio `/`

Secciones: 1. Hero y banners administrables. 2. Categorías destacadas.
3. Productos destacados (`is_featured`). 4. Ofertas (variantes con
`compare_at_price_cents`). 5. Productos nuevos. 6. Marcas. 7.
Beneficios: garantía, envío y pago seguro. 8. Footer.

La API entrega los datos públicos. Configuración y catálogo no se
consultan directamente desde Supabase.

### 6.3 Categoría `/categoria/[slug]`

**Elementos:** - Breadcrumbs. - Título y descripción. - Grid de
productos. - Panel de filtros. - Ordenamiento. - Paginación. - Estados
skeleton, vacío y error.

**Filtros:** - Marca múltiple. - Precio mínimo/máximo. - Solo en
stock. - Specs dinámicas.

Todos los filtros y el ordenamiento se reflejan en `searchParams` de la
URL. Así funcionan atrás/adelante, recarga y enlaces compartidos.

**Consulta principal:** `GET /products` con query params como
`category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `spec[...]`,
`sort`, `page` y `pageSize`.

Paginación: 24 productos por defecto, máximo 48.

### 6.4 Ficha `/producto/[slug]`

Debe mostrar: - Galería con miniaturas y visor ampliado. - Nombre,
marca, modelo y SKU. - Precio actual y precio anterior si aplica. -
Condición (nuevo, reacondicionado o usado). - Stock/disponibilidad. -
Variantes. - Selector de cantidad. - Botón agregar al carrito. -
Descripción. - Especificaciones agrupadas. - Garantía. - Información de
envío. - Productos relacionados.

La ficha debe utilizar: - `GET /products/:slug` -
`GET /products/:slug/related`

SEO: - `generateMetadata`. - Canonical. - Open Graph. - JSON-LD
`Product` + `Offer`, `BreadcrumbList` y `Organization`. - Slug estable
una vez publicado. - Producto agotado: la URL sigue respondiendo con
disponibilidad `OutOfStock`. - Producto archivado: 410 o redirección 301
si hay reemplazo. - Producto borrador: 404.

### 6.5 Búsqueda `/buscar`

**Buscador global:** - Autocompletado desde 2 caracteres. - Debounce de
250 ms. - Hasta 6 productos y 3 categorías sugeridas. - Buscar nombre,
marca, modelo, descripción corta y SKU (SKU por coincidencia
exacta/prefijo). - Mensaje útil sin resultados y sugerencias.

**Endpoints:** - `GET /search/suggest?q=` - `GET /products?q=...`

La búsqueda completa usa PostgreSQL FTS en español, `unaccent` y
`pg_trgm`. La API implementa consultas parametrizadas.

### 6.6 Tarjeta de producto

Componente reutilizable `ProductCard`: - Imagen cuadrada con
`object-contain`. - Nombre de máximo dos líneas. - Marca. - Precio y
precio tachado. - Insignia de condición/oferta/agotado. - Acción
agregar.

Otros componentes comunes: `ProductGrid`, `PriceTag`, `StockBadge`,
`QuantityInput`, `Breadcrumbs`, `FilterPanel`, `Pagination`,
`AddressForm`, `Skeleton`, `EmptyState`, `ErrorState`.

### 6.7 Carrito `/carrito`

Para invitados: - Zustand con persistencia `localStorage`. - Clave
`vm_cart_v1`. - Guardar únicamente `variantId`, `quantity` y
`addedAt`. - No guardar precios ni nombres como fuente de verdad.

Para autenticados: - Carrito persistente en `carts`/`cart_items`.

Al abrir el carrito, llama `POST /cart/price` para obtener precio y
stock vigentes. Informa si hubo cambios o si una variante ya no está
disponible.

Permite: - Cambiar cantidades. - Eliminar líneas. - Ver subtotal
estimado. - Continuar al checkout.

### 6.8 Autenticación de tienda

Vistas: - Registro. - Login. - Recuperar contraseña. - Restablecer
contraseña. - Callback OAuth.

Métodos: - Google OAuth. - Email/contraseña (mínimo 8 caracteres y
confirmación de correo).

Supabase Auth administra contraseñas y sesiones. Resend actúa como SMTP
personalizado de Supabase. La tienda refresca sesión con `@supabase/ssr`
y middleware.

Al iniciar sesión con un carrito local, ejecutar la fusión descrita en
la sección 7.

### 6.9 Cuenta del cliente

**Perfil:** nombre y teléfono. El cambio de correo queda para después.

**Direcciones:** - Máximo 10. - Domicilio (`home`) o casillero
(`courier_hub`). - Marcar predeterminada. - La primera dirección puede
quedar predeterminada. - Cambio de predeterminada dentro de una
transacción. - Para casillero: courier y código de cliente obligatorios.

**Pedidos:** - Historial propio. - Detalle por número de pedido. -
Timeline. - Tracking cuando exista.

La API filtra siempre por el usuario autenticado. No aceptes un `userId`
del navegador para consultar pedidos de otra persona.

------------------------------------------------------------------------

## 7. Flujos entre los dos frontends y la API

### 7.1 Flujo de autenticación

``` mermaid
sequenceDiagram
  participant F as Tienda o Dashboard
  participant S as Supabase Auth
  participant A as API Hono
  participant D as PostgreSQL
  F->>S: Login / registro / Google OAuth
  S-->>F: Access JWT
  F->>A: Request + Authorization Bearer JWT
  A->>A: Verificar JWT con JWKS
  A->>D: Consultar profiles y permisos
  D-->>A: Perfil y rol
  A-->>F: Respuesta autorizada
```

Supabase Auth autentica; la API autoriza. Son responsabilidades
distintas.

### 7.2 Flujo de carrito invitado a cuenta

1.  Invitado agrega variantes y cantidades.
2.  Zustand guarda `variantId`, `quantity`, `addedAt` en localStorage.
3.  Tienda consulta `POST /cart/price`.
4.  Usuario inicia sesión.
5.  Tienda envía items locales a `POST /cart/merge`.
6.  API fusiona por variante dentro de una transacción.
7.  Cantidades se suman, limitadas por stock y `max_per_order`.
8.  API descarta variantes inexistentes/inactivas y devuelve
    advertencias.
9.  Tienda limpia el carrito local y utiliza el carrito persistente.

### 7.3 Flujo de catálogo y lectura pública

``` mermaid
sequenceDiagram
  participant U as Visitante
  participant S as Store Next.js
  participant A as API
  participant DB as PostgreSQL
  U->>S: Abre categoría o producto
  S->>A: GET /products o GET /products/:slug
  A->>DB: Consulta catálogo, variante, precio, stock e imágenes
  DB-->>A: Datos
  A-->>S: data + meta
  S-->>U: HTML renderizado y contenido
```

Para páginas indexables utiliza SSR/ISR y revalidación. La API debe
enviar `Cache-Control` apropiado para GET públicos.

### 7.4 Flujo de carga de imágenes

1.  Dashboard solicita `POST /admin/uploads/product-image`.
2.  API verifica JWT y rol `admin` o `inventory`.
3.  API genera URL firmada para bucket `products`.
4.  Dashboard comprime imagen a WebP (máximo 1600 px, objetivo
    aproximado 300 KB).
5.  Navegador sube directamente a Storage usando la URL firmada.
6.  Dashboard registra metadata mediante endpoint de catálogo.
7.  API guarda `storage_path`, alt, posición y principal en
    `product_images`.

El bucket `products` es público de lectura, pero no debe permitir
escritura pública. Límite definido en SQL: 5 MB y MIME `image/webp`.

### 7.5 Flujo de checkout y pago

``` mermaid
sequenceDiagram
  participant C as Store
  participant A as API
  participant DB as PostgreSQL
  participant P as PayPal
  participant R as Resend
  C->>A: POST /checkout/orders (variantId, quantity, addressId, shippingMethodId)
  A->>DB: Transacción: validar, calcular total, crear orden/items y reservar stock
  A->>P: Create Order con total del servidor
  P-->>A: paypalOrderId
  A-->>C: orderNumber + paypalOrderId
  C->>P: Cliente aprueba pago
  C->>A: POST /checkout/orders/:id/capture
  A->>P: Captura server-to-server
  P-->>A: Resultado de captura
  A->>A: Validar estado, monto y moneda
  A->>DB: Transacción: payment captured, consumir stock y confirmar orden
  A->>R: Enviar correo después del commit
  A-->>C: Confirmación
  P-->>A: Webhook como respaldo idempotente
```

**Datos que envía el cliente:** variantes, cantidades, `addressId`,
`shippingMethodId` y nota opcional.\
**Datos que calcula el servidor:** precios, subtotal, impuesto
informativo, envío, descuento, total y monto de PayPal.

La reserva de stock dura 30 minutos por defecto. `pg_cron` ejecuta la
liberación cada 5 minutos.

Casos obligatorios: - Pago aprobado después de expirar la reserva:
intentar reservar de nuevo; si no hay stock, reembolsar y cancelar. -
Pago `PENDING`: no confirmar aún; esperar webhook. - Cliente cierra
navegador: webhook puede completar el proceso. - Doble clic/reintento:
captura idempotente. - Monto/moneda distintos: rechazar, auditar y
alertar.

### 7.6 Webhooks PayPal

`POST /webhooks/paypal`: 1. Verifica firma con PayPal y
`PAYPAL_WEBHOOK_ID`. 2. Guarda evento en `payment_events`. 3. Usa
`provider_event_id` único para evitar duplicados. 4. Procesa el evento
de manera idempotente. 5. Actualiza el pago/orden mediante servicios y
transacciones. 6. Registra `processed_at` o error.

Eventos definidos para el MVP: - `PAYMENT.CAPTURE.COMPLETED` -
`PAYMENT.CAPTURE.DENIED` - `PAYMENT.CAPTURE.REFUNDED`

No confíes en una redirección del navegador como prueba de pago.

### 7.7 Reembolsos

1.  Dashboard envía monto y motivo.
2.  API verifica permiso y pago capturado.
3.  API solicita el reembolso a PayPal.
4.  Registra `refunds`.
5.  Trigger valida que la suma no supere el pago y actualiza estados.
6.  Si corresponde reponer inventario, API llama `adjust_inventory(...)`
    con movimiento compensatorio.
7.  Webhook concilia el evento del proveedor.

------------------------------------------------------------------------

## 8. Contrato de endpoints por módulo

Prefijo general: `/api/v1`.

  ---------------------------------------------------------------------------------------------------
  Módulo            Método y ruta                                 Acceso            Consumidor
                                                                                    habitual
  ----------------- --------------------------------------------- ----------------- -----------------
  Salud             `GET /health`                                 Público           Monitor /
                                                                                    despliegue

  Catálogo          `GET /products`                               Público           Store

  Catálogo          `GET /products/:slug`                         Público           Store

  Catálogo          `GET /products/:slug/related`                 Público           Store

  Categorías        `GET /categories`                             Público           Store

  Categorías        `GET /categories/:slug`                       Público           Store

  Marcas            `GET /brands`                                 Público           Store

  Búsqueda          `GET /search/suggest?q=`                      Público           Store

  Envío             `GET /shipping/methods`                       Público           Store

  Carrito           `POST /cart/price`                            Público           Store

  Carrito           `GET /cart`                                   JWT               Store

  Carrito           `PUT /cart/items`                             JWT               Store

  Carrito           `DELETE /cart/items/:variantId`               JWT               Store

  Carrito           `POST /cart/merge`                            JWT               Store

  Perfil            `GET /me`                                     JWT               Store

  Perfil            `PATCH /me`                                   JWT               Store

  Direcciones       `GET /me/addresses`                           JWT               Store

  Direcciones       `POST /me/addresses`                          JWT               Store

  Direcciones       `PATCH /me/addresses/:id`                     JWT               Store

  Direcciones       `DELETE /me/addresses/:id`                    JWT               Store

  Direcciones       `POST /me/addresses/:id/default`              JWT               Store

  Checkout          `POST /checkout/orders`                       JWT               Store

  Checkout          `POST /checkout/orders/:id/capture`           JWT               Store

  Checkout          `POST /checkout/orders/:id/cancel`            JWT               Store

  Pedidos cliente   `GET /orders`                                 JWT, propios      Store

  Pedidos cliente   `GET /orders/:orderNumber`                    JWT, propios      Store

  Webhook           `POST /webhooks/paypal`                       Firma PayPal      PayPal

  Admin catálogo    `/admin/products`                             `admin`,          Dashboard
                                                                  `inventory`       

  Admin catálogo    `/admin/categories`                           `admin`,          Dashboard
                                                                  `inventory`       

  Admin catálogo    `/admin/brands`                               `admin`,          Dashboard
                                                                  `inventory`       

  Admin catálogo    `/admin/spec-definitions`                     `admin`,          Dashboard
                                                                  `inventory`       

  Uploads           `POST /admin/uploads/product-image`           `admin`,          Dashboard
                                                                  `inventory`       

  Inventario        `GET /admin/inventory`                        `admin`,          Dashboard
                                                                  `inventory`       

  Inventario        `POST /admin/inventory/adjustments`           `admin`,          Dashboard
                                                                  `inventory`       

  Inventario        `GET /admin/inventory/:variantId/movements`   `admin`,          Dashboard
                                                                  `inventory`       

  Admin pedidos     `GET /admin/orders`                           `admin`, `sales`  Dashboard

  Admin pedidos     `GET /admin/orders/:id`                       `admin`, `sales`  Dashboard

  Admin pedidos     `PATCH /admin/orders/:id/status`              `admin`, `sales`  Dashboard

  Admin pedidos     `POST /admin/orders/:id/shipments`            `admin`, `sales`  Dashboard

  Admin pedidos     `POST /admin/orders/:id/refunds`              `admin` según     Dashboard
                                                                  permisos de       
                                                                  negocio           

  Admin pedidos     `POST /admin/orders/:id/cancel`               `admin`, `sales`  Dashboard

  Clientes          `GET /admin/customers`                        `admin`, `sales`  Dashboard

  Clientes          `GET /admin/customers/:id`                    `admin`, `sales`  Dashboard

  Clientes          `PATCH /admin/customers/:id`                  `admin`, `sales`  Dashboard

  Sistema           `/admin/settings`                             `admin`           Dashboard

  Sistema           `/admin/shipping-methods`                     `admin`           Dashboard

  Sistema           `/admin/carriers`                             `admin`           Dashboard

  Sistema           `/admin/users` (invitar)                      `admin`           Dashboard

  Auditoría         `GET /admin/audit-logs`                       `admin`           Dashboard

  KPIs              `GET /admin/dashboard/summary`                `admin`           Dashboard

  Exportación       Endpoints CSV de pedidos/inventario           `admin`           Dashboard
  ---------------------------------------------------------------------------------------------------

**Importante:** la arquitectura enumera grupos de CRUD administrativos,
pero no especifica todos los métodos HTTP, payloads ni schemas de cada
ruta. Define esos contratos al implementar cada módulo, documentándolos
en `docs/API.md` y manteniendo Hono RPC como fuente de tipos para los
dos clientes.

### 8.1 Parámetros de catálogo

`GET /products` admite los filtros definidos por la arquitectura:

-   `q`
-   `category`
-   `brand`
-   `minPrice`
-   `maxPrice`
-   `inStock`
-   `spec[key]`
-   `sort`
-   `page`
-   `pageSize`

Ordenamientos previstos: - Relevancia en búsqueda. - Novedades. - Precio
ascendente/descendente. - Más vendidos.

La respuesta debe incluir `data` y `meta.total` para paginación.

------------------------------------------------------------------------

## 9. Reglas de negocio que deben quedar en servicios API

  Regla                                   Servicio responsable
  --------------------------------------- -----------------------------------------------
  Calcular precio y total                 `checkout` / utilidades monetarias
  Calcular impuestos                      `checkout`
  Calcular envío y envío gratis           `shipping` / `checkout`
  Validar dirección y método compatible   `addresses` / `shipping`
  Validar specs contra categoría          `catalog`
  Crear variante predeterminada           `catalog`
  Reservar stock                          `checkout` + función SQL
  Consumir stock al confirmar             `payments` / `orders` + función SQL
  Liberar reservas                        `checkout` / job SQL
  Fusionar carrito                        `cart`
  Verificar monto/moneda PayPal           `payments`
  Idempotencia de captura y webhook       `payments`
  Transiciones de pedido                  `orders` + trigger
  Reembolsos y reposición                 `payments` / `inventory`
  Roles y permisos                        middleware/servicio `auth`
  Auditoría                               helper `audit()` en servicios administrativos

### Estados

Pedido: - `pending_payment` - `confirmed` - `processing` - `shipped` -
`delivered` - `cancelled`

Pago: - `pending` - `captured` - `failed` - `partially_refunded` -
`refunded`

Envío: - `preparing` - `shipped` - `in_transit` - `delivered` -
`returned` - `failed`

No mezcles estos tres estados en una sola propiedad de UI o base de
datos.

------------------------------------------------------------------------

## 10. Variables de entorno e integraciones

### API (Render)

-   `NODE_ENV`
-   `PORT`
-   `DATABASE_URL`
-   `DIRECT_URL`
-   `SUPABASE_URL`
-   `SUPABASE_SERVICE_ROLE_KEY`
-   `PAYPAL_ENV`
-   `PAYPAL_CLIENT_ID`
-   `PAYPAL_CLIENT_SECRET`
-   `PAYPAL_WEBHOOK_ID`
-   `RESEND_API_KEY`
-   `EMAIL_FROM`
-   `CORS_ORIGINS`
-   `STORE_URL`
-   `SENTRY_DSN`

### Tienda (Vercel)

-   `NEXT_PUBLIC_SUPABASE_URL`
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
-   `NEXT_PUBLIC_API_URL`
-   `NEXT_PUBLIC_SITE_URL`
-   `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
-   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

### Dashboard (Vercel)

-   `VITE_SUPABASE_URL`
-   `VITE_SUPABASE_ANON_KEY`
-   `VITE_API_URL`

Las variables públicas no son secretos. `SUPABASE_SERVICE_ROLE_KEY`,
`PAYPAL_CLIENT_SECRET` y `RESEND_API_KEY` no deben aparecer en las
aplicaciones frontend.

### Configuración inicial de servicios

1.  Configura Resend y verifica SPF/DKIM del dominio.
2.  Configura Resend como SMTP personalizado de Supabase Auth.
3.  Activa confirmación de correo y configura Site URL/Redirect URLs.
4.  Configura Google OAuth en Google Cloud y Supabase.
5.  Crea el bucket público `products`, con escritura solo por URL
    firmada.
6.  Habilita `pg_trgm`, `unaccent` y `pg_cron`.
7.  Verifica el comportamiento de vinculación de identidades
    Google/email.
8.  Mantén PayPal Sandbox en desarrollo y Live solo en producción.

------------------------------------------------------------------------

## 11. Pruebas: qué validar antes de avanzar

### Unitarias (Vitest)

-   Cálculo de totales.
-   Cálculo fiscal.
-   Fusión de carrito.
-   Transiciones de estados.
-   Validación de especificaciones.
-   Utilidades de dinero.

### Integración API

Usa `app.request()` de Hono contra una base PostgreSQL real de pruebas
(`supabase start` o Postgres en Docker).

Prioridad: - Autenticación y roles. - Catálogo y validación de specs. -
Direcciones. - Carrito. - Checkout. - Captura. - Webhooks. -
Reembolsos. - Permisos administrativos.

### Pruebas críticas de concurrencia

1.  Stock 1, dos checkouts simultáneos: solo uno reserva.
2.  Reserva vencida: libera `reserved` y cancela orden pendiente cuando
    corresponda.
3.  Captura duplicada: no descuenta inventario dos veces.
4.  Webhook duplicado: no procesa dos veces el mismo evento.
5.  Reembolso concurrente: no supera el monto capturado.
6.  Cambio de estado inválido: trigger lo rechaza.

### E2E (Playwright)

-   Registro y login.
-   Navegación y búsqueda.
-   Agregar al carrito.
-   Recargar y recuperar carrito local.
-   Iniciar sesión y fusionar carrito.
-   Crear pedido.
-   Completar flujo con `PAYMENT_PROVIDER=fake`.
-   Flujo Sandbox manual de PayPal.
-   Prueba en viewport móvil y teléfono real.

------------------------------------------------------------------------

## 12. Despliegue, seguridad y lanzamiento

### Despliegue

-   API: Render Web Service, preferiblemente misma región que Supabase.
-   Tienda: Vercel, root directory `apps/store`.
-   Dashboard: Vercel, proyecto separado, root directory
    `apps/dashboard`, `noindex`.
-   Supabase: proyecto de desarrollo separado del proyecto de
    producción.
-   Migraciones de producción: `prisma migrate deploy` usando
    `DIRECT_URL`.
-   CI verde antes de despliegue automático desde `main`.

### Seguridad mínima

-   RLS activo en todas las tablas.
-   Sin políticas de lectura pública; `anon` y `authenticated` sin
    privilegios sobre las tablas.
-   API conectada con credenciales de servidor.
-   JWT verificado en cada ruta protegida.
-   Rol consultado en `profiles`.
-   CORS exacto, nunca `*`.
-   MFA TOTP para administradores antes de lanzar.
-   Turnstile en registro/login.
-   CSP estricta y sanitización de HTML.
-   Rate limits por IP/usuario.
-   Webhooks firmados.
-   Auditoría de acciones sensibles.
-   Secretos fuera del repositorio.
-   Sentry en las tres aplicaciones.

### SEO y rendimiento

-   Next.js SSR/ISR para producto y categoría.
-   `generateMetadata`, canonical y Open Graph.
-   Sitemap con productos activos, categorías y marcas.
-   `robots.txt` bloquea checkout y cuenta.
-   JSON-LD de Product/Offer, BreadcrumbList y Organization.
-   Filtros con `noindex` o canonical a categoría base.
-   `next/image`, WebP y dimensiones reservadas.
-   Lazy loading bajo el pliegue.
-   PayPal SDK solo en checkout.
-   Metas indicativas: LCP \< 2,5 s, INP \< 200 ms, CLS \< 0,1.

### Antes de abrir al público

-   [ ] Compra de bajo monto en PayPal Live y reembolso real probado.
-   [ ] Webhook de producción y firma verificados.
-   [ ] Moneda y disponibilidad de tarjeta confirmadas.
-   [ ] RLS y privilegios revisados.
-   [ ] MFA en administradores.
-   [ ] Backups activos y restauración probada.
-   [ ] Originales de imágenes respaldados fuera de la base de datos.
-   [ ] `pg_cron` de expiración probado.
-   [ ] Sentry y uptime con alertas.
-   [ ] `checkout_enabled` probado.
-   [ ] Políticas legales publicadas.
-   [ ] Pruebas móviles y E2E completas.
-   [ ] Compra real conciliada entre PayPal, pedido e inventario.

------------------------------------------------------------------------

## 13. Hitos y criterios de finalización

  -----------------------------------------------------------------------
  Sprint                  Construcción            Criterio para darlo por
                                                  terminado
  ----------------------- ----------------------- -----------------------
  0                       Cimientos               Monorepo, Supabase dev,
                                                  Prisma, CI, API health
                                                  y dos frontends
                                                  desplegados

  1                       Identidad               Registro, confirmación,
                                                  recuperación, Google,
                                                  perfil, direcciones y
                                                  roles

  2                       Catálogo administrativo Crear y publicar
                                                  productos reales,
                                                  variantes, imágenes,
                                                  specs y stock desde
                                                  dashboard

  3                       Tienda pública          Inicio, categorías,
                                                  fichas, búsqueda,
                                                  filtros, SEO y sitemap

  4                       Carrito                 Invitado, persistencia,
                                                  precio vivo y fusión
                                                  con carrito de usuario

  5                       Checkout y pagos        Sandbox completo,
                                                  reserva, captura,
                                                  webhook, correo y
                                                  expiración probados

  6                       Operación               Pedidos, tracking,
                                                  reembolsos, auditoría,
                                                  KPIs y CSV

  7                       Endurecimiento          Seguridad, MFA,
                                                  Turnstile, Sentry,
                                                  backups, E2E y legales

  8                       Lanzamiento suave       Compra real de bajo
                                                  monto conciliada y
                                                  primeras métricas
                                                  revisadas
  -----------------------------------------------------------------------

El horizonte original es de 8--10 semanas a tiempo completo o 3--4 meses
a medio tiempo, sujeto a la velocidad de implementación y validaciones
externas.

## 14. Qué construir primero mañana: lista de trabajo concreta

Sigue este orden sin saltar directamente a las pantallas de compra:

1.  Crear el monorepo pnpm con `apps/store`, `apps/dashboard`,
    `apps/api` y `packages/shared`.
2.  Configurar TypeScript, lint, format, scripts y CI.
3.  Crear Supabase de desarrollo.
4.  Configurar `DATABASE_URL` y `DIRECT_URL`.
5.  Integrar Prisma y preparar migraciones versionadas.
6.  Aplicar el SQL inicial en desarrollo y validar cada sección.
7.  Crear API Hono con `GET /health`, `requestId`, logger, CORS y
    errores.
8.  Crear el cliente Hono RPC para los dos frontends.
9.  Preparar los layouts vacíos de tienda y dashboard y desplegarlos.
10. Implementar Supabase Auth y el middleware JWT/roles.
11. Implementar perfiles y direcciones.
12. Implementar catálogo administrativo.
13. Construir el formulario de producto completo en dashboard.
14. Cargar productos reales y verificar Storage/inventario.
15. Implementar endpoints públicos de catálogo y búsqueda.
16. Construir home, categoría, ficha y SEO en tienda.
17. Implementar carrito invitado, carrito autenticado y fusión.
18. Implementar checkout y reservas con pruebas de concurrencia.
19. Integrar PayPal Sandbox, captura y webhooks.
20. Implementar gestión de pedidos, envíos y reembolsos.
21. Completar KPIs, auditoría, exportaciones y settings.
22. Ejecutar checklist de seguridad, SEO, backups y E2E.
23. Hacer compra real de bajo monto y lanzar gradualmente.

**No empieces por PayPal, ni por el diseño final de la home, ni por
reportes.** Primero asegúrate de que los cimientos, identidad, catálogo
y stock son confiables.

------------------------------------------------------------------------

## 15. Documentación técnica que debes mantener dentro de `docs/`

  -----------------------------------------------------------------------
  Archivo                             Contenido
  ----------------------------------- -----------------------------------
  `ARCHITECTURE.md`                   Diagrama, responsabilidades y
                                      límites entre apps

  `DATABASE.md`                       Tablas, relaciones, enums,
                                      triggers, funciones y migraciones

  `API.md`                            Endpoints, auth, payloads,
                                      respuestas, errores y ejemplos

  `BUSINESS-RULES.md`                 Inventario, pedidos, precios,
                                      impuestos, checkout y reembolsos

  `SECURITY.md`                       JWT, roles, RLS, CORS, secretos,
                                      MFA y webhooks

  `DEPLOYMENT.md`                     Entornos, variables, CI/CD,
                                      migraciones y rollback

  `INCIDENTS.md`                      Respuesta a incidentes, rotación de
                                      secretos, restauración y
                                      post-mortem
  -----------------------------------------------------------------------

Actualiza estos documentos cuando una decisión aprobada cambie. Registra
motivo, fecha, módulos afectados y decisión anterior/nueva.

------------------------------------------------------------------------

## 16. Puntos que la documentación fuente deja abiertos

No inventes decisiones sobre estos temas. Confírmalos antes de activar
la funcionalidad relacionada:

1.  País de operación y moneda definitiva.
2.  Tratamiento contable/fiscal del ITBIS.
3.  Disponibilidad de pago con tarjeta y moneda en PayPal Business.
4.  Si existirá retiro en tienda.
5.  Categorías reales del lanzamiento.
6.  Identidad visual final.
7.  Dominio definitivo.
8.  Vinculación de identidades Google y correo con el mismo email.

Además, el catálogo de endpoints de la arquitectura define grupos y
rutas principales, pero no todos los payloads y métodos CRUD
administrativos. Completa esos contratos al desarrollar cada módulo, con
Zod y Hono RPC como fuente única de tipos.

------------------------------------------------------------------------

## 17. Principio de cierre

El proyecto está terminado para el MVP cuando un cliente puede descubrir
un producto indexable, consultar disponibilidad, registrarse, agregarlo
al carrito, pagar mediante PayPal, recibir confirmación y consultar su
pedido; y cuando el equipo puede administrar productos, stock, pedidos,
envíos y reembolsos desde el dashboard, con trazabilidad y controles de
seguridad.

La condición final no es que las pantallas estén dibujadas: es que el
flujo completo funcione con datos reales, transacciones consistentes,
permisos verificados, pagos conciliados y pruebas reproducibles.
