'use strict';
const { Timestamp } = require('../config/firebase');

/** Convertit récursivement les Timestamp Firestore en chaînes ISO */
const ser = (v) => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(ser);
  if (v && typeof v === 'object') {
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    const out = {};
    Object.keys(v).forEach((k) => { out[k] = ser(v[k]); });
    return out;
  }
  return v;
};

const fromSnap = (snap) => (snap.exists ? ser({ id: snap.id, ...snap.data() }) : null);

module.exports = { ser, fromSnap };
