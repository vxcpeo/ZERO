<script setup lang="ts">
/**
 * DocsView — the long-form technical reference for Fractio.
 *
 * Every figure in a "live" column is read off Solana by `useProtocolStore()`; anything the
 * store does not expose is labelled with where it does come from (the Solidity in
 * `contracts/contracts/` or the documented defaults in `src/config/chain.ts`). The page
 * deliberately publishes no APY: mining here is fee revenue, and a yield figure would be an
 * assumption about future art sales dressed up as a fact.
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { ADDRESSES, DEFAULT_PARAMS, IS_CONFIGURED, TARGET_CHAIN } from "@/config/chain";
import { useProtocolStore } from "@/stores/protocol";
import { compactNumber, formatBps, formatBlocks, formatUnits } from "@/utils/format";

const protocol = useProtocolStore();

/** `ArtworkVault.SHARES_PER_ARTWORK`: one million 18-decimal shares per registered artwork. */
const WHOLE_SHARES_PER_ARTWORK = 1_000_000;

/** Reward amounts are formatted here and nowhere else, so a raw bigint never reaches the DOM. */
function money(value: bigint | null | undefined): string {
  return formatUnits(value, protocol.rewardDecimals, { maxFractionDigits: 4 });
}

/** The same figure with the reward asset's symbol appended. */
function reward(value: bigint | null | undefined): string {
  return `${money(value)} ${protocol.rewardSymbol}`;
}

// ── Live values ─────────────────────────────────────────────────────────────
// `reserve` is null until the first successful chain read; every derived figure degrades to "—"
// rather than to a made-up zero.

const unspent = computed(() => protocol.reserve?.unspent ?? null);
const reserved = computed(() => protocol.reserve?.reserve ?? null);
const released = computed(() => protocol.reserve?.released ?? null);
const scheduleEnd = computed(() => (protocol.reserve ? Number(protocol.reserve.endBlock) : null));

const scheduleLabel = computed(() => {
  const remaining = scheduleEnd.value === null ? null : scheduleEnd.value - protocol.currentBlock;
  if (remaining === null || protocol.currentBlock === 0) return "awaiting the first read";
  if (remaining <= 0) return "schedule ended";
  return `${formatBlocks(remaining)} left`;
});

const progressPercent = computed(() => (protocol.emissionProgress * 100).toFixed(2));

/** Treasury leg implied by the two published split parameters. */
const treasuryBps = computed(() =>
  Math.max(0, 10_000 - protocol.params.miningShareBps - protocol.params.referralBps),
);

/**
 * Premium of the final share over the first when an artwork is fully sold at the live slope.
 * `curveSlopeBps` is expressed across a whole supply, so at 50 bps the last share costs 0.50% more
 * than the first and `formatBps` prints it in the same units.
 */
const curveFullSupplyPremium = computed(() => formatBps(protocol.params.curveSlopeBps));

interface PoolRow {
  id: number;
  name: string;
  points: string;
  pointsShare: string;
  staked: string;
  weight: string;
}

const poolRows = computed<PoolRow[]>(() => {
  const totalPoints = protocol.totalAllocationPoints;
  return protocol.pools.map((pool) => ({
    id: pool.id,
    name: pool.name || `Pool ${pool.id}`,
    points: pool.allocationPoints.toString(),
    pointsShare:
      totalPoints > 0n
        ? `${(Number((pool.allocationPoints * 10_000n) / totalPoints) / 100).toFixed(2)}%`
        : "—",
    staked: `${formatUnits(pool.totalStaked, pool.decimals, { maxFractionDigits: 4 })} ${pool.symbol}`,
    // `totalWeight` is the 1e18-normalised reward weight, so it is rendered with 18 decimals even
    // when the stake token has six.
    weight: formatUnits(pool.totalWeight, 18, { maxFractionDigits: 4 }),
  }));
});

// ── Parameter tables ────────────────────────────────────────────────────────

interface SplitRow {
  parameter: string;
  contract: string;
  live: string;
  documented: string;
  bound: string;
  note: string;
  diverges: boolean;
}

const splitRows = computed<SplitRow[]>(() => [
  {
    parameter: "Platform fee on a primary purchase",
    contract: "ArtworkVault.platformFeeBps",
    live: formatBps(protocol.params.platformFeeBps),
    documented: formatBps(DEFAULT_PARAMS.platformFeeBps),
    bound: formatBps(1_000),
    note: "Charged on the gross purchase cost and forwarded to FeeRouter. This is the revenue that funds mining.",
    diverges: protocol.params.platformFeeBps !== DEFAULT_PARAMS.platformFeeBps,
  },
  {
    parameter: "Mining share",
    contract: "FeeRouter.miningShareBps",
    live: formatBps(protocol.params.miningShareBps),
    documented: formatBps(DEFAULT_PARAMS.miningShareBps),
    bound: formatBps(9_000),
    note: "Converted into the reward asset and pushed into MiningPool as reward budget.",
    diverges: protocol.params.miningShareBps !== DEFAULT_PARAMS.miningShareBps,
  },
  {
    parameter: "Referral rebate",
    contract: "FeeRouter.referralBps",
    live: formatBps(protocol.params.referralBps),
    documented: formatBps(DEFAULT_PARAMS.referralBps),
    bound: formatBps(5_000),
    note: "Paid on-chain in the same transaction. Zero when no referrer is supplied, and miningShare + referralBps may never exceed 10,000.",
    diverges: protocol.params.referralBps !== DEFAULT_PARAMS.referralBps,
  },
  {
    parameter: "Treasury remainder",
    contract: "FeeRouter._distribute (derived)",
    live: formatBps(treasuryBps.value),
    documented: formatBps(10_000 - DEFAULT_PARAMS.miningShareBps - DEFAULT_PARAMS.referralBps),
    bound: "—",
    note: "Computed as amount − mining − referral, so the three legs always sum to exactly the fee and rounding dust cannot strand tokens.",
    diverges: false,
  },
]);

interface FeeRow {
  fee: string;
  charged: string;
  contract: string;
  live: string;
  documented: string;
  ceiling: string;
  destination: string;
  diverges: boolean;
}

const feeRows = computed<FeeRow[]>(() => [
  {
    fee: "Deposit fee",
    charged: "Staking, in the pool's stake token",
    contract: "MiningPool.depositFeeBps",
    live: formatBps(protocol.params.depositFeeBps),
    documented: formatBps(DEFAULT_PARAMS.depositFeeBps),
    ceiling: formatBps(1_000),
    destination: "Forwarded to the pool's configured treasury (FeeRouter when wired there); it never reaches the reward reserve directly.",
    diverges: protocol.params.depositFeeBps !== DEFAULT_PARAMS.depositFeeBps,
  },
  {
    fee: "Harvest fee",
    charged: "Claiming rewards",
    contract: "MiningPool.harvestFeeBps",
    live: formatBps(protocol.params.harvestFeeBps),
    documented: formatBps(DEFAULT_PARAMS.harvestFeeBps),
    ceiling: formatBps(2_000),
    destination: "Recycled: rewardReserve and recycledFees both grow by the fee, so the tokens never leave the pool.",
    diverges: protocol.params.harvestFeeBps !== DEFAULT_PARAMS.harvestFeeBps,
  },
  {
    fee: "Early-withdraw penalty",
    charged: "Unstaking before the pool's loyalty lock elapses",
    contract: "MiningPool.earlyWithdrawFeeBps",
    live: formatBps(protocol.params.earlyWithdrawFeeBps),
    documented: formatBps(DEFAULT_PARAMS.earlyWithdrawFeeBps),
    ceiling: formatBps(3_000),
    destination: "Forwarded to the pool's treasury like the deposit fee. Waived entirely once block.number ≥ the unlockTime stamped on your last deposit.",
    diverges: protocol.params.earlyWithdrawFeeBps !== DEFAULT_PARAMS.earlyWithdrawFeeBps,
  },
]);

interface ShapeRow {
  parameter: string;
  contract: string;
  live: string;
  documented: string;
  bound: string;
  note: string;
  diverges: boolean;
}

