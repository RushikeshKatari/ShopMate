# ShopMate platform support

ShopMate uses one responsive Next.js interface, so it works in modern Chrome,
Edge, Safari, and Firefox on Windows, Linux, macOS, Android, iPhone/iPad, and
Android tablets. Its web manifest allows users to install it as a standalone
PWA on these platforms.

| Platform | Delivery | Voice input | Notes |
| --- | --- | --- | --- |
| Windows, Linux, macOS | Browser or installed PWA | Browser speech capability; typed fallback | Works with the hosted ShopMate server. |
| Android phones/tablets | Browser/PWA or Capacitor app | Bundled Vosk offline STT in Capacitor | Requires the Android build environment. |
| iPhone/iPad | Safari/PWA or Capacitor app | Typed input today | Native offline STT/Piper bridge remains to be implemented. |

## Important architecture boundary

The current app uses Next.js route handlers and Prisma SQLite. That database
layer runs with the hosted Next.js server and cannot be copied unchanged into a
Capacitor WebView. Therefore a signed Android/iOS build can package the UI and
native voice models, but fully offline records on mobile require the next
separate migration: move Product, Transaction, Customer, and Settings storage
from Prisma route handlers into a native/local SQLite repository and have the
voice conversation manager call it directly.

The PWA cache intentionally does not cache `/api` responses: stale stock or
khata data must never be treated as the source of truth.
