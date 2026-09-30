'use strict';
const ok = (res, data = {}, message = 'Opération effectuée avec succès', status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, error) =>
  res.status(status).json({ success: false, message, error: error ?? message });

module.exports = { ok, fail };
