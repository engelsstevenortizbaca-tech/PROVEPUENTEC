'use strict';

const httpStatus = require('../constants/httpStatus');
const categoryService = require('../services/category.service');

const list = async (req, res) => {
  const result = await categoryService.list(req.query);
  res.status(httpStatus.OK).json(result);
};

const getById = async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  res.status(httpStatus.OK).json({ category });
};

const getBySlug = async (req, res) => {
  const category = await categoryService.getBySlug(req.params.slug);
  res.status(httpStatus.OK).json({ category });
};

const create = async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(httpStatus.CREATED).json({ category });
};

const update = async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  res.status(httpStatus.OK).json({ category });
};

const remove = async (req, res) => {
  await categoryService.remove(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
};

const restore = async (req, res) => {
  const category = await categoryService.restore(req.params.id);
  res.status(httpStatus.OK).json({ category });
};

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
  restore,
};
