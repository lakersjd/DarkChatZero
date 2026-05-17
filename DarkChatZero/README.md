# VOIDCHAT Realtime

This version removes fake users and uses real webcam, microphone, and text messaging.

## What changed

- No fake people.
- No bot replies.
- Does not ask for camera/microphone permission on Start Chat.
- Webcam and microphone are optional and only requested if the user clicks the camera/mic enable controls.
- Uses WebRTC for peer-to-peer video and voice.
- Uses Socket.IO for matchmaking, WebRTC signaling, and realtime text chat.
- Still no login or signup.

## Run locally

1. Install Node.js 18 or newer.
2. Open this project folder in a terminal.
3. Run:

```bash
npm install
npm start
```

4. Open:

```text
http://localhost:3000
```

To test matching on one computer, open the site in two browser windows or two devices connected to the same deployed server.

## Important deployment note

If users choose to enable camera/microphone, browser permission is still required. Websites cannot bypass that security prompt.

Camera and microphone access require a secure origin:
- `localhost` works for local development.
- Public deployments must use `https://`.

## How it works

- `server.js` keeps a simple waiting queue.
- The first user waits.
- The second user gets paired with the first user.
- Socket.IO relays WebRTC offers, answers, and ICE candidates.
- WebRTC sends the actual webcam and microphone streams peer-to-peer.
- Socket.IO relays chat messages.

## Production notes

For a real public app, add:
- moderation and reporting
- rate limiting
- abuse filters
- TURN server for difficult networks
- consent and age rules
- logging policy and privacy policy
