const stockService = require('../services/stockService');
const { logAction } = require('../utils/auditLogger');

async function listStock(req, res, next) {
  try {
    const stock = await stockService.getAllStock();
    res.json({ success: true, data: stock });
  } catch (err) {
    next(err);
  }
}

async function getStockForProduct(req, res, next) {
  try {
    const stock = await stockService.getStockByProduct(req.params.productId);
    res.json({ success: true, data: stock });
  } catch (err) {
    next(err);
  }
}

async function listMovements(req, res, next) {
  try {
    const { productId, limit } = req.query;
    const movements = await stockService.getMovements({
      productId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json({ success: true, data: movements });
  } catch (err) {
    next(err);
  }
}

async function createAdjustment(req, res, next) {
  try {
    const { productId, newQuantity, reason } = req.body;
    const result = await stockService.adjustStock({
      productId,
      newQuantity,
      reason,
      userId: req.user.uid,
    });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'STOCK_ADJUSTED',
      entity: 'stock',
      entityId: productId,
      details: result,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createInventory(req, res, next) {
  try {
    const { items, notes } = req.body;
    const result = await stockService.performInventory({ items, notes, userId: req.user.uid });

    await logAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      action: 'INVENTORY_PERFORMED',
      entity: 'inventory',
      entityId: result.inventoryId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStock, getStockForProduct, listMovements, createAdjustment, createInventory };
