<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import LedgerFact from "@/components/ledger/LedgerFact.vue";
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
  <div class="ct-route ct-route-home">
    <!-- ── Lede: the proposition, set as the opening entry of the ledger ────── -->
    <section class="ct-lede ct-hero" aria-label="Opening statement">
      <div>
        <p class="ct-eyebrow">
          <span class="ct-tag ct-tag-accent">{{ TARGET_CHAIN.shortName }}</span>
          <span>Fee-funded mining · fractional art</span>
        </p>

        <h1>Own a share of the art. Mine the fees it earns.</h1>

        <p class="ct-standfirst">
          Fractio vaults physical artworks on Solana and sells them as
          one million ERC-20 fractions each. Every purchase pays a platform fee — and that fee is
          not pocketed. It is streamed back to the people who stake, block by block, from the
          contract that collected it.
        </p>

        <div v-if="wallet.isConnected" class="ct-callout ct-callout-info ct-gap-t3">
          Connected as <span class="ct-mono">{{ wallet.shortAddress }}</span> —
          <RouterLink to="/dashboard">open your dashboard</RouterLink> to see positions and
          claimable rewards.
        </div>
      </div>

      <div class="ct-lede-margin">
        <hr class="ct-marginal-rule" aria-hidden="true" />
        <div class="ct-actions">
          <RouterLink to="/mine" class="ct-btn ct-btn-primary">Start mining</RouterLink>
          <RouterLink to="/art" class="ct-btn">Browse artworks</RouterLink>
          <RouterLink to="/docs" class="ct-btn ct-btn-quiet">Read the mechanics</RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Tally: live protocol state as a ledger of published figures ────── -->
    <section class="ct-band" aria-label="Live from the contract">
      <div class="ct-band-head">
        <div>
          <h2 class="ct-gap-b1">Live from the contract</h2>
          <p class="ct-copy">
            Read directly from <span class="ct-mono">MiningPool</span> on every refresh — no
            backend, no cached numbers.
          </p>
        </div>
        <button class="ct-btn ct-btn-small" :disabled="protocol.loading" @click="protocol.refresh()">
          <span v-if="protocol.loading" class="ct-pulse" />
          Refresh
        </button>
      </div>

      <div class="ct-figures" role="group" aria-label="Live from the contract figures" tabindex="0">
        <LedgerFact
          label="Unspent mining budget"
          :value="`${budget}`"
          :unit="protocol.rewardSymbol"
          sub="fees committed, not yet paid out"
          accent
        />
        <LedgerFact
          label="Emission rate"
          :value="perBlock"
          :unit="`${protocol.rewardSymbol}/block`"
          sub="re-priced on every fee deposit"
        />
        <LedgerFact
          label="Lifetime mined"
          :value="lifetimeMined"
          :unit="protocol.rewardSymbol"
          sub="claimed by stakers, net of harvest fee"
        />
        <LedgerFact
          label="Miners"
          :value="protocol.totalMiners.toString()"
          sub="distinct wallets that have staked"
        />
      </div>

      <div v-if="protocol.reserve && protocol.reserve.reserve > 0n" class="ct-gap-t3">
        <div class="ct-row ct-copy ct-gap-b1">
          <span class="ct-quiet">Budget released to stakers</span>
          <span class="ct-num">
            {{ (protocol.emissionProgress * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="ct-meter">
          <div class="ct-meter-fill" :style="{ width: `${protocol.emissionProgress * 100}%` }" />
        </div>
        <p class="ct-micro ct-quiet ct-gap-b0 ct-gap-t2">
          Released {{ formatUnits(protocol.reserve.released, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
          of {{ formatUnits(protocol.reserve.reserve, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
          {{ protocol.rewardSymbol }}. Contract-level invariant:
          <span class="ct-mono">released ≤ reserve</span>, so the pool can never pay out more than
          it received.
        </p>
      </div>
    </section>

    <!-- ── The loop: four numbered entries on the ruled ledger ────────────── -->
    <section class="ct-band" aria-label="The loop">
      <div class="ct-band-head">
        <div>
          <h2 class="ct-gap-b1">The loop</h2>
          <p>
            Four steps, all enforced by code rather than by a treasury promise.
          </p>
        </div>
      </div>

      <div class="ct-loop">
        <article class="ct-step">
          <p class="ct-step-tag"><span class="ct-tag ct-tag-accent">Step 1</span></p>
          <div class="ct-step-copy">
            <h3>Art is vaulted and split</h3>
            <p class="ct-copy">
              Governance registers a physical artwork with a custodian and an appraisal. The vault
              mints one million ERC-20 fractions and an ERC-721 provenance certificate, then opens
              a bonding-curve sale. Prices rise as the artwork sells, so early buyers pay less.
            </p>
          </div>
        </article>

        <article class="ct-step">
          <p class="ct-step-tag"><span class="ct-tag ct-tag-accent">Step 2</span></p>
          <div class="ct-step-copy">
            <h3>Every purchase pays a fee</h3>
            <p class="ct-copy">
              A primary purchase charges
              <strong>{{ formatBps(protocol.params.platformFeeBps) }}</strong> of the cost. The fee
              goes to <span class="ct-mono">FeeRouter</span>, which splits it
              <strong>{{ formatBps(protocol.params.miningShareBps) }}</strong> to mining,
              <strong>{{ formatBps(protocol.params.referralBps) }}</strong> to the referrer and the
              rest to the treasury.
            </p>
          </div>
        </article>

        <article class="ct-step">
          <p class="ct-step-tag"><span class="ct-tag ct-tag-accent">Step 3</span></p>
          <div class="ct-step-copy">
            <h3>Stakers mine that fee</h3>
            <p class="ct-copy">
              The mining share lands in <span class="ct-mono">MiningPool</span> as a reward budget.
              The pool streams it to stakers over a halving schedule
              ({{ protocol.params.emissionHalvingDays.toFixed(0) }}-day default period) in
              proportion to stake weight. Rewards are paid in
              {{ protocol.rewardSymbol }}, the same asset the fees were charged in.
            </p>
          </div>
        </article>

        <article class="ct-step">
          <p class="ct-step-tag"><span class="ct-tag ct-tag-accent">Step 4</span></p>
          <div class="ct-step-copy">
            <h3>Claim, or compound</h3>
            <p class="ct-copy">
              Claim any time, or use <span class="ct-mono">harvestAndRestake</span> to fold rewards
              straight back into your position. A
              <strong>{{ formatBps(protocol.params.harvestFeeBps) }}</strong> harvest fee is
              recycled into the reserve rather than removed — claimers extend everyone's runway.
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- ── Pools: two ruled entries beside their allocation ──────────────── -->
    <section v-if="topPools.length" class="ct-band" aria-label="Mining pools">
      <div class="ct-band-head">
        <div>
          <h2>Mining pools</h2>
        </div>
      </div>

      <div class="ct-pool-list">
        <article v-for="pool in topPools" :key="pool.id" class="ct-pool">
          <div class="ct-pool-head">
            <strong>{{ pool.name }}</strong>
            <span class="ct-tag ct-tag-accent">{{ pool.allocationPoints.toString() }} pts</span>
          </div>
          <div>
            <div class="ct-label">Total staked</div>
            <div class="ct-pool-figure">
              {{ formatUnits(pool.totalStaked, pool.decimals, { maxFractionDigits: 2 }) }}
              {{ pool.symbol }}
            </div>
          </div>
          <div>
            <div class="ct-label">Lock</div>
            <div class="ct-pool-figure">
              {{ Number(pool.lockDuration) === 0 ? "None" : `${pool.lockDuration} blocks` }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ── Wallet entry: activity beside the position summary ─────────────── -->
    <section v-if="wallet.isConnected" class="ct-band" aria-label="Your position">
      <div class="ct-split-even">
        <TxFeed />
        <div class="ct-slab">
          <h3>Your position at a glance</h3>
          <div class="ct-ledger ct-gap-t2">
            <div v-for="pool in protocol.pools" :key="pool.id" class="ct-ledger-row">
              <span class="ct-ledger-key">{{ pool.name }}</span>
              <span class="ct-ledger-val">
                {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 2 }) }}
                {{ pool.symbol }}
              </span>
              <span />
            </div>
          </div>
          <hr class="ct-seam" />
          <div class="ct-row">
            <span class="ct-quiet ct-copy">Claimable</span>
            <strong class="ct-good ct-num">
              {{ formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 4 }) }}
              {{ protocol.rewardSymbol }}
            </strong>
          </div>
          <RouterLink to="/dashboard" class="ct-btn ct-btn-primary ct-btn-wide ct-gap-t2">Open dashboard</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
