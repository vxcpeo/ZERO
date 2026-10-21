<script setup lang="ts">
/**
 * Artwork detail: live curve stats, the purchase form with an exact fee split, the holder's
 * position and the settlement path back to the physical piece.
 */
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import { ADDRESSES, TARGET_CHAIN } from "@/config/chain";
import {
  SHARE_DECIMALS,
  SHARES_PER_ARTWORK,
  WHOLE_SHARES_PER_ARTWORK,
  useArtworksStore,
  type ArtworkView,
} from "@/stores/artworks";
import { useWalletStore } from "@/stores/wallet";
import { bpsOf, formatBps, formatUnits, parseUnits, shortAddress, timeAgo } from "@/utils/format";
import { describeError, explorerAddressUrl } from "@/utils/tx";

const route = useRoute();
const store = useArtworksStore();
const wallet = useWalletStore();

/** `id` route param, validated once so the rest of the view can treat it as a number. */
const artworkId = computed(() => {
  const raw = String(route.params.id ?? "");
  return /^\d+$/.test(raw) ? Number(raw) : -1;
});

const artwork = ref<ArtworkView | null>(null);
const loading = ref(true);
const loadError = ref("");

/** True when the loaded artwork is not the one the URL asks for (mid-navigation). */
const staleArtwork = computed(() => artwork.value !== null && artwork.value.id !== artworkId.value);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  if (artworkId.value < 0) {
    artwork.value = null;
    loadError.value = `"${String(route.params.id ?? "")}" is not a valid artwork id. Ids are whole numbers starting at 0.`;
    loading.value = false;
    return;
  }
  const found = await store.fetchArtwork(artworkId.value);
  artwork.value = found;
  if (!found) {
    loadError.value = store.error || `Artwork #${artworkId.value} is not registered in the vault.`;
  }
  loading.value = false;
}

watch(artworkId, () => void load(), { immediate: true });

// The holder's position is read per address, so reload when the wallet connects or switches.
watch(
  () => wallet.address,
  () => void load(),
);

// ── Purchase form ─────────────────────────────────────────────────────────────

const amountText = ref("");
const slippageBps = ref(100);
const referrer = ref("");
const formError = ref("");
const formSuccess = ref("");

const slippageOptions = [
  { label: "0.5%", bps: 50 },
  { label: "1%", bps: 100 },
  { label: "2%", bps: 200 },
];

/** Parsed amount plus whether the text was rejected, so the message stays precise. */
const amountState = computed(() => {
  const raw = amountText.value.trim();
  if (!raw) return { value: 0n, invalid: false };
  try {
    return { value: parseUnits(raw, SHARE_DECIMALS), invalid: false };
  } catch {
    return { value: 0n, invalid: true };
  }
});
const amountShares = computed(() => amountState.value.value);
const amountInvalid = computed(() => amountState.value.invalid);

/** Whole shares still for sale — the ceiling for the quick-fill buttons and the buy guard. */
const remainingWholeShares = computed(() => {
  const remaining = artwork.value?.snapshot.sharesRemaining ?? 0n;
  return remaining / 10n ** BigInt(SHARE_DECIMALS);
});
const quarterRemaining = computed(() => remainingWholeShares.value / 4n);
/** Same number, formatted for reading. */
const remainingLabel = computed(() =>
  formatUnits(artwork.value?.snapshot.sharesRemaining ?? 0n, SHARE_DECIMALS, {
    maxFractionDigits: 0,
  }),
);

const exceedsRemaining = computed(
  () => amountShares.value > (artwork.value?.snapshot.sharesRemaining ?? 0n),
);

/** Quick-fill buttons, resolved in script so the template never needs a bigint literal. */
const quickFills = computed(() => [
  { label: "10", value: 10n, available: remainingWholeShares.value >= 10n },
  { label: "100", value: 100n, available: remainingWholeShares.value >= 100n },
  { label: "1,000", value: 1000n, available: remainingWholeShares.value >= 1000n },
  { label: "25%", value: quarterRemaining.value, available: quarterRemaining.value > 0n },
  { label: "Max", value: remainingWholeShares.value, available: remainingWholeShares.value > 0n },
]);

const quotedCost = ref(0n);
const quoting = ref(false);
const quoteError = ref("");
const hasQuote = computed(() => quotedCost.value > 0n);
/** Guards against an older quote landing after a newer keystroke. */
let quoteNonce = 0;

