import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger.js';

const SWAGGER_PORT = 3334;

export function startSwaggerServer() {
  const app = express();
  app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  const server = app.listen(SWAGGER_PORT);
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`  [swagger] porta ${SWAGGER_PORT} em uso — docs nao iniciados`);
    }
  });
  return SWAGGER_PORT;
}