const shapeRows = computed<ShapeRow[]>(() => [
  {
    parameter: "Emission halving period",
    contract: "MiningPool.emissionHalvingPeriod",
    live: `${protocol.params.emissionHalvingPeriod.toLocaleString("en-US")} blocks (${formatBlocks(protocol.params.emissionHalvingPeriod)})`,
    documented: `${DEFAULT_PARAMS.emissionHalvingPeriod.toLocaleString("en-US")} blocks (${DEFAULT_PARAMS.emissionHalvingDays} days at 3s)`,
    bound: "200 – 10,512,000 blocks (≈10m – ≈365d)",
    note: "Length of the window a fresh, idle budget is spread over — capped by the budget itself in reward units. It is a schedule shape, not a per-window halving.",
    diverges: protocol.params.emissionHalvingPeriod !== DEFAULT_PARAMS.emissionHalvingPeriod,
  },
  {
    parameter: "Emission tail factor",
    contract: "MiningPool.tailEmissionBps",
    live: formatBps(protocol.params.tailEmissionBps),
    documented: formatBps(DEFAULT_PARAMS.tailEmissionBps),
    bound: "0.01% – 100.00%",
    note: "How much of the current rate a newly deposited budget is paid at when it extends a live schedule. Lower means a longer, flatter tail.",
    diverges: protocol.params.tailEmissionBps !== DEFAULT_PARAMS.tailEmissionBps,
  },
  {
    parameter: "Bonding-curve slope",
    contract: "ArtworkVault.curveSlopeBps",
    live: formatBps(protocol.params.curveSlopeBps),
    documented: formatBps(DEFAULT_PARAMS.curveSlopeBps),
    bound: formatBps(2_000),
    note: `Rise in the marginal share price across the whole supply: a full sell-out at the live slope tops out ${formatBps(protocol.params.curveSlopeBps)} over basePrice, while a large single sweep pays more per share than drip-buying the same block because the curve is convex.`,
    diverges: protocol.params.curveSlopeBps !== DEFAULT_PARAMS.curveSlopeBps,
  },
  {
    parameter: "Artist share of net proceeds",
    contract: "ArtworkVault.artistShareBps",
    live: "85.00%",
    documented: "85.00% (contract source)",
    bound: formatBps(10_000),
    note: "Read from ArtworkVault.sol; this UI does not call it, so governance may have changed it with setPricing. The remainder goes to the vault's treasury.",
    diverges: false,
  },
]);

// ── Contract reference ──────────────────────────────────────────────────────

interface ContractRow {
  name: string;
  address: string;
  role: string;
  abi: string;
}

const contracts: ContractRow[] = [
  {
    name: "MiningPool",
    address: ADDRESSES.miningPool,
    role: "The fee-funded mining engine. Holds the reward reserve, re-prices the emission schedule on every deposit, and is the only contract that pays stakers.",
    abi: "contracts/abis/MiningPool.json",
  },
  {
    name: "FeeRouter",
    address: ADDRESSES.feeRouter,
    role: "Fee intake and splitter. Accepts platform fees in any whitelisted SPL token (or native SOL), normalises the mining slice into the reward asset and pushes it to the pool.",
    abi: "contracts/abis/FeeRouter.json",
  },
  {
    name: "ArtworkVault",
    address: ADDRESSES.artworkVault,
    role: "Artwork registry, bonding-curve sale and ERC-721 provenance certificates. Mints one SPL share token per artwork and charges the platform fee on every purchase.",
    abi: "contracts/abis/ArtworkVault.json",
  },
  {
    name: "ArtToken",
    address: ADDRESSES.artToken,
    role: "The protocol's own ERC-20, $ART (hard cap 100,000,000). It is the stake token of the reference deployment's second pool; it is not the reward asset.",
    abi: "contracts/abis/ArtToken.json",
  },
];

