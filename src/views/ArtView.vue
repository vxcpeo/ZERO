<script setup lang="ts">
/**
 * Marketplace: every vaulted artwork as a catalogue lot, priced straight from the bonding curve.
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
  <div class="po-route po-route-art">
    <!-- ── Overture ─────────────────────────────────────────────────────── -->
    <section class="po-intro" aria-label="Collection statement">
      <div class="po-gutter">
        <p class="po-kicker">
          <span class="po-tag po-tag-accent">{{ TARGET_CHAIN.shortName }}</span>
          <span>
            Vaulted physical art ·
            {{ store.loading && store.total === 0 ? "reading the registry…" : `${store.total} registered` }}
          </span>
        </p>

        <h1>Buy the art. Fund the mining.</h1>

        <p class="po-standfirst">
          Each artwork is a physical piece held by a custodian and split into exactly
          {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} ERC-20 fractions. Shares are priced
          on a linear bonding curve, so the price rises as the artwork sells and each purchase
          carries a platform fee that funds the mining reward reserve.
        </p>

        <div class="po-actions">
          <RouterLink to="/mine" class="po-button po-button-primary">Mine the fees</RouterLink>
          <RouterLink to="/docs" class="po-button po-button-quiet">How the split works</RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Catalogue: a snap rail of poster lots ────────────────────────── -->
    <section class="po-plate po-catalogue" aria-label="Artwork registry">
      <div class="po-gutter">
        <div class="po-registry">
        <div class="po-plate-head">
          <div>
            <h2 class="po-gap-b1">On the vault shelf</h2>
            <p class="po-gap-b0 po-copy">
              Read live from <span class="po-mono">ArtworkVault</span> — supply, curve price and your
              own holding, with no backend in between.
            </p>
          </div>
          <button class="po-button po-button-small" :disabled="store.loading" @click="store.refresh()">
            <span v-if="store.loading" class="po-pulse" />
            Refresh
          </button>
        </div>

        <!-- The protocol's whole point, stated where the money is spent. -->
        <div class="po-callout po-callout-info po-gap-b3">
          <div class="po-fill">
            Every primary purchase charges a platform fee of
            <strong>{{ formatBps(store.feeParams.platformFeeBps) }}</strong>, routed through
            <span class="po-mono">FeeRouter</span>:
            <strong>{{ formatBps(store.feeParams.miningShareBps) }}</strong> of that fee goes into
            the mining reward reserve, an optional referrer earns
            <strong>{{ formatBps(store.feeParams.referralBps) }}</strong>, and the remainder reaches
            the treasury alongside the artist's proceeds.
            <strong>Buying art is what pays the miners.</strong>
          </div>
        </div>

        <div v-if="store.error" class="po-callout po-callout-bad po-gap-b3">
          <div class="po-fill">{{ store.error }}</div>
        </div>

        <!-- ConnectPrompt renders nothing once connected to the right chain, so gate the wrapper. -->
        <div v-if="!wallet.isConnected || wallet.isWrongChain" class="po-gap-b3">
          <ConnectPrompt
            message="Connect your wallet to buy fractions, follow your holding and redeem the provenance certificate."
          />
        </div>

        <!-- Loading skeletons -->
        <div v-if="store.loading && !store.artworks.length" class="po-grid-four">
          <div v-for="n in 4" :key="n" class="po-slab">
            <div class="po-skeleton po-gap-b2" style="width: 32%; height: 0.8em" />
            <div class="po-skeleton po-gap-b2" style="width: 65%; height: 1.4em" />
            <div class="po-skeleton po-gap-b3" style="width: 45%" />
            <div class="po-skeleton" style="height: 7px" />
          </div>
        </div>

        <!-- Empty registry -->
        <div v-else-if="!store.artworks.length" class="po-slab">
          <h3>No artworks are vaulted yet</h3>
          <p class="po-copy">
            The vault's registry is empty. Artworks are registered on-chain by protocol governance
            through <span class="po-mono">registerArtwork</span>, which is deliberately not a
            self-serve action: governance must first be satisfied that a custody agreement and an
            appraisal are genuine. Registration then mints
            {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} ERC-20 fractions plus an ERC-721
            provenance certificate for the custodian, and opens the bonding-curve sale.
          </p>
          <p class="po-copy po-gap-b0">
            Once a piece is registered it appears here and the sale itself is permissionless — any
            wallet can buy fractions at the curve price.
          </p>
          <div class="po-inline po-gap-t2">
            <button class="po-button po-button-small" :disabled="store.loading" @click="store.refresh()">
              <span v-if="store.loading" class="po-pulse" />
              Check again
            </button>
            <RouterLink to="/docs" class="po-button po-button-small po-button-quiet">Read the mechanics</RouterLink>
          </div>
        </div>

        <!-- Catalogue lots -->
        <template v-else>
          <div class="po-lot-rail">
            <RouterLink
              v-for="art in store.artworks"
              :key="art.id"
              :to="`/art/${art.id}`"
              class="po-lot"
            >
              <div class="po-lot-head">
                <div class="po-lot-name">
                  <div class="po-inline" style="gap: 6px">
                    <span v-if="art.snapshot.active" class="po-tag po-tag-good">active</span>
                    <span v-if="art.snapshot.settled" class="po-tag po-tag-warn">settled</span>
                    <span v-if="!art.snapshot.active && !art.snapshot.settled" class="po-tag">
                      paused
                    </span>
                    <span class="po-micro po-quiet">{{ timeAgo(art.createdAt) }}</span>
                  </div>

                  <h3 class="po-gap-b1">{{ art.title || `Artwork #${art.id}` }}</h3>
                  <p class="po-lot-artist po-gap-b1">{{ art.artist || "Unattributed" }}</p>
                  <div class="po-lot-meta po-mono po-micro po-quiet po-gap-b2">{{ uriPreview(art.metadataURI) }}</div>
                </div>

                <div class="po-meter po-lot-meter">
                  <div class="po-meter-fill" :style="{ width: soldWidth(art) }" />
                </div>
              </div>

              <dl class="po-lot-spec">
                <div class="po-lot-cell">
                  <dt class="po-label">Appraised value</dt>
                  <dd class="po-num">${{ formatUnits(art.appraisedValueUSD, 0) }}</dd>
                </div>
                <div class="po-lot-cell po-right">
                  <dt class="po-label">Marginal price</dt>
                  <dd class="po-num">
                    {{ formatUnits(art.snapshot.marginalPrice, art.paymentDecimals, { maxFractionDigits: 4 }) }}
                    <span class="po-micro po-quiet">{{ art.paymentSymbol }}</span>
                  </dd>
                </div>
                <div class="po-lot-cell">
                  <dt class="po-label">Sold</dt>
                  <dd class="po-num">
                    {{ soldShares(art) }} / {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }}
                    ({{ (store.soldFraction(art.snapshot) * 100).toFixed(2) }}%)
                  </dd>
                </div>
                <div class="po-lot-cell">
                  <dt class="po-label">Next share costs</dt>
                  <dd class="po-num">
                    {{ formatUnits(art.snapshot.nextShareCost, art.paymentDecimals, { maxFractionDigits: 6 }) }}
                    {{ art.paymentSymbol }}
                  </dd>
                </div>
                <div v-if="wallet.isConnected" class="po-lot-cell">
                  <dt class="po-label">Your holding</dt>
                  <dd class="po-num">
                    {{ formatUnits(art.userShares, SHARE_DECIMALS, { maxFractionDigits: 2 }) }} shares
                  </dd>
                </div>
              </dl>
            </RouterLink>
          </div>

          <div class="po-line po-gap-t3">
            <span class="po-micro po-quiet">
              Showing {{ store.artworks.length }} of {{ store.total }} artworks
            </span>
            <button
              v-if="store.hasMore"
              class="po-button po-button-small"
              :disabled="store.loadingMore"
              @click="store.loadMore()"
            >
              <span v-if="store.loadingMore" class="po-pulse" />
              Load more
            </button>
          </div>
        </template>
        </div>
      </div>
    </section>
  </div>
</template>
