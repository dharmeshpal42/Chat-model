# ChattHere

A real-time 1:1 chat web app built with React, TypeScript, and Firebase — installable as a PWA on mobile with real background push notifications, accurate online/offline presence, message reactions, and WhatsApp-style read receipts.

## Features

- **Auth** — email/password sign up, login, and password reset (Firebase Auth).
- **Real-time messaging** — 1:1 conversations backed by Cloud Firestore, live-synced via `onSnapshot`.
- **Start a chat by email** — no friend requests; enter another user's email to start chatting with them.
- **Typing indicator** and **last seen** timestamp per contact.
- **Online/offline presence** — an accurate green "online" dot (chat list and chat header) backed by Firebase Realtime Database's `onDisconnect()`, which Firebase's own servers enforce even if the app crashes or is force-closed — not a client heartbeat that can only ever time out.
- **Read receipts** — WhatsApp-style ticks on your own sent messages, shown both inside the conversation and as a preview on the chat list:
  - single gray tick — sent, recipient offline and hasn't read it
  - double gray tick — recipient is online (assumed delivered)
  - double blue tick — actually read
  - Messages are only marked read while you're actually looking at that chat (foreground/visible tab), not just because it's open in a background tab.
- **Message reactions** — triple-click/triple-tap (or right-click on desktop) any message to react with an emoji; reactions render as a small badge overlapping the bubble's edge, grouped with counts.
- **Last message preview** on the chat list, with its own read-receipt tick.
- **Unread badges** on the chat list, and a WhatsApp-style **"Unread Messages" divider** inside a conversation showing where new messages start.
- **24-hour message filter** (toggle in Profile) — hide messages older than 24h, or show full history.
- **Dark mode** (toggle in Profile), preference synced per-user via Firestore.
- **Push notifications** — real OS-level notifications even when the app is closed/backgrounded/phone locked, via a Firebase Cloud Function that triggers on new messages and sends a data-only FCM push. Data-only (no top-level `notification` payload) is deliberate: it stops some browsers from auto-displaying the push *in addition to* the app's own service worker handler, which was causing duplicate notifications. Previews are intentionally generic ("New Message" / "You have a new message") rather than showing sender/content, for privacy on the lock screen.
- **Installable PWA** — Add to Home Screen on iOS/Android/desktop, works offline for the app shell, works and looks like a native app (no browser chrome).

## Tech stack

- **Frontend**: React 19 + TypeScript (Create React App), MUI v7, React Router v6, `notistack` for toasts, `date-fns`.
- **Backend-as-a-service**: Firebase Auth, Cloud Firestore, Firebase Realtime Database (presence only), Firebase Cloud Messaging (FCM).
- **Serverless backend**: Firebase Cloud Functions (2nd gen, Node.js 20) — the only actual "server" in this app, used to send push notifications and to mirror Realtime Database presence into Firestore.
- **Hosting**: frontend deployed to Netlify (or any static host); Cloud Functions and Realtime Database rules deployed to Firebase.

## Project structure

```
chat-app/
├── public/
│   ├── manifest.json       # PWA manifest (icons, name, standalone display)
│   ├── sw.js                # Service worker: FCM background handler + offline app-shell cache + notification click handling
│   └── index.html
├── src/
│   ├── firebase/firebase.ts # Firebase app init, FCM token generation
│   ├── context/
│   │   ├── AuthContext.tsx  # Current user, synced preferences (theme, 24h filter), and presence (RTDB onDisconnect)
│   │   └── ChatsContext.tsx # Chat list, unread counts, online status, last-message previews — lives above the routes so it survives navigation
│   ├── pages/
│   │   ├── Auth/            # Login, Signup, ForgotPassword
│   │   ├── ChatList/        # Contact list, unread badges, last-message preview, start-new-chat, profile drawer
│   │   └── ChatRoom/        # Conversation view, message input, typing indicator, presence header
│   └── components/          # MessageBubble (reactions, edit, read-receipt ticks), MessageInput, CustomModal
├── functions/
│   └── index.js              # Cloud Functions: sendMessageNotification (FCM push), mirrorPresence (RTDB -> Firestore)
├── firebase.json / .firebaserc  # Firebase CLI config (Cloud Functions + Realtime Database deploy targets)
├── database.rules.json      # Realtime Database security rules (presence path only)
└── .env                      # Firebase web config (see below) — not committed
```

## How it works (architecture)

1. **Messaging**: a message is written directly to Firestore (`chats/{chatId}/messages`) by the sender's browser — no backend involved in normal chat flow.
2. **Real-time sync**: every connected client listens to that subcollection via `onSnapshot`, so both sides see new messages, reactions, and read receipts instantly.
3. **Push notifications**: writing a new message doc triggers the Cloud Function `sendMessageNotification` (Firestore `onDocumentCreated` trigger), which looks up the recipient's FCM token and sends a data-only push via `admin.messaging().send()`. This exists purely because sending a push requires a credential (`firebase-admin`) that can never be shipped to the browser.
4. **Receiving pushes**: `public/sw.js` handles the push in the background (phone locked/app closed) via `onBackgroundMessage`, showing a generic OS notification. There's no foreground in-app toast for pushes — the badge/preview on the chat list already covers that.
5. **Presence**: the client writes to Realtime Database at `status/{uid}` and registers an `onDisconnect()` promise, which Firebase's own servers execute the instant they detect the socket is gone (crash, force-close, lost network) — not something a client-only heartbeat can ever do reliably. The Cloud Function `mirrorPresence` (an RTDB `onValueWritten` trigger) mirrors that into Firestore's `users/{uid}.online`, so the rest of the app just reads a plain boolean and never needs the Realtime Database SDK directly.
6. **Read receipts**: `readBy` on each message plus the `online` presence field together derive the tick state (sent / delivered / read) shown both in the conversation and in the chat list's last-message preview.

