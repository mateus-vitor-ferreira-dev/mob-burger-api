const INSTANCE_ID  = process.env.ZAPI_INSTANCE_ID;
const TOKEN        = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

function isConfigured(): boolean {
  return !!(INSTANCE_ID && TOKEN && CLIENT_TOKEN);
}

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!isConfigured()) return;

  const digits = phone.replace(/\D/g, '');
  if (!digits) return;

  try {
    await fetch(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': CLIENT_TOKEN!,
        },
        body: JSON.stringify({ phone: digits, message }),
      },
    );
  } catch {
    // Falha silenciosa — notificação não é crítica
  }
}

export function buildOrderConfirmedMessage(params: {
  customerName: string;
  orderNumber: number;
  orderId: string;
  items: { quantity: number; productName: string }[];
  totalPrice: number;
}): string {
  const { customerName, orderNumber, orderId, items, totalPrice } = params;
  const num = String(orderNumber).padStart(4, '0');
  const price = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
  const itemLines = items.map((i) => `• ${i.quantity}× ${i.productName.replace(/^Mob /i, '')}`).join('\n');
  const trackUrl = `${FRONTEND_URL}/acompanhar/${orderId}`;

  return (
    `🍔 *Pedido #${num} confirmado!*\n\n` +
    `Olá, ${customerName.split(' ')[0]}! Seu pedido entrou na cozinha.\n\n` +
    `*Itens:*\n${itemLines}\n\n` +
    `*Total:* ${price}\n\n` +
    `Acompanhe em tempo real:\n${trackUrl}`
  );
}

export function buildOrderReadyMessage(params: {
  customerName: string;
  orderNumber: number;
  type: 'DELIVERY' | 'PICKUP';
}): string {
  const { customerName, orderNumber, type } = params;
  const num = String(orderNumber).padStart(4, '0');
  const action = type === 'DELIVERY' ? 'saiu para entrega! 🛵' : 'está pronto para retirada! 🏃';
  return (
    `✅ *Pedido #${num} pronto!*\n\n` +
    `${customerName.split(' ')[0]}, seu pedido ${action}`
  );
}
