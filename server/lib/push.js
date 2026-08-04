'use strict';

const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function initVapid() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

async function sendToAll(payload) {
  const subs = await prisma.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async err => {
        // 410 Gone = subscription expired; clean it up
        if (err.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
        throw err;
      }),
    ),
  );

  const sent     = results.filter(r => r.status === 'fulfilled').length;
  const failed   = results.filter(r => r.status === 'rejected').length;
  console.log(`[push] sent=${sent} failed=${failed}`);
}

module.exports = { initVapid, sendToAll, prisma };
