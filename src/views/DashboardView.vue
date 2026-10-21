<script setup lang="ts">
/**
 * Personal dashboard: positions, claimable rewards, protocol-wide stats and a direct fee
 * payment form (the "pay a fee and fund mining yourself" path).
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import PosterFigure from "@/components/poster/PosterFigure.vue";
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
  <div class="po-route po-route-dashboard po-halo">
    <section class="po-billboard" aria-label="Dashboard summary">
      <div class="po-gutter po-billboard-grid">
        <div>
          <h1 class="po-gap-b1">Dashboard</h1>
          <p class="po-gap-b0">
            Your positions on {{ TARGET_CHAIN.name }}, plus the protocol-wide state they depend on.
          </p>
        </div>
        <div class="po-inline" style="gap: 8px">
          <span v-if="protocol.lastUpdated" class="po-micro po-quiet">
            updated {{ new Date(protocol.lastUpdated).toLocaleTimeString() }}
          </span>
          <button class="po-button po-button-small" :disabled="protocol.loading" @click="protocol.refresh()">
            <span v-if="protocol.loading" class="po-pulse" />
            Refresh
          </button>
        </div>
      </div>
    </section>

    <div class="po-gutter">
      <ConnectPrompt class="po-gap-b3" />

      <!-- ── Wallet summary ─────────────────────────────────────────────── -->
      <section v-if="wallet.isConnected" class="po-wallet-figures" aria-label="Wallet balances">
        <div class="po-figures po-gap-b3">
          <PosterFigure
            label="Claimable rewards"
            :value="formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 6 })"
            :unit="protocol.rewardSymbol"
            sub="claim from the Mine page"
            accent
          />
          <PosterFigure
            :label="`${protocol.rewardSymbol} balance`"
            :value="formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 })"
            :unit="protocol.rewardSymbol"
            sub="available to stake or spend"
          />
          <PosterFigure
            label="$ART balance"
            :value="formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 })"
            unit="ART"
            sub="the fraction-ownership token"
          />
          <PosterFigure
            label="BNB balance"
            :value="wallet.bnbBalanceFormatted"
            unit="BNB"
            sub="for gas"
          />
        </div>
      </section>

      <!-- ── Positions ──────────────────────────────────────────────────── -->
      <section class="po-plate" aria-label="Your positions">
        <h2 class="po-gap-b2">Positions</h2>

        <div v-if="!wallet.isConnected" class="po-slab po-muted">
          Connect a wallet to see your positions.
        </div>

        <div v-else-if="!positions.length" class="po-slab">
          <p class="po-gap-b2">You have no mining positions yet.</p>
          <RouterLink to="/mine" class="po-button po-button-primary">Stake into a pool</RouterLink>
        </div>

        <div v-else class="po-slab">
          <table class="po-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th class="po-right">Staked</th>
                <th class="po-right">Pool weight share</th>
                <th class="po-right">Claimable</th>
                <th class="po-right">Lock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="pool in positions" :key="pool.id">
                <td>
                  <strong>{{ pool.name }}</strong>
                  <div class="po-micro po-quiet po-mono">#{{ pool.id }}</div>
                </td>
                <td class="po-right">
                  {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 4 }) }}
                  {{ pool.symbol }}
                </td>
                <td class="po-right">{{ pool.shareOfWeight.toFixed(3) }}%</td>
                <td class="po-right po-good">
                  {{ formatUnits(pool.pending, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </td>
                <td class="po-right">
                  <span v-if="pool.locked" class="po-tag po-tag-warn">Locked</span>
                  <span v-else class="po-quiet po-micro">Unlocked</span>
                </td>
                <td class="po-right">
                  <div class="po-inline" style="gap: 6px; justify-content: flex-end">
                    <button
                      class="po-button po-button-small po-button-good"
                      :disabled="pool.pending === 0n || protocol.loading"
                      @click="protocol.harvest(pool.id)"
                    >
                      Claim
                    </button>
                    <button
                      class="po-button po-button-small"
                      :disabled="pool.pending === 0n || protocol.loading"
                      @click="protocol.harvestAndRestake(pool.id)"
                    >
                      Compound
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── Fee payment ───────────────────────────────────────────────── -->
      <section class="po-plate" aria-label="Pay a platform fee">
        <div class="po-slab">
          <div class="po-line po-gap-b2">
            <div>
              <h3 class="po-gap-b1">Pay a platform fee</h3>
              <p class="po-copy po-gap-b0">
                Anyone can send a fee through <span class="po-mono">FeeRouter</span>. The router splits it
                on-chain and pushes the mining share straight into the reward budget, so paying a fee
                directly extends everyone's mining runway.
              </p>
            </div>
            <button class="po-button po-button-small" @click="showFeePanel = !showFeePanel">
              {{ showFeePanel ? "Hide" : "Open" }}
            </button>
          </div>

          <div v-if="showFeePanel" class="po-stack">
            <div class="po-split">
              <div class="po-field">
                <label class="po-field-label" for="fee-amount">Fee amount</label>
                <div class="po-field-row">
                  <input
                    id="fee-amount"
                    v-model="feeAmount"
                    class="po-field-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                  />
                  <span class="po-field-suffix">{{ protocol.rewardSymbol }}</span>
                </div>
              </div>
              <div class="po-field">
                <label class="po-field-label" for="fee-referrer">Referrer (optional)</label>
                <div class="po-field-row">
                  <input
                    id="fee-referrer"
                    v-model="feeReferrer"
                    class="po-field-input"
                    type="text"
                    placeholder="0x…"
                    spellcheck="false"
                  />
                </div>
              </div>
            </div>

            <div v-if="splitPreview" class="po-grid-four">
              <div>
                <div class="po-label">To mining</div>
                <div class="po-num po-good">
                  {{ formatUnits(splitPreview.mining, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="po-note">{{ formatBps(protocol.params.miningShareBps) }} of the fee</div>
              </div>
              <div>
                <div class="po-label">To referrer</div>
                <div class="po-num">
                  {{ formatUnits(splitPreview.referral, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="po-note">
                  {{
                    splitPreview.referral === 0n
                      ? "no referrer — falls to treasury"
                      : formatBps(protocol.params.referralBps) + " of the fee"
                  }}
                </div>
              </div>
              <div>
                <div class="po-label">To treasury</div>
                <div class="po-num">
                  {{ formatUnits(splitPreview.treasury, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="po-note">remainder, so the legs always sum exactly</div>
              </div>
              <div>
                <div class="po-label">Total fee</div>
                <div class="po-num">
                  {{ formatUnits(splitPreview.amount, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="po-note">requires an approval to the router</div>
              </div>
            </div>

            <div class="po-row">
              <button
                class="po-button po-button-primary"
                :disabled="
                  !wallet.isConnected || wallet.isWrongChain || protocol.loading || !feeAmount.trim()
                "
                @click="payFee"
              >
                Pay fee through the router
              </button>
              <span v-if="!wallet.isConnected" class="po-micro po-quiet">
                Connect a wallet to continue.
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Protocol stats + activity ─────────────────────────────────── -->
      <section class="po-plate" aria-label="Protocol state">
        <div class="po-split">
          <div class="po-slab">
            <h3>Protocol</h3>
            <div class="po-stack po-stack-tight">
              <div v-for="stat in protocolStats" :key="stat.label" class="po-line po-copy">
                <span class="po-quiet">{{ stat.label }}</span>
                <span class="po-num">{{ stat.value }} {{ stat.unit }}</span>
              </div>
              <div class="po-line po-copy">
                <span class="po-quiet">Emission</span>
                <span class="po-num">
                  {{ protocol.emissionPerBlock.toFixed(4) }} {{ protocol.rewardSymbol }}/block
                </span>
              </div>
              <div class="po-line po-copy">
                <span class="po-quiet">Deposit fee</span>
                <span class="po-num">{{ formatBps(protocol.params.depositFeeBps) }}</span>
              </div>
              <div class="po-line po-copy">
                <span class="po-quiet">Early-withdraw penalty</span>
                <span class="po-num">{{ formatBps(protocol.params.earlyWithdrawFeeBps) }}</span>
              </div>
            </div>

            <div class="po-seam" />
            <span class="po-label">Contracts</span>
            <div class="po-stack po-stack-tight">
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
                class="po-line po-copy"
              >
                <span class="po-quiet">{{ label }}</span>
                <span class="po-mono po-micro">{{ address.slice(0, 10) }}…</span>
              </a>
            </div>
          </div>

          <TxFeed />
        </div>
      </section>
    </div>
  </div>
</template>
