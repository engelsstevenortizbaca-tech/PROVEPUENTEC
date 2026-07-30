#  PROVEPUENTEC

Aplicación **PROVEPUENTEC** full-stack que permite a los usuarios publicar,
explorar y comprar productos. Desarrollada con **React**, **Node.js**, **MySQL**
y empaquetada para móvil con **Capacitor**.

---

## Stack tecnológico

| Capa            | Tecnología                          |
| --------------- | ----------------------------------- |
| **Frontend**    | React + Vite                        |
| **Backend**     | Node.js + Express                   |
| **Base de datos** | MySQL                             |
| **Móvil**       | Capacitor                           |
| **Control de versiones** | Git + GitHub               |

---

##  Estructura del proyecto

```
Marketplace/
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
├── server/        # API backend (Node.js + Express)
│   └── src/
│       ├── config/       # Configuración (DB, entorno)
│       ├── controllers/  # Lógica de los endpoints
│       ├── routes/       # Definición de rutas
│       ├── models/       # Modelos de datos
│       ├── middlewares/  # Middlewares (auth, errores)
│       ├── services/     # Lógica de negocio
│       └── utils/        # Utilidades y helpers
│
├── database/      # Esquemas, migraciones y seeds
│   ├── migrations/
│   └── seeds/
│
├── docs/          # Documentación del proyecto
│
├── .gitignore
└── README.md
```

---

##  Flujo de ramas (Git)

- **main** → rama estable / producción.
- **develop** → rama de integración de nuevas funcionalidades.
- **feature/** → ramas para funcionalidades específicas.

---

##  Puesta en marcha

>  El proyecto se encuentra en su fase inicial (estructura base).
> Las dependencias y funcionalidades se irán agregando progresivamente.

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Marketplace

# Instalar dependencias de tooling (también activa los hooks de Husky)
npm install
```

Instrucciones detalladas de instalación y ejecución se documentarán en
[`docs/`](./docs) a medida que avance el desarrollo.

---

##  Calidad de código (tooling)

El repositorio incluye un conjunto de herramientas de calidad ya configuradas.

### Scripts disponibles

| Script                 | Descripción                                              |
| ---------------------- | -------------------------------------------------------- |
| `npm run lint`         | Analiza el código con ESLint.                            |
| `npm run lint:fix`     | Corrige automáticamente los problemas que ESLint pueda.  |
| `npm run format`       | Formatea el proyecto con Prettier.                       |
| `npm run format:check` | Verifica el formato sin modificar archivos (usado en CI).|
| `npm run build`        | Compila los workspaces (`client` y `server`).            |

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

## 📄 Licencia

Este proyecto se distribuye bajo los términos que defina el autor.
