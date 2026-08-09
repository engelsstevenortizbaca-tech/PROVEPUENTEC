'use strict';

// Lectura de los parámetros de consulta comunes a todos los listados de la API.
// Los Validators ya rechazan los valores fuera de rango (422); estas funciones
// son la última defensa y garantizan valores utilizables aunque la ruta no
// declare validación.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// { page, limit, offset } a partir de `page` y `limit` de la query.
const parsePagination = (
  query = {},
  { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}
) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const requested = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(requested, 1), maxLimit);

  return { page, limit, offset: (page - 1) * limit };
};

// Filtro booleano de tres estados: true, false o null ("sin filtrar"). Un
// parámetro ausente o vacío no debe filtrar nada, que es distinto de filtrar
// por false.
const parseOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value === true || value === 'true' || value === '1';
};

// Identificador de filtro opcional: entero positivo o null.
const parseOptionalId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// Texto de búsqueda recortado, o null si no aporta nada.
const parseSearch = (value) => {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || null;
};

// Respuesta de colección con el formato acordado: { data, pagination }.
const paginated = (data, { page, limit, total }) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  parseOptionalBoolean,
  parseOptionalId,
  parseSearch,
  paginated,
};
