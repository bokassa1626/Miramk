'use strict';
const { col } = require('../config/firebase');
const { ApiError } = require('../utils/errors');
const crud = require('./crud.factory');

module.exports = crud({
  collectionName: 'categories',
  moduleName: 'categories',
  label: 'Catégorie',
  beforeArchive: async (id) => {
    const used = await col('products').where('categoryId', '==', id).where('status', '==', 'ACTIVE').limit(1).get();
    if (!used.empty) throw new ApiError(409, 'Impossible : des produits actifs utilisent cette catégorie');
  },
});
