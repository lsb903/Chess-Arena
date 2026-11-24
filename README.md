# Chess Arena

A QR-based live chess room: the first two visitors become White and Black, and everyone else watches the match live.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run:

   ```bash
   npm install
   npm start
   ```

4. Open http://localhost:3000

## Deploy online with Render

1. Create a GitHub repository and upload the contents of this folder.
2. In Render, create a **New Web Service** and connect that repository.
3. Use these settings:
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy, then open the public HTTPS address.
5. On the host screen, select **Create arena + QR**. Let the two players scan the QR code. Anyone else who scans it becomes a spectator.

**Important:** The QR join link works across phones only after the site is deployed to a public HTTPS address. `localhost` works only on the same device.

## Included features

- Host-created room and QR code
- First two joiners are assigned White and Black
- Additional visitors become live spectators
- Server-side legal move validation
- Move history and host-controlled new game

## Note

This is a starter live-match website, not a full tournament bracket manager. Rooms are stored in server memory and are lost if the server restarts.
