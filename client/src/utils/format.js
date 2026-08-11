// Formateo compartido por tarjetas y detalle, para que el precio no se pinte
// de dos maneras distintas según la pantalla.

const PRECIO = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
});

// El backend ya convierte el DECIMAL de MySQL a número; se protege igualmente
// frente a un valor ausente.
export const formatearPrecio = (valor) =>
  Number.isFinite(Number(valor)) ? PRECIO.format(Number(valor)) : '—';

const FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const formatearFecha = (valor) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA.format(fecha);
};
