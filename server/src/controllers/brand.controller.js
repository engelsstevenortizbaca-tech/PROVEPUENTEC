'use strict';

const httpStatus = require('../constants/httpStatus');
const brandService = require('../services/brand.service');

const list = async (req, res) => {
  const result = await brandService.list(req.query);
  res.status(httpStatus.OK).json(result);
};

const getById = async (req, res) => {
  const brand = await brandService.getById(req.params.id);
  res.status(httpStatus.OK).json({ brand });
};

const getBySlug = async (req, res) => {
  const brand = await brandService.getBySlug(req.params.slug);
  res.status(httpStatus.OK).json({ brand });
};

const create = async (req, res) => {
  const brand = await brandService.create(req.body);
  res.status(httpStatus.CREATED).json({ brand });
};

const update = async (req, res) => {
  const brand = await brandService.update(req.params.id, req.body);
  res.status(httpStatus.OK).json({ brand });
};

const remove = async (req, res) => {
  await brandService.remove(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
};

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
};
