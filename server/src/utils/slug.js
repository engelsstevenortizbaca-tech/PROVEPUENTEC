'use strict';

// Convierte un texto en un slug apto para URL: minúsculas, sin diacríticos y
// con guiones en lugar de caracteres no alfanuméricos. Se limita a 140
// caracteres para encajar en la columna `slug` de la BD.
const slugify = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina acentos/diacríticos combinados
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // no alfanumérico -> guion
    .replace(/^-+|-+$/g, '') // recorta guiones sobrantes
    .slice(0, 140)
    .replace(/-+$/g, ''); // por si el corte dejó un guion al final

module.exports = { slugify };
