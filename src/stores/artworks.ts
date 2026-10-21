/**
 * Artwork store: paged registry reads, live bonding-curve quotes and the primary purchase path.
 *
 * Reads go through the wallet's read provider so a deep link to `/art/:id` works before a wallet
 * is connected. Writes need a signer and follow the same approve-then-send shape as the mining
 * store, but keep their own small transaction record: the mining store's feed is not exported and
 * must not be reached into from here.
 */
import { ZeroAddress } from "ethers";
import type { ContractTransactionResponse, Provider, Signer } from "ethers";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { DEFAULT_PARAMS, TARGET_CHAIN } from "@/config/chain";
import {
  artworkVault,
  erc20,
  feeRouter,
  toObject,
  type Artwork,
  type ArtworkSnapshot,
} from "@/contracts";
import { useWalletStore } from "@/stores/wallet";
import { parseUnits } from "@/utils/format";
import { describeError, ensureAllowance, explorerTxUrl } from "@/utils/tx";

/** Shares are 18-decimal ERC-20 units, quoted in whole shares everywhere in the UI. */
export const SHARE_DECIMALS = 18;
/** `ArtworkVault.WHOLE_SHARES_PER_ARTWORK`. */
export const WHOLE_SHARES_PER_ARTWORK = 1_000_000;
/** `ArtworkVault.SHARES_PER_ARTWORK` — one million `1e18` fractions per physical artwork. */
export const SHARES_PER_ARTWORK = BigInt(WHOLE_SHARES_PER_ARTWORK) * 10n ** BigInt(SHARE_DECIMALS);
/** Artworks fetched per `artworksPaged` round trip. */
export const ARTWORK_PAGE_SIZE = 12;

/** One artwork plus everything the UI needs that the raw struct does not carry. */
export interface ArtworkView extends Artwork {
  id: number;
  /** Per-artwork ERC-20 fraction token. */
  shareToken: string;
  /** ERC-721 provenance certificate minted to the custodian at registration. */
  certificateId: bigint;
  /** Market state in one read: sold, remaining, marginal price, next-share cost, volume. */
  snapshot: ArtworkSnapshot;
  /** This wallet's shares per the vault's purchase ledger (needs a connected address). */
  userShares: bigint;
  /** Decimals of `paymentToken`, read once per artwork. */
  paymentDecimals: number;
  /** Symbol of `paymentToken`, read once per artwork. */
  paymentSymbol: string;
}

/** Published fee parameters the purchase form needs to show an exact split. */
export interface ArtworkFeeParams {
  /** `ArtworkVault.platformFeeBps` — charged on every primary purchase. */
  platformFeeBps: number;
  /** `ArtworkVault.artistShareBps` — the artist's cut of the post-fee proceeds. */
  artistShareBps: number;
  /** `FeeRouter.miningShareBps` — share of the platform fee routed into the mining reserve. */
  miningShareBps: number;
  /** `FeeRouter.referralBps` — share of the platform fee paid to a named referrer. */
  referralBps: number;
}

/** Single most recent transaction, so a page can link straight to Solscan. */
export interface ArtworkTxEntry {
  hash: string;
  label: string;
  status: "pending" | "success" | "error";
  message?: string;
  explorerUrl?: string;
}

const DEFAULT_FEE_PARAMS: ArtworkFeeParams = {
  platformFeeBps: DEFAULT_PARAMS.platformFeeBps,
  artistShareBps: 8_500,
  miningShareBps: DEFAULT_PARAMS.miningShareBps,
  referralBps: DEFAULT_PARAMS.referralBps,
};