function isConfigured(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** True when every address this UI needs came back from the deployment manifest or .env.local. */
const configured = computed(() => IS_CONFIGURED);

function explorerLink(address: string): string {
  return TARGET_CHAIN.explorer ? `${TARGET_CHAIN.explorer}/address/${address}` : "";
}

// ── Navigation ──────────────────────────────────────────────────────────────

const toc = [
  { id: "live", label: "Live state" },
  { id: "overview", label: "1 · What this is" },
  { id: "loop", label: "2 · The mining loop" },
  { id: "emission", label: "3 · Emission schedule" },
  { id: "precision", label: "4 · Weight precision" },
  { id: "fees", label: "5 · Fee schedule" },
  { id: "example", label: "6 · Worked example" },
  { id: "governance", label: "7 · Governance" },
  { id: "risks", label: "8 · Risks" },
  { id: "contracts", label: "9 · Contracts" },
  { id: "integrators", label: "10 · Integrators" },
];

/**
 * Scroll to a section instead of letting the browser follow `#id`.
 * @dev This app routes with `createWebHashHistory`, so a bare `#section` href would be parsed as a
 *      route ("/section"), match the catch-all and bounce the reader to the home page. The anchor
 *      stays in the markup for copy-paste and accessibility; the default is prevented here.
 */
function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="ct-route ct-route-docs ct-doc">
    <!-- ── Prologue ─────────────────────────────────────────────────────── -->
    <section class="ct-doc-head" aria-label="Protocol reference">
      <div>
        <p class="ct-eyebrow">
          <span class="ct-tag ct-tag-accent">{{ TARGET_CHAIN.shortName }}</span>
          <span>Protocol reference · chain {{ TARGET_CHAIN.chainId }}</span>
        </p>

        <h1>How this protocol actually works.</h1>

        <p class="ct-standfirst">
          Fractional ownership of vaulted physical artworks, and a mining engine that is paid only
          from the fees the protocol really collects. This page is the reference: the exact fee
          flow, the emission arithmetic, the precision constraint that shapes the reward
          accumulator, what governance can and cannot touch, and the risks — including the ones
          that are easy to leave out of a landing page.
        </p>

        <div class="ct-actions">
          <RouterLink to="/mine" class="ct-btn ct-btn-primary">Mine fees</RouterLink>
          <RouterLink to="/art" class="ct-btn">Browse artworks</RouterLink>
          <a class="ct-btn ct-btn-quiet" href="#risks" @click.prevent="jumpTo('risks')">Read the risks first</a>
        </div>

        <div v-if="!configured" class="ct-callout ct-callout-caution ct-gap-t3">
          <span>
            This build has no complete deployment configured, so every live figure below falls back
            to the documented default in <code>src/config/chain.ts</code> and reads that touch the
            chain will fail. Deploy the contracts, run <code>npm run export:abi</code> in
            <code>contracts/</code>, then set the <code>VITE_*</code> addresses.
          </span>
        </div>
      </div>
    </section>

    <!-- ── Body: numbered ledger chapters beside the contents rail ──────── -->
    <div class="ct-doc-grid">
      <div class="ct-doc-margin">
        <div class="ct-contents" role="group" aria-label="On this page">
          <span class="ct-label">On this page</span>
          <ul class="ct-toc-list">
            <li v-for="item in toc" :key="item.id">
              <a
                :href="`#${item.id}`"
                class="ct-toc-link"
                @click.prevent="jumpTo(item.id)"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="ct-doc-body">
          <!-- ── Live state ──────────────────────────────────────────────── -->
          <section id="live" class="ct-chapter" aria-label="Live protocol state" style="scroll-margin-top: 80px; padding-top: 0">
            <div class="ct-plate-head ct-line ct-row">
              <div>
                <h2 class="ct-gap-b1">Live protocol state</h2>
                <p class="ct-gap-b0 ct-copy">
                  Read from the contracts on {{ TARGET_CHAIN.name }} by the protocol store and
                  refreshed every 15 seconds. Nothing here is cached, indexed or projected — if this
                  page disagrees with another view, the later read is the correct one.
                </p>
              </div>
              <button class="ct-btn ct-btn-small" :disabled="protocol.loading" @click="protocol.refresh()">
                {{ protocol.loading ? "Reading…" : "Refresh" }}
              </button>
            </div>

            <div class="ct-grid ct-grid-four">
              <div class="ct-slab">
                <div class="ct-label">Unspent mining budget</div>
                <div class="ct-figure">{{ money(unspent) }}</div>
                <div class="ct-note">
                  {{ protocol.rewardSymbol }} committed and not yet paid out
                  ({{ compactNumber(protocol.unspentBudget) }} tokens)
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Emission rate</div>
                <div class="ct-figure">{{ protocol.emissionPerBlock.toFixed(6) }}</div>
                <div class="ct-note">
                  {{ protocol.rewardSymbol }} per block, re-priced on every fee deposit
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Budget released</div>
                <div class="ct-figure">{{ progressPercent }}%</div>
                <div class="ct-meter ct-gap-t2">
                  <div
                    class="ct-meter-fill"
                    :style="{ width: `${protocol.emissionProgress * 100}%` }"
                  />
                </div>
                <div class="ct-note ct-gap-t2">
                  {{ reward(released) }} of {{ reward(reserved) }} released to stakers
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Lifetime mined</div>
                <div class="ct-figure">{{ money(protocol.totalRewardsClaimed) }}</div>
                <div class="ct-note">
                  {{ protocol.rewardSymbol }} claimed by stakers, net of the harvest fee
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Recycled harvest fees</div>
                <div class="ct-figure">{{ money(protocol.recycledFees) }}</div>
                <div class="ct-note">
                  {{ protocol.rewardSymbol }} returned to the reserve instead of being taken out
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Miners</div>
                <div class="ct-figure">{{ protocol.totalMiners.toLocaleString("en-US") }}</div>
                <div class="ct-note">wallets that have staked at least once</div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Schedule</div>
                <div class="ct-figure ct-copy">{{ scheduleLabel }}</div>
                <div class="ct-note">
                  end block {{ scheduleEnd ?? "—" }} · halving period
                  {{ formatBlocks(protocol.params.emissionHalvingPeriod) }} ·
                  {{ protocol.rewardDecimals }}-decimal rewards
                </div>
              </div>

              <div class="ct-slab">
                <div class="ct-label">Pools</div>
                <div class="ct-figure">{{ protocol.pools.length }}</div>
                <div class="ct-note">
                  {{ protocol.totalAllocationPoints.toString() }} allocation points in total
                </div>
              </div>
            </div>

            <div v-if="poolRows.length" class="ct-slab ct-gap-t2">
              <h3 class="ct-gap-b1">Pools and the two denominators</h3>
              <p class="ct-copy">
                Rewards are split between pools by <code>allocationPoints</code>, then inside a pool
                by reward <code>weight</code>. The staked column is a raw token amount in the stake
                token's own decimals; the weight column is the same stake normalised to 1e18, which
                is why the two columns do not look alike for a 6-decimal token.
              </p>
              <table class="ct-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Pool</th>
                    <th>Points</th>
                    <th>Share of points</th>
                    <th>Total staked</th>
                    <th>Total weight (1e18)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in poolRows" :key="row.id">
                    <td class="ct-num">{{ row.id }}</td>
                    <td>{{ row.name }}</td>
                    <td class="ct-num">{{ row.points }}</td>
                    <td class="ct-num">{{ row.pointsShare }}</td>
                    <td class="ct-num">{{ row.staked }}</td>
                    <td class="ct-num ct-mono">{{ row.weight }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ── 1 · What this is ────────────────────────────────────────── -->
          <section id="overview" class="ct-chapter" aria-label="What this protocol is" style="scroll-margin-top: 80px">
            <h2>1 · What this protocol is</h2>

            <p>
              Fractio vaults physical artworks and sells fractional ownership of them on
              Solana. Governance registers an artwork with a custodian, an artist payout
              address and an appraisal; registration deploys a dedicated SPL share token for that
              artwork and mints an ERC-721 provenance certificate to the custodian. The custody
              agreement and appraisal documents live at the artwork's
              <code>metadataURI</code> (IPFS or Arweave) — the contract stores the pointer, it
              cannot verify the contents.
            </p>

            <p>
              Each artwork's share token has a fixed supply of
              {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} shares (18 decimals, so
              <span class="ct-mono">1_000_000e18</span> base units). Buyers call
              <code>buyShares(artworkId, shareAmount, maxCost, referrer)</code> and the vault mints
              the shares straight into their wallet. That is the design difference worth
              understanding: a fraction is a real SPL balance you custody yourself, so it can be
              staked in the protocol's own pools, used as collateral, or traded on any Solana venue
              that lists it — rather than a line in a custodial ledger that only the operator can
              move.
            </p>

            <p>
              Pricing is on-chain and transparent. Every artwork prices on a linear bonding curve
              anchored at <code>basePrice</code>; the marginal price of the next whole share is
              <span class="ct-mono">basePrice × (1 + curveSlopeBps × sold / (10,000 × 1,000,000))</span>,
              so a purchase costs the integral of that line across the fill range it covers. At the
              live slope of {{ formatBps(protocol.params.curveSlopeBps) }} the final share of a
              completely sold-out artwork costs <span class="ct-muted">at most</span>
              {{ curveFullSupplyPremium }} more than the first one — the curve is convex, but at
              default settings it is shallow, which is exactly why the risks section talks about
              exit liquidity rather than about the curve.
            </p>

            <p>
              The gross purchase price is split by code: the platform fee goes to
              <code>FeeRouter</code>, and the remainder is divided between the artwork's
              <code>artistPayout</code> address and the vault's treasury (85% artist / 15% treasury
              at the deployed <code>artistShareBps = 8_500</code>; that constant is not read by this
              UI, so treat it as documented rather than live).
            </p>

            <div class="ct-callout ct-callout-info">
              <span>
                Two different tokens are easy to conflate. <strong>$ART</strong> is the protocol's
                own ERC-20 (hard cap 100,000,000) and the stake token of the reference deployment's
                second pool. Each artwork instead gets its own <code>ArtworkShare</code> token,
                mintable and burnable only by the vault. Staking $ART mines fees; it does not make
                you an owner of any artwork.
              </span>
            </div>

            <div class="ct-grid ct-grid-four ct-gap-t3">
              <div class="ct-slab ct-slab-tight">
                <div class="ct-label">Shares per artwork</div>
                <div class="ct-figure">
                  {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }}
                </div>
                <div class="ct-note">fixed supply, 18 decimals, one SPL token per artwork</div>
              </div>
              <div class="ct-slab ct-slab-tight">
                <div class="ct-label">Provenance</div>
                <div class="ct-figure ct-copy">1 ERC-721</div>
                <div class="ct-note">minted to the custodian at registration</div>
              </div>
              <div class="ct-slab ct-slab-tight">
                <div class="ct-label">Curve slope</div>
                <div class="ct-figure">{{ formatBps(protocol.params.curveSlopeBps) }}</div>
                <div class="ct-note">
                  documented default {{ formatBps(DEFAULT_PARAMS.curveSlopeBps) }}, ceiling
                  {{ formatBps(2_000) }}
                </div>
              </div>
              <div class="ct-slab ct-slab-tight">
                <div class="ct-label">Net proceeds to the artist</div>
                <div class="ct-figure">85%</div>
                <div class="ct-note">ArtworkVault.artistShareBps, from the contract source</div>
              </div>
            </div>
          </section>

          <!-- ── 2 · The mining loop ─────────────────────────────────────── -->
          <section id="loop" class="ct-chapter" aria-label="The fee-funded mining loop" style="scroll-margin-top: 80px">
            <h2>2 · The fee-funded mining loop</h2>

            <p>
              This is the core mechanic, and it is worth spelling out step by step because the whole
              economic claim of the protocol rests on it: <strong>mining has no funding source other
              than fees that were actually collected.</strong>
            </p>

            <div class="ct-stack">
              <div class="ct-slab">
                <span class="ct-tag ct-tag-accent ct-gap-b1">Step 1</span>
                <h3>A primary purchase charges a platform fee</h3>
                <p class="ct-copy ct-gap-b0">
                  <code>ArtworkVault.buyShares()</code> computes
                  <span class="ct-mono">platformFee = cost × platformFeeBps / 10,000</span> (floored)
                  and forwards it in the artwork's <code>paymentToken</code> by calling
                  <code>FeeRouter.payTokenFee(paymentToken, platformFee, referrer)</code>. The vault
                  keeps none of it. Live value:
                  <strong>{{ formatBps(protocol.params.platformFeeBps) }}</strong>
                  (default {{ formatBps(DEFAULT_PARAMS.platformFeeBps) }}, ceiling
                  {{ formatBps(1_000) }}).
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-accent ct-gap-b1">Step 2</span>
                <h3>FeeRouter splits it three ways</h3>
                <p class="ct-copy ct-gap-b0">
                  <span class="ct-mono">miningPart = amount × miningShareBps / 10,000</span> →
                  the reward budget;
                  <span class="ct-mono">referralPart = referrer == 0 ? 0 : amount × referralBps / 10,000</span>
                  → the referrer, paid in the same transaction;
                  <span class="ct-mono">treasuryPart = amount − miningPart − referralPart</span> →
                  the treasury. The treasury leg is a remainder rather than a third parameter, so
                  the three legs add up to exactly the fee and rounding dust can never be
                  stranded in the router. Live split:
                  <strong>{{ formatBps(protocol.params.miningShareBps) }}</strong> mining,
                  <strong>{{ formatBps(protocol.params.referralBps) }}</strong> referral,
                  <strong>{{ formatBps(treasuryBps) }}</strong> treasury — and when no referrer is
                  supplied the referral leg is never created, so it falls through to the treasury
                  automatically. There is no separate "unclaimed rebate" bucket.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-accent ct-gap-b1">Step 3</span>
                <h3>The mining slice is normalised into the reward asset</h3>
                <p class="ct-copy ct-gap-b0">
                  If the fee token is already the reward asset, it is transferred directly;
                  otherwise <code>FeeRouter</code> swaps it through Jupiter — an explicitly
                  configured path, or the default <span class="ct-mono">token → wSOL → rewardToken</span>
                  route — with <code>maxSwapSlippageBps = 500</code> (5%) protection. This swap is
                  the only place where the credited budget can end up smaller than the nominal
                  slice, which is why the next step measures rather than trusts.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-accent ct-gap-b1">Step 4</span>
                <h3>MiningPool verifies what it received</h3>
                <p class="ct-copy ct-gap-b0">
                  The router snapshots the pool's balance before it moves anything and calls
                  <code>notifyFeeDeposit(amount, floatBefore)</code>; the pool credits
                  <span class="ct-mono">received = min(balanceNow − floatBefore, amount)</span>. It
                  cannot simply credit its own balance: the pool also holds staked principal and
                  recycled fees, so <code>balanceOf(this)</code> would hand other people's deposits
                  to the reward reserve. Only the router may call this function, and it can only
                  ever increase the reserve.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-accent ct-gap-b1">Step 5</span>
                <h3>Stakers mine that budget</h3>
                <p class="ct-copy ct-gap-b0">
                  The credited amount is added to <code>rewardReserve</code> and the emission
                  schedule is re-priced (section 3). From then on every pool update releases a slice
                  of the reserve into its accumulator, and each staker's share follows their reward
                  weight (section 4). Emission that has already been released is not retroactively
                  claimable: <code>pendingRewardOf</code> prices elapsed emission against the weight
                  snapshot taken at the last accumulator update, so a position that did not exist
                  then earns none of it — it shares only in what is released after it joins.
                </p>
              </div>
            </div>

            <div class="ct-callout ct-callout-good ct-gap-t3">
              <span>
                <strong>The invariant:</strong>
                <span class="ct-mono">rewardReleased ≤ rewardReserve</span>. Every release is capped by
                the unspent reserve, so the pool can only ever pay out fees it actually received.
                Live: released {{ reward(released) }} of {{ reward(reserved) }} —
                {{ progressPercent }}% used, {{ reward(unspent) }} still unspent.
              </span>
            </div>

            <div class="ct-callout ct-callout-caution ct-gap-t2">
              <span>
                <strong>One configuration caveat, stated plainly.</strong> In the reference
                deployment <code>MiningPool</code> is constructed with
                <span class="ct-mono">miningToken = address(0)</span>, which makes the fee asset itself
                the reward asset: rewards are <em>transferred</em> out of the pool's balance, so the
                reserve is a hard cap at the token level. The contract also supports a distinct
                emission token, in which case <code>_payReward</code> mints it instead. The reserve
                still caps the accounting 1:1 against budget that was already funded, but the "it
                cannot pay out what it never received" property then belongs to the accounting, not
                to the token supply. Read <code>MiningPool.miningToken()</code> before assuming
                which configuration you are in.
              </span>
            </div>

            <div class="ct-callout ct-callout-info ct-gap-t2">
              <span>
                Also absent by design: no staking subsidy from a treasury, no pre-committed emission
                schedule, no inflation paid to stakers in the reference deployment. If nobody buys
                art, no fees arrive and nothing is mined. That is the whole funding model.
              </span>
            </div>
          </section>

          <!-- ── 3 · Emission schedule ───────────────────────────────────── -->
          <section id="emission" class="ct-chapter" aria-label="Emission schedule" style="scroll-margin-top: 80px">
            <h2>3 · Emission schedule</h2>

            <p>
              A fee deposit does not pay out immediately. It is added to the reserve and released
              block by block, so a small fee produces a slow stream rather than a one-block spike.
              The schedule is re-priced on every deposit, and the shaper is
              <code>tailEmissionBps</code>.
            </p>

            <div class="ct-slab">
              <pre class="ct-mono ct-gap-b0" style="line-height: 1.6; overflow-x: auto">fresh budget (current rate is 0):
  period           = min(emissionHalvingPeriod, unspent)
  emissionEndBlock = block.number + period
  rate             = max(1, unspent / period)           // reward units per block

