const purchaseService = require('../services/purchaseService');
const ApiError = require('../utils/ApiError');

async function listPurchases(req, res, next) {
  try {
    const purchases = await purchaseService.getPurchases({});
    res.json({ success: true, data: purchases });
  } catch (err) {
    next(err);
  }
}

async function getPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    if (!purchase) throw new ApiError(404, 'Achat introuvable.');
    res.json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
}

async function createPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.createPurchase({ ...req.body, user: req.user });
    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
}

async function updatePurchase(req, res, next) {
  try {
    const updated = await purchaseService.updatePurchase(req.params.id, req.body, req.user);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPurchases, getPurchase, createPurchase, updatePurchase };
