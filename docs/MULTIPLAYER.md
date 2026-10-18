# Multiplayer repair and verification

The previous implementation replayed movement and encounters on every device, including
AI route selection and world random draws. Guest snapshots were ignored by the host,
and a guest could no longer send the final snapshot after changing the active player.

## Ownership and synchronization

- Only the active human simulates a human turn. Only the host simulates AI turns.
- Turn snapshots identify the **previous** owner when handing off to the next player.
  Both hosts and guests accept snapshots from that owner.
- Live snapshots preserve dice/movement phase and remaining moves. Disk-save recovery
  still returns to a board checkpoint.
- Spectators update board position without triggering movement damage, events, shops,
  battles, weekly drafts or additional random draws.
- PvP choices carry a unique prompt ID, role and player seat. Only the requested player
  can reply, and duplicate/stale replies are ignored. Role swaps preserve the chosen attack.
- The host bridges WebRTC and BroadcastChannel using the original packet ID. Duplicate
  joins acknowledge the roster, allowing a second transport to become usable.

## Rooms and recovery

- Capacity is enforced by the manager. Lobby departures renumber seats; playing departures
  preserve seats. Rejoin matches the session identity, never names or a claimed player index.
- Hosts persist membership and capacity for refresh recovery. Lobby recovery opens the lobby.
- Superseded async transport setup and stale connection callbacks cannot replace a newer room.
- A refreshed active guest resumes a board checkpoint shared with the other clients. A
  transport reconnect preserves an active turn; outstanding PvP prompts are resent.
- Invitation links have a start callback even when the title multiplayer button was never used.
- Starting with unfilled human slots or starting an already running room is disabled.
- Player names are escaped in lobby HTML, and chat history survives lobby rerenders.

## Validation

`npm run verify` covers type checking, production build, game regression tests and CSS coverage.
`tests/multiplayer.test.mjs` exercises admission, capacity, profiles/settings, departures,
rejoin identity, duplicate joins, mixed transport forwarding, reserved seats, packet authority
and repeated human/AI handoffs with replicated world RNG and economy.
`tests/multiplayer-battle.test.mjs` exercises PvP prompt ownership, stale/duplicate responses,
prompt resending and preserving an attack after roles swap.

Browser validation used two local tabs: invitation entry, lobby refresh/rejoin, capacity
change to two players, synchronized start, host movement and event choice, guest movement
and paid healing, then handoff back to the host on day 2. Spectators did not open event dialogs.

Separate-device/NAT traversal and long campaign play were not verified in this environment.
The default transport has STUN but no TURN relay, and there is no automatic host migration.
