# API de Autenticación

Base: `${API_PREFIX}/auth` (por defecto `/api/auth`).

## Conceptos

- **Access token** (JWT, corta duración, `JWT_ACCESS_EXPIRES_IN`, por defecto 15 min):
  se envía en cada petición protegida como `Authorization: Bearer <accessToken>`.
- **Refresh token** (JWT, larga duración, `JWT_REFRESH_EXPIRES_IN`, por defecto 7 días):
  se entrega en una **cookie httpOnly** (`refresh_token`, restringida a `/api/auth`)
  y también en el cuerpo de la respuesta para clientes no-navegador. Se guarda
  **hasheado** (SHA-256) en `refresh_tokens` y se **rota** en cada `/refresh`.
- Las contraseñas se guardan con **bcrypt** (`BCRYPT_ROUNDS`).
- Errores uniformes: `{ "status": "error", "message": "...", "details": [...] }`.
  Validación → `422` con `details: [{ field, message }]`.

## Roles (RBAC)

`admin`, `vendedor`, `comprador`, `soporte`. Al registrarse se asigna `comprador`.
Rutas protegidas por rol usan el middleware `authorize(...roles)`.

## Endpoints

| Método  | Ruta                   | Auth        | Descripción                                                                             |
| ------- | ---------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `POST`  | `/register`            | —           | Crea la cuenta, asigna rol por defecto, envía correo de verificación y devuelve tokens. |
| `POST`  | `/login`               | —           | Inicia sesión y devuelve tokens.                                                        |
| `POST`  | `/refresh`             | cookie/body | Rota el refresh token y emite un nuevo par.                                             |
| `POST`  | `/logout`              | cookie/body | Revoca el refresh token actual.                                                         |
| `GET`   | `/me`                  | Bearer      | Devuelve el perfil del usuario autenticado.                                             |
| `PATCH` | `/password`            | Bearer      | Cambia la contraseña (cierra todas las sesiones).                                       |
| `POST`  | `/password/forgot`     | —           | Solicita recuperación (respuesta genérica).                                             |
| `POST`  | `/password/reset`      | —           | Restablece la contraseña con un token de un solo uso.                                   |
| `GET`   | `/email/verify?token=` | —           | Verifica el correo con el token recibido.                                               |
| `POST`  | `/email/resend`        | —           | Reenvía el correo de verificación (respuesta genérica).                                 |

## Cuerpos de petición

```jsonc
// POST /register
{ "nombre": "Ana", "apellido": "Pérez", "email": "ana@example.com",
  "password": "secreta123", "telefono": "999111222" }

// POST /login
{ "email": "ana@example.com", "password": "secreta123" }

// POST /refresh  (opcional si se usa la cookie)
{ "refreshToken": "<jwt>" }

// PATCH /password  (Authorization: Bearer <accessToken>)
{ "currentPassword": "secreta123", "newPassword": "nueva4567" }

// POST /password/forgot   { "email": "ana@example.com" }
// POST /password/reset     { "token": "<token>", "newPassword": "nueva4567" }
// POST /email/resend       { "email": "ana@example.com" }
```

## Respuesta de autenticación (`register` / `login` / `refresh`)

```jsonc
{
  "user": {
    "id": 1,
    "nombre": "Ana",
    "apellido": "Pérez",
    "email": "ana@example.com",
    "telefono": "999111222",
    "avatarUrl": null,
    "estado": "activo",
    "emailVerificado": false,
    "roles": ["comprador"],
    "createdAt": "...",
  },
  "tokenType": "Bearer",
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "accessTokenExpiresIn": "15m",
}
```

## Reglas de validación (express-validator)

- **email**: formato válido, normalizado.
- **password / newPassword**: 8–100 caracteres, con al menos una letra y un número.
- **nombre / apellido**: obligatorios (máx. 80).
- **telefono**: opcional (máx. 30).

## Notas de implementación

- El envío de correo está **stubbed**: el enlace/token se registra vía logger
  (`utils/mailer.js`) hasta integrar un proveedor real (p. ej. nodemailer).
- Las tablas `refresh_tokens`, `password_reset_tokens` y
  `email_verification_tokens` las crea la migración **aditiva**
  `database/migrations/008_auth.sql` (depende de `002_usuarios`).
