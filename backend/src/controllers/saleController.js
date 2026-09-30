const saleService = require('../services/saleService');
const ApiError = require('../utils/ApiError');

async function listSales(req, res, next) {
  try {
    const sales = await saleService.getSales({});
    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
}

async function getSale(req, res, next) {
  try {
    const sale = await saleService.getSaleById(req.params.id);
    if (!sale) throw new ApiError(404, 'Vente introuvable.');
    res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
}

async function createSale(req, res, next) {
  try {
    const result = await saleService.createSale({ ...req.body, user: req.user });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSales, getSale, createSale };
