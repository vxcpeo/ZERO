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
  <div class="po-wallet">
    <div v-if="wallet.isWrongChain" class="po-inline" style="gap: 8px">
      <span class="po-tag po-tag-warn">Wrong network</span>
      <button class="po-button po-button-small po-button-primary" @click="wallet.switchToTargetChain()">
        Switch
      </button>
    </div>

    <template v-else-if="wallet.isConnected">
      <div v-if="protocol.totalPending > 0n" class="po-claim">
        <span class="po-micro po-quiet">Claimable</span>
        <strong class="po-num po-good">
          {{ Number(protocol.totalPending) / 10 ** protocol.rewardDecimals < 1
            ? "<1"
            : (Number(protocol.totalPending) / 10 ** protocol.rewardDecimals).toFixed(2) }}
          {{ protocol.rewardSymbol }}
        </strong>
        <button class="po-button po-button-small po-button-good" :disabled="protocol.loading" @click="claimAll">
          Claim all
        </button>
      </div>

      <button class="po-button po-button-small po-mono" :title="wallet.address" @click="wallet.disconnect()">
        {{ wallet.shortAddress }}
        <span class="po-quiet">{{ wallet.bnbBalanceFormatted }} BNB</span>
      </button>
    </template>

    <button v-else class="po-button po-button-primary" :disabled="wallet.connecting" @click="showModal = true">
      <span v-if="wallet.connecting" class="po-pulse" />
      Connect wallet
    </button>

    <WalletModal v-if="showModal" @close="showModal = false" />
  </div>
</template>
