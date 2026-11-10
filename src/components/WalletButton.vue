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
  <div class="pt-wallet">
    <div v-if="wallet.isWrongChain" class="pt-inline">
      <span class="pt-tag pt-tag--warn">Wrong network</span>
      <button class="pt-btn pt-btn--small pt-btn--solid" @click="wallet.switchToTargetChain()">
        Switch
      </button>
    </div>

    <template v-else-if="wallet.isConnected">
      <div v-if="protocol.totalPending > 0n" class="pt-claim">
        <span class="pt-note pt-quiet">Claimable</span>
        <strong class="pt-num pt-good">
          {{ Number(protocol.totalPending) / 10 ** protocol.rewardDecimals < 1
            ? "<1"
            : (Number(protocol.totalPending) / 10 ** protocol.rewardDecimals).toFixed(2) }}
          {{ protocol.rewardSymbol }}
        </strong>
        <button class="pt-btn pt-btn--small pt-btn--good" :disabled="protocol.loading" @click="claimAll">
          Claim all
        </button>
      </div>

      <button class="pt-btn pt-btn--small pt-mono" :title="wallet.address" @click="wallet.disconnect()">
        {{ wallet.shortAddress }}
        <span class="pt-quiet">{{ wallet.solBalanceFormatted }} SOL</span>
      </button>
    </template>

    <button v-else class="pt-btn pt-btn--solid" :disabled="wallet.connecting" @click="showModal = true">
      <span v-if="wallet.connecting" class="pt-pulse" />
      Connect wallet
    </button>

    <WalletModal v-if="showModal" @close="showModal = false" />
  </div>
</template>
