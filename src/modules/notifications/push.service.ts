import webpush from 'web-push';
import { Expo } from 'expo-server-sdk';
import prisma from '../../config/prisma.js';

const expo = new Expo();

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const CONTACT = process.env.VAPID_CONTACT ?? 'mailto:admin@mobburguer.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function saveSubscription(
  customerId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      customerId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    update: { customerId },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function saveStaffSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await prisma.staffPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId },
  });
}

export async function removeStaffSubscription(endpoint: string) {
  await prisma.staffPushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToAllStaff(payload: { title: string; body: string; url?: string }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  const subs = await prisma.staffPushSubscription.findMany();
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch {
        await prisma.staffPushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
}

export async function sendPushToCustomer(
  customerId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subs = await prisma.pushSubscription.findMany({ where: { customerId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch {
        // Subscription expired or invalid — remove it
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
}

export async function sendExpoPushToCustomer(
  customerId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { expoPushToken: true },
  });

  const token = customer?.expoPushToken;
  if (!token || !Expo.isExpoPushToken(token)) return;

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([
      {
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
      },
    ]);

    if (ticket.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await prisma.customer.update({ where: { id: customerId }, data: { expoPushToken: null } });
      }
    }
  } catch {
    // Non-critical — ignore push failures
  }
}

export async function saveExpoPushToken(customerId: string, token: string) {
  if (!Expo.isExpoPushToken(token)) return;
  await prisma.customer.update({ where: { id: customerId }, data: { expoPushToken: token } });
}
