'use strict';

const httpStatus = require('../constants/httpStatus');
const subcategoryService = require('../services/subcategory.service');

const list = async (req, res) => {
  const result = await subcategoryService.list(req.query);
  res.status(httpStatus.OK).json(result);
};

const getById = async (req, res) => {
  const subcategory = await subcategoryService.getById(req.params.id);
  res.status(httpStatus.OK).json({ subcategory });
};

const getBySlug = async (req, res) => {
  const subcategory = await subcategoryService.getBySlug(req.params.slug);
  res.status(httpStatus.OK).json({ subcategory });
};

const create = async (req, res) => {
  const subcategory = await subcategoryService.create(req.body);
  res.status(httpStatus.CREATED).json({ subcategory });
};

const update = async (req, res) => {
  const subcategory = await subcategoryService.update(req.params.id, req.body);
  res.status(httpStatus.OK).json({ subcategory });
};

const remove = async (req, res) => {
  await subcategoryService.remove(req.params.id);
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
