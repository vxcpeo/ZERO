/**
 * Number, unit and time formatting shared by every view.
 *
 * All amounts cross the RPC boundary as `bigint` in the token's smallest unit; nothing in the
 * app converts to `number` until it is about to be displayed, so 18-decimal token amounts
 * cannot silently lose precision.
 */
import { BSC_BLOCK_TIME_SECONDS } from "@/config/chain";

/** Format a fixed-point amount for display with thousands separators. */
export function formatUnits(
  value: bigint | undefined | null,
  decimals = 18,
  options: { maxFractionDigits?: number; minFractionDigits?: number } = {},
): string {
  if (value === undefined || value === null) return "—";
  const { maxFractionDigits = 4, minFractionDigits = 0 } = options;

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = absolute % base;

  const wholeText = whole.toLocaleString("en-US");
  if (maxFractionDigits === 0 || fraction === 0n) return `${negative ? "-" : ""}${wholeText}`;

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");

  if (fractionText.length < minFractionDigits) {
    return `${negative ? "-" : ""}${wholeText}.${fractionText.padEnd(minFractionDigits, "0")}`;
  }
  return fractionText.length
    ? `${negative ? "-" : ""}${wholeText}.${fractionText}`
    : `${negative ? "-" : ""}${wholeText}`;
}

/** Parse a user-typed decimal string into smallest units without float rounding. */
export function parseUnits(value: string, decimals = 18): bigint {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") return 0n;
  if (!/^\d*\.?\d*$/.test(trimmed)) throw new Error(`Invalid amount: ${value}`);

  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const paddedFraction = fractionPart.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(wholePart || "0") * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
}

/** Compact display for large numbers (e.g. 1.24M). */
export function compactNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** `value` as a percentage string, e.g. 300n -> "3.00%". */
export function formatBps(bps: number | bigint, fractionDigits = 2): string {
  const numeric = typeof bps === "bigint" ? Number(bps) : bps;
  return `${(numeric / 100).toFixed(fractionDigits)}%`;
}

/** Human duration for a block count, using BSC's ~3s block time. */
export function formatBlocks(blocks: number | bigint): string {
  const count = typeof blocks === "bigint" ? Number(blocks) : blocks;
  const seconds = count * BSC_BLOCK_TIME_SECONDS;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/** Truncate an address for display: `0x1234…abcd`. */
export function shortAddress(address: string | undefined, lead = 6, tail = 4): string {
  if (!address) return "—";
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Relative time such as "3m ago". */
export function timeAgo(timestampSeconds: number | bigint): string {
  const seconds = typeof timestampSeconds === "bigint" ? Number(timestampSeconds) : timestampSeconds;
  if (!seconds) return "—";
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 2_592_000) return `${Math.floor(delta / 86_400)}d ago`;
  return new Date(seconds * 1000).toLocaleDateString();
}

/** Human-readable countdown to a unix timestamp (seconds). */
export function countdown(targetSeconds: number | bigint): string {
  const target = typeof targetSeconds === "bigint" ? Number(targetSeconds) : targetSeconds;
  const delta = target - Math.floor(Date.now() / 1000);
  if (delta <= 0) return "elapsed";
  const days = Math.floor(delta / 86_400);
  const hours = Math.floor((delta % 86_400) / 3600);
  const minutes = Math.floor((delta % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Convert a basis-point share of a bigint total, floored (matches Solidity's `bpsOf`). */
export function bpsOf(amount: bigint, bps: number | bigint): bigint {
  return (amount * BigInt(bps)) / 10_000n;
}

/** A percentage of `value`, floored. */
export function percentOf(value: number, percent: number): number {
  return (value * percent) / 100;
}

/** Clamp a bigint into `[0, max]`. */
export function clampBigInt(value: bigint, max: bigint): bigint {
  if (value < 0n) return 0n;
  if (value > max) return max;
  return value;
}
