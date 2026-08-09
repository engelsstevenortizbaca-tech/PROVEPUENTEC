'use strict';

const { BadRequestError } = require('../errors');

// Rango Unicode de los diacríticos combinantes (Combining Diacritical Marks),
// que `normalize('NFD')` separa de su letra base. Se escribe con secuencias de
// escape y no con los caracteres literales: son invisibles en el editor, y
// cualquier normalización del archivo los alteraría rompiendo el borrado de
// acentos sin dejar rastro en el diff.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Convierte un texto en un slug apto para URL: minúsculas, sin diacríticos y
// con guiones en lugar de caracteres no alfanuméricos. Se limita a 140
// caracteres para encajar en la columna `slug` de la BD.
const slugify = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // no alfanumérico -> guion
    .replace(/^-+|-+$/g, '') // recorta guiones sobrantes
    .slice(0, 140)
    .replace(/-+$/g, ''); // por si el corte dejó un guion al final

// Deriva el slug de un recurso a partir del valor explícito (si viene) o de su
// nombre, y valida que no quede vacío tras normalizar: ocurre cuando el nombre
// no contiene ningún carácter latino ni dígito (p. ej. solo ideogramas). En ese
// caso el cliente debe enviar un `slug` explícito.
const buildSlug = ({ slug, nombre }) => {
  const source = slug && String(slug).trim() ? slug : nombre;
  const result = slugify(source);
  if (!result) {
    throw new BadRequestError('No se pudo generar un slug válido a partir del nombre');
  }
  return result;
};

module.exports = { slugify, buildSlug };
