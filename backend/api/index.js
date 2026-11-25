// Entrypoint serverless untuk Vercel.
// Vercel memanggil file di folder api/ sebagai Function; seluruh request
// diarahkan ke sini lewat rewrites di vercel.json, lalu ditangani Express app
// yang sama persis dengan mode server biasa (backend/app.js).
const app = require('../app');

module.exports = app;
