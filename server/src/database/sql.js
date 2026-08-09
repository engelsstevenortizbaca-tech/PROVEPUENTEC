'use strict';

// Fragmentos de SQL que todos los repositorios construyen igual. Ninguna de
// estas funciones acepta valores del cliente como identificadores: las columnas
// y tablas provienen siempre de literales del repositorio.

// Cláusula LIMIT/OFFSET con enteros saneados. Los placeholders preparados de
// mysql2 no admiten LIMIT/OFFSET de forma fiable, así que hay que interpolarlos;
// por eso se fuerzan a entero no negativo antes de entrar en la consulta.
const limitOffset = ({ limit = 20, offset = 0 } = {}) => {
  const safeLimit = Math.max(Math.trunc(Number(limit)) || 0, 0);
  const safeOffset = Math.max(Math.trunc(Number(offset)) || 0, 0);
  return `LIMIT ${safeLimit} OFFSET ${safeOffset}`;
};

// Parte SET de un UPDATE parcial: solo las columnas presentes en `fields`.
//
//   buildSet({ allowed: ['nombre', 'activo'], fields, booleanColumns: ['activo'] })
//   → { sql: 'nombre = :nombre, activo = :activo', params: { ... } }
//
// `allowed` es la lista blanca de columnas del repositorio: los nombres nunca
// salen de las claves que envía el cliente, así que no hay superficie de
// inyección. Devuelve null si no hay nada que actualizar.
const buildSet = ({ allowed = [], fields = {}, booleanColumns = [] }) => {
  const assignments = [];
  const params = {};

  for (const column of allowed) {
    if (fields[column] === undefined) continue;
    assignments.push(`${column} = :${column}`);
    params[column] = booleanColumns.includes(column) ? (fields[column] ? 1 : 0) : fields[column];
  }

  return assignments.length > 0 ? { sql: assignments.join(', '), params } : null;
};

module.exports = { limitOffset, buildSet };
