# Database — MySQL

Recursos relacionados con la base de datos de UCC Market.

## Estructura

```
database/
├── migrations/   # Scripts de creación y modificación del esquema
└── seeds/        # Datos iniciales de prueba
```

## Estado en esta rama

⚠️ **El esquema completo no está aquí.** `feature/categories` contiene solo:

| Archivo                    | Contenido                                                        |
| -------------------------- | ---------------------------------------------------------------- |
| `migrations/008_auth.sql`  | `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens` |

Las migraciones `001`–`007` (ubicaciones, usuarios, productos, administración,
ventas, comunicación, comunidad), junto con `schema.sql`, `indexes/`, `views/`,
`procedures/`, `triggers/` y `seeds/`, están en `origin/develop`.

Para consultar un archivo sin cambiar de rama:

```bash
git show origin/develop:database/schema.sql
```

`schema.sql` **no referencia todavía** `008_auth.sql`: hay que aplicarla aparte.
Pendiente de resolver al crear la rama de integración (ver
`docs/ROADMAP.md` → *Prerrequisitos técnicos* y `docs/AUDIT_PHASE_-1.md` → H-3).

El modelo de datos es [`docs/DATABASE_DESIGN.md`](../docs/DATABASE_DESIGN.md).
