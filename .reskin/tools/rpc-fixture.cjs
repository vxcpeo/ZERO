/**
 * Local JSON-RPC fixture for the reskin verification runs.
 *
 * Why this exists: the dApp targets a Hardhat node on 127.0.0.1:8545 (see `.env.local`, chain
 * 31337) which is not running in this workspace. When the socket is refused, Chrome logs
 * "net::ERR_CONNECTION_REFUSED" as a page console error and the usability gate counts it as a
 * failure — for the baseline and for the reskin alike.
 *
 * This fixture answers the transport without a browser-level network error and reproduces the
 * exact error the app already showed in the baseline capture: the protocol read reverts with
 * `Error("Failed to fetch")`, so `describeError()` yields the same copy and the same banner.
 * `eth_blockNumber` succeeds so the page finishes its first read instead of hanging.
 *
 * Verification tooling only — never imported by the app and never bundled.
 */
const http = require("node:http");

const PORT = Number(process.env.RESKIN_RPC_PORT || 8545);
const REVERT_TEXT = process.env.RESKIN_RPC_REVERT_TEXT || "Failed to fetch";

/** ABI-encode `Error(string)` so ethers decodes it into error.revert.args[0]. */
function encodeErrorString(message) {
  const hex = Buffer.from(message, "utf8").toString("hex");
  const length = (hex.length / 2).toString(16).padStart(64, "0");
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
  return `0x08c379a0${"20".padStart(64, "0")}${length}${padded}`;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, origin, x-requested-with",
  "access-control-max-age": "600",
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    let payload = null;
    try {
      payload = JSON.parse(body);
    } catch {
      payload = null;
    }
    const items = Array.isArray(payload) ? payload : [payload];
    const replies = items.map((item) => {
      if (!item || typeof item.method !== "string") {
        return { jsonrpc: "2.0", id: (item && item.id) || null, result: "0x0" };
      }
      if (item.method === "eth_blockNumber") {
        return { jsonrpc: "2.0", id: item.id, result: "0x10" };
      }
      if (item.method === "eth_chainId") {
        return { jsonrpc: "2.0", id: item.id, result: "0x7a69" };
      }
      if (item.method === "net_version") {
        return { jsonrpc: "2.0", id: item.id, result: "31337" };
      }
      if (item.method === "eth_call") {
        return {
          jsonrpc: "2.0",
          id: item.id,
          error: { code: 3, message: "execution reverted", data: encodeErrorString(REVERT_TEXT) },
        };
      }
      return { jsonrpc: "2.0", id: item.id, result: "0x0" };
    });
    res.writeHead(200, { ...CORS, "content-type": "application/json" });
    res.end(JSON.stringify(Array.isArray(payload) ? replies : replies[0]));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`rpc-fixture listening on http://127.0.0.1:${PORT} (revert: ${REVERT_TEXT})\n`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
