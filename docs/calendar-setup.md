# Calendar Setup

Daftro serves a live iCal feed at:

```
http://localhost:3000/api/calendar/feed.ics
```

Subscribe to this URL once in your calendar app and day plan events will sync automatically. Whenever you update a day plan in the Day Editor, the change appears in your calendar on the next poll (typically within 15–60 minutes).

Only timed entries (those with both a start and end time) appear as events. Open/placeholder slots are excluded.

---

## Google Calendar

1. Open [Google Calendar](https://calendar.google.com) → click the **+** next to **Other calendars** in the left sidebar → **From URL**
2. Paste `http://localhost:3000/api/calendar/feed.ics`
3. Click **Add calendar**

Google Calendar polls the feed roughly every 12–24 hours. To force a refresh, remove and re-add the calendar.

> **Note:** Google caches external feeds aggressively. For same-day updates, Apple Calendar or Outlook are more responsive.

---

## Apple Calendar

1. Open **Calendar** → **File** → **New Calendar Subscription…**
2. Paste `http://localhost:3000/api/calendar/feed.ics` → click **Subscribe**
3. Set a name (e.g. *Daftro*), choose an auto-refresh interval (every 15 minutes is fine), click **OK**

Apple Calendar respects the refresh interval you set, so you can get near-real-time sync.

---

## Outlook (desktop or web)

**Web (outlook.com / Microsoft 365):**

1. Open your calendar → **Add calendar** → **Subscribe from web**
2. Paste `http://localhost:3000/api/calendar/feed.ics`
3. Give it a name and click **Import**

**Desktop (Outlook for Windows):**

1. **File** → **Account Settings** → **Internet Calendars** → **New…**
2. Paste `http://localhost:3000/api/calendar/feed.ics` → click **Add**
3. In the subscription options, check **Update Limit** to control refresh frequency

---

## Thunderbird / other CalDAV clients

Any iCal-compatible calendar app can subscribe via the same URL. Look for an option like **Subscribe**, **Add calendar from URL**, or **Import iCal feed** and paste the feed address.

---

## Remote access

The feed URL above uses `localhost` — it only works on the machine running Daftro. If you want to subscribe from another device or calendar service hosted in the cloud:

- Set up a reverse proxy (nginx, Caddy) or use a tunnel (e.g. Tailscale, Cloudflare Tunnel) to expose Daftro externally
- Use the external URL when subscribing (e.g. `https://daftro.yourdomain.com/api/calendar/feed.ics`)

Phase 12 (deployment) will cover hosting Daftro in the cloud with a stable public URL.
