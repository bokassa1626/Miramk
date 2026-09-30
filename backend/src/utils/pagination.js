'use strict';
const { fromSnap } = require('./serialize');
const { rangeBounds } = require('./dates');
const { Timestamp } = require('../config/firebase');

/**
 * Construit une requête Firestore : filtres d'égalité (liste blanche) + plage de dates.
 * Les filtres combinés à orderBy(createdAt) nécessitent les index de firebase/firestore.indexes.json.
 */
const buildQuery = (collectionRef, query, { equals = [], dateField = 'createdAt', extra = {} } = {}) => {
  let q = collectionRef;
  [...equals].forEach((f) => {
    const v = extra[f] !== undefined ? extra[f] : query[f]; // extra (portée imposée par le serveur) l'emporte
    if (v !== undefined && v !== '') q = q.where(f, '==', v);
  });
  Object.entries(extra).forEach(([f, v]) => {
    if (!equals.includes(f) && v !== undefined) q = q.where(f, '==', v);
  });
  if (query.from) {
    const { start, end } = rangeBounds(query.from, query.to || query.from);
    q = q.where(dateField, '>=', Timestamp.fromDate(start)).where(dateField, '<', Timestamp.fromDate(end));
  }
  return q;
};

/** Pagination par curseur (id du dernier document) */
const paginate = async (baseQuery, collectionRef, { limit, cursor, orderField = 'createdAt', dir = 'desc' } = {}) => {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  let q = baseQuery.orderBy(orderField, dir);
  if (cursor) {
    const cursorSnap = await collectionRef.doc(cursor).get();
    if (cursorSnap.exists) q = q.startAfter(cursorSnap);
  }
  const snaps = await q.limit(lim + 1).get();
  const hasMore = snaps.docs.length > lim;
  const page = snaps.docs.slice(0, lim);
  return { items: page.map(fromSnap), nextCursor: hasMore ? page[page.length - 1].id : null, limit: lim };
};

module.exports = { buildQuery, paginate };
