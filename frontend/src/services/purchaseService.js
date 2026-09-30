import api from './api';

export const purchaseService = {
  list: () => api.get('/purchases').then((r) => r.data.data),
  get: (id) => api.get(`/purchases/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/purchases', payload).then((r) => r.data.data),
  update: (id, payload) => api.put(`/purchases/${id}`, payload).then((r) => r.data.data),
};
