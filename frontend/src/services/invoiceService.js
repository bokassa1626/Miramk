import api from './api';

export const invoiceService = {
  list: () => api.get('/invoices').then((r) => r.data.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data.data),
  pdfUrl: (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
};
