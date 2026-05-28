import axios from 'axios';

const pagarme = axios.create({
  baseURL: 'https://api.pagar.me/core/v5',
  headers: { 'Content-Type': 'application/json' },
});

pagarme.interceptors.request.use((config) => {
  const key = process.env.PAGARME_SECRET_KEY ?? '';
  config.headers.Authorization = `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
  return config;
});

export default pagarme;
