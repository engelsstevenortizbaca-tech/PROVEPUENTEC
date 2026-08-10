'use strict';

const httpStatus = require('../constants/httpStatus');
const productService = require('../services/product.service');
const productImageService = require('../services/productImage.service');

const list = async (req, res) => {
  const result = await productService.list(req.query);
  res.status(httpStatus.OK).json(result);
};

// Publicaciones del usuario autenticado, borradores incluidos.
const listMine = async (req, res) => {
  const result = await productService.listByOwner(req.user.id, req.query);
  res.status(httpStatus.OK).json(result);
};

// `req.user` es null en una petición anónima: el service decide qué es visible.
const getById = async (req, res) => {
  const product = await productService.getById(req.params.id, req.user);
  res.status(httpStatus.OK).json({ product });
};

const getBySlug = async (req, res) => {
  const product = await productService.getBySlug(req.params.slug, req.user);
  res.status(httpStatus.OK).json({ product });
};

const create = async (req, res) => {
  const product = await productService.create(req.user.id, req.body);
  res.status(httpStatus.CREATED).json({ product });
};

const update = async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  res.status(httpStatus.OK).json({ product });
};

const changeStatus = async (req, res) => {
  const product = await productService.changeStatus(req.params.id, req.body.estado);
  res.status(httpStatus.OK).json({ product });
};

const remove = async (req, res) => {
  await productService.remove(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
};

// --- Imágenes ---------------------------------------------------------------

const addImages = async (req, res) => {
  const { imagenes } = await productImageService.addImages(req.params.id, req.files);
  res.status(httpStatus.CREATED).json({ imagenes });
};

const updateImage = async (req, res) => {
  const imagenes = await productImageService.update(req.params.id, req.params.imageId, req.body);
  res.status(httpStatus.OK).json({ imagenes });
};

const removeImage = async (req, res) => {
  await productImageService.remove(req.params.id, req.params.imageId);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = {
  list,
  listMine,
  getById,
  getBySlug,
  create,
  update,
  changeStatus,
  remove,
  addImages,
  updateImage,
  removeImage,
};
