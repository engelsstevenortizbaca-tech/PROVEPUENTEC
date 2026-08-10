'use strict';

const { withTransaction } = require('../database/transaction');
const { toPublicProductImage } = require('../models/productImage.model');
const productImageRepository = require('../repositories/productImage.repository');
const { publicUrl, removeUpload, removeUploads } = require('../utils/uploads');
const { NotFoundError, ValidationError } = require('../errors');

const NOT_FOUND = 'Imagen no encontrada';

const list = async (productoId) =>
  (await productImageRepository.findByProductId(productoId)).map(toPublicProductImage);

// Registra en la galería los archivos que multer ya dejó en disco.
//
// Si la escritura en BD falla, los archivos huérfanos se borran antes de
// propagar el error: el disco no debe quedar con basura de una operación que
// se revirtió.
async function addImages(productoId, files = []) {
  if (files.length === 0) {
    throw new ValidationError('Debes adjuntar al menos una imagen');
  }

  const urls = files.map((file) => publicUrl(file.filename));

  try {
    const ids = await withTransaction(async () => {
      // La primera imagen de un producto sin galería queda como principal: un
      // producto con imágenes pero sin principal no tendría portada.
      const yaHayImagenes = (await productImageRepository.countByProductId(productoId)) > 0;
      let orden = (await productImageRepository.maxOrden(productoId)) + 1;

      const creados = [];
      for (const [index, url] of urls.entries()) {
        const esPrincipal = !yaHayImagenes && index === 0;
        creados.push(
          await productImageRepository.create({ productoId, url, orden: orden++, esPrincipal })
        );
      }
      return creados;
    });

    return { ids, imagenes: await list(productoId) };
  } catch (error) {
    await removeUploads(urls);
    throw error;
  }
}

// Reordena una imagen o la marca como principal. Marcar una nueva principal
// desmarca la anterior en la misma transacción: la regla «solo una principal
// por producto» no la impone la BD.
async function update(productoId, imageId, data) {
  const current = await productImageRepository.findById(imageId, productoId);
  if (!current) throw new NotFoundError(NOT_FOUND);

  const fields = {};
  if (data.orden !== undefined) fields.orden = data.orden;
  if (data.esPrincipal !== undefined) fields.es_principal = Boolean(data.esPrincipal);

  await withTransaction(async () => {
    if (fields.es_principal === true) {
      await productImageRepository.clearPrincipal(productoId, { exceptId: imageId });
    }
    await productImageRepository.update(imageId, fields);
  });

  return list(productoId);
}

// Borrado definitivo: la tabla no tiene soft delete. El archivo se elimina
// después de que la fila desaparezca, para no dejar una referencia rota si el
// borrado en BD falla. Un archivo ya ausente no es un error.
async function remove(productoId, imageId) {
  const current = await productImageRepository.findById(imageId, productoId);
  if (!current) throw new NotFoundError(NOT_FOUND);

  await productImageRepository.remove(imageId);
  await removeUpload(current.url);
}

module.exports = { list, addImages, update, remove };
