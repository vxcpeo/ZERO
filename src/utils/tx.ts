/**
 * Transaction and allowance helpers.
 *
 * Every write path goes through here so the UI gets consistent error messages, BscScan links and
 * "infinite approval" handling instead of each component re-implementing it.
 */
import { MaxUint256, type Contract, type ContractTransactionReceipt, type Signer } from "ethers";

import { TARGET_CHAIN } from "@/config/chain";

/**
 * Minimal ERC-20 write surface. ethers v6 types `Contract` methods through an index signature
 * that is not callable, so approval calls are funnelled through this shape with a single
 * documented cast instead of scattering `as any` through the stores.
 */
interface Erc20Writer {
  approve(spender: string, amount: bigint): Promise<{
    hash: string;
    wait(): Promise<ContractTransactionReceipt | null>;
  }>;
}

/** Cast a contract handle to the narrow ERC-20 writer interface used for approvals. */
function asErc20(contract: Contract, signer: Signer): Erc20Writer {
  return contract.connect(signer) as unknown as Erc20Writer;
}

export interface TxResult {
  hash: string;
  receipt: ContractTransactionReceipt | null;
  explorerUrl: string;
}

/** BscScan (or testnet equivalent) link for a transaction hash. */
export function explorerTxUrl(hash: string): string {
  return TARGET_CHAIN.explorer ? `${TARGET_CHAIN.explorer}/tx/${hash}` : "";
}

/** BscScan (or testnet equivalent) link for an address. */
export function explorerAddressUrl(address: string): string {
  return TARGET_CHAIN.explorer ? `${TARGET_CHAIN.explorer}/address/${address}` : "";
}

/**
 * Read the current ERC-20 allowance.
 * @returns the allowance in the token's smallest unit.
 */
export async function readAllowance(
  token: Contract,
  owner: string,
  spender: string,
): Promise<bigint> {
  try {
    const allowance = (await token.allowance(owner, spender)) as bigint;
    return allowance;
  } catch {
    return 0n;
  }
}

/**
 * Ensure `spender` can move at least `needed` of `token` on behalf of the signer.
 * @returns the transaction result when an approval was sent, or null when none was required.
 */
export async function ensureAllowance(
  token: Contract,
  spender: string,
  needed: bigint,
  signer: Signer,
  options: { infinite?: boolean } = {},
): Promise<TxResult | null> {
  const erc20 = asErc20(token, signer);
  const owner = await signer.getAddress();
  const current = await readAllowance(token, owner, spender);
  if (current >= needed) return null;

  const amount = options.infinite === false ? needed : MaxUint256;
  // Some non-standard tokens (notably older USDT deployments) reject a non-zero -> non-zero
  // approval, so reset to zero first when a stale allowance exists.
  if (current > 0n) {
    const resetTx = await erc20.approve(spender, 0n);
    await resetTx.wait();
  }

  const tx = await erc20.approve(spender, amount);
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt, explorerUrl: explorerTxUrl(tx.hash) };
}

/** Extract a user-presentable message from an ethers/JSON-RPC error. */
export function describeError(error: unknown): string {
  const candidate = error as {
    code?: number | string;
    shortMessage?: string;
    reason?: string;
    message?: string;
    info?: { error?: { message?: string } };
    revert?: { name?: string; args?: unknown[] };
  };

  if (candidate?.code === 4001 || /user (rejected|denied)/i.test(String(candidate?.message))) {
    return "Transaction rejected in your wallet.";
  }
  if (candidate?.code === "ACTION_REJECTED") {
    return "Transaction rejected in your wallet.";
  }

  // Custom Solidity errors carry the name; surface it plus a friendly gloss.
  const revertName = candidate?.revert?.name;
  if (revertName) {
    const gloss = REVERT_MESSAGES[revertName];
    return gloss ? `${gloss} (${revertName})` : `Contract rejected the call: ${revertName}`;
  }

  const raw =
    candidate?.revert?.args?.[0] ??
    candidate?.shortMessage ??
    candidate?.reason ??
    candidate?.info?.error?.message ??
    candidate?.message ??
    String(error);

  const text = String(raw);
  if (/insufficient funds/i.test(text)) return "Not enough BNB to cover gas.";
  if (/nonce/i.test(text)) return "Wallet nonce is out of sync — reset the account in your wallet.";
  if (/network|chain/i.test(text) && /wrong/i.test(text)) {
    return `Wrong network. Switch to ${TARGET_CHAIN.name}.`;
  }
  if (/CALL_EXCEPTION/i.test(text)) return "The contract reverted. Check the amount and try again.";

  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

/** Human glosses for the protocol's custom errors, keyed by Solidity error name. */
export const REVERT_MESSAGES: Record<string, string> = {
  DepositsArePaused: "New deposits are paused by governance.",
  PoolInactive: "That mining pool is not accepting deposits.",
  ZeroAmount: "Enter an amount greater than zero.",
  ZeroAddress: "That address is not valid.",
  InsufficientReserve: "Amount exceeds the balance available.",
  NotEnoughShares: "Not enough shares remain for that purchase.",
  FeeTooHigh: "The cost moved above your slippage limit — refresh and retry.",
  ArtworkNotActive: "This artwork is not currently on sale.",
  ArtworkNotFound: "That artwork does not exist.",
  NotFullyOwned: "You must hold 100% of the shares to redeem the certificate.",
  NotCustodian: "Only the artwork's custodian can do that.",
  NotAccepted: "That token is not accepted for fees.",
  BpsOutOfRange: "Fee parameters out of range.",
  BpsTooHigh: "Fee parameters out of range.",
  PoolNotFound: "That pool does not exist.",
  CannotRecoverStakeToken: "The reward asset cannot be withdrawn by governance.",
  ERC20InsufficientAllowance: "Approve the token first.",
  ERC20InsufficientBalance: "Your token balance is too low.",
  OwnableUnauthorizedAccount: "Only protocol governance can do that.",
};
