<script setup lang="ts">
/**
 * Personal dashboard: positions, claimable rewards, protocol-wide stats and a direct fee
 * payment form (the "pay a fee and fund mining yourself" path).
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import FigureSlab from "@/components/gallery/FigureSlab.vue";
import TxFeed from "@/components/TxFeed.vue";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { ADDRESSES, TARGET_CHAIN } from "@/config/chain";
import { formatBps, formatUnits, parseUnits } from "@/utils/format";
import { explorerAddressUrl } from "@/utils/tx";

const protocol = useProtocolStore();
const wallet = useWalletStore();

const feeAmount = ref("");
const feeReferrer = ref("");
const showFeePanel = ref(false);

const positions = computed(() => protocol.pools.filter((pool) => pool.user.amount > 0n));

/** Split preview computed client-side from the on-chain bps values. */
const splitPreview = computed(() => {
  try {
    const amount = parseUnits(feeAmount.value || "0", protocol.rewardDecimals);
    if (amount === 0n) return null;
    const hasReferrer = feeReferrer.value.trim().length > 0;
    const mining = (amount * BigInt(protocol.params.miningShareBps)) / 10_000n;
    const referral = hasReferrer
      ? (amount * BigInt(protocol.params.referralBps)) / 10_000n
      : 0n;
    return { amount, mining, referral, treasury: amount - mining - referral };
  } catch {
    return null;
  }
});

async function payFee(): Promise<void> {
  const ok = await protocol.payFee(feeAmount.value, feeReferrer.value);
  if (ok) feeAmount.value = "";
}

const protocolStats = computed(() => [
  {
    label: "Unspent budget",
    value: protocol.reserve
      ? formatUnits(protocol.reserve.unspent, protocol.rewardDecimals, { maxFractionDigits: 2 })
      : "—",
    unit: protocol.rewardSymbol,
  },
  {
    label: "Lifetime mined",
    value: formatUnits(protocol.totalRewardsClaimed, protocol.rewardDecimals, {
      maxFractionDigits: 2,
    }),
    unit: protocol.rewardSymbol,
  },
  { label: "Miners", value: protocol.totalMiners.toString(), unit: "" },
  {
    label: "Recycled fees",
    value: formatUnits(protocol.recycledFees, protocol.rewardDecimals, { maxFractionDigits: 4 }),
    unit: protocol.rewardSymbol,
  },
]);
</script>

