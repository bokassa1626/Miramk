'use strict';
const { db, ts } = require('../config/firebase');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { COMPANY_REF, getSettings } = require('../services/settings.service');
const { addAudit, ctxFromReq } = require('../services/audit.service');

exports.get = asyncHandler(async (req, res) => ok(res, await getSettings()));

exports.update = asyncHandler(async (req, res) => {
  const before = await getSettings();
  const batch = db.batch();
  batch.set(COMPANY_REF, { ...req.body, updatedAt: ts() }, { merge: true });
  const old = {};
  Object.keys(req.body).forEach((k) => { old[k] = before[k]; });
  addAudit(batch, ctxFromReq(req), {
    action: 'UPDATE', module: 'settings', documentId: 'company',
    description: "Modification des paramètres de l'entreprise", oldData: old, newData: req.body,
  });
  await batch.commit();
  return ok(res, await getSettings(), 'Paramètres enregistrés');
});
