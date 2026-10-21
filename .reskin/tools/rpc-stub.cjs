/**
 * Local RPC stub for the reskin verification runs.
 *
 * The dApp is configured against a Hardhat node on 127.0.0.1:8545 (.env.local, chain 31337).
 * When that node is not running, Chrome logs a "net::ERR_CONNECTION_REFUSED" console error for
 * every capture and the usability gate counts it as a page error. This stub accepts the socket and
 * keeps the request pending, which is the same "no chain available" state as the baseline capture
 * (the UI stays in its first-read loading state) without a console-level network failure.
 *
 * It is verification tooling only: not imported by the app, never bundled.
 */
const net = require("node:net");

const PORT = Number(process.env.RESKIN_RPC_STUB_PORT || 8545);
const sockets = new Set();

const server = net.createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
  // Intentionally no response: a pending JSON-RPC read keeps the UI in the same
  // "awaiting chain" state the unconfigured environment produces, without an
  // ERR_CONNECTION_REFUSED console entry.
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`rpc-stub listening on http://127.0.0.1:${PORT}\n`);
});

process.on("SIGTERM", () => {
  for (const socket of sockets) socket.destroy();
  server.close(() => process.exit(0));
});
