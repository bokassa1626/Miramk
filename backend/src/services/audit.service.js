'use strict';
const { col, ts } = require('../config/firebase');

/** Contexte d'exécution d'une opération : qui, avec quel rôle, depuis quelle IP */
const ctxFromReq = (req) => ({
  userId: req.user.id,
  userName: req.user.name,
  role: req.user.role,
  ip: req.ip,
});

/**
 * Ajoute une entrée d'audit à un writer Firestore (Transaction ou WriteBatch).
 * Les journaux sont en ajout seul : aucune route de modification/suppression n'existe.
 */
const addAudit = (writer, ctx, { action, module, documentId, description, oldData = null, newData = null }) => {
  const ref = col('audit_logs').doc();
  writer.set(ref, {
    userId: ctx.userId,
    userName: ctx.userName,
    role: ctx.role,
    action,
    module,
    documentId: documentId || null,
    description,
    oldData,
    newData,
    ipAddress: ctx.ip || null,
    createdAt: ts(),
  });
  return ref;
};

/** Audit autonome (hors transaction), ex. LOGIN / LOGOUT */
const logAudit = async (ctx, entry) => {
  const ref = col('audit_logs').doc();
  await ref.set({
    userId: ctx.userId,
    userName: ctx.userName,
    role: ctx.role,
    ...entry,
    documentId: entry.documentId || null,
    oldData: entry.oldData || null,
    newData: entry.newData || null,
    ipAddress: ctx.ip || null,
    createdAt: ts(),
  });
};

module.exports = { ctxFromReq, addAudit, logAudit };
