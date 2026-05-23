import { createRequire } from 'module';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { HTTP } from '../../constants/httpStatus.js';

// node-thermal-printer é CJS — importamos via createRequire para manter ESM
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThermalPrinter, PrinterTypes, CharacterSet } = _require(
  'node-thermal-printer',
) as typeof import('node-thermal-printer');

function fmtPrice(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export async function printOrderService(orderId: string) {
  const printerInterface = process.env.PRINTER_INTERFACE;

  if (!printerInterface) {
    throw new AppError(
      'Impressora não configurada. Defina PRINTER_INTERFACE no .env.',
      HTTP.SERVICE_UNAVAILABLE,
      'PRINTER_NOT_CONFIGURED',
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      delivery: { include: { zone: true } },
      customer: { select: { name: true, phone: true } },
    },
  });

  if (!order) throw new AppError('Pedido não encontrado.', HTTP.NOT_FOUND, 'ORDER_NOT_FOUND');

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: printerInterface,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: { timeout: 5000 },
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new AppError(
      'Impressora offline ou não encontrada.',
      HTTP.SERVICE_UNAVAILABLE,
      'PRINTER_OFFLINE',
    );
  }

  // ─── Header ──────────────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println('M.O.B BURGER');
  printer.setTextSize(0, 0);
  printer.bold(false);
  printer.println('Burgers Pack Co.');
  printer.drawLine();

  // ─── Dados do pedido ─────────────────────────────────────────────────────────
  printer.alignLeft();
  printer.println(`Pedido : #${String(order.orderNumber).padStart(4, '0')}`);
  printer.println(`Data   : ${fmtDate(order.createdAt)}`);
  printer.println(`Tipo   : ${order.type === 'DELIVERY' ? 'Entrega' : 'Retirada'}`);
  printer.drawLine();

  // ─── Cliente / endereço ───────────────────────────────────────────────────────
  printer.bold(true);
  printer.println('CLIENTE');
  printer.bold(false);
  printer.println(order.customer.name);
  if (order.customer.phone) printer.println(`Tel: ${order.customer.phone}`);

  if (order.delivery) {
    const d = order.delivery;
    printer.println(`${d.street}, ${d.number}${d.complement ? ` - ${d.complement}` : ''}`);
    printer.println(d.neighborhood);
    if (d.zone) printer.println(`Taxa entrega: ${fmtPrice(d.zone.fee)}`);
  }
  printer.drawLine();

  // ─── Itens ───────────────────────────────────────────────────────────────────
  printer.bold(true);
  printer.println('ITENS');
  printer.bold(false);

  for (const item of order.items) {
    const name = item.product.name.replace('MOB ', '').substring(0, 22);
    printer.tableCustom([
      { text: `${item.quantity}x ${name}`, align: 'LEFT', width: 0.65 },
      { text: fmtPrice(item.unitPrice * item.quantity), align: 'RIGHT', width: 0.35 },
    ]);
  }

  printer.drawLine();

  // ─── Total ───────────────────────────────────────────────────────────────────
  printer.bold(true);
  printer.tableCustom([
    { text: 'TOTAL', align: 'LEFT', width: 0.55 },
    { text: fmtPrice(order.totalPrice), align: 'RIGHT', width: 0.45 },
  ]);
  printer.bold(false);
  printer.println(`Pagamento: ${order.paymentMethod}`);
  printer.drawLine();

  // ─── Rodapé ───────────────────────────────────────────────────────────────────
  printer.alignCenter();
  printer.println('Obrigado pela preferencia!');
  printer.cut();

  await printer.execute();
}
