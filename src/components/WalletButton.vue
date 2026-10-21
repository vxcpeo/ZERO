<script setup lang="ts">
import { ref } from "vue";

import { useWalletStore } from "@/stores/wallet";
import { useProtocolStore } from "@/stores/protocol";
import WalletModal from "@/components/WalletModal.vue";

const wallet = useWalletStore();
const protocol = useProtocolStore();
const showModal = ref(false);

/** One-click claim across every pool with a pending balance. */
async function claimAll(): Promise<void> {
  const targets = protocol.pools.filter((pool) => pool.pending > 0n);
  for (const pool of targets) {
    await protocol.harvest(pool.id);
  }
}
</script>

<template>
  <div class="ct-wallet">
    <div v-if="wallet.isWrongChain" class="ct-inline">
      <span class="ct-tag ct-tag-warn">Wrong network</span>
      <button class="ct-btn ct-btn-small ct-btn-primary" @click="wallet.switchToTargetChain()">
        Switch
      </button>
    </div>

    <template v-else-if="wallet.isConnected">
      <div v-if="protocol.totalPending > 0n" class="ct-claim">
        <span class="ct-micro ct-quiet">Claimable</span>
        <strong class="ct-num ct-good">
          {{ Number(protocol.totalPending) / 10 ** protocol.rewardDecimals < 1
            ? "<1"
            : (Number(protocol.totalPending) / 10 ** protocol.rewardDecimals).toFixed(2) }}
          {{ protocol.rewardSymbol }}
        </strong>
        <button class="ct-btn ct-btn-small ct-btn-good" :disabled="protocol.loading" @click="claimAll">
          Claim all
        </button>
      </div>

      <button class="ct-btn ct-btn-small ct-mono" :title="wallet.address" @click="wallet.disconnect()">
        {{ wallet.shortAddress }}
        <span class="ct-quiet">{{ wallet.solBalanceFormatted }} SOL</span>
      </button>
    </template>

    <button v-else class="ct-btn ct-btn-primary" :disabled="wallet.connecting" @click="showModal = true">
      <span v-if="wallet.connecting" class="ct-pulse" />
      Connect wallet
    </button>

    <WalletModal v-if="showModal" @close="showModal = false" />
  </div>
</template>
