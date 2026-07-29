import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const [state, setState] = useState('idle'); // idle | unsupported | denied | subscribed | error

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        const existing = await reg.pushManager.getSubscription();

        if (existing) {
          // Re-POST on every load so the server always has an up-to-date record
          await fetch('/api/push/subscribe', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(existing),
          });
          setState('subscribed');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { setState('denied'); return; }

        const res     = await fetch('/api/push/vapid-public-key');
        const { key } = await res.json();

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });

        await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(sub),
        });

        setState('subscribed');
      } catch (err) {
        console.error('[push]', err);
        setState('error');
      }
    }

    subscribe();
  }, []);

  return state;
}
