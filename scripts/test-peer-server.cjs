// Signaling only. Gameplay packets travel over actual browser WebRTC DataChannels.
const { PeerServer } = require('peer');
PeerServer({ host: '127.0.0.1', port: 9000, path: '/' });
// PeerServer returns an Express app, not an HTTP listener. This ephemeral test
// process owns all of its sockets; terminate them together during CI teardown.
process.once('SIGTERM', () => process.exit(0));
