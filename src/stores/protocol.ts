/**
 * Protocol store: mining pools, the fee-funded reward budget and user positions.
 *
 * Reads are batched through a single provider and refreshed on an interval; writes go through a
 * small `submit` wrapper that keeps a transaction log for the UI.
 */
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import type { ContractTransactionResponse } from "ethers";

import { ADDRESSES, REWARD_DECIMALS, BSC_BLOCK_TIME_SECONDS, DEFAULT_PARAMS, type ProtocolParams } from "@/config/chain";
import {
  artToken,
  erc20,
  feeToken,
  feeRouter,
  miningPool,
  miningToken,
  toObject,
  type PoolInfo,
  type ReserveStats,
  type UserInfo,
} from "@/contracts";
import { useWalletStore } from "@/stores/wallet";
import { bpsOf, formatUnits, parseUnits } from "@/utils/format";
import { describeError, ensureAllowance, explorerTxUrl } from "@/utils/tx";

export interface PoolView extends PoolInfo {
  id: number;
  /** Symbol of the staked token, resolved once per refresh. */
  symbol: string;
  decimals: number;
  /** This wallet's position in the pool. */
  user: UserInfo;
  /** Unclaimed rewards quoted by the contract at the current block. */
  pending: bigint;
  /** Whether this wallet currently satisfies the pool's loyalty lock. */
  locked: boolean;
  /** Total weight across all pools, for share-of-emissions maths. */
  shareOfWeight: number;
}

export interface TxLogEntry {
  hash: string;
  label: string;
  status: "pending" | "success" | "error";
  message?: string;
  explorerUrl?: string;
}

