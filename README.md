# PROVEPUENTEC

PROVEPUENTEC es un marketplace full-stack donde compradores y vendedores publican
productos, **negocian el precio y el envío**, generan pedidos y siguen su entrega.

> **Estado:** desarrollo activo. Operativos los módulos **Auth**,
> **Categorías**, **Subcategorías**, **Marcas** y **Productos**. El frontend
> tiene su primera entrega: portada, catálogo, ficha de producto, categorías,
> login y registro.
> El avance por módulo está en [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Stack tecnológico

| Capa                     | Tecnología                                       |
| ------------------------ | ------------------------------------------------ |
| **Frontend**             | React + Vite                                     |
| **Backend**              | Node.js + Express (arquitectura por capas)       |
| **Base de datos**        | MySQL 8                                          |
| **Autenticación**        | JWT (access + refresh) · bcrypt                  |
| **Validación**           | express-validator                                |
| **Pruebas**              | Runner nativo de Node (`node --test`)            |
| **Control de versiones** | Git + GitHub                                     |

---

## Estructura del proyecto

```
PROVEPUENTEC/
├── client/        # Aplicación frontend (React + Vite)
│   ├── public/    # Recursos estáticos públicos
│   └── src/
│       ├── assets/       # Imágenes, íconos, fuentes
│       ├── components/   # Componentes reutilizables
│       ├── pages/        # Vistas / páginas
│       ├── services/     # Llamadas a la API
│       ├── hooks/        # Custom hooks
│       ├── context/      # Estado global (Context API)
│       └── utils/        # Utilidades y helpers
│
├── server/        # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/       # Carga y validación de variables de entorno
│   │   ├── database/     # Pool MySQL, helper transaccional, fragmentos SQL
│   │   ├── routes/       # Definición de endpoints
│   │   ├── controllers/  # Petición y respuesta HTTP (sin lógica)
│   │   ├── services/     # Lógica de negocio
│   │   ├── repositories/ # Acceso a datos (todas las consultas)
│   │   ├── validators/   # Reglas de validación de entrada
│   │   ├── middlewares/  # Auth, RBAC, errores, subidas, rate limiting
│   │   ├── models/       # Proyección de filas a representación pública
│   │   ├── errors/       # AppError y errores HTTP derivados
│   │   ├── constants/    # Códigos HTTP, roles, estados de dominio
│   │   ├── utils/        # Logger, JWT, slug, contraseñas, subidas
│   │   └── docs/         # Documentación por módulo de la API
│   ├── tests/            # Pruebas
│   ├── uploads/          # Archivos subidos (runtime)
│   └── logs/             # Logs de la aplicación (runtime)
│
├── database/      # Esquema, migraciones, índices, vistas y seeds
│
├── docs/          # Documentación técnica y funcional
│
├── CLAUDE.md      # Convenciones obligatorias del proyecto
└── README.md
```

La arquitectura por capas es obligatoria: **Repository → Service → Controller →
Routes**. Los detalles y las razones están en
[`CLAUDE.md`](./CLAUDE.md) y [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Puesta en marcha

### Requisitos

- Node.js >= 18
- MySQL 8

### 1 · Clonar el repositorio e instalar el tooling

```bash
git clone https://github.com/engelsstevenortizbaca-tech/PROVEPUENTEC.git
cd PROVEPUENTEC

# Instalar dependencias de tooling (también activa los hooks de Husky)
npm install
```

### 2 · Crear la base de datos

Desde `database/`. `schema.sql` encadena las migraciones `001`–`007` junto con los
índices, las vistas, los procedimientos y los triggers; `008_auth.sql` se aplica
aparte porque no está incluido en él:

```bash
cd database
mysql -u root -p < schema.sql                      # migraciones, índices, vistas
mysql -u root -p marketplace < seeds/001_catalogos.sql   # roles, estados, catálogos
mysql -u root -p marketplace < migrations/008_auth.sql   # tablas de tokens de auth
```

El seed de catálogos es **obligatorio**: sin la tabla `roles` poblada, el registro
de usuarios crea cuentas sin rol. `seeds/002_demo.sql` es opcional y carga datos
de ejemplo.

Modelo de datos y notas de compatibilidad en
[`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md).

### 3 · Levantar la API

```bash
cd server
cp .env.example .env      # ajusta las credenciales de MySQL
npm install
npm run dev               # desarrollo (nodemon)
```

Comprobación rápida:

```bash
curl http://localhost:3000/health     # → {"status":"ok"}
```

Las variables de entorno están documentadas en
[`server/README.md`](./server/README.md#variables-de-entorno). **En producción el
servidor no arranca con los secretos JWT de desarrollo ni con `CORS_ORIGINS=*`.**

### 4 · Frontend

```bash
npm run dev -w client     # http://localhost:5173
```

Vite proxifica `/api` y `/uploads` hacia `http://localhost:3000`, así que el
servidor debe estar levantado. Las pantallas disponibles, las variables de
entorno (`VITE_API_PROXY`, `VITE_API_PREFIX`) y la organización del código están
en [`client/README.md`](./client/README.md).

---

## Flujo de ramas (Git)

- **main** → rama estable / producción.
- **develop** → rama de integración de nuevas funcionalidades.
- **feature/** → ramas para funcionalidades específicas.

---

## Calidad de código (tooling)

El repositorio incluye un conjunto de herramientas de calidad ya configuradas.

### Scripts disponibles

Desde la raíz del repositorio:

| Script                 | Descripción                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run lint`         | Analiza el código con ESLint.                            |
| `npm run lint:fix`     | Corrige automáticamente los problemas que ESLint pueda.  |
| `npm run format`       | Formatea el proyecto con Prettier.                       |
| `npm run format:check` | Verifica el formato sin modificar archivos (usado en CI).|
| `npm run build`        | Compila los workspaces (`client` y `server`).            |

Antes de dar por terminada una tarea, desde `server/`:

```bash
npm run lint
npm run format:check
npm test
```

### Herramientas

- **ESLint** (flat config) — reglas para React (cliente) y Node.js (servidor).
- **Prettier** — formateo consistente, integrado con ESLint (sin conflictos).
- **EditorConfig** — estilo de edición común (UTF-8, LF, 2 espacios).
- **Husky** — hooks de Git (`pre-commit`, `commit-msg`), activados por `npm install`.
- **lint-staged** — ejecuta ESLint/Prettier solo sobre los archivos en *stage*.
- **commitlint** — obliga a usar [Conventional Commits](https://www.conventionalcommits.org).
- **GitHub Actions** — CI que instala, lintea, verifica formato y compila.

### Convención de commits

Los mensajes deben seguir el formato `tipo(alcance): descripción`, por ejemplo:

```
feat(client): agregar página de inicio
fix(server): corregir validación de token
chore: actualizar dependencias
```

---

## Documentación

| Documento                                                       | Contenido                                       |
| --------------------------------------------------------------- | ----------------------------------------------- |
| [`docs/BUSINESS_RULES.md`](./docs/BUSINESS_RULES.md)            | Reglas de negocio. Fuente de verdad funcional.  |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)                | Decisiones, flujo, módulos y endpoints          |
| [`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md)          | Modelo de datos. Referencia de las migraciones. |
| [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md)  | Orden, criterios de aceptación y pruebas        |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                          | Estado de avance                                |
| [`server/src/docs/`](./server/src/docs/)                        | Documentación de cada módulo de la API          |

Índice completo en [`docs/README.md`](./docs/README.md).

---

## Licencia

Este proyecto se distribuye bajo los términos que defina el autor.
