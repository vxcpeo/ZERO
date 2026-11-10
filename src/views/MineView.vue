<script setup lang="ts">
/**
 * Mining view: stake, unstake, claim and compound against the fee-funded pool.
 *
 * Every number shown here is read from `MiningPool` — including the fee parameters, so the UI
 * can never advertise a rate the contract disagrees with.
 */
import { computed, reactive, ref } from "vue";

import ConnectPrompt from "@/components/ConnectPrompt.vue";
import FigureSlab from "@/components/gallery/FigureSlab.vue";
import TxFeed from "@/components/TxFeed.vue";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { ADDRESSES } from "@/config/chain";
import { bpsOf, formatBps, formatBlocks, formatUnits, parseUnits } from "@/utils/format";

const protocol = useProtocolStore();
const wallet = useWalletStore();

/** Per-pool form state, keyed by pool id. */
const forms = reactive<Record<number, { amount: string; tab: "stake" | "unstake" }>>({});
const referrer = ref("");
const advancedOpen = ref(false);

function formFor(poolId: number): { amount: string; tab: "stake" | "unstake" } {
  if (!forms[poolId]) forms[poolId] = { amount: "", tab: "stake" };
  return forms[poolId];
}

/** Fee the pool will charge on the pending stake action, in stake-token units. */
function depositFeeFor(poolId: number): bigint {
  const pool = protocol.pools.find((candidate) => candidate.id === poolId);
  const form = formFor(poolId);
  if (!pool || !form.amount) return 0n;
  try {
    return bpsOf(parseUnits(form.amount, pool.decimals), protocol.params.depositFeeBps);
  } catch {
    return 0n;
  }
}

/** Early-withdraw penalty that would apply right now. */
function withdrawFeeFor(poolId: number): bigint {
  const pool = protocol.pools.find((candidate) => candidate.id === poolId);
  const form = formFor(poolId);
  if (!pool || !form.amount) return 0n;
  try {
    const amount = parseUnits(form.amount, pool.decimals);
    return pool.locked ? bpsOf(amount, protocol.params.earlyWithdrawFeeBps) : 0n;
  } catch {
    return 0n;
  }
}

function maxStake(poolId: number): string {
  const pool = protocol.pools.find((candidate) => candidate.id === poolId);
  if (!pool) return "0";
  // Identify the balance by address, not by symbol: a deployment may use a mock ART token whose
  // symbol differs, and guessing from the symbol would show the wrong maximum.
  const isArtPool = pool.stakeToken.toLowerCase() === ADDRESSES.artToken.toLowerCase();
  const base = isArtPool ? protocol.artTokenBalance : protocol.feeTokenBalance;
  return formatUnits(base, pool.decimals, { maxFractionDigits: pool.decimals });
}

function setMax(poolId: number): void {
  formFor(poolId).amount = maxStake(poolId);
}

async function stake(poolId: number): Promise<void> {
  const form = formFor(poolId);
  const ok = await protocol.deposit(poolId, form.amount, referrer.value);
  if (ok) form.amount = "";
}

async function unstake(poolId: number): Promise<void> {
  const form = formFor(poolId);
  const ok = await protocol.withdraw(poolId, form.amount);
  if (ok) form.amount = "";
}

/** Share of the pool's weight this wallet controls — the driver of reward share. */
function weightShare(poolId: number): string {
  const pool = protocol.pools.find((candidate) => candidate.id === poolId);
  if (!pool || pool.totalWeight === 0n) return "0";
  return ((Number(pool.user.weight) / Number(pool.totalWeight)) * 100).toFixed(2);
}

const hasPositions = computed(() => protocol.pools.some((pool) => pool.user.amount > 0n));
const anyPending = computed(() => protocol.totalPending > 0n);

