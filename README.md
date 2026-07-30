# Sistema de Gestión Comercial

Sistema web desarrollado con una arquitectura cliente-servidor que permite administrar productos, categorías, subcategorías y usuarios mediante una API REST.

## Características

- Gestión de productos.
- Administración de categorías y subcategorías.
- Sistema de autenticación de usuarios.
- API REST para la comunicación entre cliente y servidor.
- Validación de datos.
- Manejo centralizado de errores.
- Arquitectura modular.
- Base de datos relacional.

## Tecnologías utilizadas

### Frontend

- React
- JavaScript
- HTML5
- CSS3

### Backend

- Node.js
- Express.js

### Base de datos

- MySQL

### Herramientas

- Git
- GitHub
- npm

## Estructura del proyecto

```
Proyecto/
│
├── client/             # Aplicación Frontend
├── server/             # API REST
├── database/           # Scripts de base de datos
├── docs/               # Documentación técnica
├── ROADMAP.md          # Mejoras futuras
└── README.md
```

## Funcionalidades principales

### Usuarios

- Registro de usuarios.
- Inicio de sesión.
- Gestión de perfiles.
- Autenticación mediante credenciales.

### Productos

- Crear productos.
- Editar productos.
- Eliminar productos.
- Consultar productos.

### Categorías

- Crear categorías.
- Editar categorías.
- Eliminar categorías.
- Consultar categorías.

### Subcategorías

- Crear subcategorías.
- Editar subcategorías.
- Eliminar subcategorías.
- Asociación con categorías.

## Arquitectura

El sistema sigue una arquitectura Cliente-Servidor.

```
Frontend
      │
      ▼
API REST (Express)
      │
      ▼
Servicios
      │
      ▼
Repositorios
      │
      ▼
MySQL
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
```

### 2. Instalar dependencias

**Frontend**

```bash
cd client
npm install
```

**Backend**

```bash
cd ../server
npm install
```

### 3. Configurar variables de entorno

Crear el archivo:

```
server/.env
```

Ejemplo:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=proyecto
DB_USER=root
DB_PASSWORD=tu_contraseña

JWT_SECRET=tu_clave_secreta
```

## Base de datos

Crear la base de datos en MySQL e importar los scripts SQL correspondientes ubicados en la carpeta:

```
database/
```

> **Importante:** Verifique qué scripts SQL corresponden a la rama del proyecto antes de ejecutarlos.

## Ejecución

**Backend**

```bash
cd server
npm start
```

**Frontend**

```bash
cd client
npm start
```

## Verificación del proyecto

Ejecutar las siguientes herramientas para comprobar la calidad del código:

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run format
```




