/**
 * Typed contract access layer.
 *
 * ABIs are generated from the compiled artifacts by `contracts/scripts/export-abi.js`, so the
 * front-end can never drift from the deployed bytecode. Every helper takes an explicit
 * `Provider | Signer` so read paths use the public RPC and write paths require a wallet.
 */
import { Contract, type InterfaceAbi, type Provider, type Signer } from "ethers";

import { ADDRESSES, IS_CONFIGURED, REWARD_DECIMALS, TARGET_CHAIN } from "@/config/chain";

import artTokenAbi from "@/contracts/abis/ArtToken.json";
import artworkShareAbi from "@/contracts/abis/ArtworkShare.json";
import artworkVaultAbi from "@/contracts/abis/ArtworkVault.json";
import erc20Abi from "@/contracts/abis/MockBEP20.json";
import feeRouterAbi from "@/contracts/abis/FeeRouter.json";
import miningPoolAbi from "@/contracts/abis/MiningPool.json";
import miningTokenAbi from "@/contracts/abis/MiningToken.json";

const ABI = {
  artToken: artTokenAbi as InterfaceAbi,
  artworkShare: artworkShareAbi as InterfaceAbi,
  artworkVault: artworkVaultAbi as InterfaceAbi,
  erc20: erc20Abi as InterfaceAbi,
  feeRouter: feeRouterAbi as InterfaceAbi,
  miningPool: miningPoolAbi as InterfaceAbi,
  miningToken: miningTokenAbi as InterfaceAbi,
};

/** Wrapper that fails loudly instead of returning a contract at the zero address. */
function at(address: string, abi: InterfaceAbi, runner: Provider | Signer): Contract {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(
      `Contract address is not configured (got "${address || "empty"}"). ` +
        `Deploy the contracts and run \`npm run export:abi\` in contracts/.`,
    );
  }
  return new Contract(address, abi, runner);
}

/** `$ART` fractional-ownership token. */
export function artToken(runner: Provider | Signer): Contract {
  return at(ADDRESSES.artToken, ABI.artToken, runner);
}

/** `$MINE` protocol emission token. */
export function miningToken(runner: Provider | Signer): Contract {
  return at(ADDRESSES.miningToken, ABI.miningToken, runner);
}

/** Fee-funded mining engine. */
export function miningPool(runner: Provider | Signer): Contract {
  return at(ADDRESSES.miningPool, ABI.miningPool, runner);
}

/** Fee intake and splitter. */
export function feeRouter(runner: Provider | Signer): Contract {
  return at(ADDRESSES.feeRouter, ABI.feeRouter, runner);
}

/** Artwork registry and fractional sale vault. */
export function artworkVault(runner: Provider | Signer): Contract {
  return at(ADDRESSES.artworkVault, ABI.artworkVault, runner);
}

/** Any BEP-20, including the fee/reward asset and per-artwork share tokens. */
export function erc20(address: string, runner: Provider | Signer): Contract {
  return at(address, ABI.erc20, runner);
}

/** Per-artwork ERC-20 fraction token. */
export function artworkShare(address: string, runner: Provider | Signer): Contract {
  return at(address, ABI.artworkShare, runner);
}

/** The fee/reward asset (USDT on BSC, a mock on testnet). */
export function feeToken(runner: Provider | Signer): Contract {
  return at(ADDRESSES.feeToken, ABI.erc20, runner);
}

export { ABI, IS_CONFIGURED, REWARD_DECIMALS, TARGET_CHAIN };

/**
 * Shape of `MiningPool.poolInfo(poolId)`.
 * @dev `totalWeight` is the 1e18-normalised reward weight; `totalStaked` is the raw token
 *      amount. Both are exposed because they answer different questions.
 */
export interface PoolInfo {
  stakeToken: string;
  allocationPoints: bigint;
  lockDuration: bigint;
  totalStaked: bigint;
  totalWeight: bigint;
  weightAtUpdate: bigint;
  accRewardPerShare: bigint;
  lastRewardBlock: bigint;
  active: boolean;
  name: string;
}

/** Shape of `MiningPool.userInfo(poolId, account)`. */
export interface UserInfo {
  amount: bigint;
  weight: bigint;
  rewardDebt: bigint;
  pendingReward: bigint;
  unlockTime: bigint;
  lastDepositBlock: bigint;
  referrer: string;
}

/** Shape of `MiningPool.reserveStats()`. */
export interface ReserveStats {
  reserve: bigint;
  released: bigint;
  unspent: bigint;
  endBlock: bigint;
  perBlockScaled: bigint;
  halvingPeriod: bigint;
}

/** Shape of `ArtworkVault.artwork(id)`. */
export interface Artwork {
  title: string;
  artist: string;
  metadataURI: string;
  appraisedValueUSD: bigint;
  paymentToken: string;
  artistPayout: string;
  custodian: string;
  basePrice: bigint;
  sharesSold: bigint;
  createdAt: bigint;
  active: boolean;
  settled: boolean;
}

/** Shape of `ArtworkVault.artworkSnapshot(id)`. */
export interface ArtworkSnapshot {
  sharesSold: bigint;
  sharesRemaining: bigint;
  marginalPrice: bigint;
  nextShareCost: bigint;
  volume: bigint;
  active: boolean;
  settled: boolean;
}

/** Normalise an ethers Result into a plain object so views can use typed access. */
export function toObject<T>(result: unknown): T {
  const source = result as Record<string, unknown> & unknown[];
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (Number.isNaN(Number(key))) out[key] = value;
  }
  return out as T;
}