extending a live schedule (current rate &gt; 0):
  extraBlocks      = received * 10_000 / (currentRate * tailEmissionBps)
  emissionEndBlock += extraBlocks

read live at any block:
  rewardPerBlockScaled() = (rewardReserve / (emissionEndBlock - block.number)) * ACC_PRECISION
  pool slice             = rate * blocks * allocationPoints / totalAllocationPoints
  hard cap               = rewardReserve - rewardReleased</pre>
            </div>

            <div class="ct-grid ct-split ct-gap-t3">
              <div class="ct-slab">
                <h3>A fresh budget opens a window</h3>
                <p class="ct-copy ct-gap-b0">
                  When the schedule is idle or exhausted, a deposit starts a window of
                  <code>emissionHalvingPeriod</code> blocks — live
                  {{ formatBlocks(protocol.params.emissionHalvingPeriod) }}
                  ({{ protocol.params.emissionHalvingDays.toFixed(1) }} days at 3 seconds per block),
                  documented default
                  {{ DEFAULT_PARAMS.emissionHalvingPeriod.toLocaleString("en-US") }} blocks. The
                  window is capped by the budget itself in reward units
                  (<span class="ct-mono">min(period, unspent)</span>) with a floor of 1 unit per block,
                  so a budget smaller than the period length is spread over fewer blocks instead of
                  flooring to zero and emitting nothing at all.
                </p>
              </div>

              <div class="ct-slab">
                <h3>A live schedule gets a tail</h3>
                <p class="ct-copy ct-gap-b0">
                  If a schedule is already running, the new budget does not reset the rate. The end
                  block is pushed out by
                  <span class="ct-mono">received × 10,000 / (rate × tailEmissionBps)</span>. At the live
                  tail of {{ formatBps(protocol.params.tailEmissionBps) }} that is twice the runway a
                  flat payout of the same budget would need, so each deposit extends the stream and
                  lowers the effective rate a little. Successive deposits therefore decay the rate
                  smoothly and asymptotically instead of creating a cliff when a window closes.
                </p>
              </div>
            </div>

            <p class="ct-gap-t3">
              Live now: <strong>{{ protocol.emissionPerBlock.toFixed(6) }}</strong>
              {{ protocol.rewardSymbol }} per block, {{ scheduleLabel }}, end block
              {{ scheduleEnd ?? "—" }}. Note the two properties of the formula above that a "halving"
              label hides, both of which are visible in <code>reserveStats()</code>:
            </p>

            <div class="ct-slab">
              <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                <li class="ct-gap-b1">
                  The rate is the <em>cumulative</em> reserve divided by the blocks remaining, so
                  inside a window the nominal rate drifts up as <code>emissionEndBlock</code>
                  approaches — the release is mildly back-loaded within a period rather than flat.
                </li>
                <li class="ct-gap-b1">
                  The unspent cap is what keeps that from overshooting:
                  <code>_previewEmission</code> caps every pool update at
                  <span class="ct-mono">rewardReserve − rewardReleased</span>, so the budget is never
                  exceeded no matter how the rate moves.
                </li>
                <li class="ct-gap-b1">
                  A pool with no stake banks nothing. When <code>totalWeight == 0</code>,
                  <code>_updatePool</code> advances <code>lastRewardBlock</code> without releasing
                  anything, so the window keeps ticking while no rewards accrue.
                </li>
                <li>
                  Recycled harvest fees raise <code>rewardReserve</code> <em>without</em> extending
                  <code>emissionEndBlock</code>, so they lift the payout rate for the rest of the
                  current window instead of lengthening it. The tokens never leave the pool either
                  way.
                </li>
              </ul>
            </div>

            <p class="ct-copy ct-gap-t3 ct-gap-b0">
              Practical consequence: do not model this schedule off-chain and expect to match. Call
              <code>reserveStats()</code> and <code>rewardPerBlockScaled()</code>, or read the numbers
              on this page, which come from exactly those calls.
            </p>
          </section>

          <!-- ── 4 · Weight precision ────────────────────────────────────── -->
          <section id="precision" class="ct-chapter" aria-label="Stake weight normalisation and the precision trap" style="scroll-margin-top: 80px">
            <h2>4 · Stake weight normalisation and the precision trap</h2>

            <p>
              Reward accounting is a MasterChef-style accumulator:
              <code>accRewardPerShare</code> stores reward per 1e18 units of stake weight. Two
              scaling decisions make that safe for tokens that are not 18-decimal, and one of them
              is a bug class worth documenting for anyone forking this code.
            </p>

            <div class="ct-slab">
              <pre class="ct-mono ct-gap-b0" style="line-height: 1.6; overflow-x: auto">weight        = amount * 10**(18 - stakeDecimals)        // stakeDecimals &lt; 18
              = amount / 10**(stakeDecimals - 18)        // stakeDecimals &gt; 18
