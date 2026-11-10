<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import FigureSlab from "@/components/gallery/FigureSlab.vue";
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
  <div class="pt-route">
    <!-- ── Scene 1: the proposition, set as the opening poster ─────────────── -->
    <section class="pt-scene pt-scene--open" aria-label="Opening statement">
      <div class="pt-spread pt-open">
        <div class="pt-open-main">
          <p class="pt-kicker">
          <span class="pt-tag pt-tag--accent">{{ TARGET_CHAIN.shortName }}</span>
          <span>Fee-funded mining · fractional art</span>
        </p>

        <h1>Own a share of the art. Mine the fees it earns.</h1>

        <p class="pt-standfirst">
          Cimela vaults physical artworks on Solana and sells them as
          one million ERC-20 fractions each. Every purchase pays a platform fee — and that fee is
          not pocketed. It is streamed back to the people who stake, block by block, from the
          contract that collected it.
        </p>

        <div v-if="wallet.isConnected" class="pt-callout pt-callout--info pt-gap-t3">
          Connected as <span class="pt-mono">{{ wallet.shortAddress }}</span> —
          <RouterLink to="/dashboard">open your dashboard</RouterLink> to see positions and
          claimable rewards.
        </div>

        <div class="pt-open-actions">
          <RouterLink to="/mine" class="pt-btn pt-btn--solid">Start mining</RouterLink>
          <RouterLink to="/art" class="pt-btn">Browse artworks</RouterLink>
          <RouterLink to="/docs" class="pt-btn pt-btn--quiet">Read the mechanics</RouterLink>
        </div>
        </div>

        <div class="pt-open-art" aria-hidden="true"></div>
      </div>
    </section>

    <!-- ── Scene 2: live protocol state as a snap rail of figures ──────────── -->
    <section class="pt-scene pt-scene--wash" aria-label="Live from the contract">
      <div class="pt-spread">
        <div class="pt-scene-head">
          <div>
            <h2>Live from the contract</h2>
            <p class="pt-copy">
              Read directly from <span class="pt-mono">MiningPool</span> on every refresh — no
              backend, no cached numbers.
            </p>
          </div>
          <button class="pt-btn pt-btn--small" :disabled="protocol.loading" @click="protocol.refresh()">
            <span v-if="protocol.loading" class="pt-pulse" />
            Refresh
          </button>
        </div>

        <div class="pt-rail pt-rail--figures" role="group" aria-label="Live from the contract figures" tabindex="0">
          <FigureSlab
            label="Unspent mining budget"
            :value="`${budget}`"
            :unit="protocol.rewardSymbol"
            sub="fees committed, not yet paid out"
            accent
          />
          <FigureSlab
            label="Emission rate"
            :value="perBlock"
            :unit="`${protocol.rewardSymbol}/block`"
            sub="re-priced on every fee deposit"
          />
          <FigureSlab
            label="Lifetime mined"
            :value="lifetimeMined"
            :unit="protocol.rewardSymbol"
            sub="claimed by stakers, net of harvest fee"
          />
          <FigureSlab
            label="Miners"
            :value="protocol.totalMiners.toString()"
            sub="distinct wallets that have staked"
          />
        </div>

        <div v-if="protocol.reserve && protocol.reserve.reserve > 0n" class="pt-gap-t3">
          <div class="pt-row pt-copy pt-gap-b1">
            <span class="pt-quiet">Budget released to stakers</span>
            <span class="pt-num">
              {{ (protocol.emissionProgress * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="pt-meter">
            <div class="pt-meter-fill" :style="{ width: `${protocol.emissionProgress * 100}%` }" />
          </div>
          <p class="pt-note pt-quiet pt-gap-b0 pt-gap-t2">
            Released {{ formatUnits(protocol.reserve.released, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            of {{ formatUnits(protocol.reserve.reserve, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            {{ protocol.rewardSymbol }}. Contract-level invariant:
            <span class="pt-mono">released ≤ reserve</span>, so the pool can never pay out more than
            it received.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Scene 3: the loop, four numbered posters on an ink ground ───────── -->
    <section class="pt-scene pt-scene--ink" aria-label="The loop">
      <div class="pt-spread">
        <div class="pt-scene-head">
          <div>
            <h2>The loop</h2>
            <p>
              Four steps, all enforced by code rather than by a treasury promise.
            </p>
          </div>
        </div>

        <div class="pt-rail pt-rail--steps" role="group" aria-label="The loop steps" tabindex="0">
          <article class="pt-step">
            <p class="pt-step-tag"><span class="pt-tag pt-tag--accent">Step 1</span></p>
            <div>
              <h3>Art is vaulted and split</h3>
              <p class="pt-copy">
                Governance registers a physical artwork with a custodian and an appraisal. The vault
                mints one million ERC-20 fractions and an ERC-721 provenance certificate, then opens
                a bonding-curve sale. Prices rise as the artwork sells, so early buyers pay less.
              </p>
            </div>
          </article>

          <article class="pt-step">
            <p class="pt-step-tag"><span class="pt-tag pt-tag--accent">Step 2</span></p>
            <div>
              <h3>Every purchase pays a fee</h3>
              <p class="pt-copy">
                A primary purchase charges
                <strong>{{ formatBps(protocol.params.platformFeeBps) }}</strong> of the cost. The fee
                goes to <span class="pt-mono">FeeRouter</span>, which splits it
                <strong>{{ formatBps(protocol.params.miningShareBps) }}</strong> to mining,
                <strong>{{ formatBps(protocol.params.referralBps) }}</strong> to the referrer and the
                rest to the treasury.
              </p>
            </div>
          </article>

          <article class="pt-step">
            <p class="pt-step-tag"><span class="pt-tag pt-tag--accent">Step 3</span></p>
            <div>
              <h3>Stakers mine that fee</h3>
              <p class="pt-copy">
                The mining share lands in <span class="pt-mono">MiningPool</span> as a reward budget.
                The pool streams it to stakers over a halving schedule
                ({{ protocol.params.emissionHalvingDays.toFixed(0) }}-day default period) in
                proportion to stake weight. Rewards are paid in
                {{ protocol.rewardSymbol }}, the same asset the fees were charged in.
              </p>
            </div>
          </article>

          <article class="pt-step">
            <p class="pt-step-tag"><span class="pt-tag pt-tag--accent">Step 4</span></p>
            <div>
              <h3>Claim, or compound</h3>
              <p class="pt-copy">
                Claim any time, or use <span class="pt-mono">harvestAndRestake</span> to fold rewards
                straight back into your position. A
                <strong>{{ formatBps(protocol.params.harvestFeeBps) }}</strong> harvest fee is
                recycled into the reserve rather than removed — claimers extend everyone's runway.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Scene 4: the pools, as ruled poster strips ─────────────────────── -->
    <section v-if="topPools.length" class="pt-scene" aria-label="Mining pools">
      <div class="pt-spread">
        <div class="pt-scene-head">
          <div>
            <h2>Mining pools</h2>
          </div>
        </div>

        <div>
          <article v-for="pool in topPools" :key="pool.id" class="pt-pool">
            <div class="pt-pool-head">
              <strong>{{ pool.name }}</strong>
              <span class="pt-tag pt-tag--accent">{{ pool.allocationPoints.toString() }} pts</span>
            </div>
            <div>
              <div class="pt-label">Total staked</div>
              <div class="pt-pool-figure">
                {{ formatUnits(pool.totalStaked, pool.decimals, { maxFractionDigits: 2 }) }}
                {{ pool.symbol }}
              </div>
            </div>
            <div>
              <div class="pt-label">Lock</div>
              <div class="pt-pool-figure">
                {{ Number(pool.lockDuration) === 0 ? "None" : `${pool.lockDuration} blocks` }}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Scene 5: the wallet's own position, beside its activity ────────── -->
    <section v-if="wallet.isConnected" class="pt-scene pt-scene--wash" aria-label="Your position">
      <div class="pt-spread">
        <div class="pt-spread-2">
          <TxFeed />
          <div class="pt-sheet">
            <h3>Your position at a glance</h3>
            <div class="pt-ledger pt-gap-t2">
              <div v-for="pool in protocol.pools" :key="pool.id" class="pt-ledger-row">
                <span class="pt-ledger-key">{{ pool.name }}</span>
                <span class="pt-ledger-val">
                  {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 2 }) }}
                  {{ pool.symbol }}
                </span>
                <span />
              </div>
            </div>
            <hr class="pt-seam" />
            <div class="pt-row">
              <span class="pt-quiet pt-copy">Claimable</span>
              <strong class="pt-good pt-num">
                {{ formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 4 }) }}
                {{ protocol.rewardSymbol }}
              </strong>
            </div>
            <RouterLink to="/dashboard" class="pt-btn pt-btn--solid pt-btn--wide pt-gap-t2">Open dashboard</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
