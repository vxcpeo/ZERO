/**
 * Wallet store: injected-provider connection, chain enforcement and SOL balance tracking.
 */
import { BrowserProvider, JsonRpcProvider, formatUnits, type Signer } from "ethers";
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { TARGET_CHAIN } from "@/config/chain";
import {
  DEFAULT_WALLET_ID,
  WALLET_OPTIONS,
  isUserRejection,
  switchChain,
  type InjectedProvider,
  type WalletOption,
} from "@/wallet/connectors";
import { describeError } from "@/utils/tx";

const STORAGE_KEY = "zero-art.wallet";

export const useWalletStore = defineStore("wallet", () => {
  const address = ref<string>("");
  const chainId = ref<number>(0);
  const solBalance = ref<bigint>(0n);
  const connecting = ref(false);
  const error = ref<string>("");
  // A wallet id saved by an older build may no longer be offered; fall back to the default
  // instead of failing every connect attempt with "Unknown wallet".
  const storedWalletId = localStorage.getItem(STORAGE_KEY);
  const walletId = ref<string>(
    WALLET_OPTIONS.some((option) => option.id === storedWalletId)
      ? (storedWalletId as string)
      : DEFAULT_WALLET_ID,
  );

  /** Read-only provider pointed at the target chain, used when no wallet is connected. */
  const readProvider = shallowRef<JsonRpcProvider | null>(null);
  /** Wallet-backed provider/signer, available only while connected. */
  const browserProvider = shallowRef<BrowserProvider | null>(null);
  const signer = shallowRef<Signer | null>(null);

  const isConnected = computed(() => address.value.length > 0);
  const isWrongChain = computed(() => isConnected.value && chainId.value !== TARGET_CHAIN.chainId);
  const shortAddress = computed(() =>
    address.value ? `${address.value.slice(0, 6)}…${address.value.slice(-4)}` : "",
  );
  const solBalanceFormatted = computed(() =>
    solBalance.value
      ? Number(formatUnits(solBalance.value, TARGET_CHAIN.nativeCurrency.decimals)).toFixed(4)
      : "0",
  );

  /** Wallet options actually present in this browser. */
  const availableWallets = computed<WalletOption[]>(() =>
    WALLET_OPTIONS.filter((option) => Boolean(option.getProvider())),
  );

  const selectedWallet = computed<WalletOption | undefined>(
    () => WALLET_OPTIONS.find((option) => option.id === walletId.value),
  );

  /** Provider for reads: prefers the wallet (already authenticated) then the public RPC. */
  function getReadProvider(): BrowserProvider | JsonRpcProvider | null {
    return browserProvider.value ?? readProvider.value;
  }

  /** Signer for writes; throws a readable error when the wallet is not connected. */
  function requireSigner(): Signer {
    if (!signer.value) throw new Error("Connect your wallet first.");
    return signer.value;
  }

  /** Create the fallback JSON-RPC provider from `VITE_RPC_URL` or the chain default. */
  function initReadProvider(): void {
    const url =
      import.meta.env.VITE_RPC_URL ||
      (TARGET_CHAIN.rpcUrls.length ? TARGET_CHAIN.rpcUrls[0] : "");
    if (!url) return;
    readProvider.value = new JsonRpcProvider(url, {
      chainId: TARGET_CHAIN.chainId,
      name: TARGET_CHAIN.name,
    });
  }

  async function refreshBalances(): Promise<void> {
    const provider = getReadProvider();
    if (!provider || !address.value) {
      solBalance.value = 0n;
      return;
    }
    try {
      solBalance.value = await provider.getBalance(address.value);
    } catch {
      // A flaky RPC should not break the UI; keep the last known balance.
    }
  }

  async function readChainId(provider: InjectedProvider): Promise<number> {
    const hex = (await provider.request({ method: "eth_chainId" })) as string;
    return Number.parseInt(hex, 16);
  }

  /** Connect an injected wallet and bind its accounts to the store. */
  async function connect(id: string = walletId.value): Promise<boolean> {
    error.value = "";
    const option = WALLET_OPTIONS.find((candidate) => candidate.id === id);
    if (!option) {
      error.value = "Unknown wallet.";
      return false;
    }
    const injected = option.getProvider();
    if (!injected) {
      error.value = `${option.name} is not installed.`;
      return false;
    }

    connecting.value = true;
    try {
      const accounts = (await injected.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        error.value = "No account was shared by the wallet.";
        return false;
      }

      const provider = new BrowserProvider(injected);
      browserProvider.value = provider;
      chainId.value = await readChainId(injected);

      if (chainId.value !== TARGET_CHAIN.chainId) {
        const switched = await switchChain(injected, TARGET_CHAIN.chainIdHex, {
          chainName: TARGET_CHAIN.name,
          rpcUrls: TARGET_CHAIN.rpcUrls,
          nativeCurrency: TARGET_CHAIN.nativeCurrency,
          blockExplorerUrls: TARGET_CHAIN.explorer ? [TARGET_CHAIN.explorer] : [],
        });
        chainId.value = await readChainId(injected);
        if (!switched || chainId.value !== TARGET_CHAIN.chainId) {
          error.value = `Please switch your wallet to ${TARGET_CHAIN.name}.`;
        }
      }

      signer.value = await provider.getSigner();
      address.value = await signer.value.getAddress();
      walletId.value = id;
      localStorage.setItem(STORAGE_KEY, id);
      await refreshBalances();
      bindProviderEvents(injected);
      return true;
    } catch (caught) {
      error.value = isUserRejection(caught)
        ? "Connection request rejected."
        : describeError(caught);
      return false;
    } finally {
      connecting.value = false;
    }
  }

  function disconnect(): void {
    address.value = "";
    signer.value = null;
    browserProvider.value = null;
    chainId.value = 0;
    solBalance.value = 0n;
  }

  /** Re-attach to a previously authorised wallet without prompting, if the wallet allows it. */
  async function restore(): Promise<void> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const option = WALLET_OPTIONS.find((candidate) => candidate.id === stored);
    const injected = option?.getProvider();
    if (!injected) return;
    try {
      const accounts = (await injected.request({ method: "eth_accounts" })) as string[];
      if (!accounts?.length) return;
      await connect(option!.id);
    } catch {
      // Silent: restoration is best-effort.
    }
  }

  let eventsBound = false;
  /** Track account/chain changes so the UI never shows a stale session. */
  function bindProviderEvents(injected: InjectedProvider): void {
    const on = injected.on;
    // `on` is optional in EIP-1193; wallets that omit it simply will not push updates.
    if (eventsBound || typeof on !== "function") return;
    eventsBound = true;
    // Bind through the extracted function so the call site is provably non-optional.
    const subscribe = on.bind(injected);

    subscribe("accountsChanged", (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      if (!accounts?.length) {
        disconnect();
      } else {
        address.value = accounts[0];
        void connect(walletId.value);
      }
    });

    subscribe("chainChanged", (...args: unknown[]) => {
      chainId.value = Number.parseInt(String(args[0]), 16);
      // Rebuild the signer: ethers caches the network on the provider.
      void connect(walletId.value);
    });

    subscribe("disconnect", () => disconnect());
  }

  /** Ask the wallet to move to the protocol's chain. */
  async function switchToTargetChain(): Promise<boolean> {
    const option = WALLET_OPTIONS.find((candidate) => candidate.id === walletId.value);
    const injected = option?.getProvider();
    if (!injected) return false;
    const ok = await switchChain(injected, TARGET_CHAIN.chainIdHex, {
      chainName: TARGET_CHAIN.name,
      rpcUrls: TARGET_CHAIN.rpcUrls,
      nativeCurrency: TARGET_CHAIN.nativeCurrency,
      blockExplorerUrls: TARGET_CHAIN.explorer ? [TARGET_CHAIN.explorer] : [],
    });
    if (ok) {
      chainId.value = await readChainId(injected);
      await connect(walletId.value);
    }
    return ok;
  }

  initReadProvider();

  return {
    address,
    chainId,
    solBalance,
    connecting,
    error,
    walletId,
    isConnected,
    isWrongChain,
    shortAddress,
    solBalanceFormatted,
    availableWallets,
    selectedWallet,
    connect,
    disconnect,
    restore,
    refreshBalances,
    switchToTargetChain,
    getReadProvider,
    requireSigner,
  };
});
