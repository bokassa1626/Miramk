import api from './api';

export const stockService = {
  list: () => api.get('/stock').then((r) => r.data.data),
  movements: (productId) =>
    api.get('/stock/movements', { params: { productId } }).then((r) => r.data.data),
  adjust: (payload) => api.post('/stock/adjustment', payload).then((r) => r.data.data),
  inventory: (payload) => api.post('/stock/inventory', payload).then((r) => r.data.data),
};
