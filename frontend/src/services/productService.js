import api from './api';

export const productService = {
  list: () => api.get('/products').then((r) => r.data.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/products', payload).then((r) => r.data.data),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};
