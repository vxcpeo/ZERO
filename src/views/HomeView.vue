<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import PosterFigure from "@/components/poster/PosterFigure.vue";
import TxFeed from "@/components/TxFeed.vue";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { TARGET_CHAIN } from "@/config/chain";
import { formatBps, formatUnits } from "@/utils/format";

const protocol = useProtocolStore();
const wallet = useWalletStore();

const budget = computed(() =>
  protocol.reserve
    ? formatUnits(protocol.reserve.unspent, protocol.rewardDecimals, { maxFractionDigits: 2 })
    : "—",
);

const lifetimeMined = computed(() =>
  formatUnits(protocol.totalRewardsClaimed, protocol.rewardDecimals, { maxFractionDigits: 2 }),
);

const perBlock = computed(() =>
  protocol.emissionPerBlock > 0 ? protocol.emissionPerBlock.toFixed(4) : "0",
);

const topPools = computed(() => protocol.pools.slice(0, 2));
</script>

<template>
  <div class="po-route po-route-home">
    <!-- ── Overture: the proposition, printed as a poster cover ─────────────── -->
    <section class="po-overture" aria-label="Opening statement">
      <div class="po-gutter po-overture-grid">
        <div class="po-overture-copy">
          <p class="po-kicker">
            <span class="po-tag po-tag-accent">{{ TARGET_CHAIN.shortName }}</span>
            <span>Fee-funded mining · fractional art</span>
          </p>

          <h1>Own a share of the art. Mine the fees it earns.</h1>

          <p class="po-standfirst">
            Tessella vaults physical artworks on BNB Smart Chain and sells them as
            one million ERC-20 fractions each. Every purchase pays a platform fee — and that fee is
            not pocketed. It is streamed back to the people who stake, block by block, from the
            contract that collected it.
          </p>

          <div v-if="wallet.isConnected" class="po-callout po-callout-info po-gap-t3">
            Connected as <span class="po-mono">{{ wallet.shortAddress }}</span> —
            <RouterLink to="/dashboard">open your dashboard</RouterLink> to see positions and
            claimable rewards.
          </div>
        </div>

        <div class="po-overture-margin">
          <hr class="po-margin-rule" aria-hidden="true" />
          <div class="po-actions">
            <RouterLink to="/mine" class="po-button po-button-primary">Start mining</RouterLink>
            <RouterLink to="/art" class="po-button">Browse artworks</RouterLink>
            <RouterLink to="/docs" class="po-button po-button-quiet">Read the mechanics</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Tally: the live protocol state, as a horizontal figure rail ──────── -->
    <section class="po-plate po-plate--peach po-tally" aria-label="Live from the contract">
      <div class="po-gutter">
        <div class="po-plate-head">
          <div>
            <h2 class="po-gap-b1">Live from the contract</h2>
            <p class="po-copy">
              Read directly from <span class="po-mono">MiningPool</span> on every refresh — no
              backend, no cached numbers.
            </p>
          </div>
          <button class="po-button po-button-small" :disabled="protocol.loading" @click="protocol.refresh()">
            <span v-if="protocol.loading" class="po-pulse" />
            Refresh
          </button>
        </div>

        <div class="po-figures po-gallery" role="group" aria-label="Live from the contract figures" tabindex="0">
          <PosterFigure
            label="Unspent mining budget"
            :value="`${budget}`"
            :unit="protocol.rewardSymbol"
            sub="fees committed, not yet paid out"
            accent
          />
          <PosterFigure
            label="Emission rate"
            :value="perBlock"
            :unit="`${protocol.rewardSymbol}/block`"
            sub="re-priced on every fee deposit"
          />
          <PosterFigure
            label="Lifetime mined"
            :value="lifetimeMined"
            :unit="protocol.rewardSymbol"
            sub="claimed by stakers, net of harvest fee"
          />
          <PosterFigure
            label="Miners"
            :value="protocol.totalMiners.toString()"
            sub="distinct wallets that have staked"
          />
        </div>

        <div
          v-if="protocol.reserve && protocol.reserve.reserve > 0n"
          class="po-release"
        >
          <div class="po-line po-copy po-gap-b1">
            <span class="po-quiet">Budget released to stakers</span>
            <span class="po-num">
              {{ (protocol.emissionProgress * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="po-meter">
            <div class="po-meter-fill" :style="{ width: `${protocol.emissionProgress * 100}%` }" />
          </div>
          <p class="po-micro po-quiet po-gap-b0 po-gap-t2">
            Released {{ formatUnits(protocol.reserve.released, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            of {{ formatUnits(protocol.reserve.reserve, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            {{ protocol.rewardSymbol }}. Contract-level invariant:
            <span class="po-mono">released ≤ reserve</span>, so the pool can never pay out more than
            it received.
          </p>
        </div>
      </div>
    </section>

    <!-- ── The loop: four full-width poster scenes ──────────────────────────── -->
    <section class="po-plate po-plate--ink" aria-label="The loop">
      <div class="po-gutter">
        <div class="po-plate-head">
          <div>
            <h2 class="po-gap-b1">The loop</h2>
            <p>
              Four steps, all enforced by code rather than by a treasury promise.
            </p>
          </div>
        </div>

        <div class="po-loop">
          <article class="po-step">
            <p class="po-step-tag"><span class="po-tag po-tag-accent">Step 1</span></p>
            <div class="po-step-copy">
              <h3>Art is vaulted and split</h3>
              <p class="po-copy">
                Governance registers a physical artwork with a custodian and an appraisal. The vault
                mints one million ERC-20 fractions and an ERC-721 provenance certificate, then opens
                a bonding-curve sale. Prices rise as the artwork sells, so early buyers pay less.
              </p>
            </div>
          </article>

          <article class="po-step">
            <p class="po-step-tag"><span class="po-tag po-tag-accent">Step 2</span></p>
            <div class="po-step-copy">
              <h3>Every purchase pays a fee</h3>
              <p class="po-copy">
                A primary purchase charges
                <strong>{{ formatBps(protocol.params.platformFeeBps) }}</strong> of the cost. The fee
                goes to <span class="po-mono">FeeRouter</span>, which splits it
                <strong>{{ formatBps(protocol.params.miningShareBps) }}</strong> to mining,
                <strong>{{ formatBps(protocol.params.referralBps) }}</strong> to the referrer and the
                rest to the treasury.
              </p>
            </div>
          </article>

          <article class="po-step">
            <p class="po-step-tag"><span class="po-tag po-tag-accent">Step 3</span></p>
            <div class="po-step-copy">
              <h3>Stakers mine that fee</h3>
              <p class="po-copy">
                The mining share lands in <span class="po-mono">MiningPool</span> as a reward budget.
                The pool streams it to stakers over a halving schedule
                ({{ protocol.params.emissionHalvingDays.toFixed(0) }}-day default period) in
                proportion to stake weight. Rewards are paid in
                {{ protocol.rewardSymbol }}, the same asset the fees were charged in.
              </p>
            </div>
          </article>

          <article class="po-step">
            <p class="po-step-tag"><span class="po-tag po-tag-accent">Step 4</span></p>
            <div class="po-step-copy">
              <h3>Claim, or compound</h3>
              <p class="po-copy">
                Claim any time, or use <span class="po-mono">harvestAndRestake</span> to fold rewards
                straight back into your position. A
                <strong>{{ formatBps(protocol.params.harvestFeeBps) }}</strong> harvest fee is
                recycled into the reserve rather than removed — claimers extend everyone's runway.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Pools: paired poster plates ─────────────────────────────────────── -->
    <section v-if="topPools.length" class="po-plate" aria-label="Mining pools">
      <div class="po-gutter">
        <div class="po-plate-head">
          <div>
            <h2>Mining pools</h2>
          </div>
        </div>

        <div class="po-pool-list">
          <article v-for="pool in topPools" :key="pool.id" class="po-pool">
            <div class="po-pool-head">
              <strong>{{ pool.name }}</strong>
              <span class="po-tag po-tag-accent">{{ pool.allocationPoints.toString() }} pts</span>
            </div>
            <div class="po-split">
              <div>
                <div class="po-label">Total staked</div>
                <div class="po-pool-figure">
                  {{ formatUnits(pool.totalStaked, pool.decimals, { maxFractionDigits: 2 }) }}
                  {{ pool.symbol }}
                </div>
              </div>
              <div>
                <div class="po-label">Lock</div>
                <div class="po-pool-figure">
                  {{ Number(pool.lockDuration) === 0 ? "None" : `${pool.lockDuration} blocks` }}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Wallet scene: activity beside the position summary ──────────────── -->
    <section v-if="wallet.isConnected" class="po-plate" aria-label="Your position">
      <div class="po-gutter po-split">
        <TxFeed />
        <div class="po-slab">
          <h3>Your position at a glance</h3>
          <div class="po-stack-tight po-gap-t2">
            <div v-for="pool in protocol.pools" :key="pool.id" class="po-line po-copy">
              <span class="po-quiet">{{ pool.name }}</span>
              <span class="po-num">
                {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 2 }) }}
                {{ pool.symbol }}
              </span>
            </div>
          </div>
          <hr class="po-seam" />
          <div class="po-line">
            <span class="po-quiet po-copy">Claimable</span>
            <strong class="po-good po-num">
              {{ formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 4 }) }}
              {{ protocol.rewardSymbol }}
            </strong>
          </div>
          <RouterLink to="/dashboard" class="po-button po-button-primary po-button-wide po-gap-t2">Open dashboard</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
