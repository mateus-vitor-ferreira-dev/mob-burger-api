import type { Request, Response } from 'express';

const clients = new Set<Response>();
const orderClients = new Map<string, Set<Response>>();

export function sseHandler(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('data: {"type":"connected"}\n\n');

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
}

export function orderSseHandler(req: Request, res: Response): void {
  const raw = req.params.id;
  const orderId = Array.isArray(raw) ? raw[0] : raw;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('data: {"type":"connected"}\n\n');

  if (!orderClients.has(orderId)) orderClients.set(orderId, new Set());
  orderClients.get(orderId)!.add(res);

  req.on('close', () => {
    const set = orderClients.get(orderId);
    if (set) {
      set.delete(res);
      if (set.size === 0) orderClients.delete(orderId);
    }
  });
}

export function broadcastOrderUpdate(payload: { type: string; order?: { id: string } & Record<string, unknown> }): void {
  const data = JSON.stringify(payload);
  clients.forEach((client) => {
    client.write(`data: ${data}\n\n`);
  });
  if (payload.order?.id) {
    orderClients.get(payload.order.id)?.forEach((client) => {
      client.write(`data: ${data}\n\n`);
    });
  }
}