<template>
  <div class="pt-route">
    <section class="pt-scene pt-scene--open" aria-label="Dashboard summary">
      <div class="pt-spread pt-billboard">
        <div>
          <h1 class="pt-gap-b1">Dashboard</h1>
          <p class="pt-gap-b0">
            Your positions on {{ TARGET_CHAIN.name }}, plus the protocol-wide state they depend on.
          </p>
        </div>
        <div class="pt-inline">
          <span v-if="protocol.lastUpdated" class="pt-note pt-quiet">
            updated {{ new Date(protocol.lastUpdated).toLocaleTimeString() }}
          </span>
          <button class="pt-btn pt-btn--small" :disabled="protocol.loading" @click="protocol.refresh()">
            <span v-if="protocol.loading" class="pt-pulse" />
            Refresh
          </button>
        </div>
      </div>
    </section>

    <!-- ── Wallet summary ───────────────────────────────────────────────── -->
    <section v-if="wallet.isConnected" class="pt-scene pt-scene--wash" aria-label="Wallet balances">
      <div class="pt-spread">
        <div class="pt-rail pt-rail--figures" role="group" aria-label="Wallet balances figures" tabindex="0">
          <FigureSlab
            label="Claimable rewards"
            :value="formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 6 })"
            :unit="protocol.rewardSymbol"
            sub="claim from the Mine page"
            accent
          />
          <FigureSlab
            :label="`${protocol.rewardSymbol} balance`"
            :value="formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 })"
            :unit="protocol.rewardSymbol"
            sub="available to stake or spend"
          />
          <FigureSlab
            label="$ART balance"
            :value="formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 })"
            unit="ART"
            sub="the fraction-ownership token"
          />
          <FigureSlab
            label="SOL balance"
            :value="wallet.solBalanceFormatted"
            unit="SOL"
            sub="for gas"
          />
        </div>
      </div>
    </section>

    <!-- ── Positions: one poster record per pool ────────────────────────── -->
    <section class="pt-scene" aria-label="Your positions">
      <div class="pt-spread pt-stack">
        <div class="pt-scene-head">
          <h2 class="pt-gap-b0">Positions</h2>
        </div>

        <ConnectPrompt class="pt-gap-b3" />

        <div v-if="!wallet.isConnected" class="pt-sheet pt-quiet">
          Connect a wallet to see your positions.
        </div>

        <div v-else-if="!positions.length" class="pt-empty">
          <p class="pt-gap-b2">You have no mining positions yet.</p>
          <RouterLink to="/mine" class="pt-btn pt-btn--solid">Stake into a pool</RouterLink>
        </div>

        <div v-else class="pt-rail pt-rail--wide">
          <article v-for="pool in positions" :key="pool.id" class="pt-sheet">
            <div class="pt-row pt-gap-b2">
              <div>
                <div class="pt-label">Pool</div>
                <strong>{{ pool.name }}</strong>
                <div class="pt-note pt-quiet pt-mono">#{{ pool.id }}</div>
              </div>
              <div class="pt-inline">
                <button
                  class="pt-btn pt-btn--small pt-btn--good"
                  :disabled="pool.pending === 0n || protocol.loading"
                  @click="protocol.harvest(pool.id)"
                >
                  Claim
                </button>
                <button
                  class="pt-btn pt-btn--small"
                  :disabled="pool.pending === 0n || protocol.loading"
                  @click="protocol.harvestAndRestake(pool.id)"
                >
                  Compound
                </button>
              </div>
            </div>

            <dl class="pt-position">
              <div class="pt-position-cell">
                <dt class="pt-label">Staked</dt>
                <dd class="pt-num">
                  {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 4 }) }}
                  {{ pool.symbol }}
                </dd>
              </div>
              <div class="pt-position-cell">
                <dt class="pt-label">Pool weight share</dt>
                <dd class="pt-num">{{ pool.shareOfWeight.toFixed(3) }}%</dd>
              </div>
              <div class="pt-position-cell">
                <dt class="pt-label">Claimable</dt>
                <dd class="pt-good pt-num">
                  {{ formatUnits(pool.pending, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </dd>
              </div>
              <div class="pt-position-cell">
                <dt class="pt-label">Lock</dt>
                <dd>
                  <span v-if="pool.locked" class="pt-tag pt-tag--warn">Locked</span>
                  <span v-else class="pt-quiet pt-note">Unlocked</span>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Fee payment ─────────────────────────────────────────────────── -->
    <section class="pt-scene pt-scene--wash" aria-label="Pay a platform fee">
      <div class="pt-spread">
        <div class="pt-sheet">
          <div class="pt-sheet-head">
            <div>
              <h3 class="pt-gap-b1">Pay a platform fee</h3>
              <p class="pt-copy pt-gap-b0">
                Anyone can send a fee through <span class="pt-mono">FeeRouter</span>. The router splits it
                on-chain and pushes the mining share straight into the reward budget, so paying a fee
                directly extends everyone's mining runway.
              </p>
            </div>
            <button class="pt-btn pt-btn--small" @click="showFeePanel = !showFeePanel">
              {{ showFeePanel ? "Hide" : "Open" }}
            </button>
          </div>

          <div v-if="showFeePanel" class="pt-stack">
            <div class="pt-field-grid">
              <div class="pt-field">
                <label class="pt-field-label" for="fee-amount">Fee amount</label>
                <div class="pt-input-row">
                  <input
                    id="fee-amount"
                    v-model="feeAmount"
                    class="pt-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                  />
                  <span class="pt-input-suffix">{{ protocol.rewardSymbol }}</span>
                </div>
              </div>
              <div class="pt-field">
                <label class="pt-field-label" for="fee-referrer">Referrer (optional)</label>
                <div class="pt-input-row">
                  <input
                    id="fee-referrer"
                    v-model="feeReferrer"
                    class="pt-input"
                    type="text"
                    placeholder="0x…"
                    spellcheck="false"
                  />
                </div>
              </div>
            </div>

            <div v-if="splitPreview" class="pt-grid-4">
              <div>
                <div class="pt-label">To mining</div>
                <div class="pt-num pt-good">
                  {{ formatUnits(splitPreview.mining, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="pt-note">{{ formatBps(protocol.params.miningShareBps) }} of the fee</div>
              </div>
              <div>
                <div class="pt-label">To referrer</div>
                <div class="pt-num">
                  {{ formatUnits(splitPreview.referral, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="pt-note">
                  {{
                    splitPreview.referral === 0n
                      ? "no referrer — falls to treasury"
                      : formatBps(protocol.params.referralBps) + " of the fee"
                  }}
                </div>
              </div>
              <div>
                <div class="pt-label">To treasury</div>
                <div class="pt-num">
                  {{ formatUnits(splitPreview.treasury, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="pt-note">remainder, so the legs always sum exactly</div>
              </div>
              <div>
                <div class="pt-label">Total fee</div>
                <div class="pt-num">
                  {{ formatUnits(splitPreview.amount, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="pt-note">requires an approval to the router</div>
              </div>
            </div>

            <div class="pt-row">
              <button
                class="pt-btn pt-btn--accent"
                :disabled="
                  !wallet.isConnected || wallet.isWrongChain || protocol.loading || !feeAmount.trim()
                "
                @click="payFee"
              >
                Pay fee through the router
              </button>
              <span v-if="!wallet.isConnected" class="pt-note pt-quiet">
                Connect a wallet to continue.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Protocol stats + activity ────────────────────────────────────── -->
    <section class="pt-scene" aria-label="Protocol state">
      <div class="pt-spread">
        <div class="pt-spread-2">
          <div class="pt-sheet">
            <h3>Protocol</h3>
            <div class="pt-ledger pt-gap-t2">
              <div v-for="stat in protocolStats" :key="stat.label" class="pt-ledger-row">
                <span class="pt-ledger-key">{{ stat.label }}</span>
                <span class="pt-ledger-val">{{ stat.value }} {{ stat.unit }}</span>
                <span />
              </div>
              <div class="pt-ledger-row">
                <span class="pt-ledger-key">Emission</span>
                <span class="pt-ledger-val">
                  {{ protocol.emissionPerBlock.toFixed(4) }} {{ protocol.rewardSymbol }}/block
                </span>
                <span />
              </div>
              <div class="pt-ledger-row">
                <span class="pt-ledger-key">Deposit fee</span>
                <span class="pt-ledger-val">{{ formatBps(protocol.params.depositFeeBps) }}</span>
                <span />
              </div>
              <div class="pt-ledger-row">
                <span class="pt-ledger-key">Early-withdraw penalty</span>
                <span class="pt-ledger-val">{{ formatBps(protocol.params.earlyWithdrawFeeBps) }}</span>
                <span />
              </div>
            </div>

            <hr class="pt-seam" />
            <span class="pt-label">Contracts</span>
            <div class="pt-stack pt-stack--tight">
              <a
                v-for="(address, label) in {
                  MiningPool: ADDRESSES.miningPool,
                  FeeRouter: ADDRESSES.feeRouter,
                  ArtworkVault: ADDRESSES.artworkVault,
                }"
                :key="label"
                :href="explorerAddressUrl(address)"
                target="_blank"
                rel="noreferrer noopener"
                class="pt-row pt-copy"
              >
                <span class="pt-quiet">{{ label }}</span>
                <span class="pt-mono pt-note">{{ address.slice(0, 10) }}…</span>
              </a>
            </div>
          </div>

          <TxFeed />
        </div>
      </div>
    </section>
  </div>
</template>
