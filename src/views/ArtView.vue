<script setup lang="ts">
/**
 * Marketplace: every vaulted artwork as a catalogue entry in the registry ledger, priced straight
 * from the bonding curve.
 */
import { onMounted, watch } from "vue";
import { RouterLink } from "vue-router";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import { TARGET_CHAIN } from "@/config/chain";
import {
  SHARE_DECIMALS,
  WHOLE_SHARES_PER_ARTWORK,
  useArtworksStore,
  type ArtworkView,
} from "@/stores/artworks";
import { useWalletStore } from "@/stores/wallet";
import { formatBps, formatUnits, timeAgo } from "@/utils/format";

const store = useArtworksStore();
const wallet = useWalletStore();

onMounted(() => {
  void store.refresh();
});

// Holdings are read per address, so re-read the page when the wallet connects or switches.
watch(
  () => wallet.address,
  () => void store.refresh(),
);

/** Compact, readable preview of an artwork's metadata pointer (IPFS CID or document URI). */
function uriPreview(uri: string): string {
  const trimmed = (uri || "").trim();
  if (!trimmed) return "no metadata pointer";
  if (trimmed.length <= 44) return trimmed;
  return `${trimmed.slice(0, 26)}…${trimmed.slice(-14)}`;
}

/** Progress bar width for the sale, as a CSS percentage. */
function soldWidth(art: ArtworkView): string {
  return `${store.soldFraction(art.snapshot) * 100}%`;
}

/** Shares sold as a whole number, without locale separators breaking anything downstream. */
function soldShares(art: ArtworkView): string {
  return formatUnits(art.snapshot.sharesSold, SHARE_DECIMALS, { maxFractionDigits: 0 });
}
</script>

