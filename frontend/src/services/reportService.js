import api from './api';

export const reportService = {
  daily: (date) => api.get('/reports/daily', { params: { date } }).then((r) => r.data.data),
  sales: (startDate, endDate) =>
    api.get('/reports/sales', { params: { startDate, endDate } }).then((r) => r.data.data),
  purchases: (startDate, endDate) =>
    api.get('/reports/purchases', { params: { startDate, endDate } }).then((r) => r.data.data),
  expenses: (startDate, endDate) =>
    api.get('/reports/expenses', { params: { startDate, endDate } }).then((r) => r.data.data),
  profit: (startDate, endDate) =>
    api.get('/reports/profit', { params: { startDate, endDate } }).then((r) => r.data.data),
  stock: () => api.get('/reports/stock').then((r) => r.data.data),
};
