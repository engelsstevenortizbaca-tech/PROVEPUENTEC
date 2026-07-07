# 🛒 Marketplace

Aplicación **Marketplace** full-stack que permite a los usuarios publicar,
explorar y comprar productos. Desarrollada con **React**, **Node.js**, **MySQL**
y empaquetada para móvil con **Capacitor**.

---

## 🚀 Stack tecnológico

| Capa            | Tecnología                          |
| --------------- | ----------------------------------- |
| **Frontend**    | React + Vite                        |
| **Backend**     | Node.js + Express                   |
| **Base de datos** | MySQL                             |
| **Móvil**       | Capacitor                           |
| **Control de versiones** | Git + GitHub               |

---

## 📁 Estructura del proyecto

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

## 🌿 Flujo de ramas (Git)

- **main** → rama estable / producción.
- **develop** → rama de integración de nuevas funcionalidades.
- **feature/** → ramas para funcionalidades específicas.

---

## 🛠️ Puesta en marcha

> ⚠️ El proyecto se encuentra en su fase inicial (estructura base).
> Las dependencias y funcionalidades se irán agregando progresivamente.

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Marketplace
```

Instrucciones detalladas de instalación y ejecución se documentarán en
[`docs/`](./docs) a medida que avance el desarrollo.

---

## 📄 Licencia

Este proyecto se distribuye bajo los términos que defina el autor.
