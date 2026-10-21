<script setup lang="ts">
/**
 * Personal dashboard: positions, claimable rewards, protocol-wide stats and a direct fee
 * payment form (the "pay a fee and fund mining yourself" path).
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import LedgerFact from "@/components/ledger/LedgerFact.vue";
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
  <div class="ct-route ct-route-dashboard">
    <section class="ct-billboard" aria-label="Dashboard summary">
      <div>
        <h1 class="ct-gap-b1">Dashboard</h1>
        <p class="ct-gap-b0">
          Your positions on {{ TARGET_CHAIN.name }}, plus the protocol-wide state they depend on.
        </p>
      </div>
      <div class="ct-inline">
        <span v-if="protocol.lastUpdated" class="ct-micro ct-quiet">
          updated {{ new Date(protocol.lastUpdated).toLocaleTimeString() }}
        </span>
        <button class="ct-btn ct-btn-small" :disabled="protocol.loading" @click="protocol.refresh()">
          <span v-if="protocol.loading" class="ct-pulse" />
          Refresh
        </button>
      </div>
    </section>

    <div>
      <ConnectPrompt class="ct-gap-b3" />

      <!-- ── Wallet summary ─────────────────────────────────────────────── -->
      <section v-if="wallet.isConnected" class="ct-band" aria-label="Wallet balances">
        <div class="ct-figures">
          <LedgerFact
            label="Claimable rewards"
            :value="formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 6 })"
            :unit="protocol.rewardSymbol"
            sub="claim from the Mine page"
            accent
          />
          <LedgerFact
            :label="`${protocol.rewardSymbol} balance`"
            :value="formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 })"
            :unit="protocol.rewardSymbol"
            sub="available to stake or spend"
          />
          <LedgerFact
            label="$ART balance"
            :value="formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 })"
            unit="ART"
            sub="the fraction-ownership token"
          />
          <LedgerFact
            label="SOL balance"
            :value="wallet.solBalanceFormatted"
            unit="SOL"
            sub="for gas"
          />
        </div>
      </section>

      <!-- ── Positions ──────────────────────────────────────────────────── -->
      <section class="ct-band" aria-label="Your positions">
        <h2 class="ct-gap-b2">Positions</h2>

        <div v-if="!wallet.isConnected" class="ct-slab ct-muted">
          Connect a wallet to see your positions.
        </div>

        <div v-else-if="!positions.length" class="ct-empty">
          <p class="ct-gap-b2">You have no mining positions yet.</p>
          <RouterLink to="/mine" class="ct-btn ct-btn-primary">Stake into a pool</RouterLink>
        </div>

        <div v-else class="ct-scroll">
          <table class="ct-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th class="ct-right">Staked</th>
                <th class="ct-right">Pool weight share</th>
                <th class="ct-right">Claimable</th>
                <th class="ct-right">Lock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="pool in positions" :key="pool.id">
                <td>
                  <strong>{{ pool.name }}</strong>
                  <div class="ct-micro ct-quiet ct-mono">#{{ pool.id }}</div>
                </td>
                <td class="ct-right ct-num">
                  {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 4 }) }}
                  {{ pool.symbol }}
                </td>
                <td class="ct-right ct-num">{{ pool.shareOfWeight.toFixed(3) }}%</td>
                <td class="ct-right ct-good ct-num">
                  {{ formatUnits(pool.pending, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </td>
                <td class="ct-right">
                  <span v-if="pool.locked" class="ct-tag ct-tag-warn">Locked</span>
                  <span v-else class="ct-quiet ct-micro">Unlocked</span>
                </td>
                <td class="ct-right">
                  <div class="ct-inline" style="justify-content: flex-end">
                    <button
                      class="ct-btn ct-btn-small ct-btn-good"
                      :disabled="pool.pending === 0n || protocol.loading"
                      @click="protocol.harvest(pool.id)"
                    >
                      Claim
                    </button>
                    <button
                      class="ct-btn ct-btn-small"
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
      <section class="ct-band" aria-label="Pay a platform fee">
        <div class="ct-slab">
          <div class="ct-band-head">
            <div>
              <h3 class="ct-gap-b1">Pay a platform fee</h3>
              <p class="ct-copy ct-gap-b0">
                Anyone can send a fee through <span class="ct-mono">FeeRouter</span>. The router splits it
                on-chain and pushes the mining share straight into the reward budget, so paying a fee
                directly extends everyone's mining runway.
              </p>
            </div>
            <button class="ct-btn ct-btn-small" @click="showFeePanel = !showFeePanel">
              {{ showFeePanel ? "Hide" : "Open" }}
            </button>
          </div>

          <div v-if="showFeePanel" class="ct-stack">
            <div class="ct-field-stack">
              <div class="ct-field">
                <label class="ct-field-label" for="fee-amount">Fee amount</label>
                <div class="ct-field-row">
                  <input
                    id="fee-amount"
                    v-model="feeAmount"
                    class="ct-field-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                  />
                  <span class="ct-field-suffix">{{ protocol.rewardSymbol }}</span>
                </div>
              </div>
              <div class="ct-field">
                <label class="ct-field-label" for="fee-referrer">Referrer (optional)</label>
                <div class="ct-field-row">
                  <input
                    id="fee-referrer"
                    v-model="feeReferrer"
                    class="ct-field-input"
                    type="text"
                    placeholder="0x…"
                    spellcheck="false"
                  />
                </div>
              </div>
            </div>

            <div v-if="splitPreview" class="ct-grid-four">
              <div>
                <div class="ct-label">To mining</div>
                <div class="ct-num ct-good">
                  {{ formatUnits(splitPreview.mining, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="ct-note">{{ formatBps(protocol.params.miningShareBps) }} of the fee</div>
              </div>
              <div>
                <div class="ct-label">To referrer</div>
                <div class="ct-num">
                  {{ formatUnits(splitPreview.referral, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="ct-note">
                  {{
                    splitPreview.referral === 0n
                      ? "no referrer — falls to treasury"
                      : formatBps(protocol.params.referralBps) + " of the fee"
                  }}
                </div>
              </div>
              <div>
                <div class="ct-label">To treasury</div>
                <div class="ct-num">
                  {{ formatUnits(splitPreview.treasury, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="ct-note">remainder, so the legs always sum exactly</div>
              </div>
              <div>
                <div class="ct-label">Total fee</div>
                <div class="ct-num">
                  {{ formatUnits(splitPreview.amount, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
                <div class="ct-note">requires an approval to the router</div>
              </div>
            </div>

            <div class="ct-row">
              <button
                class="ct-btn ct-btn-primary"
                :disabled="
                  !wallet.isConnected || wallet.isWrongChain || protocol.loading || !feeAmount.trim()
                "
                @click="payFee"
              >
                Pay fee through the router
              </button>
              <span v-if="!wallet.isConnected" class="ct-micro ct-quiet">
                Connect a wallet to continue.
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Protocol stats + activity ─────────────────────────────────── -->
      <section class="ct-band" aria-label="Protocol state">
        <div class="ct-split-even">
          <div class="ct-slab">
            <h3>Protocol</h3>
            <div class="ct-ledger ct-gap-t2">
              <div v-for="stat in protocolStats" :key="stat.label" class="ct-ledger-row">
                <span class="ct-ledger-key">{{ stat.label }}</span>
                <span class="ct-ledger-val">{{ stat.value }} {{ stat.unit }}</span>
                <span />
              </div>
              <div class="ct-ledger-row">
                <span class="ct-ledger-key">Emission</span>
                <span class="ct-ledger-val">
                  {{ protocol.emissionPerBlock.toFixed(4) }} {{ protocol.rewardSymbol }}/block
                </span>
                <span />
              </div>
              <div class="ct-ledger-row">
                <span class="ct-ledger-key">Deposit fee</span>
                <span class="ct-ledger-val">{{ formatBps(protocol.params.depositFeeBps) }}</span>
                <span />
              </div>
              <div class="ct-ledger-row">
                <span class="ct-ledger-key">Early-withdraw penalty</span>
                <span class="ct-ledger-val">{{ formatBps(protocol.params.earlyWithdrawFeeBps) }}</span>
                <span />
              </div>
            </div>

            <hr class="ct-seam" />
            <span class="ct-label">Contracts</span>
            <div class="ct-stack ct-stack-tight">
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
                class="ct-row ct-copy"
              >
                <span class="ct-quiet">{{ label }}</span>
                <span class="ct-mono ct-micro">{{ address.slice(0, 10) }}…</span>
              </a>
            </div>
          </div>

          <TxFeed />
        </div>
      </section>
    </div>
  </div>
</template>