## Firestore data model

- `users/{uid}` — `{ name, email, avatar, lastSeen, online, fcmToken, showOldChats, themeMode }`
- `chats/{chatId}` — id is the two user UIDs sorted and joined with `-` (e.g. `uidA-uidB`). Fields: `{ members: [uid, uid], lastMessage: { text, senderId, senderName, timestamp }, updatedAt }`
- `chats/{chatId}/messages/{messageId}` — `{ senderId, senderName, text, timestamp, readBy: [uid, ...], reactions: { [uid]: emoji }, edited?, updatedAt? }`
- `chats/{chatId}/typing/{uid}` — `{ isTyping, updatedAt }`

## Realtime Database data model

- `status/{uid}` — `{ state: "online" | "offline", last_changed }`, written client-side via `onDisconnect()`. Access is restricted to each user's own path (`database.rules.json`); nothing else reads this directly — it's mirrored into Firestore by `mirrorPresence`.

> **Note**: Firestore security rules are not stored in this repo — they must be configured directly in the Firebase console (or added as a `firestore.rules` file and deployed via `firebase deploy --only firestore:rules`) to restrict reads/writes appropriately before going to production with real users. Realtime Database rules *are* checked in (`database.rules.json`) since presence needed them to function at all.

---

## Setup — from scratch

### 1. Prerequisites

- Node.js 18+ and npm
- A [Firebase project](https://console.firebase.google.com) with:
  - **Authentication** → Email/Password provider enabled
  - **Firestore Database** created (in production or test mode)
  - **Realtime Database** created (any region) — used only for presence
  - **Cloud Messaging** enabled, with a **Web Push certificate (VAPID key)** generated (Project Settings → Cloud Messaging → Web configuration)
  - The project upgraded to the **Blaze (pay-as-you-go) plan** — required to deploy Cloud Functions at all, even though actual usage stays in the free tier at low volume

### 2. Clone and install

```bash
git clone git@github.com-dharmesh-personal:dharmeshpal42/Chat-model.git chat-app
cd chat-app
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root (gitignored, never commit it):

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_FIREBASE_MEASUREMENT_ID=...
REACT_APP_FIREBASE_VAPID_KEY=...
REACT_APP_FIREBASE_DATABASE_URL=...
```

All of these come from Firebase Console → Project Settings → General (the web app config), → Cloud Messaging (the VAPID key), and → Realtime Database (the instance URL, e.g. `https://<project>-default-rtdb.firebaseio.com`).

### 4. Sync the service worker's Firebase config

`public/sw.js` runs in a context where `process.env` isn't available (it's served as a static file), so its `firebase.initializeApp({...})` block has the **same values hardcoded**. If you're pointing this at a different Firebase project, update the config object at the top of `public/sw.js` to match your `.env` values.

### 5. Run locally

```bash
npm start
```

Opens at `http://localhost:3000`. Note: push notifications require HTTPS (or `localhost`) and won't work when testing over a local network IP (`http://192.168.x.x`) — use a tunnel (e.g. `ngrok http 3000`) if you need to test on a real phone before deploying.

### 6. Deploy the Cloud Functions and Realtime Database rules

```bash
npm install -g firebase-tools   # if not already installed
firebase login
firebase deploy --only functions,database
```

This deploys `sendMessageNotification` and `mirrorPresence` from `functions/index.js`, plus `database.rules.json`. Requires the Blaze plan (step 1). First-time deploys of 2nd-gen functions can fail with an Eventarc permission error — this is expected, Google's IAM just needs a few minutes to propagate; retry the same command. If you skip deploying `database.rules.json`, presence writes will fail with `PERMISSION_DENIED` — a freshly created Realtime Database instance defaults to denying all reads/writes.

### 7. Deploy the frontend

Any static host works (Netlify, Firebase Hosting, Vercel). For Netlify:

- Connect the repo, set the build command to `npm run build` and publish directory to `build`.
- Add all the `REACT_APP_*` env vars from step 3 in Netlify's Site settings → Environment variables.
- Push to your connected branch — Netlify auto-deploys.

### 8. Install it as a PWA

**iPhone** (must use Safari for the install step):
1. Open the deployed HTTPS URL in Safari.
2. Share → **Add to Home Screen**.
3. Open the app from the new Home Screen icon (not the Safari tab) — this is required for notification permission to work at all on iOS.

**Android** (Chrome):
1. Open the URL in Chrome.
2. Tap the install banner, or ⋮ menu → **Install app**.

**Desktop** (Chrome/Edge):
1. Click the install icon in the address bar, or ⋮ menu → **Install ChattHere**.

Once installed, accept the notification permission prompt on first launch to receive push notifications.

---

## Available scripts

- `npm start` — run the dev server.
- `npm run build` — production build to `build/`.
- `npm test` — run the CRA test runner.
- `firebase deploy --only functions` — deploy the Cloud Functions (from the repo root, requires `firebase login`).
- `firebase deploy --only database` — deploy Realtime Database security rules (`database.rules.json`).

## Known limitations

- 1:1 chats only — no group conversations.
- No Firestore security rules checked into this repo (see note above) — Realtime Database rules are checked in, Firestore's are not.
- Notification previews are intentionally generic and don't show message content or sender name.
- "Delivered" (double gray tick) is inferred from the recipient being online, not a true device-ack — if they're online but the app is somehow not syncing, it can show as delivered slightly ahead of them actually seeing the data.