async function refreshQuote(): Promise<void> {
  const art = artwork.value;
  if (!art || amountShares.value === 0n) {
    // Invalidate anything already in flight so a late reply cannot resurrect a stale cost.
    quoteNonce += 1;
    quotedCost.value = 0n;
    quoteError.value = "";
    quoting.value = false;
    return;
  }
  const nonce = ++quoteNonce;
  quoting.value = true;
  try {
    const cost = await store.quote(art.id, amountText.value.trim());
    if (nonce !== quoteNonce) return;
    quotedCost.value = cost;
    quoteError.value = "";
  } catch (caught) {
    if (nonce !== quoteNonce) return;
    quotedCost.value = 0n;
    quoteError.value = describeError(caught);
  } finally {
    if (nonce === quoteNonce) quoting.value = false;
  }
}

watch([amountText, artwork], () => void refreshQuote());

function setAmount(shares: bigint): void {
  amountText.value = shares > 0n ? shares.toString() : "";
}

const referrerIsValid = computed(() => /^0x[0-9a-fA-F]{40}$/.test(referrer.value.trim()));

const canBuy = computed(
  () =>
    Boolean(artwork.value) &&
    artwork.value?.snapshot.active === true &&
    wallet.isConnected &&
    !wallet.isWrongChain &&
    amountShares.value > 0n &&
    !amountInvalid.value &&
    !exceedsRemaining.value &&
    quotedCost.value > 0n &&
    !quoting.value &&
    !quoteError.value &&
    !store.submitting,
);

/** Why the buy button is disabled, phrased for the person looking at it. */
const disabledReason = computed(() => {
  const art = artwork.value;
  if (!art) return "";
  if (!wallet.isConnected) return "Connect your wallet to buy fractions of this artwork.";
  if (wallet.isWrongChain) return `Switch your wallet to ${TARGET_CHAIN.name} to buy fractions.`;
  if (!art.snapshot.active) {
    return "Primary sales for this artwork are paused by governance. Existing fractions keep trading as SPL tokens.";
  }
  if (amountInvalid.value) return "Enter a plain number of shares, for example 250 or 12.5.";
  if (exceedsRemaining.value) {
    return `Only ${remainingLabel.value} whole shares are still for sale.`;
  }
  if (amountShares.value === 0n) return "Enter how many shares you want to buy.";
  if (quoteError.value) return `The curve quote failed: ${quoteError.value}`;
  if (quotedCost.value === 0n) return "Waiting for a live quote from the vault.";
  if (store.submitting) return "A transaction is already in flight.";
  return "";
});

const buyLabel = computed(() => {
  const art = artwork.value;
  if (store.submitting) return "Waiting for the wallet…";
  if (art && quotedCost.value > 0n) {
    return `Buy for ${formatUnits(quotedCost.value, art.paymentDecimals, { maxFractionDigits: 6 })} ${art.paymentSymbol}`;
  }
  return "Buy shares";
});

/** Complement of the platform fee, as basis points of the cost. */
const artistProceedsBps = computed(() => 10_000 - store.feeParams.platformFeeBps);

const lastTxBadge = computed(() => {
  const status = store.lastTx?.status;
  if (status === "pending") return "ct-tag-warn";
  if (status === "error") return "ct-tag-bad";
  if (status === "success") return "ct-tag-good";
  return "";
});

/** Format a payment-token amount with this artwork's decimals. */
function fmt(value: bigint): string {
  return formatUnits(value, artwork.value?.paymentDecimals ?? 18, { maxFractionDigits: 6 });
}

/**
 * The exact on-chain split of the quoted cost: a platform fee on the whole cost, then the
 * remaining proceeds between the artist and the treasury, with the fee's own three legs.
 */
const breakdown = computed(() => {
  const cost = quotedCost.value;
  const params = store.feeParams;
  const fee = bpsOf(cost, params.platformFeeBps);
  const artistProceeds = cost - fee;
  const artistPayout = bpsOf(artistProceeds, params.artistShareBps);
  const proceedsTreasury = artistProceeds - artistPayout;

  const hasReferrer = referrerIsValid.value;
  const mining = bpsOf(fee, params.miningShareBps);
  const referral = hasReferrer ? bpsOf(fee, params.referralBps) : 0n;
  // The router hands the treasury whatever is left, so the three legs always sum to the fee.
  const feeTreasury = fee - mining - referral;

  return {
    cost,
    fee,
    artistProceeds,
    artistPayout,
    proceedsTreasury,
    mining,
    referral,
    feeTreasury,
    treasury: feeTreasury + proceedsTreasury,
    hasReferrer,
  };
});

