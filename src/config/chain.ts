/**
 * BNB Smart Chain network configuration and deployed protocol addresses.
 *
 * Addresses come from the generated `addresses.ts` (written by `contracts/scripts/export-abi.js`
 * from the latest deployment manifest) with `.env.local` allowed to override them, so the same
 * bundle can be pointed at a fresh deployment without a code change.
 */
import { DEPLOYMENT } from "@/contracts/addresses";

export interface ChainConfig {
  chainId: number;
  /** Hex chain id used by `wallet_switchEthereumChain`. */
  chainIdHex: string;
  name: string;
  shortName: string;
  rpcUrls: string[];
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
}

export const BSC_MAINNET: ChainConfig = {
  chainId: 56,
  chainIdHex: "0x38",
  name: "BNB Smart Chain",
  shortName: "BSC",
  rpcUrls: ["https://bsc-dataseed.bnbchain.org", "https://bsc-dataseed1.defibit.io"],
  explorer: "https://bscscan.com",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  testnet: false,
};

export const BSC_TESTNET: ChainConfig = {
  chainId: 97,
  chainIdHex: "0x61",
  name: "BNB Smart Chain Testnet",
  shortName: "BSC Testnet",
  rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
  explorer: "https://testnet.bscscan.com",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  testnet: true,
};

export const HARDHAT_LOCAL: ChainConfig = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  name: "Hardhat (local)",
  shortName: "Local",
  rpcUrls: ["http://127.0.0.1:8545"],
  explorer: "",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
};

export const SUPPORTED_CHAINS: ChainConfig[] = [BSC_MAINNET, BSC_TESTNET, HARDHAT_LOCAL];

function envOr(key: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** Target chain derived from the deployment manifest, then `.env.local`, defaulting to testnet. */
export const TARGET_CHAIN_ID = Number(
  envOr("VITE_CHAIN_ID", String(DEPLOYMENT.chainId || BSC_TESTNET.chainId)),
);

export const TARGET_CHAIN: ChainConfig =
  SUPPORTED_CHAINS.find((chain) => chain.chainId === TARGET_CHAIN_ID) ?? BSC_TESTNET;

/** Deployed protocol addresses, overridable per environment. */
export const ADDRESSES = {
  feeToken: envOr("VITE_FEE_TOKEN", DEPLOYMENT.feeToken),
  artToken: envOr("VITE_ART_TOKEN", DEPLOYMENT.artToken),
  miningToken: envOr("VITE_MINING_TOKEN", DEPLOYMENT.miningToken),
  miningPool: envOr("VITE_MINING_POOL", DEPLOYMENT.miningPool),
  feeRouter: envOr("VITE_FEE_ROUTER", DEPLOYMENT.feeRouter),
  artworkVault: envOr("VITE_ARTWORK_VAULT", DEPLOYMENT.artworkVault),
};

/** Decimals of the asset fees are charged in and rewards are paid in. */
export const REWARD_DECIMALS = Number(
  envOr("VITE_FEE_TOKEN_DECIMALS", String(DEPLOYMENT.rewardDecimals || 18)),
);

/** True when every required contract address is configured. */
export const IS_CONFIGURED = Object.entries(ADDRESSES)
  .filter(([key]) => key !== "miningToken")
  .every(([, value]) => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value));

/** BSC block time in seconds, used for the block-to-time conversions in the UI. */
export const BSC_BLOCK_TIME_SECONDS = 3;

/** Live view of the protocol's published fee parameters (populated from chain, with defaults). */
export interface ProtocolParams {
  depositFeeBps: number;
  harvestFeeBps: number;
  earlyWithdrawFeeBps: number;
  miningShareBps: number;
  referralBps: number;
  platformFeeBps: number;
  curveSlopeBps: number;
  emissionHalvingPeriod: number;
  emissionHalvingDays: number;
  tailEmissionBps: number;
}

export const DEFAULT_PARAMS: ProtocolParams = {
  depositFeeBps: 300,
  harvestFeeBps: 500,
  earlyWithdrawFeeBps: 1000,
  miningShareBps: 5000,
  referralBps: 2000,
  platformFeeBps: 300,
  curveSlopeBps: 50,
  emissionHalvingPeriod: 1_209_600,
  emissionHalvingDays: 42,
  tailEmissionBps: 5000,
};