export const useProtocolStore = defineStore("protocol", () => {
  const wallet = useWalletStore();

  const pools = ref<PoolView[]>([]);
  const reserve = shallowRef<ReserveStats | null>(null);
  const params = ref<ProtocolParams>({ ...DEFAULT_PARAMS });
  const rewardSymbol = ref("USDT");
  const totalMiners = ref(0n);
  const totalRewardsClaimed = ref(0n);
  const recycledFees = ref(0n);
  const rewardsPaused = ref(false);
  const totalAllocationPoints = ref(0n);
  const currentBlock = ref(0);

  const loading = ref(false);
  const lastError = ref("");
  const lastUpdated = ref(0);
  const txLog = ref<TxLogEntry[]>([]);

  /** Wallet balances relevant to the mining flow. */
  const feeTokenBalance = ref(0n);
  const artTokenBalance = ref(0n);
  const mineTokenBalance = ref(0n);
  const feeTokenAllowanceForPool = ref(0n);

  const rewardDecimals = REWARD_DECIMALS;

  /** Total claimable across every pool. */
  const totalPending = computed(() =>
    pools.value.reduce((sum, pool) => sum + pool.pending, 0n),
  );

  /** Weighted average deposit fee as actually published on-chain. */
  const depositFeeBps = computed(() => params.value.depositFeeBps);
  const harvestFeeBps = computed(() => params.value.harvestFeeBps);

  /** Reward budget still to be released, in whole reward tokens. */
  const unspentBudget = computed(() =>
    reserve.value ? Number(formatUnits(reserve.value.unspent, rewardDecimals, { maxFractionDigits: 2 }).replace(/,/g, "")) : 0,
  );

  /** Per-block emission in whole reward tokens. */
  const emissionPerBlock = computed(() => {
    if (!reserve.value) return 0;
    const scaled = reserve.value.perBlockScaled;
    return Number(scaled) / 10 ** (18 + rewardDecimals);
  });

  /** Progress of the funded emission schedule, 0..1. */
  const emissionProgress = computed(() => {
    if (!reserve.value || reserve.value.reserve === 0n) return 0;
    return Number((reserve.value.released * 10_000n) / reserve.value.reserve) / 10_000;
  });

  function pushTx(entry: TxLogEntry): void {
    txLog.value = [entry, ...txLog.value].slice(0, 12);
  }

  function updateTx(hash: string, patch: Partial<TxLogEntry>): void {
    txLog.value = txLog.value.map((entry) => (entry.hash === hash ? { ...entry, ...patch } : entry));
  }

  /**
   * Send a write and track it in the transaction log.
   * @param label Human label shown in the activity feed.
   * @param send Function returning the transaction response.
   */
  async function submit(label: string, send: () => Promise<ContractTransactionResponse>): Promise<boolean> {
    lastError.value = "";
    try {
      const tx = await send();
      pushTx({ hash: tx.hash, label, status: "pending", explorerUrl: explorerTxUrl(tx.hash) });
      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        updateTx(tx.hash, { status: "error", message: "Transaction reverted." });
        return false;
      }
      updateTx(tx.hash, { status: "success" });
      await refresh();
      return true;
    } catch (caught) {
      const message = describeError(caught);
      lastError.value = message;
      // Reuse the pending hash when the revert happened after broadcast.
      const hash = txLog.value.find((entry) => entry.status === "pending")?.hash;
      if (hash) updateTx(hash, { status: "error", message });
      else pushTx({ hash: "", label, status: "error", message });
      return false;
    }
  }

  /** Read the pool's published parameters and global counters. */
  async function refreshParams(poolContract: ReturnType<typeof miningPool>): Promise<void> {
    const [
      deposit,
      harvest,
      early,
      halving,
      tail,
      points,
      miners,
      claimed,
      recycled,
      paused,
    ] = await Promise.all([
      poolContract.depositFeeBps(),
      poolContract.harvestFeeBps(),
      poolContract.earlyWithdrawFeeBps(),
      poolContract.emissionHalvingPeriod(),
      poolContract.tailEmissionBps(),
      poolContract.totalAllocationPoints(),
      poolContract.totalMiners(),
      poolContract.totalRewardsClaimed(),
      poolContract.recycledFees(),
      poolContract.depositsPaused(),
    ]);

    totalAllocationPoints.value = points as bigint;
    totalMiners.value = miners as bigint;
    totalRewardsClaimed.value = claimed as bigint;
    recycledFees.value = recycled as bigint;
    rewardsPaused.value = paused as boolean;

    params.value = {
      ...params.value,
      depositFeeBps: Number(deposit),
      harvestFeeBps: Number(harvest),
      earlyWithdrawFeeBps: Number(early),
      emissionHalvingPeriod: Number(halving),
      // BSC produces a block roughly every 3 seconds.
      emissionHalvingDays: (Number(halving) * BSC_BLOCK_TIME_SECONDS) / 86_400,
      tailEmissionBps: Number(tail),
    };
  }

  /** Refresh every read path. Safe to call repeatedly. */
  async function refresh(): Promise<void> {
    const provider = wallet.getReadProvider();
    if (!provider) {
      lastError.value = "No RPC provider available.";
      return;
    }
    loading.value = true;
    try {
      const poolContract = miningPool(provider);
      const userAddress = wallet.address;

      const [stats, blockNumber] = await Promise.all([
        poolContract.reserveStats(),
        provider.getBlockNumber(),
      ]);
      currentBlock.value = blockNumber;
      reserve.value = toObject<ReserveStats>(stats);

      await refreshParams(poolContract);

      const count = Number(await poolContract.poolCount());
      const poolViews: PoolView[] = [];

      for (let id = 0; id < count; id += 1) {
        const raw = toObject<PoolInfo>(await poolContract.poolInfo(id));
        const token = erc20(raw.stakeToken, provider);
        const [symbol, decimals] = await Promise.all([
          token.symbol().catch(() => "?"),
          token.decimals().catch(() => 18),
        ]);

        const user = userAddress
          ? toObject<UserInfo>(await poolContract.userInfo(id, userAddress))
          : {
              amount: 0n,
              weight: 0n,
              rewardDebt: 0n,
              pendingReward: 0n,
              unlockTime: 0n,
              lastDepositBlock: 0n,
              referrer: "",
            };

        const pending = userAddress
          ? ((await poolContract.pendingRewardOf(id, userAddress)) as bigint)
          : 0n;

        poolViews.push({
          ...raw,
          id,
          symbol: String(symbol),
          decimals: Number(decimals),
          user,
          pending,
          locked: userAddress ? BigInt(blockNumber) < user.unlockTime : false,
          shareOfWeight:
            raw.totalWeight > 0n
              ? Number((user.weight * 10_000n) / raw.totalWeight) / 100
              : 0,
        });
      }
      pools.value = poolViews;

      // Token symbols and wallet balances.
      const fee = feeToken(provider);
      rewardSymbol.value = String(await fee.symbol().catch(() => "USDT"));

      if (userAddress) {
        const [feeBalance, artBalance, mineBalance] = await Promise.all([
          fee.balanceOf(userAddress) as Promise<bigint>,
          artToken(provider).balanceOf(userAddress) as Promise<bigint>,
          // The emission token only exists in the "distinct reward token" configuration; the
          // default deployment mints nothing and pays miners in the fee asset itself.
          ADDRESSES.miningToken
            ? (miningToken(provider).balanceOf(userAddress) as Promise<bigint>).catch(() => 0n)
            : Promise.resolve(0n),
        ]);
        feeTokenBalance.value = feeBalance;
        artTokenBalance.value = artBalance;
        mineTokenBalance.value = mineBalance;

        const poolAddress = await poolContract.getAddress();
        feeTokenAllowanceForPool.value = (await fee.allowance(
          userAddress,
          poolAddress,
        )) as bigint;
      } else {
        feeTokenBalance.value = 0n;
        artTokenBalance.value = 0n;
        mineTokenBalance.value = 0n;
        feeTokenAllowanceForPool.value = 0n;
      }

      lastUpdated.value = Date.now();
      lastError.value = "";
    } catch (caught) {
      lastError.value = describeError(caught);
    } finally {
      loading.value = false;
    }
  }

  /** Deposit into a pool, approving the staking token first when needed. */
  async function deposit(poolId: number, amountText: string, referrer = ""): Promise<boolean> {
    const pool = pools.value.find((candidate) => candidate.id === poolId);
    if (!pool) return false;
    const signer = wallet.requireSigner();
    const provider = wallet.getReadProvider();
    if (!provider) return false;

    const amount = parseUnits(amountText, pool.decimals);
    if (amount === 0n) {
      lastError.value = "Enter an amount greater than zero.";
      return false;
    }

    const poolContract = miningPool(signer);
    const token = erc20(pool.stakeToken, signer);
    const poolAddress = await poolContract.getAddress();

    const approval = await ensureAllowance(token, poolAddress, amount, signer);
    if (approval) pushTx({ ...approval, label: `Approve ${pool.symbol}`, status: "success" });

    const referrerAddress = /^0x[0-9a-fA-F]{40}$/.test(referrer) ? referrer : wallet.address;
    return submit(`Stake ${pool.symbol}`, () => poolContract.deposit(poolId, amount, referrerAddress) as Promise<ContractTransactionResponse>);
  }

  /** Withdraw staked principal; the pool charges a penalty while the lock is active. */
  async function withdraw(poolId: number, amountText: string): Promise<boolean> {
    const pool = pools.value.find((candidate) => candidate.id === poolId);
    if (!pool) return false;
    const signer = wallet.requireSigner();
    const amount = parseUnits(amountText, pool.decimals);
    if (amount === 0n) {
      lastError.value = "Enter an amount greater than zero.";
      return false;
    }
    const poolContract = miningPool(signer);
    return submit(`Unstake ${pool.symbol}`, () =>
      poolContract.withdraw(poolId, amount) as Promise<ContractTransactionResponse>,
    );
  }

  /** Claim mined fees from one pool. */
  async function harvest(poolId: number): Promise<boolean> {
    const pool = pools.value.find((candidate) => candidate.id === poolId);
    const signer = wallet.requireSigner();
    const poolContract = miningPool(signer);
    return submit(`Claim rewards${pool ? ` (${pool.symbol})` : ""}`, () =>
      poolContract.harvest(poolId) as Promise<ContractTransactionResponse>,
    );
  }

  /** Claim and restake in one transaction. */
  async function harvestAndRestake(poolId: number): Promise<boolean> {
    const signer = wallet.requireSigner();
    const poolContract = miningPool(signer);
    return submit("Claim & compound", () =>
      poolContract.harvestAndRestake(poolId) as Promise<ContractTransactionResponse>,
    );
  }

  /** Exit a position and forfeit pending rewards. */
  async function emergencyWithdraw(poolId: number): Promise<boolean> {
    const signer = wallet.requireSigner();
    const poolContract = miningPool(signer);
    return submit("Emergency exit", () =>
      poolContract.emergencyWithdraw(poolId) as Promise<ContractTransactionResponse>,
    );
  }

  /** Fund the mining reserve directly (paying a platform fee). */
  async function payFee(amountText: string, referrer = ""): Promise<boolean> {
    const signer = wallet.requireSigner();
    const provider = wallet.getReadProvider();
    if (!provider) return false;

    const amount = parseUnits(amountText, rewardDecimals);
    if (amount === 0n) {
      lastError.value = "Enter an amount greater than zero.";
      return false;
    }

    const router = feeRouter(signer);
    const routerAddress = await router.getAddress();
    const token = feeToken(signer);
    const tokenAddress = await token.getAddress();
    const approval = await ensureAllowance(token, routerAddress, amount, signer);
    if (approval) pushTx({ ...approval, label: `Approve ${rewardSymbol.value}`, status: "success" });

    const referrerAddress = /^0x[0-9a-fA-F]{40}$/.test(referrer) ? referrer : wallet.address;
    // Ask the router itself for the split so the label matches what will actually happen.
    const split = await router.previewSplit(amount, referrerAddress !== wallet.address);
    const miningShare = split.miningShare as bigint;

    return submit(
      `Pay fee → ${formatUnits(miningShare, rewardDecimals, { maxFractionDigits: 2 })} ${rewardSymbol.value} to mining`,
      () =>
        router.payTokenFee(tokenAddress, amount, referrerAddress) as Promise<ContractTransactionResponse>,
    );
  }

  /** Reward share a deposit of `amount` would leave in the mining reserve. */
  function previewMiningContribution(amountText: string): bigint {
    try {
      const amount = parseUnits(amountText, rewardDecimals);
      return bpsOf(amount, params.value.miningShareBps);
    } catch {
      return 0n;
    }
  }

  return {
    pools,
    reserve,
    params,
    rewardSymbol,
    rewardDecimals,
    totalMiners,
    totalRewardsClaimed,
    recycledFees,
    rewardsPaused,
    totalAllocationPoints,
    currentBlock,
    loading,
    lastError,
    lastUpdated,
    txLog,
    feeTokenBalance,
    artTokenBalance,
    mineTokenBalance,
    feeTokenAllowanceForPool,
    totalPending,
    depositFeeBps,
    harvestFeeBps,
    unspentBudget,
    emissionPerBlock,
    emissionProgress,
    refresh,
    deposit,
    withdraw,
    harvest,
    harvestAndRestake,
    emergencyWithdraw,
    payFee,
    previewMiningContribution,
  };
});