async function handleBuy(): Promise<void> {
  const art = artwork.value;
  if (!art) return;
  formError.value = "";
  formSuccess.value = "";
  const label = amountText.value.trim();
  const ok = await store.buy(art.id, label, slippageBps.value, referrer.value.trim());
  if (!ok) {
    formError.value = store.error || "The purchase did not go through.";
    return;
  }
  formSuccess.value = `Bought ${label} shares of ${art.title}.`;
  await load();
}

// ── Position, settlement and certificate ──────────────────────────────────────

const holdsEverything = computed(
  () => artwork.value !== null && artwork.value.userShares === SHARES_PER_ARTWORK,
);

const holdingPercent = computed(() => {
  const shares = artwork.value?.userShares ?? 0n;
  if (shares === 0n) return "0";
  return (Number((shares * 1_000_000n) / SHARES_PER_ARTWORK) / 10_000).toFixed(4);
});

/** What the curve's current marginal price would value this wallet's holding at. */
const holdingValue = computed(() => {
  const art = artwork.value;
  if (!art) return 0n;
  return (art.userShares * art.snapshot.marginalPrice) / 10n ** BigInt(SHARE_DECIMALS);
});

const isCustodian = computed(
  () =>
    Boolean(artwork.value?.custodian) &&
    Boolean(wallet.address) &&
    artwork.value?.custodian.toLowerCase() === wallet.address.toLowerCase(),
);

/** Connect/network half of the guard shared by every write on this page. */
const writeBlockedReason = computed(() => {
  if (!wallet.isConnected) return "Connect your wallet to sign this transaction.";
  if (wallet.isWrongChain) return `Switch your wallet to ${TARGET_CHAIN.name} to sign this transaction.`;
  if (store.submitting) return "A transaction is already in flight.";
  return "";
});

const canRedeem = computed(
  () => holdsEverything.value && artwork.value?.snapshot.settled === true && !writeBlockedReason.value,
);

const deliveryProof = ref("");
const settleError = ref("");
const settleSuccess = ref("");
const canSettle = computed(
  () => isCustodian.value && deliveryProof.value.trim().length > 0 && !writeBlockedReason.value,
);

const redeemError = ref("");
const redeemSuccess = ref("");

async function handleRedeem(): Promise<void> {
  const art = artwork.value;
  if (!art) return;
  redeemError.value = "";
  redeemSuccess.value = "";
  const ok = await store.redeem(art.id);
  if (!ok) {
    redeemError.value = store.error || "The redemption did not go through.";
    return;
  }
  redeemSuccess.value = "Certificate redeemed — the provenance NFT is now in your wallet.";
  await load();
}

async function handleSettle(): Promise<void> {
  const art = artwork.value;
  if (!art) return;
  settleError.value = "";
  settleSuccess.value = "";
  const ok = await store.settle(art.id, deliveryProof.value.trim());
  if (!ok) {
    settleError.value = store.error || "Settlement did not go through.";
    return;
  }
  settleSuccess.value = "Artwork settled. A wallet holding every share can now redeem the certificate.";
  await load();
}

/** Metadata pointer, linked when it is a plain HTTP document. */
const metadataHref = computed(() => {
  const uri = artwork.value?.metadataURI ?? "";
  return /^https?:\/\//i.test(uri) ? uri : "";
});

/** Explorer link for an address, or "" when there is nothing linkable. */
function addressHref(address: string): string {
  return /^0x[0-9a-fA-F]{40}$/.test(address) ? explorerAddressUrl(address) : "";
}

interface AddressRow {
  label: string;
  address: string;
  note: string;
}

/** Every contract and wallet behind this artwork, with its explorer link. */
const addressRows = computed<AddressRow[]>(() => {
  const art = artwork.value;
  if (!art) return [];
  return [
    {
      label: "Share token (ERC-20)",
      address: art.shareToken,
      note: `${WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US")} fractions`,
    },
    { label: `Payment token (${art.paymentSymbol})`, address: art.paymentToken, note: "fees + proceeds" },
    {
      label: "Provenance certificate (ERC-721)",
      address: ADDRESSES.artworkVault,
      note: `token #${art.certificateId.toString()}`,
    },
    { label: "Custodian", address: art.custodian, note: "holds the physical piece" },
    { label: "Artist payout", address: art.artistPayout, note: "receives the artist share" },
  ];
});
</script>