export const useArtworksStore = defineStore("artworks", () => {
  const wallet = useWalletStore();

  const artworks = ref<ArtworkView[]>([]);
  /** `artworkCount()` — the registry is append-only, so ids stay dense from 0. */
  const total = ref(0);
  const feeParams = ref<ArtworkFeeParams>({ ...DEFAULT_FEE_PARAMS });

  const loading = ref(false);
  const loadingMore = ref(false);
  /** True while any write in this store is in flight (buy, redeem or settle). */
  const submitting = ref(false);
  const error = ref("");
  const lastUpdated = ref(0);
  const lastTx = ref<ArtworkTxEntry | null>(null);

  /** True while the registry holds artworks that have not been paged in yet. */
  const hasMore = computed(() => artworks.value.length < total.value);

  /** Registry progress as a 0..1 fraction, for the marketplace progress bars. */
  function soldFraction(snapshot: ArtworkSnapshot): number {
    if (snapshot.sharesSold === 0n) return 0;
    return Number((snapshot.sharesSold * 10_000n) / SHARES_PER_ARTWORK) / 10_000;
  }

  /** Resolve a signer for a write, or record why the write is unavailable. */
  function writeSigner(): Signer | null {
    if (!wallet.isConnected) {
      error.value = "Connect your wallet first.";
      return null;
    }
    if (wallet.isWrongChain) {
      error.value = `Switch your wallet to ${TARGET_CHAIN.name} first.`;
      return null;
    }
    try {
      return wallet.requireSigner();
    } catch (caught) {
      error.value = describeError(caught);
      return null;
    }
  }

  /**
   * Send a write, keep the result in `lastTx`, then re-read the registry so prices and
   * holdings reflect the new fill level.
   */
  async function submit(
    label: string,
    send: () => Promise<ContractTransactionResponse>,
  ): Promise<boolean> {
    try {
      const tx = await send();
      const explorerUrl = explorerTxUrl(tx.hash);
      lastTx.value = { hash: tx.hash, label, status: "pending", explorerUrl };

      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        lastTx.value = { hash: tx.hash, label, status: "error", message: "Transaction reverted.", explorerUrl };
        return false;
      }
      lastTx.value = { hash: tx.hash, label, status: "success", explorerUrl };
      await refresh();
      return true;
    } catch (caught) {
      const message = describeError(caught);
      error.value = message;
      // Reuse the hash when the revert happened after broadcast.
      const pending = lastTx.value?.status === "pending" ? lastTx.value : null;
      lastTx.value = pending
        ? { ...pending, status: "error", message }
        : { hash: "", label, status: "error", message };
      return false;
    }
  }

  /** Attach the snapshot, share token, wallet holding and payment-token metadata. */
  async function decorate(
    vault: ReturnType<typeof artworkVault>,
    provider: Provider,
    id: number,
    raw: Artwork,
  ): Promise<ArtworkView> {
    const owner = wallet.address;
    const [snapshotRaw, shareTokenRaw, certificateId, userShares] = (await Promise.all([
      vault.artworkSnapshot(id),
      vault.shareTokenOf(id),
      vault.certificateOf(id),
      owner ? vault.sharesOf(id, owner) : Promise.resolve(0n),
    ])) as [unknown, string, bigint, bigint];

    const payment = erc20(raw.paymentToken, provider);
    const [symbol, decimals] = (await Promise.all([
      payment.symbol().catch(() => "?"),
      payment.decimals().catch(() => 18),
    ])) as [string, number];

    return {
      ...raw,
      id,
      shareToken: String(shareTokenRaw),
      certificateId,
      snapshot: toObject<ArtworkSnapshot>(snapshotRaw),
      userShares,
      paymentSymbol: String(symbol),
      paymentDecimals: Number(decimals),
    };
  }

  /** Read the published fee parameters: vault pricing plus the router's split. */
  async function refreshFeeParams(provider: Provider): Promise<void> {
    const vaultContract = artworkVault(provider);
    const router = feeRouter(provider);
    const [platformFeeBps, artistShareBps, miningShareBps, referralBps] = (await Promise.all([
      vaultContract.platformFeeBps(),
      vaultContract.artistShareBps(),
      router.miningShareBps(),
      router.referralBps(),
    ])) as [bigint, bigint, bigint, bigint];

    feeParams.value = {
      platformFeeBps: Number(platformFeeBps),
      artistShareBps: Number(artistShareBps),
      miningShareBps: Number(miningShareBps),
      referralBps: Number(referralBps),
    };
  }

  /** Refresh the first page, the registry size and the published fee parameters. */
  async function refresh(): Promise<void> {
    const provider = wallet.getReadProvider();
    if (!provider) {
      error.value = "No RPC provider available.";
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      const vault = artworkVault(provider);
      const count = (await vault.artworkCount()) as bigint;
      total.value = Number(count);

      await refreshFeeParams(provider);

      if (total.value === 0) {
        artworks.value = [];
      } else {
        const limit = Math.min(ARTWORK_PAGE_SIZE, total.value);
        const rows = (await vault.artworksPaged(0, limit)) as unknown[];
        artworks.value = await Promise.all(
          rows.map((row, index) => decorate(vault, provider, index, toObject<Artwork>(row))),
        );
      }
      lastUpdated.value = Date.now();
    } catch (caught) {
      error.value = describeError(caught);
    } finally {
      loading.value = false;
    }
  }

  /** Page the next slice of the registry onto the end of the list. */
  async function loadMore(): Promise<void> {
    if (!hasMore.value || loadingMore.value) return;
    const provider = wallet.getReadProvider();
    if (!provider) {
      error.value = "No RPC provider available.";
      return;
    }
    loadingMore.value = true;
    try {
      const vault = artworkVault(provider);
      const offset = artworks.value.length;
      const rows = (await vault.artworksPaged(offset, ARTWORK_PAGE_SIZE)) as unknown[];
      if (!rows.length) {
        // The registry shrank under us (a re-org or a different deployment): stop paging.
        total.value = offset;
        return;
      }
      const page = await Promise.all(
        rows.map((row, index) => decorate(vault, provider, offset + index, toObject<Artwork>(row))),
      );
      artworks.value = [...artworks.value, ...page];
      error.value = "";
      lastUpdated.value = Date.now();
    } catch (caught) {
      error.value = describeError(caught);
    } finally {
      loadingMore.value = false;
    }
  }

  /**
   * Load one artwork by id, for deep links beyond the paged window.
   * @returns the artwork, or null when the id is unregistered or unreadable.
   */
  async function fetchArtwork(id: number): Promise<ArtworkView | null> {
    if (!Number.isInteger(id) || id < 0) return null;
    const provider = wallet.getReadProvider();
    if (!provider) {
      error.value = "No RPC provider available.";
      return null;
    }
    try {
      const vault = artworkVault(provider);
      const raw = toObject<Artwork>(await vault.artwork(id));
      // An unregistered slot reads as a zeroed struct; `basePrice` is the contract's own sentinel.
      if (raw.basePrice === 0n) return null;

      const view = await decorate(vault, provider, id, raw);
      const index = artworks.value.findIndex((candidate) => candidate.id === id);
      if (index >= 0) {
        const next = [...artworks.value];
        next[index] = view;
        artworks.value = next;
      }
      return view;
    } catch (caught) {
      error.value = describeError(caught);
      return null;
    }
  }

  /**
   * Live cost of `shareAmountHuman` shares, straight from the bonding curve.
   * @dev Shares are 18-decimal units; an empty or zero amount returns 0n without a round trip.
   */
  async function quote(id: number, shareAmountHuman: string): Promise<bigint> {
    const amount = parseUnits(shareAmountHuman, SHARE_DECIMALS);
    if (amount === 0n) return 0n;
    const provider = wallet.getReadProvider();
    if (!provider) throw new Error("No RPC provider available.");
    return (await artworkVault(provider).quoteBuy(id, amount)) as bigint;
  }

  /**
   * Buy fractions in an artwork. Approves the artwork's payment token first when needed, then
   * pays `quoteBuy` + `slippageBps` as the on-chain `maxCost` guard.
   * @param slippageBps Tolerance above the live quote, e.g. 100 = 1%.
   * @param referrer Optional address that receives the router's referral rebate out of the fee.
   */
  async function buy(
    id: number,
    shareAmountHuman: string,
    slippageBps = 100,
    referrer = "",
  ): Promise<boolean> {
    error.value = "";

    let amount: bigint;
    try {
      amount = parseUnits(shareAmountHuman, SHARE_DECIMALS);
    } catch (caught) {
      error.value = describeError(caught);
      return false;
    }
    if (amount === 0n) {
      error.value = "Enter an amount greater than zero.";
      return false;
    }

    const signer = writeSigner();
    if (!signer) return false;

    const provider = signer.provider ?? wallet.getReadProvider();
    if (!provider) {
      error.value = "No RPC provider available.";
      return false;
    }

    const artwork =
      artworks.value.find((candidate) => candidate.id === id) ?? (await fetchArtwork(id));
    if (!artwork) {
      error.value = error.value || "That artwork does not exist.";
      return false;
    }

    submitting.value = true;
    try {
      const cost = (await artworkVault(provider).quoteBuy(id, amount)) as bigint;
      // Slippage guard: `buyShares` reverts with FeeTooHigh when the live cost exceeds this.
      const maxCost = (cost * BigInt(10_000 + slippageBps)) / 10_000n;

      const vault = artworkVault(signer);
      const vaultAddress = await vault.getAddress();
      const payment = erc20(artwork.paymentToken, signer);

      const approval = await ensureAllowance(payment, vaultAddress, cost, signer);
      if (approval) {
        lastTx.value = {
          hash: approval.hash,
          label: `Approve ${artwork.paymentSymbol}`,
          status: "success",
          explorerUrl: approval.explorerUrl,
        };
      }

      const trimmed = referrer.trim();
      const referrerAddress = /^0x[0-9a-fA-F]{40}$/.test(trimmed) ? trimmed : ZeroAddress;

      return await submit(`Buy ${shareAmountHuman} shares of ${artwork.title}`, () =>
        vault.buyShares(id, amount, maxCost, referrerAddress) as Promise<ContractTransactionResponse>,
      );
    } catch (caught) {
      error.value = describeError(caught);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * Redeem the provenance certificate. Only the wallet holding every share can do this, and only
   * after the custodian has settled the artwork.
   */
  async function redeem(id: number): Promise<boolean> {
    error.value = "";
    const signer = writeSigner();
    if (!signer) return false;
    submitting.value = true;
    try {
      const vault = artworkVault(signer);
      return await submit("Redeem provenance certificate", () =>
        vault.redeemCertificate(id) as Promise<ContractTransactionResponse>,
      );
    } catch (caught) {
      error.value = describeError(caught);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  /** Custodian (or governance) confirms delivery / custody transfer of a vaulted artwork. */
  async function settle(id: number, deliveryProofURI: string): Promise<boolean> {
    error.value = "";
    const signer = writeSigner();
    if (!signer) return false;
    submitting.value = true;
    try {
      const vault = artworkVault(signer);
      return await submit("Settle artwork", () =>
        vault.settleArtwork(id, deliveryProofURI) as Promise<ContractTransactionResponse>,
      );
    } catch (caught) {
      error.value = describeError(caught);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return {
    artworks,
    total,
    feeParams,
    loading,
    loadingMore,
    submitting,
    error,
    lastUpdated,
    lastTx,
    hasMore,
    soldFraction,
    refresh,
    loadMore,
    fetchArtwork,
    quote,
    buy,
    redeem,
    settle,
  };
});