const copied = ref(false);
/** Copy the wallet address, which doubles as the on-chain referral code. */
async function copyReferralCode(): Promise<void> {
  if (!wallet.address) return;
  try {
    await navigator.clipboard.writeText(wallet.address);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="pt-route">
    <!-- ── Scene 1: the mining proposition, as an opening poster ────────────── -->
    <section class="pt-scene pt-scene--open" aria-label="Mining statement">
      <div class="pt-spread pt-billboard">
        <div>
          <p class="pt-kicker">
            <span class="pt-tag pt-tag--good">Mining</span>
            <span>Self-funded by real platform fees</span>
          </p>
          <h1>Mine the protocol's fees</h1>
        </div>
        <p class="pt-standfirst">
          Stake into a pool and you earn a pro-rata share of the fees Cimela collects —
          paid in {{ protocol.rewardSymbol }}, the same asset the fees were charged in. The pool
          cannot mint rewards from nothing: it streams exactly the budget it has received, and
          <span class="pt-mono">rewardReleased ≤ rewardReserve</span> is enforced on-chain.
        </p>
      </div>
    </section>

    <!-- ── Scene 2: budget, emission schedule and the wallet gate ───────────── -->
    <section class="pt-scene pt-scene--wash" aria-label="Budget overview">
      <div class="pt-spread pt-stack">
        <ConnectPrompt
          message="Connect a wallet to stake, claim, or compound. You can explore the numbers below without one."
          class="pt-gap-b3"
        />

        <div class="pt-rail pt-rail--figures" role="group" aria-label="Budget overview figures" tabindex="0">
          <FigureSlab
            label="Unspent budget"
            :value="
              protocol.reserve
                ? formatUnits(protocol.reserve.unspent, protocol.rewardDecimals, { maxFractionDigits: 2 })
                : '—'
            "
            :unit="protocol.rewardSymbol"
            sub="still to be streamed to stakers"
            accent
          />
          <FigureSlab
            label="Emission"
            :value="protocol.emissionPerBlock > 0 ? protocol.emissionPerBlock.toFixed(4) : '0'"
            :unit="`${protocol.rewardSymbol}/block`"
            sub="re-priced on every fee deposit"
          />
          <FigureSlab
            label="Your claimable"
            :value="formatUnits(protocol.totalPending, protocol.rewardDecimals, { maxFractionDigits: 4 })"
            :unit="protocol.rewardSymbol"
            sub="across all pools"
          />
          <FigureSlab
            label="Harvest fee"
            :value="formatBps(protocol.params.harvestFeeBps)"
            sub="recycled into the reserve, not removed"
          />
        </div>

        <div v-if="protocol.reserve" class="pt-sheet">
          <div class="pt-row pt-gap-b1">
            <strong>Emission schedule</strong>
            <span class="pt-tag pt-tag--accent">
              {{ protocol.params.emissionHalvingDays.toFixed(0) }}-day halving period
            </span>
          </div>
          <div class="pt-meter pt-gap-b2">
            <div class="pt-meter-fill" :style="{ width: `${protocol.emissionProgress * 100}%` }" />
          </div>
          <div class="pt-grid-4">
            <div>
              <div class="pt-label">Committed budget</div>
              <div class="pt-num">
                {{ formatUnits(protocol.reserve.reserve, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
                {{ protocol.rewardSymbol }}
              </div>
            </div>
            <div>
              <div class="pt-label">Released so far</div>
              <div class="pt-num">
                {{ formatUnits(protocol.reserve.released, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
                {{ protocol.rewardSymbol }}
              </div>
            </div>
            <div>
              <div class="pt-label">Schedule ends at block</div>
              <div class="pt-num pt-mono">{{ protocol.reserve.endBlock.toString() }}</div>
            </div>
            <div>
              <div class="pt-label">Recycled by claimers</div>
              <div class="pt-num">
                {{ formatUnits(protocol.recycledFees, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
                {{ protocol.rewardSymbol }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Scene 3: the pools, each one a poster entry with its own form ───── -->
    <section class="pt-scene" aria-label="Mining pools">
      <div class="pt-spread">
        <div class="pt-scene-head">
          <h2 class="pt-gap-b0">Pools</h2>
          <div class="pt-inline">
            <button class="pt-btn pt-btn--small" :disabled="protocol.loading" @click="protocol.refresh()">
              <span v-if="protocol.loading" class="pt-pulse" />
              Refresh
            </button>
            <button class="pt-btn pt-btn--small pt-btn--quiet" @click="advancedOpen = !advancedOpen">
              {{ advancedOpen ? "Hide" : "Show" }} advanced
            </button>
          </div>
        </div>

        <div v-if="!protocol.pools.length" class="pt-sheet pt-quiet">
          No pools are registered on this deployment yet.
        </div>

        <div v-else class="pt-stack">
          <article v-for="pool in protocol.pools" :key="pool.id" class="pt-pool-entry">
            <div class="pt-row pt-gap-b2">
              <div>
                <h3 class="pt-gap-b0">{{ pool.name }}</h3>
                <span class="pt-note pt-quiet pt-mono">pool #{{ pool.id }} · {{ pool.stakeToken }}</span>
              </div>
              <div class="pt-inline">
                <span class="pt-tag pt-tag--accent">{{ pool.allocationPoints.toString() }} pts</span>
                <span v-if="!pool.active" class="pt-tag pt-tag--warn">Inactive</span>
                <span v-if="pool.locked" class="pt-tag pt-tag--warn">
                  Locked · {{ formatBlocks(pool.user.unlockTime - BigInt(protocol.currentBlock)) }}
                </span>
                <span v-else-if="Number(pool.lockDuration) > 0" class="pt-tag">
                  Lock {{ formatBlocks(pool.lockDuration) }}
                </span>
              </div>
            </div>

            <div class="pt-grid-4 pt-gap-b2">
              <div>
                <div class="pt-label">Total staked</div>
                <div class="pt-num">
                  {{ formatUnits(pool.totalStaked, pool.decimals, { maxFractionDigits: 2 }) }}
                  {{ pool.symbol }}
                </div>
              </div>
              <div>
                <div class="pt-label">Your stake</div>
                <div class="pt-num">
                  {{ formatUnits(pool.user.amount, pool.decimals, { maxFractionDigits: 4 }) }}
                  {{ pool.symbol }}
                </div>
                <div class="pt-note">{{ weightShare(pool.id) }}% of pool weight</div>
              </div>
              <div>
                <div class="pt-label">Your claimable</div>
                <div class="pt-num pt-good">
                  {{ formatUnits(pool.pending, protocol.rewardDecimals, { maxFractionDigits: 6 }) }}
                  {{ protocol.rewardSymbol }}
                </div>
              </div>
              <div>
                <div class="pt-label">Weight at last update</div>
                <div class="pt-num">
                  {{ formatUnits(pool.totalWeight, 18, { maxFractionDigits: 2 }) }}
                </div>
                <div class="pt-note">1e18-normalised across token decimals</div>
              </div>
            </div>

            <!-- Claim row -->
            <div v-if="wallet.isConnected && pool.pending > 0n" class="pt-claim-strip">
              <button
                class="pt-btn pt-btn--good pt-btn--small"
                :disabled="protocol.loading"
                @click="protocol.harvest(pool.id)"
              >
                Claim
                {{ formatUnits(pool.pending, protocol.rewardDecimals, { maxFractionDigits: 4 }) }}
                {{ protocol.rewardSymbol }}
              </button>
              <button
                class="pt-btn pt-btn--small"
                :disabled="protocol.loading"
                title="Claim and stake the result in one transaction"
                @click="protocol.harvestAndRestake(pool.id)"
              >
                Claim &amp; compound
              </button>
              <span class="pt-note pt-quiet">
                {{ formatBps(protocol.params.harvestFeeBps) }} harvest fee is recycled into the reserve
              </span>
            </div>

            <!-- Stake / unstake -->
            <div class="pt-action-pair">
              <div class="pt-field">
                <div class="pt-row">
                  <label class="pt-field-label" :for="`amount-${pool.id}`">
                    {{ formFor(pool.id).tab === "stake" ? "Amount to stake" : "Amount to unstake" }}
                  </label>
                  <button class="pt-btn pt-btn--quiet pt-btn--small" @click="setMax(pool.id)">Max</button>
                </div>
                <div class="pt-input-row">
                  <input
                    :id="`amount-${pool.id}`"
                    v-model="formFor(pool.id).amount"
                    class="pt-input"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.0"
                  />
                  <span class="pt-input-suffix">{{ pool.symbol }}</span>
                </div>
              </div>

              <div class="pt-stack pt-stack--tight">
                <div class="pt-inline">
                  <button
                    class="pt-btn pt-btn--accent pt-fill"
                    :disabled="
                      !wallet.isConnected ||
                      wallet.isWrongChain ||
                      protocol.loading ||
                      !pool.active ||
                      formFor(pool.id).tab !== 'stake'
                    "
                    @click="stake(pool.id)"
                  >
                    Stake
                  </button>
                  <button
                    class="pt-btn pt-fill"
                    :disabled="
                      !wallet.isConnected ||
                      wallet.isWrongChain ||
                      protocol.loading ||
                      pool.user.amount === 0n ||
                      formFor(pool.id).tab !== 'unstake'
                    "
                    @click="unstake(pool.id)"
                  >
                    Unstake
                  </button>
                </div>
                <button
                  class="pt-btn pt-btn--quiet pt-btn--small"
                  @click="formFor(pool.id).tab = formFor(pool.id).tab === 'stake' ? 'unstake' : 'stake'"
                >
                  Switch to {{ formFor(pool.id).tab === "stake" ? "unstake" : "stake" }}
                </button>
              </div>
            </div>

            <!-- Cost preview -->
            <div
              v-if="formFor(pool.id).amount && (depositFeeFor(pool.id) > 0n || withdrawFeeFor(pool.id) > 0n)"
              class="pt-callout pt-gap-t2"
              :class="withdrawFeeFor(pool.id) > 0n ? 'pt-callout--caution' : 'pt-callout--info'"
            >
              <div>
                <template v-if="formFor(pool.id).tab === 'stake'">
                  Staking {{ formFor(pool.id).amount }} {{ pool.symbol }} costs a
                  <strong>{{ formatBps(protocol.params.depositFeeBps) }}</strong> deposit fee
                  ({{ formatUnits(depositFeeFor(pool.id), pool.decimals, { maxFractionDigits: 6 }) }}
                  {{ pool.symbol }}) charged in {{ pool.symbol }} and forwarded to the protocol
                  treasury. The fee that funds <em>your</em> mining rewards is the platform fee on
                  artwork purchases, which the router splits into the reserve.
                </template>
                <template v-else-if="withdrawFeeFor(pool.id) > 0n">
                  You are still inside the {{ formatBlocks(pool.lockDuration) }} loyalty lock, so
                  unstaking now costs
                  <strong>{{ formatBps(protocol.params.earlyWithdrawFeeBps) }}</strong>
                  ({{ formatUnits(withdrawFeeFor(pool.id), pool.decimals, { maxFractionDigits: 6 }) }}
                  {{ pool.symbol }}). Wait for the lock to end to pay nothing.
                </template>
                <template v-else>
                  No penalty applies — the loyalty lock has elapsed.
                </template>
              </div>
            </div>

            <!-- Advanced -->
            <div v-if="advancedOpen" class="pt-reveal">
              <div class="pt-grid-2">
                <div>
                  <div class="pt-label">Accumulator (reward per 1e18 weight)</div>
                  <div class="pt-mono pt-note">{{ pool.accRewardPerShare.toString() }}</div>
                </div>
                <div>
                  <div class="pt-label">Your reward debt</div>
                  <div class="pt-mono pt-note">{{ pool.user.rewardDebt.toString() }}</div>
                </div>
                <div>
                  <div class="pt-label">Total allocation points</div>
                  <div class="pt-num">{{ protocol.totalAllocationPoints.toString() }}</div>
                </div>
                <div>
                  <div class="pt-label">Last reward block</div>
                  <div class="pt-num pt-mono">{{ pool.lastRewardBlock.toString() }}</div>
                </div>
              </div>

              <hr class="pt-seam" />

              <div class="pt-row">
                <span class="pt-note pt-quiet">
                  Emergency exit returns your principal and forfeits pending rewards. It never touches
                  the reward budget, so it always works.
                </span>
                <button
                  class="pt-btn pt-btn--bad pt-btn--small"
                  :disabled="!wallet.isConnected || pool.user.amount === 0n || protocol.loading"
                  @click="protocol.emergencyWithdraw(pool.id)"
                >
                  Emergency exit
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ── Scene 4: referral and activity ──────────────────────────────────── -->
    <section class="pt-scene pt-scene--wash" aria-label="Referral and activity">
      <div class="pt-spread">
        <div class="pt-spread-2">
          <div class="pt-sheet">
            <h3>Referral</h3>
            <p class="pt-copy">
              Fees paid on your behalf can route
              <strong>{{ formatBps(protocol.params.referralBps) }}</strong> to a referrer. Your
              referral code is your wallet address — share it and the router pays it on-chain in the
              same transaction as the fee.
            </p>
            <div class="pt-field">
              <label class="pt-field-label" for="referrer">Referrer address (optional)</label>
              <div class="pt-input-row">
                <input
                  id="referrer"
                  v-model="referrer"
                  class="pt-input"
                  type="text"
                  placeholder="0x…"
                  spellcheck="false"
                />
              </div>
            </div>
            <div v-if="wallet.isConnected" class="pt-row pt-gap-t2 pt-copy">
              <span class="pt-quiet">Your referral code</span>
              <button class="pt-btn pt-btn--small pt-mono" :title="wallet.address" @click="copyReferralCode">
                {{ copied ? "Copied" : `${wallet.shortAddress} · copy` }}
              </button>
            </div>
          </div>

          <TxFeed />
        </div>

        <!-- ── Empty state hint ───────────────────────────────────────────── -->
        <div v-if="wallet.isConnected && !hasPositions" class="pt-callout pt-callout--info pt-gap-t3">
          <div>
            You have no positions yet. Staking {{ protocol.pools[0]?.symbol ?? "the fee asset" }} earns
            a share of every fee the protocol collects. Rewards only start flowing once the pool holds
            a fee budget — a fresh deployment with no fee revenue pays nothing, by design.
            <span v-if="anyPending" class="pt-hidden" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
