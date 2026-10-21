/// <reference types="vite/client" />

/** Typed surface for the generated `.env.local` written by `contracts/scripts/deploy.js`. */
interface ImportMetaEnv {
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_FEE_TOKEN?: string;
  readonly VITE_FEE_TOKEN_DECIMALS?: string;
  readonly VITE_ART_TOKEN?: string;
  readonly VITE_MINING_TOKEN?: string;
  readonly VITE_MINING_POOL?: string;
  readonly VITE_FEE_ROUTER?: string;
  readonly VITE_ARTWORK_VAULT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

/** EIP-1193 provider injected by BSC wallets. */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  /** Optional in EIP-1193, but every wallet this app targets implements them. */
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isBitKeep?: boolean;
  isTrust?: boolean;
  isBinance?: boolean;
  providers?: Eip1193Provider[];
}

/** Same shape, with the event methods required — used once a provider is known to be live. */
interface Eip1193EventProvider extends Eip1193Provider {
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: Eip1193Provider;
  BinanceChain?: Eip1193Provider;
  okxwallet?: Eip1193Provider;
  bitkeep?: { ethereum?: Eip1193Provider };
  trustwallet?: Eip1193Provider;
}
