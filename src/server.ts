import app from './app.js';
import { startSwaggerServer } from './docs/swagger.server.js';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  const swaggerPort = startSwaggerServer();

  console.log('');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │           Mob Burger API iniciada           │');
  console.log('  ├─────────────────────────────────────────────┤');
  console.log(`  │  API / Health check                         │`);
  console.log(`  │  http://localhost:${PORT}/health               │`);
  console.log('  │                                             │');
  console.log(`  │  Swagger — documentacao das rotas           │`);
  console.log(`  │  http://localhost:${swaggerPort}                        │`);
  console.log('  ├─────────────────────────────────────────────┤');
  console.log(`  │  Ambiente: ${(process.env.NODE_ENV ?? 'development').padEnd(33)}│`);
  console.log('  └─────────────────────────────────────────────┘');
  console.log('');
});