<template>
  <div class="ct-route">
    <!-- ── Loading / invalid id ─────────────────────────────────────────── -->
    <section v-if="loading && (!artwork || staleArtwork)" class="ct-plate" aria-label="Loading artwork record">
      <div class="ct-gutter">
        <div class="ct-slab">
          <div class="ct-skeleton ct-gap-b2" style="width: 30%; height: 0.8em" />
          <div class="ct-skeleton ct-gap-b2" style="width: 60%; height: 2em" />
          <div class="ct-skeleton ct-gap-b3" style="width: 40%" />
          <div class="ct-grid ct-grid-four">
            <div v-for="n in 4" :key="n" class="ct-skeleton" style="height: 3.4em" />
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="loadError" class="ct-plate" aria-label="Artwork unavailable">
      <div class="ct-gutter">
        <div class="ct-slab">
          <span class="ct-tag ct-tag-warn ct-gap-b1">Unavailable</span>
          <h2>We could not open that artwork</h2>
          <p class="ct-copy">{{ loadError }}</p>
          <p class="ct-copy ct-quiet">
            Artwork ids are assigned by the vault as
            <span class="ct-mono">registerArtwork</span> is called by governance, so an id that has
            never been used simply has nothing behind it.
          </p>
          <div class="ct-inline ct-row ct-gap-t2">
            <RouterLink to="/art" class="ct-btn ct-btn-primary">Back to the gallery</RouterLink>
            <button v-if="artworkId >= 0" class="ct-btn" :disabled="store.loading" @click="load()">
              <span v-if="store.loading" class="ct-pulse" />
              Try again
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Artwork ──────────────────────────────────────────────────────── -->
    <template v-else-if="artwork">
      <section class="ct-plate ct-plaque" aria-label="Artwork record">
        <div class="ct-gutter">
          <RouterLink to="/art" class="ct-copy">← All artworks</RouterLink>

          <div class="ct-kicker ct-gap-t2">
            <span class="ct-tag ct-tag-accent">#{{ artwork.id }}</span>
            <span v-if="artwork.snapshot.active" class="ct-tag ct-tag-good">active</span>
            <span v-if="artwork.snapshot.settled" class="ct-tag ct-tag-warn">settled</span>
            <span v-if="!artwork.snapshot.active && !artwork.snapshot.settled" class="ct-tag">
              paused
            </span>
            <span>registered {{ timeAgo(artwork.createdAt) }}</span>
          </div>

          <h1>{{ artwork.title || `Artwork #${artwork.id}` }}</h1>

          <p class="ct-standfirst">
            {{ artwork.artist || "Unattributed" }} · appraised at
            <strong>${{ formatUnits(artwork.appraisedValueUSD, 0) }}</strong>, vaulted with
            <span class="ct-mono">{{ shortAddress(artwork.custodian) }}</span> as custodian and split
            into {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} ERC-20 fractions.
          </p>

          <p class="ct-copy ct-quiet ct-gap-b0">
            Metadata pointer:
            <a
              v-if="metadataHref"
              :href="metadataHref"
              target="_blank"
              rel="noreferrer noopener"
              class="ct-mono"
            >
              {{ artwork.metadataURI }}
            </a>
            <span v-else class="ct-mono">{{ artwork.metadataURI || "—" }}</span>
          </p>
        </div>
      </section>

      <!-- ── Market stats ───────────────────────────────────────────────── -->
      <section class="ct-plate" aria-label="The curve, right now">
        <div class="ct-gutter">
          <div class="ct-plate-head ct-line ct-row">
            <div>
              <h2 class="ct-gap-b1">The curve, right now</h2>
              <p class="ct-gap-b0 ct-copy">
                One snapshot read from <span class="ct-mono">artworkSnapshot</span>. Cost is convex: a
                bigger block costs more per share than a small one.
              </p>
            </div>
            <button class="ct-btn ct-btn-small" :disabled="store.loading" @click="load()">
              <span v-if="store.loading" class="ct-pulse" />
              Refresh
            </button>
          </div>

          <div class="ct-figures ct-figures-five">
            <div class="ct-fact">
              <div class="ct-label">Shares sold</div>
              <div class="ct-figure">
                {{ formatUnits(artwork.snapshot.sharesSold, SHARE_DECIMALS, { maxFractionDigits: 0 }) }}
              </div>
              <div class="ct-note">
                of {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }}
              </div>
            </div>
            <div class="ct-fact">
              <div class="ct-label">Shares remaining</div>
              <div class="ct-figure">
                {{ formatUnits(artwork.snapshot.sharesRemaining, SHARE_DECIMALS, { maxFractionDigits: 0 }) }}
              </div>
              <div class="ct-note">still on the curve</div>
            </div>
            <div class="ct-fact">
              <div class="ct-label">Marginal price</div>
              <div class="ct-figure">
                {{ formatUnits(artwork.snapshot.marginalPrice, artwork.paymentDecimals, { maxFractionDigits: 6 }) }}
              </div>
              <div class="ct-note">per share in {{ artwork.paymentSymbol }}</div>
            </div>
            <div class="ct-fact">
              <div class="ct-label">Next share costs</div>
              <div class="ct-figure">
                {{ formatUnits(artwork.snapshot.nextShareCost, artwork.paymentDecimals, { maxFractionDigits: 6 }) }}
              </div>
              <div class="ct-note">{{ artwork.paymentSymbol }} for 1 share</div>
            </div>
            <div class="ct-fact">
              <div class="ct-label">Primary volume</div>
              <div class="ct-figure">
                {{ formatUnits(artwork.snapshot.volume, artwork.paymentDecimals, { maxFractionDigits: 2 }) }}
              </div>
              <div class="ct-note">{{ artwork.paymentSymbol }} raised on the curve</div>
            </div>
          </div>

          <div class="ct-slab ct-gap-t2">
            <div class="ct-line ct-copy ct-gap-b1">
              <span class="ct-quiet">Sold through the curve</span>
              <span class="ct-num">
                {{ (store.soldFraction(artwork.snapshot) * 100).toFixed(2) }}%
              </span>
            </div>
            <div class="ct-meter">
              <div
                class="ct-meter-fill"
                :style="{ width: `${store.soldFraction(artwork.snapshot) * 100}%` }"
              />
            </div>
            <p class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2">
              The curve opens at
              {{ formatUnits(artwork.basePrice, artwork.paymentDecimals, { maxFractionDigits: 6 }) }}
              {{ artwork.paymentSymbol }} per share and rises with every fill, so early buyers pay
              less for the same artwork.
            </p>
          </div>
        </div>
      </section>

      <!-- ── Buy + fee split ────────────────────────────────────────────── -->
      <section class="ct-plate" aria-label="Buy fractions and fee split">
        <div class="ct-gutter">
          <div class="ct-grid ct-split">
            <div class="ct-slab">
              <div class="ct-line ct-gap-b2">
                <h3 class="ct-gap-b0">Buy fractions</h3>
                <span class="ct-micro ct-quiet">{{ remainingLabel }} shares left</span>
              </div>

              <div class="ct-field ct-gap-b2">
                <label class="ct-field-label" for="share-amount">Shares to buy</label>
                <div class="ct-field-row">
                  <input
                    id="share-amount"
                    v-model="amountText"
                    class="ct-field-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="0"
                    autocomplete="off"
                  />
                  <span class="ct-field-suffix">shares</span>
                </div>
              </div>

              <div class="ct-inline ct-row ct-gap-b2">
                <button
                  v-for="fill in quickFills"
                  :key="fill.label"
                  class="ct-btn ct-btn-small"
                  :disabled="!fill.available"
                  @click="setAmount(fill.value)"
                >
                  {{ fill.label }}
                </button>
              </div>
              <p class="ct-micro ct-quiet ct-gap-b2">
                25% and Max are floored to whole shares of what is still for sale. A fractional
                amount can still be typed by hand.
              </p>

              <div class="ct-line ct-gap-b2">
                <span class="ct-copy ct-quiet">Cost on the curve</span>
                <span class="ct-num">
                  <span v-if="quoting" class="ct-pulse" />
                  <template v-else-if="hasQuote">{{ fmt(quotedCost) }} {{ artwork.paymentSymbol }}</template>
                  <template v-else>—</template>
                </span>
              </div>

              <div class="ct-field ct-gap-b2">
                <span class="ct-field-label">Slippage tolerance</span>
                <div class="ct-inline">
                  <button
                    v-for="option in slippageOptions"
                    :key="option.bps"
                    class="ct-btn ct-btn-small"
                    :class="{ 'ct-btn-primary': slippageBps === option.bps }"
                    @click="slippageBps = option.bps"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <p class="ct-micro ct-quiet ct-gap-b0">
                  Sent as <span class="ct-mono">maxCost</span>: the vault reverts if the cost moves
                  above your quote by more than this.
                </p>
              </div>

              <div class="ct-field ct-gap-b2">
                <label class="ct-field-label" for="referrer">Referrer (optional)</label>
                <input
                  id="referrer"
                  v-model="referrer"
                  class="ct-field-input"
                  type="text"
                  placeholder="0x…"
                  autocomplete="off"
                />
                <p class="ct-micro ct-quiet ct-gap-b0">
                  Whoever you name earns {{ formatBps(store.feeParams.referralBps) }} of the
                  platform fee as an on-chain rebate. Left blank, that slice stays with the treasury.
                  Your own address works too.
                </p>
              </div>

              <button class="ct-btn ct-btn-primary ct-btn-wide" :disabled="!canBuy" @click="handleBuy()">
                <span v-if="store.submitting" class="ct-pulse" />
                {{ buyLabel }}
              </button>

              <p v-if="disabledReason" class="ct-micro ct-warn ct-gap-t2 ct-gap-b0">
                {{ disabledReason }}
              </p>
              <p v-else class="ct-micro ct-quiet ct-gap-t2 ct-gap-b0">
                Buying mints real SPL shares to your wallet in the same transaction.
              </p>

              <div v-if="formError" class="ct-callout ct-callout-bad ct-gap-t2">
                <div class="ct-fill">{{ formError }}</div>
              </div>
              <div v-if="formSuccess" class="ct-callout ct-callout-good ct-gap-t2">
                <div class="ct-fill">{{ formSuccess }}</div>
              </div>

              <div v-if="!wallet.isConnected || wallet.isWrongChain" class="ct-gap-t2">
                <ConnectPrompt
                  compact
                  message="Connect your wallet to buy fractions of this artwork."
                />
              </div>

              <template v-if="store.lastTx">
                <div class="ct-seam" />
                <div class="ct-line ct-micro">
                  <span class="ct-quiet">{{ store.lastTx?.label }}</span>
                  <span class="ct-inline" style="gap: 8px">
                    <span class="ct-tag" :class="lastTxBadge">{{ store.lastTx?.status }}</span>
                    <a
                      v-if="store.lastTx?.explorerUrl"
                      :href="store.lastTx?.explorerUrl"
                      target="_blank"
                      rel="noreferrer noopener"
                      class="ct-mono"
                    >
                      {{ (store.lastTx?.hash ?? "").slice(0, 10) }}…
                    </a>
                  </span>
                </div>
                <p v-if="store.lastTx?.message" class="ct-micro ct-bad ct-gap-b0 ct-gap-t2">
                  {{ store.lastTx?.message }}
                </p>
              </template>
            </div>

            <!-- Fee breakdown -->
            <div class="ct-slab">
              <h3 class="ct-gap-b1">Where your money goes</h3>
              <p class="ct-copy ct-gap-b2">
                The exact split of the quote above, using the parameters published by
                <span class="ct-mono">ArtworkVault</span> and <span class="ct-mono">FeeRouter</span> at
                this moment.
              </p>

              <p v-if="!hasQuote" class="ct-copy ct-quiet ct-gap-b0">
                Enter an amount of shares to see the split, including how much of your purchase
                lands in the mining reward reserve.
              </p>

              <template v-else>
                <div class="ct-line ct-copy">
                  <span>Cost (convex curve total)</span>
                  <strong class="ct-num">{{ fmt(breakdown.cost) }} {{ artwork.paymentSymbol }}</strong>
                </div>

                <div class="ct-seam" />

                <div class="ct-line ct-copy">
                  <span>
                    Platform fee ({{ formatBps(store.feeParams.platformFeeBps) }} of cost)
                  </span>
                  <span class="ct-num">{{ fmt(breakdown.fee) }}</span>
                </div>
                <div class="ct-line ct-copy ct-split-line">
                  <span class="ct-muted">→ Mining reward reserve</span>
                  <span class="ct-num ct-good">{{ fmt(breakdown.mining) }}</span>
                </div>
                <div v-if="breakdown.hasReferrer" class="ct-line ct-copy ct-split-line">
                  <span class="ct-muted">→ Referrer rebate</span>
                  <span class="ct-num">{{ fmt(breakdown.referral) }}</span>
                </div>
                <div class="ct-line ct-copy ct-split-line">
                  <span class="ct-muted">
                    → Treasury ({{ breakdown.hasReferrer ? "fee remainder" : "unclaimed referral slice + remainder" }})
                  </span>
                  <span class="ct-num">{{ fmt(breakdown.feeTreasury) }}</span>
                </div>

                <div class="ct-line ct-copy ct-gap-t2">
                  <span>
                    Artist proceeds ({{ formatBps(artistProceedsBps) }} of cost)
                  </span>
                  <span class="ct-num">{{ fmt(breakdown.artistProceeds) }}</span>
                </div>
                <div class="ct-line ct-copy ct-split-line">
                  <span class="ct-muted">
                    → Artist payout ({{ formatBps(store.feeParams.artistShareBps) }})
                  </span>
                  <span class="ct-num">{{ fmt(breakdown.artistPayout) }}</span>
                </div>
                <div class="ct-line ct-copy ct-split-line">
                  <span class="ct-muted">→ Treasury (proceeds remainder)</span>
                  <span class="ct-num">{{ fmt(breakdown.proceedsTreasury) }}</span>
                </div>

                <div class="ct-seam" />

                <div class="ct-line ct-copy">
                  <span class="ct-quiet">Treasury total</span>
                  <span class="ct-num">{{ fmt(breakdown.treasury) }} {{ artwork.paymentSymbol }}</span>
                </div>

                <div class="ct-callout ct-callout-good ct-gap-t2">
                  <div class="ct-fill">
                    This purchase commits
                    <strong>{{ fmt(breakdown.mining) }} {{ artwork.paymentSymbol }}</strong> of
                    mining reward budget — {{ formatBps(store.feeParams.miningShareBps) }} of the
                    platform fee, routed through <span class="ct-mono">FeeRouter.payTokenFee</span> into
                    <span class="ct-mono">MiningPool</span> and streamed to stakers block by block.
                    Buying art is how this protocol pays its miners.
                  </div>
                </div>

                <p class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2">
                  The artist's proceeds are paid from the vault; only the platform fee travels
                  through the router, which is why the mining contribution is a slice of the fee
                  rather than of the whole cost.
                </p>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Position, settlement, contracts ────────────────────────────── -->
      <section class="ct-plate" aria-label="Position and settlement">
        <div class="ct-gutter">
          <div class="ct-grid ct-split">
            <div class="ct-slab">
              <h3 class="ct-gap-b2">Your position</h3>

              <p v-if="!wallet.isConnected" class="ct-copy ct-gap-b0">
                Connect a wallet to see how many fractions you hold in this artwork.
              </p>

              <template v-else>
                <div class="ct-line ct-copy">
                  <span class="ct-quiet">Shares held</span>
                  <span class="ct-num">
                    {{ formatUnits(artwork.userShares, SHARE_DECIMALS, { maxFractionDigits: 4 }) }}
                  </span>
                </div>
                <div class="ct-line ct-copy">
                  <span class="ct-quiet">Share of the artwork</span>
                  <span class="ct-num">{{ holdingPercent }}%</span>
                </div>
                <div class="ct-line ct-copy">
                  <span class="ct-quiet">Value at the marginal price</span>
                  <span class="ct-num">
                    {{ formatUnits(holdingValue, artwork.paymentDecimals, { maxFractionDigits: 2 }) }}
                    {{ artwork.paymentSymbol }}
                  </span>
                </div>
                <div class="ct-seam" />
                <p class="ct-micro ct-quiet ct-gap-b0">
                  Read from the vault's own purchase ledger
                  (<span class="ct-mono">sharesOf</span>) — the same number the certificate redemption
                  check uses. The curve prices each additional share at
                  {{ formatUnits(artwork.snapshot.marginalPrice, artwork.paymentDecimals, { maxFractionDigits: 6 }) }}
                  {{ artwork.paymentSymbol }}, so a larger block pushes the price up for everyone
                  after you.
                </p>

                <div v-if="holdsEverything" class="ct-callout ct-callout-good ct-gap-t2">
                  <div class="ct-fill">
                    You hold all
                    {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} shares of this artwork —                     the whole piece, on-chain.
                  </div>
                </div>
              </template>
            </div>

            <div class="ct-slab">
              <div class="ct-line ct-gap-b2">
                <h3 class="ct-gap-b0">Settlement &amp; certificate</h3>
                <span class="ct-tag" :class="{ 'ct-tag-warn': artwork.snapshot.settled }">
                  {{ artwork.snapshot.settled ? "settled" : "in custody" }}
                </span>
              </div>

              <p class="ct-copy">
                Fractions trade while the physical piece stays with its custodian
                (<span class="ct-mono">{{ shortAddress(artwork.custodian) }}</span>). Delivery or a
                custody transfer is confirmed by the custodian — or by protocol governance — calling
                <span class="ct-mono">settleArtwork(id, deliveryProofURI)</span>. Settlement does not
                close primary sales; it unlocks redemption.
              </p>
              <p class="ct-copy">
                Once settled, a single wallet holding every one of the
                {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} shares can call
                <span class="ct-mono">redeemCertificate(id)</span> and receive the ERC-721 provenance
                certificate that the vault minted to the custodian at registration — the on-chain
                claim on the physical artwork.
              </p>

              <div class="ct-callout ct-callout-info">
                <div class="ct-fill">
                  The certificate is an ERC-721 issued by the vault itself, so it has no separate
                  contract: token <span class="ct-mono">#{{ artwork.certificateId.toString() }}</span>
                  at <span class="ct-mono">{{ shortAddress(ADDRESSES.artworkVault) }}</span>.
                  <template v-if="artwork.snapshot.settled">
                    This artwork is settled.
                  </template>
                  <template v-else>
                    It stays with the custodian until settlement.
                  </template>
                </div>
              </div>

              <template v-if="holdsEverything && artwork.snapshot.settled">
                <button class="ct-btn ct-btn-good ct-btn-wide ct-gap-t2" :disabled="!canRedeem" @click="handleRedeem()">
                  <span v-if="store.submitting" class="ct-pulse" />
                  Redeem provenance certificate
                </button>
                <p v-if="!canRedeem && writeBlockedReason" class="ct-micro ct-warn ct-gap-t2 ct-gap-b0">
                  {{ writeBlockedReason }}
                </p>
              </template>

              <p
                v-else-if="holdsEverything && !artwork.snapshot.settled"
                class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2"
              >
                You already hold every share. Redemption opens as soon as the custodian settles the
                artwork.
              </p>

              <p v-else class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2">
                Redemption needs 100% of the shares in one wallet. Every fraction you buy brings that
                closer.
              </p>

              <div v-if="redeemError" class="ct-callout ct-callout-bad ct-gap-t2">
                <div class="ct-fill">{{ redeemError }}</div>
              </div>
              <div v-if="redeemSuccess" class="ct-callout ct-callout-good ct-gap-t2">
                <div class="ct-fill">{{ redeemSuccess }}</div>
              </div>

              <template v-if="isCustodian && !artwork.snapshot.settled">
                <div class="ct-seam" />
                <div class="ct-field ct-gap-b2">
                  <label class="ct-field-label" for="delivery-proof">
                    Delivery proof URI — you are the custodian
                  </label>
                  <input
                    id="delivery-proof"
                    v-model="deliveryProof"
                    class="ct-field-input"
                    type="text"
                    placeholder="ipfs://…"
                    autocomplete="off"
                  />
                </div>
                <button class="ct-btn ct-btn-wide" :disabled="!canSettle" @click="handleSettle()">
                  <span v-if="store.submitting" class="ct-pulse" />
                  Settle artwork
                </button>
                <p v-if="!canSettle" class="ct-micro ct-warn ct-gap-t2 ct-gap-b0">
                  {{ writeBlockedReason || "Add a delivery proof URI before settling." }}
                </p>
                <div v-if="settleError" class="ct-callout ct-callout-bad ct-gap-t2">
                  <div class="ct-fill">{{ settleError }}</div>
                </div>
                <div v-if="settleSuccess" class="ct-callout ct-callout-good ct-gap-t2">
                  <div class="ct-fill">{{ settleSuccess }}</div>
                </div>
              </template>
            </div>
          </div>

          <!-- Contracts -->
          <div class="ct-slab ct-gap-t3">
            <h3 class="ct-gap-b2">Contracts and counterparties</h3>
            <div class="ct-stack ct-stack-tight">
              <div v-for="row in addressRows" :key="row.label" class="ct-line ct-copy ct-row">
                <span class="ct-quiet">{{ row.label }}</span>
                <span class="ct-inline" style="gap: 8px">
                  <a
                    v-if="addressHref(row.address)"
                    :href="addressHref(row.address)"
                    target="_blank"
                    rel="noreferrer noopener"
                    class="ct-mono ct-micro"
                  >
                    {{ shortAddress(row.address) }}
                  </a>
                  <span v-else class="ct-mono ct-micro">{{ shortAddress(row.address) }}</span>
                  <span class="ct-micro ct-quiet">{{ row.note }}</span>
                </span>
              </div>
            </div>
            <p class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2">
              Every artwork gets its own ERC-20 share token, deployed by the vault at registration.
              Fractions are real SPL tokens: they can be held or transferred like any other token
              while the sale is open.
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
