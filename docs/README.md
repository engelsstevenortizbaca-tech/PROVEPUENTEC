# Documentación

Documentación técnica y funcional de **PROVEPUENTEC**.

## Documentos

| Documento                                          | Contenido                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| [BUSINESS_RULES.md](BUSINESS_RULES.md)             | Reglas de negocio. **Fuente de verdad funcional.**                         |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | Decisiones de arquitectura, flujo, módulos, endpoints y riesgos            |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md)           | Modelo de datos. **Referencia oficial de toda migración.**                 |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)   | Orden de implementación, criterios de aceptación, pruebas y checklist      |
| [ROADMAP.md](ROADMAP.md)                           | Estado de avance por módulo                                                |
| [AUDIT_PHASE_-1.md](AUDIT_PHASE_-1.md)             | Informe de la auditoría técnica previa a la fase 0. Hallazgos y bloqueos    |
| [AUDIT_2026-07-30.md](AUDIT_2026-07-30.md)         | Auditoría de código, seguridad, BD y documentación. Correcciones aplicadas  |

### Documentos no disponibles en esta rama

| Documento                       | Rama                 | Estado                                        |
| ------------------------------- | -------------------- | --------------------------------------------- |
| `docs/database/modelo-de-datos.md` | `feature/database` | **No presente en esta rama.** Sin enlazar para no dejar una referencia inválida |

Ese documento describe el esquema original y no está en esta rama. Vive en
`feature/database` y, según verificó la auditoría (hallazgo H-1), también en
`origin/develop`, donde ya se fusionó junto con el esquema completo. Para
consultarlo sin cambiar de rama:

```
git show feature/database:docs/database/modelo-de-datos.md
```

Cuando exista la rama de integración, el archivo estará disponible localmente y
podrá enlazarse desde esta tabla. **Hasta entonces no debe añadirse el enlace**:
apuntaría a una ruta inexistente.

## Orden de lectura

Para implementar un módulo:

1. `BUSINESS_RULES.md` — qué debe hacer
2. `ARCHITECTURE.md` — cómo encaja en el sistema
3. `DATABASE_DESIGN.md` — qué tablas toca
4. `IMPLEMENTATION_PLAN.md` — qué debe cumplir para darse por terminado

## Precedencia ante contradicciones

- Lo funcional: `BUSINESS_RULES.md`
- El modelo de datos: `DATABASE_DESIGN.md`
- Las convenciones de código: `CLAUDE.md`

## Documentación por módulo

La documentación de cada módulo del backend vive en `server/src/docs/`. La
infraestructura compartida (helper transaccional, `ownership`, `upload` y
constantes de estado) está en `server/src/docs/base-tecnica.md`.