<template>
  <div class="ct-route ct-route-art">
    <!-- ── Opening entry ─────────────────────────────────────────────────── -->
    <section class="ct-billboard" aria-label="Collection statement">
      <div>
        <p class="ct-eyebrow">
          <span class="ct-tag ct-tag-accent">{{ TARGET_CHAIN.shortName }}</span>
          <span>
            Vaulted physical art ·
            {{ store.loading && store.total === 0 ? "reading the registry…" : `${store.total} registered` }}
          </span>
        </p>

        <h1>Buy the art. Fund the mining.</h1>

        <p class="ct-standfirst">
          Each artwork is a physical piece held by a custodian and split into exactly
          {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} ERC-20 fractions. Shares are priced
          on a linear bonding curve, so the price rises as the artwork sells and each purchase
          carries a platform fee that funds the mining reward reserve.
        </p>
      </div>

      <div class="ct-actions">
        <RouterLink to="/mine" class="ct-btn ct-btn-primary">Mine the fees</RouterLink>
        <RouterLink to="/docs" class="ct-btn ct-btn-quiet">How the split works</RouterLink>
      </div>
    </section>

    <!-- ── Registry: ruled catalogue entries, not cards ──────────────────── -->
    <section class="ct-band ct-registry" aria-label="Artwork registry">
      <div class="ct-band-head">
        <div>
          <h2 class="ct-gap-b1">On the vault shelf</h2>
          <p class="ct-gap-b0 ct-copy">
            Read live from <span class="ct-mono">ArtworkVault</span> — supply, curve price and your
            own holding, with no backend in between.
          </p>
        </div>
        <button class="ct-btn ct-btn-small" :disabled="store.loading" @click="store.refresh()">
          <span v-if="store.loading" class="ct-pulse" />
          Refresh
        </button>
      </div>

      <!-- The protocol's whole point, stated where the money is spent. -->
      <div class="ct-callout ct-callout-info">
        <div class="ct-fill">
          Every primary purchase charges a platform fee of
          <strong>{{ formatBps(store.feeParams.platformFeeBps) }}</strong>, routed through
          <span class="ct-mono">FeeRouter</span>:
          <strong>{{ formatBps(store.feeParams.miningShareBps) }}</strong> of that fee goes into
          the mining reward reserve, an optional referrer earns
          <strong>{{ formatBps(store.feeParams.referralBps) }}</strong>, and the remainder reaches
          the treasury alongside the artist's proceeds.
          <strong>Buying art is what pays the miners.</strong>
        </div>
      </div>

      <div v-if="store.error" class="ct-callout ct-callout-bad">
        <div class="ct-fill">{{ store.error }}</div>
      </div>

      <!-- ConnectPrompt renders nothing once connected to the right chain, so gate the wrapper. -->
      <div v-if="!wallet.isConnected || wallet.isWrongChain">
        <ConnectPrompt
          message="Connect your wallet to buy fractions, follow your holding and redeem the provenance certificate."
        />
      </div>

      <!-- Loading skeletons -->
      <div v-if="store.loading && !store.artworks.length" class="ct-grid-four">
        <div v-for="n in 4" :key="n" class="ct-slab">
          <div class="ct-skeleton ct-gap-b2" style="width: 32%; height: 0.8em" />
          <div class="ct-skeleton ct-gap-b2" style="width: 65%; height: 1.4em" />
          <div class="ct-skeleton ct-gap-b3" style="width: 45%" />
          <div class="ct-skeleton" style="height: 7px" />
        </div>
      </div>

      <!-- Empty registry -->
      <div v-else-if="!store.artworks.length" class="ct-empty">
        <h3>No artworks are vaulted yet</h3>
        <p class="ct-copy">
          The vault's registry is empty. Artworks are registered on-chain by protocol governance
          through <span class="ct-mono">registerArtwork</span>, which is deliberately not a
          self-serve action: governance must first be satisfied that a custody agreement and an
          appraisal are genuine. Registration then mints
          {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} ERC-20 fractions plus an ERC-721
          provenance certificate for the custodian, and opens the bonding-curve sale.
        </p>
        <p class="ct-copy ct-gap-b0">
          Once a piece is registered it appears here and the sale itself is permissionless — any
          wallet can buy fractions at the curve price.
        </p>
        <div class="ct-inline ct-gap-t2">
          <button class="ct-btn ct-btn-small" :disabled="store.loading" @click="store.refresh()">
            <span v-if="store.loading" class="ct-pulse" />
            Check again
          </button>
          <RouterLink to="/docs" class="ct-btn ct-btn-small ct-btn-quiet">Read the mechanics</RouterLink>
        </div>
      </div>

      <!-- Catalogue entries -->
      <template v-else>
        <div class="ct-lot-list">
          <RouterLink
            v-for="art in store.artworks"
            :key="art.id"
            :to="`/art/${art.id}`"
            class="ct-lot"
          >
            <div class="ct-lot-head">
              <div class="ct-lot-name">
                <div class="ct-inline">
                  <span v-if="art.snapshot.active" class="ct-tag ct-tag-good">active</span>
                  <span v-if="art.snapshot.settled" class="ct-tag ct-tag-warn">settled</span>
                  <span v-if="!art.snapshot.active && !art.snapshot.settled" class="ct-tag">
                    paused
                  </span>
                  <span class="ct-micro ct-quiet">{{ timeAgo(art.createdAt) }}</span>
                </div>

                <h3 class="ct-gap-b1">{{ art.title || `Artwork #${art.id}` }}</h3>
                <p class="ct-lot-artist ct-gap-b1">{{ art.artist || "Unattributed" }}</p>
                <div class="ct-lot-meta ct-mono ct-micro ct-quiet">{{ uriPreview(art.metadataURI) }}</div>
              </div>

              <div class="ct-meter ct-lot-meter">
                <div class="ct-meter-fill" :style="{ width: soldWidth(art) }" />
              </div>
            </div>

            <dl class="ct-lot-spec">
              <div class="ct-lot-cell">
                <dt class="ct-label">Appraised value</dt>
                <dd class="ct-num">${{ formatUnits(art.appraisedValueUSD, 0) }}</dd>
              </div>
              <div class="ct-lot-cell ct-right">
                <dt class="ct-label">Marginal price</dt>
                <dd class="ct-num">
                  {{ formatUnits(art.snapshot.marginalPrice, art.paymentDecimals, { maxFractionDigits: 4 }) }}
                  <span class="ct-micro ct-quiet">{{ art.paymentSymbol }}</span>
                </dd>
              </div>
              <div class="ct-lot-cell">
                <dt class="ct-label">Sold</dt>
                <dd class="ct-num">
                  {{ soldShares(art) }} / {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }}
                  ({{ (store.soldFraction(art.snapshot) * 100).toFixed(2) }}%)
                </dd>
              </div>
              <div class="ct-lot-cell">
                <dt class="ct-label">Next share costs</dt>
                <dd class="ct-num">
                  {{ formatUnits(art.snapshot.nextShareCost, art.paymentDecimals, { maxFractionDigits: 6 }) }}
                  {{ art.paymentSymbol }}
                </dd>
              </div>
              <div v-if="wallet.isConnected" class="ct-lot-cell">
                <dt class="ct-label">Your holding</dt>
                <dd class="ct-num">
                  {{ formatUnits(art.userShares, SHARE_DECIMALS, { maxFractionDigits: 2 }) }} shares
                </dd>
              </div>
            </dl>
          </RouterLink>
        </div>

        <div class="ct-row ct-gap-t3">
          <span class="ct-micro ct-quiet">
            Showing {{ store.artworks.length }} of {{ store.total }} artworks
          </span>
          <button
            v-if="store.hasMore"
            class="ct-btn ct-btn-small"
            :disabled="store.loadingMore"
            @click="store.loadMore()"
          >
            <span v-if="store.loadingMore" class="ct-pulse" />
            Load more
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
