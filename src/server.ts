import app from './app.js';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  console.log(`[mob-burger-api] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[mob-burger-api] Ambiente: ${process.env.NODE_ENV}`);
});
