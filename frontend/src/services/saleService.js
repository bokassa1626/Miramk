import api from './api';

export const saleService = {
  list: () => api.get('/sales').then((r) => r.data.data),
  get: (id) => api.get(`/sales/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/sales', payload).then((r) => r.data.data),
};
