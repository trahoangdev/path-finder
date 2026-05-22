import './config/dns.js';

import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { requestId } from 'hono/request-id';
import { timing } from 'hono/timing';

import { env, isProd } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import { logger } from './lib/logger.js';
import { onError, onNotFound } from './middleware/error.js';

import { healthApp } from './routes/health.js';
import { skillsApp } from './routes/skills.js';
import { analysisApp } from './routes/analysis.js';
import { pathsApp } from './routes/paths.js';
import { proofApp } from './routes/proof.js';
import { similarApp } from './routes/similar.js';
import { coursesApp } from './routes/courses.js';
import { orchestratorApp } from './routes/orchestrator.js';
import { skillExplainApp } from './routes/skill-explain.js';

const app = new OpenAPIHono();

// ─── Global middleware ──────────────────────────────────────────────────────

app.use('*', requestId());
app.use('*', timing());
app.use('*', secureHeaders());
if (isProd) app.use('*', compress());

app.use(
  '*',
  cors({
    origin: env.CORS_ORIGINS,
    credentials: false,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);

app.use('*', async (c, next) => {
  const start = Date.now();
  const reqId = c.get('requestId');
  logger.debug({ reqId, method: c.req.method, path: c.req.path }, 'request start');
  await next();
  logger.info(
    {
      reqId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    },
    'request end',
  );
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.route('/', healthApp);
app.route('/api', skillsApp);
app.route('/api', analysisApp);
app.route('/api', pathsApp);
app.route('/api', proofApp);
app.route('/api', similarApp);
app.route('/api', coursesApp);
app.route('/api', orchestratorApp);
app.route('/api', skillExplainApp);

// ─── OpenAPI + Swagger UI ───────────────────────────────────────────────────

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'PathFinder API',
    version: '0.1.0',
    description:
      'REST API for PathFinder — Career Pivot Engine for Vietnamese Developers. ' +
      'Powered by MongoDB Atlas Vector Search + Aggregation Pipeline + OpenAI.',
    contact: {
      name: 'Hoàng Trọng Trà',
      url: 'https://github.com/trahoangdev/path-finder',
    },
    license: { name: 'MIT' },
  },
  tags: [
    { name: 'system', description: 'Health & meta' },
    { name: 'cv', description: 'CV parsing & profile extraction' },
    { name: 'ai', description: 'Direct AI utilities (embedding)' },
    {
      name: 'analysis',
      description: 'Recommendation engine endpoints (Vector Search + Aggregation)',
    },
  ],
  servers: [
    { url: `http://localhost:${env.PORT}`, description: 'Local dev' },
    { url: 'https://pathfinder-api.fly.dev', description: 'Production (TBD)' },
  ],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

app.get('/', (c) =>
  c.json({
    name: 'pathfinder-server',
    version: '0.1.0',
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/health',
  }),
);

// ─── Error & 404 handlers ───────────────────────────────────────────────────

app.onError(onError);
app.notFound(onNotFound);

// ─── Bootstrap ──────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    await connectMongo();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB on startup');
    // Don't exit — server starts anyway; /health will report db=false.
  }

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(
      {
        port: info.port,
        env: env.NODE_ENV,
        cors: env.CORS_ORIGINS,
      },
      `pathfinder-server listening on http://localhost:${info.port}`,
    );
    logger.info(`Swagger UI: http://localhost:${info.port}/docs`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down…');
  await disconnectMongo();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();

export type AppType = typeof app;
export { app };
