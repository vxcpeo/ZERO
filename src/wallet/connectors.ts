/**
 * Multi-wallet detection and connection.
 *
 * Deliberately dependency-free: BSC users overwhelmingly arrive with an injected provider
 * (MetaMask, Binance Wallet, OKX, Trust, BitKeep), so a small EIP-1193 layer covers the real
 * audience without shipping a wallet-SDK bundle. WalletConnect-style QR flows can be layered on
 * later by implementing the same `WalletConnector` interface.
 */

/**
 * Structural view of an injected provider. The global `Eip1193Provider` in `env.d.ts` declares
 * the window properties; this local alias adds the optional event methods so the wallet store can
 * subscribe without fighting the global declaration.
 */
export type InjectedProvider = Eip1193Provider & {
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  /** Returns the injected provider, or undefined when the wallet is absent. */
  getProvider: () => InjectedProvider | undefined;
  installUrl?: string;
}

/** Every injected provider this app knows how to talk to. */
export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    getProvider: () => (window.ethereum?.isMetaMask ? window.ethereum : undefined),
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "binance",
    name: "Binance Wallet",
    icon: "🟡",
    getProvider: () => window.BinanceChain ?? (window.ethereum?.isBinance ? window.ethereum : undefined),
    installUrl: "https://www.binance.com/en/web3wallet",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    icon: "⚫",
    getProvider: () => window.okxwallet ?? (window.ethereum?.isOkxWallet ? window.ethereum : undefined),
    installUrl: "https://www.okx.com/web3",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "🛡️",
    getProvider: () =>
      window.trustwallet ?? (window.ethereum?.isTrust ? window.ethereum : undefined),
    installUrl: "https://trustwallet.com/browser-extension",
  },
  {
    id: "bitkeep",
    name: "Bitget Wallet",
    icon: "🔵",
    getProvider: () =>
      window.bitkeep?.ethereum ?? (window.ethereum?.isBitKeep ? window.ethereum : undefined),
    installUrl: "https://web3.bitget.com/en/wallet-download",
  },
  {
    id: "injected",
    name: "Browser Wallet",
    icon: "🌐",
    getProvider: () => {
      const injected = window.ethereum;
      if (!injected) return undefined;
      // EIP-6963-style multi-provider hosts expose an array; the first entry is the user's pick.
      return Array.isArray(injected.providers) ? injected.providers[0] : injected;
    },
  },
];

/** Wallet a first-time visitor is most likely to have. */
export const DEFAULT_WALLET_ID = "metamask";

/** True when any injected provider exists. */
export function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum || window.BinanceChain || window.okxwallet);
}

/** All wallets that are actually installed in this browser. */
export function installedWallets(): WalletOption[] {
  return WALLET_OPTIONS.filter((option) => Boolean(option.getProvider()));
}

export interface InjectedError {
  code?: number;
  message?: string;
}

/** `4001` is the EIP-1193 code for "user rejected the request". */
export function isUserRejection(error: unknown): boolean {
  const candidate = error as InjectedError | undefined;
  return candidate?.code === 4001 || /user (rejected|denied)/i.test(String(candidate?.message ?? ""));
}

/**
 * Ask the wallet to switch to `chainIdHex`, adding the chain first when it is unknown.
 * @returns true when the wallet is on the requested chain afterwards.
 */
export async function switchChain(
  provider: InjectedProvider,
  chainIdHex: string,
  addParams: {
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    blockExplorerUrls?: string[];
  },
): Promise<boolean> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (error) {
    const code = (error as InjectedError)?.code;
    // 4902: the wallet does not know this chain yet.
    if (code === 4902 || code === -32603) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: addParams.chainName,
              rpcUrls: addParams.rpcUrls,
              nativeCurrency: addParams.nativeCurrency,
              blockExplorerUrls: addParams.blockExplorerUrls?.filter(Boolean),
            },
          ],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