ACC_PRECISION = 1e18 * 10**rewardDecimals                // immutable, set in the constructor

acc      += emission * ACC_PRECISION / totalWeight       // accumulator update
accrued   = weight * acc / ACC_PRECISION                 // a user's entitlement
pendingRewardOf(poolId, account) recomputes the accrual so it matches what harvest pays</pre>
            </div>

            <p class="ct-gap-t3">
              <strong>Why weight is normalised.</strong> Stakes are converted to a 1e18 scale before
              they touch the accumulator, so allocation points stay comparable across pools whose
              stake tokens have different decimals, and reward weight is decimals-independent. A
              6-decimal USDT stake of 33 tokens carries a weight of
              <span class="ct-mono">33e18</span>, not <span class="ct-mono">33e6</span>. That also means
              <code>amount</code> and <code>weight</code> are <em>not</em> interchangeable in
              integrations; see the checklist below.
            </p>

            <p>
              <strong>Why the denominator carries the reward decimals.</strong> The accumulator
              stores reward-per-1e18-weight, so the obvious denominator is a flat 1e18. With that
              choice an update credits
              <span class="ct-mono">emission × 1e18 / totalWeight = emission / (whole tokens staked)</span>
              — an integer that floors to zero whenever an update releases fewer reward units than
              there are whole tokens staked. For a 6-decimal reward asset such as the mock USDT in
              the reference deployment that happens constantly at realistic position sizes, and
              because the loss is silent the symptom is not an error but position values that simply
              never grow. The contract's own note records the observed failure: a 33 USDT position
              accruing <em>2 units</em> where it should have accrued <em>2,755</em>.
            </p>

            <p>
              Multiplying the denominator by the reward asset's decimals
              (<span class="ct-mono">1e18 × 10**rewardDecimals</span>) restores one unit of resolution
              per stake unit. That is also why <code>rewardDecimals</code> is an explicit constructor
              argument rather than something probed from <code>decimals()</code>: a missing or
              non-standard <code>decimals()</code> must fail loudly at deploy time instead of
              silently miscalibrating the accumulator. <code>ACC_PRECISION</code> is immutable, so
              getting it wrong is not a parameter change — it is a redeployment.
            </p>

            <div class="ct-slab ct-gap-t3">
              <h3 class="ct-gap-b1">Integrator checklist</h3>
              <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                <li class="ct-gap-b1">
                  Never re-derive pending rewards off-chain. Call
                  <code>pendingRewardOf(poolId, account)</code>, or
                  <code>pendingRewardAll(account)</code> for a wallet's whole portfolio. The view
                  recomputes the accrual with the pool's <code>weightAtUpdate</code> snapshot
                  specifically so it agrees with what <code>harvest</code> pays; dividing live
                  emission by live <code>totalWeight</code> does not, and understates incumbents.
                </li>
                <li class="ct-gap-b1">
                  Do not compare <code>amount</code> with <code>weight</code>. Use
                  <code>weightOf(poolId, account)</code> for reward maths and
                  <code>poolDecimals(poolId)</code> when you need to convert back.
                </li>
                <li class="ct-gap-b1">
                  Everything floors — <code>bpsOf</code>, the accumulator, the pending sync — always
                  in the protocol's favour. Expect a quote to sit at or a hair below an exact
                  pro-rata figure, never above it.
                </li>
                <li>
                  A quote is a view at one block. A <code>harvest</code> that lands a block or two
                  later pays a slightly different amount, and other people's deposits move the
                  denominator in between. Treat quotes as indications, not as signed amounts.
                </li>
              </ul>
            </div>
          </section>

          <!-- ── 5 · Fee schedule ────────────────────────────────────────── -->
          <section id="fees" class="ct-chapter" aria-label="Fee schedule" style="scroll-margin-top: 80px">
            <h2>5 · Fee schedule</h2>

            <p>
              Three fees are charged to users of the mining engine, and each has a hard ceiling that
              governance cannot exceed — the setter reverts with <code>FeeTooHigh</code> rather than
              clamping. The live column is the value published on-chain right now; a
              <span class="ct-tag ct-tag-warn">changed</span> marker means it differs from the
              documented default in <code>src/config/chain.ts</code>.
            </p>

            <table class="ct-table">
              <thead>
                <tr>
                  <th>Fee</th>
                  <th>Charged on</th>
                  <th>Live</th>
                  <th>Default</th>
                  <th>Ceiling</th>
                  <th>Where it goes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in feeRows" :key="row.fee">
                  <td>
                    <strong>{{ row.fee }}</strong>
                    <div class="ct-micro ct-quiet ct-mono">{{ row.contract }}</div>
                  </td>
                  <td class="ct-copy">{{ row.charged }}</td>
                  <td class="ct-num">
                    {{ row.live }}
                    <span v-if="row.diverges" class="ct-tag ct-tag-warn">changed</span>
                  </td>
                  <td class="ct-num ct-quiet">{{ row.documented }}</td>
                  <td class="ct-num">{{ row.ceiling }}</td>
                  <td class="ct-copy">{{ row.destination }}</td>
                </tr>
              </tbody>
            </table>

            <p class="ct-copy ct-gap-t2">
              A note on the deposit fee: it is charged in the <em>stake</em> token on the amount the
              pool actually receives, and the pool forwards it to its configured
              <code>treasury()</code>. In the reference deployment the router and the pool are wired
              to each other for fee intake, while <code>treasury()</code> is the deploy-time
              treasury address — so read <code>treasury()</code> before assuming the deposit fee
              passes through the three-way split that purchase fees do.
            </p>

            <h3 class="ct-gap-t3">The three-way split of a purchase fee</h3>
            <table class="ct-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Contract</th>
                  <th>Live</th>
                  <th>Default</th>
                  <th>Hard bound</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in splitRows" :key="row.parameter">
                  <td><strong>{{ row.parameter }}</strong></td>
                  <td class="ct-micro ct-mono">{{ row.contract }}</td>
                  <td class="ct-num">
                    {{ row.live }}
                    <span v-if="row.diverges" class="ct-tag ct-tag-warn">changed</span>
                  </td>
                  <td class="ct-num ct-quiet">{{ row.documented }}</td>
                  <td class="ct-num">{{ row.bound }}</td>
                  <td class="ct-copy">{{ row.note }}</td>
                </tr>
              </tbody>
            </table>

            <h3 class="ct-gap-t3">Emission shaping and pricing bounds</h3>
            <table class="ct-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Contract</th>
                  <th>Live</th>
                  <th>Default</th>
                  <th>Hard bound</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in shapeRows" :key="row.parameter">
                  <td><strong>{{ row.parameter }}</strong></td>
                  <td class="ct-micro ct-mono">{{ row.contract }}</td>
                  <td class="ct-num">
                    {{ row.live }}
                    <span v-if="row.diverges" class="ct-tag ct-tag-warn">changed</span>
                  </td>
                  <td class="ct-num ct-quiet">{{ row.documented }}</td>
                  <td class="ct-num">{{ row.bound }}</td>
                  <td class="ct-copy">{{ row.note }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- ── 6 · Worked example ──────────────────────────────────────── -->
          <section id="example" class="ct-chapter" aria-label="Worked example" style="scroll-margin-top: 80px">
            <h2>6 · Worked example</h2>

            <p>
              A round-number walkthrough so every line can be checked with a calculator and against
              the tables above. Assumptions: the documented default parameters in
              <code>src/config/chain.ts</code> — a
              {{ formatBps(DEFAULT_PARAMS.platformFeeBps) }} platform fee, a
              {{ formatBps(DEFAULT_PARAMS.miningShareBps) }} mining share and a
              {{ formatBps(DEFAULT_PARAMS.referralBps) }} referral rebate — a 6-decimal reward asset
              (the reference deployment's mock USDT; with an 18-decimal asset such as Solana USDT the
              integer unit counts scale by 10¹² while every token-denominated line below is
              unchanged), an idle reward schedule opened at the default
              {{ DEFAULT_PARAMS.emissionHalvingPeriod.toLocaleString("en-US") }}-block period, and a
              staker holding 25% of the pool's reward weight for the whole schedule. Where a live
              value above carries a <span class="ct-tag ct-tag-warn">changed</span> badge,
              substitute it: the arithmetic is identical.
            </p>

            <table class="ct-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Arithmetic</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Purchase cost</td>
                  <td class="ct-copy">given</td>
                  <td class="ct-num">10,000.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Platform fee</td>
                  <td class="ct-copy ct-mono">10,000 × 300 / 10,000</td>
                  <td class="ct-num">300.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Mining share</td>
                  <td class="ct-copy ct-mono">300 × 5,000 / 10,000</td>
                  <td class="ct-num">150.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Referral rebate (with a referrer)</td>
                  <td class="ct-copy ct-mono">300 × 2,000 / 10,000</td>
                  <td class="ct-num">60.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Treasury remainder</td>
                  <td class="ct-copy ct-mono">300 − 150 − 60</td>
                  <td class="ct-num">90.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Treasury leg with no referrer</td>
                  <td class="ct-copy ct-mono">300 − 150 − 0</td>
                  <td class="ct-num">150.000000 {{ protocol.rewardSymbol }}</td>
                </tr>
                <tr>
                  <td>Reward reserve credit</td>
                  <td class="ct-copy ct-mono">min(measured delta, 150)</td>
                  <td class="ct-num">
                    150.000000 {{ protocol.rewardSymbol }}
                    <span class="ct-quiet">(150,000,000 units at 6 decimals)</span>
                  </td>
                </tr>
                <tr>
                  <td>Fresh window length</td>
                  <td class="ct-copy ct-mono">min(1,209,600 blocks, 150,000,000 units)</td>
                  <td class="ct-num">1,209,600 blocks ≈ 42.0 days at 3s</td>
                </tr>
                <tr>
                  <td>Nominal emission rate</td>
                  <td class="ct-copy ct-mono">150,000,000 / 1,209,600</td>
                  <td class="ct-num">
                    124 units/block at 6 decimals = 0.000124 {{ protocol.rewardSymbol }}/block
                  </td>
                </tr>
                <tr>
                  <td>Whole pool, per day</td>
                  <td class="ct-copy ct-mono">150 / 42</td>
                  <td class="ct-num">≈ 3.571429 {{ protocol.rewardSymbol }}/day</td>
                </tr>
                <tr>
                  <td>Your reward weight</td>
                  <td class="ct-copy">given</td>
                  <td class="ct-num">25% of totalWeight</td>
                </tr>
                <tr>
                  <td>Your share of the budget</td>
                  <td class="ct-copy ct-mono">150 × 0.25</td>
                  <td class="ct-num">37.500000 {{ protocol.rewardSymbol }} gross</td>
                </tr>
                <tr>
                  <td>Harvest fee, recycled</td>
                  <td class="ct-copy ct-mono">37.5 × 500 / 10,000</td>
                  <td class="ct-num">
                    1.875000 {{ protocol.rewardSymbol }} back into rewardReserve
                  </td>
                </tr>
                <tr>
                  <td>Net to your wallet</td>
                  <td class="ct-copy ct-mono">37.5 − 1.875</td>
                  <td class="ct-num ct-good">
                    35.625000 {{ protocol.rewardSymbol }}
                  </td>
                </tr>
                <tr>
                  <td>Entry cost of the position itself</td>
                  <td class="ct-copy ct-mono">10,000 × 300 / 10,000 deposit fee</td>
                  <td class="ct-num">
                    300.000000 charged, 9,700.000000 credited as principal and weight
                  </td>
                </tr>
              </tbody>
            </table>

            <p class="ct-copy ct-gap-t3">
              That is 37.5 {{ protocol.rewardSymbol }} gross on a 10,000
              {{ protocol.rewardSymbol }} position — 0.375% — and it is not a yield, it is a share of
              one fee. Read the three qualifications:
            </p>

            <div class="ct-slab">
              <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                <li class="ct-gap-b1">
                  <strong>The 42 days assume nothing else happens.</strong> Any further fee deposit
                  extends <code>emissionEndBlock</code> and lowers the rate, and recycled harvest fees
                  raise it within the current window. The schedule is re-priced on every deposit, so
                  the realised stream is the integral of all of that, not the single-window figure.
                </li>
                <li class="ct-gap-b1">
                  <strong>The 25% assumes you keep 25% of the weight.</strong> Weight is a share of a
                  pool, so other people staking dilutes your slice even though the budget itself does
                  not change. Rewards follow weight at each accumulator update, not at deposit time.
                </li>
                <li>
                  <strong>If no more art sells, that is the entire yield.</strong> There is no other
                  funding source, no subsidy and no floor. The pool's income statement is the fee
                  revenue in the tables above; {{ reward(reserved) }} is the lifetime budget and
                  {{ reward(released) }} of it has been released.
                </li>
              </ul>
            </div>
          </section>

          <!-- ── 7 · Governance ─────────────────────────────────────────── -->
          <section id="governance" class="ct-chapter" aria-label="Governance and trust boundaries" style="scroll-margin-top: 80px">
            <h2>7 · Governance and trust boundaries</h2>

            <p>
              All four core contracts are <code>Ownable2Step</code>: ownership transfers in two
              steps, so a mistyped new owner does not orphan the contract. None of them is upgradeable
              — there is no proxy, no admin slot and no initializer anywhere in the codebase — so a
              rule change means a new deployment, not a silent patch.
            </p>

            <div class="ct-grid ct-split">
              <div class="ct-slab">
                <span class="ct-tag ct-tag-good ct-gap-b1">Governance can</span>
                <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                  <li class="ct-gap-b1">
                    Tune the three mining fees with
                    <code>setFeeParams(depositFeeBps, harvestFeeBps, earlyWithdrawFeeBps)</code>,
                    inside the immutable ceilings of {{ formatBps(1_000) }},
                    {{ formatBps(2_000) }} and {{ formatBps(3_000) }}.
                  </li>
                  <li class="ct-gap-b1">
                    Reshape emission with <code>setEmissionParams(halvingPeriod, tailBps)</code>:
                    200 – 10,512,000 blocks and a non-zero tail up to 100%.
                  </li>
                  <li class="ct-gap-b1">
                    Add and retune pools with <code>addPool(stakeToken, allocationPoints,
                    lockDuration, name)</code> and <code>setPool(poolId, allocationPoints,
                    lockDuration, active)</code>, which takes
                    <span class="ct-mono">type(uint256).max</span> to keep a field unchanged. A new
                    <code>lockDuration</code> is stamped per deposit, so raising it cannot
                    retroactively charge an existing position until that position stakes again.
                  </li>
                  <li class="ct-gap-b1">
                    Pause new deposits with <code>setDepositsPaused(true)</code>. Existing positions
                    keep withdrawing, harvesting and emergency-exiting.
                  </li>
                  <li class="ct-gap-b1">
                    Rewire the plumbing: <code>setFeeRouter</code> and <code>setTreasury</code> on the
                    pool, and on the router <code>setSplit</code> (mining ≤ 90%, referral ≤ 50%, and
                    the two together ≤ 100%), <code>setAcceptedFeeToken</code>,
                    <code>setSwapPath</code>, <code>setSwapRouter</code> and
                    <code>setMaxSwapSlippageBps</code>.
                  </li>
                  <li class="ct-gap-b1">
                    Register artworks, price them inside bounds
                    (<code>setPricing</code>: platform fee ≤ {{ formatBps(1_000) }}, artist share ≤
                    {{ formatBps(10_000) }}, curve slope ≤ {{ formatBps(2_000) }}) and suspend sales
                    per artwork.
                  </li>
                  <li>
                    Mark an artwork settled: <code>settleArtwork</code> accepts the artwork's
                    custodian <em>or</em> the owner, after which a wallet holding 100% of the shares
                    can pull the provenance certificate with <code>redeemCertificate</code>.
                  </li>
                </ul>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-bad ct-gap-b1">Governance cannot</span>
                <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                  <li class="ct-gap-b1">
                    Withdraw the reward asset. <code>recoverToken</code> reverts with
                    <code>CannotRecoverStakeToken</code> for the fee token and for the pool's reward
                    asset, so the reserve stakers are mining cannot be confiscated or re-routed by
                    an owner call.
                  </li>
                  <li class="ct-gap-b1">
                    Mint rewards from nothing in the reference deployment: the pool pays the fee
                    asset out of its own balance and every release is charged against
                    <code>rewardReserve</code>, capped at the unspent amount.
                  </li>
                  <li class="ct-gap-b1">
                    Drain fees through the router: only the pool may call
                    <code>collectFromPool</code>, and both the router's accepted fee assets and its
                    reward asset are excluded from <code>rescueToken</code>.
                  </li>
                  <li class="ct-gap-b1">
                    Block an exit. <code>emergencyWithdraw(poolId)</code> never reads or touches the
                    reward budget and never advances the accumulator, so it works even when the
                    reserve is empty or deposits are paused: it returns the full staked amount,
                    charges no withdrawal penalty, and forfeits pending rewards.
                  </li>
                  <li class="ct-gap-b1">
                    Upgrade the contracts or alter already-minted shares: supply is fixed at
                    {{ WHOLE_SHARES_PER_ARTWORK.toLocaleString("en-US") }} per artwork and only the
                    vault can mint or burn it.
                  </li>
                  <li>
                    Change <code>ACC_PRECISION</code>, the fee ceilings, the share supply or the
                    <code>SHARES_PER_ARTWORK</code> constant. Those are compile-time, not governance.
                  </li>
                </ul>
              </div>
            </div>

            <div class="ct-callout ct-callout-caution ct-gap-t3">
              <span>
                <strong>Two residual trust edges, stated rather than glossed over.</strong>
                <br />
                First: <code>recoverToken</code> reverts only for the fee asset and the pool's reward
                asset — it is not a blanket guarantee that "user funds are unreachable". A pool whose
                stake token is something else (the reference deployment registers $ART as its second
                pool) is not covered by that check, so an owner call could move that token out of the
                pool contract, staked balances included. Pool selection is therefore a trust decision,
                and governance should be a multisig or a timelock, not an EOA.
                <br />
                Second: $ART and $MINE have owner-controlled minting via <code>setMinter</code>. That
                does not affect the fee-funded stream while the reward asset stays the fee token —
                which is what the reference deployment ships — but it does affect those tokens'
                supply, and it is the reason section 2 tells you to check
                <code>miningToken()</code> before trusting the "self-funded" label.
              </span>
            </div>
          </section>

          <!-- ── 8 · Risks ──────────────────────────────────────────────── -->
          <section id="risks" class="ct-chapter" aria-label="Risks, stated plainly" style="scroll-margin-top: 80px">
            <h2>8 · Risks, stated plainly</h2>

            <p>
              Everything above describes mechanics. This section describes what can go wrong with
              them. If you only read one part of this page, read this one.
            </p>

            <div class="ct-grid ct-split">
              <div class="ct-slab">
                <span class="ct-tag ct-tag-bad ct-gap-b1">Liquidity</span>
                <h3>Fractional art is illiquid</h3>
                <p class="ct-copy ct-gap-b0">
                  The vault sells primary shares and never buys them back. There is no AMM, no order
                  book, no market maker and no protocol redemption in this implementation. Exiting
                  means finding another buyer on whatever venue lists the share token, or assembling
                  100% of the shares to redeem the physical piece. A real SPL balance is not the
                  same thing as a sellable one.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-warn ct-gap-b1">Entry price</span>
                <h3>The curve only moves the ask up</h3>
                <p class="ct-copy ct-gap-b0">
                  Your cost is the integral of the curve across the range you fill, so the more of an
                  artwork that is already sold, the more you pay per share: the final share of a
                  fully sold artwork costs {{ curveFullSupplyPremium }} more than the first one at the
                  live slope. That is small, but it is a one-way ratchet with nothing on the other
                  side — the price you could exit at is whatever a future buyer will pay, and that
                  can be below your entry.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-bad ct-gap-b1">Yield</span>
                <h3>Mining is fee revenue, not a promise</h3>
                <p class="ct-copy ct-gap-b0">
                  Every unit paid to stakers was first collected as a platform fee. Once the reserve
                  is spent and no new fees arrive, nothing more accrues —
                  <code>_previewEmission</code> caps every release at the unspent reserve, and once
                  <code>block.number</code> passes <code>emissionEndBlock</code>,
                  <code>rewardPerBlockScaled()</code> returns 0 as well. Nothing in the contracts
                  creates a floor, a minimum rate or a buy-back, and this page deliberately publishes
                  no APY because any such number would be an assumption about future art sales. Live:
                  {{ reward(reserved) }} ever committed, {{ reward(released) }} released,
                  {{ reward(unspent) }} unspent.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-warn ct-gap-b1">Reward asset</span>
                <h3>You are paid in a stablecoin, with stablecoin risk</h3>
                <p class="ct-copy ct-gap-b0">
                  In the reference deployment's fee pool, rewards and principal are the same SPL token
                  ({{ protocol.rewardSymbol }}, {{ protocol.rewardDecimals }} decimals), so its
                  issuer's risks — freezes, blacklists, de-pegging, redemption gates — apply to your
                  mined balance exactly as much as to your deposit. Staking a different asset such as
                  $ART in the fraction pool adds that asset's own price and liquidity risk on top of
                  your principal. The protocol cannot hedge or substitute either one.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-warn ct-gap-b1">Custody</span>
                <h3>The artwork is physical and off-chain</h3>
                <p class="ct-copy ct-gap-b0">
                  A custodian holds the piece. The ERC-721 certificate is a provenance record, not
                  the artwork, and the contract cannot enforce delivery, insurance, storage
                  conditions or authenticity. Redemption needs the artwork to be marked settled (the
                  custodian or governance can do that) and one wallet to hold 100% of the shares.
                  Everything after that — shipping, title, disputes — is a legal process the code
                  does not referee.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-warn ct-gap-b1">Governance</span>
                <h3>Parameters move, and appraisals are trusted input</h3>
                <p class="ct-copy ct-gap-b0">
                  Governance chooses which artworks exist, at what <code>basePrice</code>, with which
                  custodian, against an appraisal it supplies itself:
                  <code>appraisedValueUSD</code> is recorded but the sale price does not derive from
                  it, so a stale or optimistic appraisal has no on-chain enforcement. Fee parameters
                  are bounded, but the bounds still allow fees to triple from today's defaults, and
                  the residual trust edges in section 7 apply.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-tag-bad ct-gap-b1">Code</span>
                <h3>Smart contracts can be buggy</h3>
                <p class="ct-copy ct-gap-b0">
                  This is a reference implementation written for study. No third-party audit of this
                  codebase is included in the repository; the published audit of the project this one
                  takes inspiration from covers <em>their</em> contracts, not these. The unit
                  test-suite in <code>contracts/test/</code> pins the behaviours described above,
                  including the solvency invariant, but tests are not an audit. Reward accounting —
                  accumulator precision, weight snapshotting, rounding — is exactly the kind of code
                  where a subtle error is silent rather than loud.
                </p>
              </div>

              <div class="ct-slab">
                <span class="ct-tag ct-gap-b1">Chain</span>
                <h3>Wallets, RPC and approvals</h3>
                <p class="ct-copy ct-gap-b0">
                  Solana liveness, RPC availability, gas spikes and reorganisations all
                  apply; this UI reads through a public RPC and shows whatever it returns, including
                  stale data if the endpoint lags. Any approval you grant to the vault, the router or
                  a pool can be spent according to that contract's code, so approve the amount you
                  need rather than an unlimited allowance where you can.
                </p>
              </div>
            </div>

            <div class="ct-callout ct-callout-info ct-gap-t3">
              <span>
                This page documents a reference implementation of a fee-funded fractional-art
                protocol. It is not investment advice, not a solicitation, and not a valuation of any
                artwork or token. Read <code>contracts/contracts/core/</code> — the Solidity is the
                only authoritative description of what these contracts do, and where it disagrees
                with any page, the Solidity wins.
              </span>
            </div>
          </section>

          <!-- ── 9 · Contract reference ─────────────────────────────────── -->
          <section id="contracts" class="ct-chapter" aria-label="Contract reference" style="scroll-margin-top: 80px">
            <h2>9 · Contract reference</h2>

            <p>
              The four core contracts this dApp talks to, with the addresses the bundle actually
              resolves at build time. A blank address means the deployment manifest and
              <code>.env.local</code> both left it unset; the UI then shows a "not configured" state
              instead of a zero address.
            </p>

            <table class="ct-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Address</th>
                  <th>What it does</th>
                  <th>ABI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in contracts" :key="row.name">
                  <td><strong class="ct-mono">{{ row.name }}</strong></td>
                  <td>
                    <template v-if="isConfigured(row.address)">
                      <a
                        v-if="explorerLink(row.address)"
                        :href="`${explorerLink(row.address)}`"
                        target="_blank"
                        rel="noreferrer"
                        class="ct-mono ct-micro"
                        style="word-break: break-all"
                      >
                        {{ row.address }}
                      </a>
                      <span v-else class="ct-mono ct-micro" style="word-break: break-all">
                        {{ row.address }}
                      </span>
                    </template>
                    <span v-else class="ct-tag ct-tag-warn">not configured</span>
                  </td>
                  <td class="ct-copy">{{ row.role }}</td>
                  <td class="ct-micro ct-mono">{{ row.abi }}</td>
                </tr>
              </tbody>
            </table>

            <div class="ct-grid ct-split ct-gap-t3">
              <div class="ct-slab">
                <h3>How these addresses get here</h3>
                <p class="ct-copy ct-gap-b0">
                  <code>contracts/scripts/deploy.js</code> writes
                  <code>deployments/&lt;network&gt;.json</code> with the deployed addresses, the
                  parameters captured at deploy time and the pool list.
                  <code>contracts/scripts/export-abi.js</code> then exports the ABIs into
                  <code>website/src/contracts/abis/</code> and generates
                  <code>website/src/contracts/addresses.ts</code>. <code>src/config/chain.ts</code>
                  lets each address be overridden per environment with a <code>VITE_*</code>
                  variable, and <code>IS_CONFIGURED</code> is the check the UI uses before it tries
                  to read.
                </p>
              </div>

              <div class="ct-slab">
                <h3>Configuration facts worth knowing</h3>
                <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                  <li class="ct-gap-b1">
                    Target chain: {{ TARGET_CHAIN.name }} (chain id {{ TARGET_CHAIN.chainId }}),
                    explorer <span class="ct-mono">{{ TARGET_CHAIN.explorer || "none configured" }}</span>.
                  </li>
                  <li class="ct-gap-b1">
                    Reward asset: the fee token, {{ protocol.rewardSymbol }}, at
                    {{ protocol.rewardDecimals }} decimals — paid to miners as-is.
                  </li>
                  <li class="ct-gap-b1">
                    <code>MiningPool</code> was constructed with
                    <span class="ct-mono">miningToken = address(0)</span> in the reference deployment,
                    so the protocol's own $MINE token is deployed but not used as the reward asset.
                    Verify against <code>miningToken()</code> before drawing conclusions.
                  </li>
                  <li>
                    Every address above is a plain, non-upgradeable deployment: there is no proxy
                    behind them, so a redeployment produces new addresses rather than mutating these.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <!-- ── 10 · Integrator quickstart ─────────────────────────────── -->
          <section id="integrators" class="ct-chapter" aria-label="Integrator quickstart" style="scroll-margin-top: 80px">
            <h2>10 · Integrator quickstart</h2>

            <p>
              The calls an integrator needs, in their real argument order. Amounts are integer
              smallest units everywhere — never floats — and every write needs an ERC-20 approval to
              the contract that pulls the tokens.
            </p>

            <h3>Mine fees</h3>
            <div class="ct-slab ct-slab-tight ct-gap-b2">
              <pre class="ct-mono ct-gap-b0" style="line-height: 1.6; overflow-x: auto">// Views (no gas, no wallet)
const pending = await pool.pendingRewardOf(poolId, account);     // (poolId, account)
const all     = await pool.pendingRewardAll(account);            // every pool in one call
const stats   = await pool.reserveStats();                       // reserve, released, unspent,
                                                                 // endBlock, perBlockScaled, halvingPeriod

// Writes (approve the stake token to the pool first)
await pool.deposit(poolId, amount, referrer);                    // (poolId, amount, referrer)
await pool.harvest(poolId);                                      // (poolId)
await pool.harvestAndRestake(poolId);                            // (poolId) — stakeToken == rewardAsset only
await pool.withdraw(poolId, amount);                             // (poolId, amount)
await pool.emergencyWithdraw(poolId);                            // (poolId) — forfeits pending rewards

// Anyone may poke every pool to equalise accumulators before comparing rates
await pool.pokeAllPools();                                       // ()
const releasedPerPool = await pool.pokeAllPoolsDetailed();       // () — per-pool released by this call

// Custodial / contract-based miners
await pool.depositFor(poolId, amount, beneficiary, referrer);     // (poolId, amount, beneficiary, referrer)</pre>
            </div>

            <h3>Pay and preview a fee</h3>
            <div class="ct-slab ct-slab-tight ct-gap-b2">
              <pre class="ct-mono ct-gap-b0" style="line-height: 1.6; overflow-x: auto">// The three legs always sum to `amount`; the treasury leg absorbs rounding dust.
const [miningShare, referralShare, treasuryShare] =
  await router.previewSplit(amount, hasReferrer);                // (amount, hasReferrer)

// Approve the router for `amount` of `feeToken`, then:
await router.payTokenFee(feeToken, amount, referrer);            // (feeToken, amount, referrer)
await router.payDefaultFee(amount, referrer);                    // (amount, referrer)
await router.payNativeFee(referrer, { value });                   // (referrer) payable, SOL</pre>
            </div>

            <h3>Buy and quote artwork fractions</h3>
            <div class="ct-slab ct-slab-tight ct-gap-b2">
              <pre class="ct-mono ct-gap-b0" style="line-height: 1.6; overflow-x: auto">// Quote before approving anything. shareAmount is 18-decimal share units (1e18 = one share).
const cost = await vault.quoteBuy(artworkId, shareAmount);       // (artworkId, shareAmount)

// maxCost is a hard ceiling; the call reverts (FeeTooHigh) rather than filling above it.
await vault.buyShares(artworkId, shareAmount, maxCost, referrer);
                                                                 // (artworkId, shareAmount, maxCost, referrer)

// Market state in one round-trip:
const snap = await vault.artworkSnapshot(artworkId);
// → sharesSold, sharesRemaining, marginalPrice, nextShareCost, volume, active, settled</pre>
            </div>

            <div class="ct-slab">
              <h3 class="ct-gap-b1">Gotchas that cost real transactions</h3>
              <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                <li class="ct-gap-b1">
                  <strong>Argument order is not uniform.</strong>
                  <code>deposit(poolId, amount, referrer)</code> leads with the pool id;
                  <code>buyShares(artworkId, shareAmount, maxCost, referrer)</code> leads with the
                  artwork id and has four arguments. Both are easy to transpose and neither will
                  complain about a plausible-looking wrong order.
                </li>
                <li class="ct-gap-b1">
                  <strong>Units differ per call.</strong> <code>amount</code> is in the stake token's
                  smallest units, <code>shareAmount</code> is always 18-decimal share units, and
                  <code>cost</code>/<code>maxCost</code> are in the artwork's
                  <code>paymentToken</code> units.
                </li>
                <li class="ct-gap-b1">
                  <strong>Approvals.</strong> Stake token → pool for staking, fee token → router for
                  fee payment, payment token → vault for a purchase.
                  <code>harvestAndRestake</code> needs no new approval because nothing leaves the
                  pool, and it reverts with <code>Unauthorized</code> unless the pool's stake token
                  is its reward asset.
                </li>
                <li class="ct-gap-b1">
                  <strong>Whitelisted fee assets only.</strong> The router rejects tokens that were
                  never accepted, so a purchase in an artwork whose <code>paymentToken</code> is not
                  whitelisted reverts with <code>NotAccepted</code> inside <code>buyShares</code>.
                </li>
                <li>
                  <strong>Read the pool before assuming a reward asset.</strong>
                  <code>miningToken()</code> decides whether rewards are transferred or minted, and
                  <code>treasury()</code> decides where deposit and early-withdraw fees land.
                </li>
              </ul>
            </div>
          </section>

          <!-- ── Sources ────────────────────────────────────────────────── -->
          <section class="ct-chapter" aria-label="How to verify every number on this page" style="padding-top: 0">
            <div class="ct-slab">
              <h3 class="ct-gap-b1">How to verify every number on this page</h3>
              <ul class="ct-copy" style="margin: 0; padding-left: 20px">
                <li class="ct-gap-b1">
                  <strong>Live columns</strong> come from <code>src/stores/protocol.ts</code>, which
                  batches <code>reserveStats()</code>, the fee getters,
                  <code>emissionHalvingPeriod()</code>, <code>tailEmissionBps()</code>,
                  <code>totalMiners()</code>, <code>totalRewardsClaimed()</code>,
                  <code>recycledFees()</code>, <code>poolInfo()</code> and
                  <code>poolCount()</code> from a single RPC provider.
                </li>
                <li class="ct-gap-b1">
                  <strong>Documented defaults</strong> come from <code>DEFAULT_PARAMS</code> in
                  <code>src/config/chain.ts</code> — the values the UI falls back to when a read has
                  not succeeded yet.
                </li>
                <li class="ct-gap-b1">
                  <strong>Ceilings, ranges and behaviour</strong> come from the Solidity in
                  <code>contracts/contracts/core/</code>: constants such as
                  <code>MAX_DEPOSIT_FEE_BPS</code>, the emission maths in <code>_creditReserve</code>
                  and <code>rewardPerBlockScaled</code>, and the precision argument documented on
                  <code>_normalize</code> and <code>ACC_PRECISION</code>.
                </li>
                <li>
                  <strong>Not read by this UI:</strong> the vault's artwork list, per-artwork share
                  tokens, <code>artistShareBps</code>, <code>treasury()</code> and
                  <code>miningToken()</code>. Those are quoted from the contract source, so treat
                  them as documented values and confirm them on-chain if a decision depends on them.
                </li>
              </ul>
            </div>
          </section>
        </div>
    </div>
  </div>
</template>
