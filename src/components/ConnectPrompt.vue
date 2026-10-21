<script setup lang="ts">
/**
 * Inline call-to-action shown wherever a write action needs a connected wallet.
 */
import { ref } from "vue";

import WalletModal from "@/components/WalletModal.vue";
import { useWalletStore } from "@/stores/wallet";
import { TARGET_CHAIN } from "@/config/chain";

withDefaults(
  defineProps<{
    /** Explains what the user will be able to do once connected. */
    message?: string;
    compact?: boolean;
  }>(),
  { message: "", compact: false },
);

const wallet = useWalletStore();
const showModal = ref(false);
</script>

<template>
  <div v-if="!wallet.isConnected" class="po-slab" :class="{ 'po-slab-tight': compact }">
    <div class="po-line" style="gap: 14px">
      <div class="po-fill">
        <strong>Connect a wallet</strong>
        <p class="po-copy po-gap-b0">
          {{ message || `Read-only mode. Connect to sign transactions on ${TARGET_CHAIN.name}.` }}
        </p>
      </div>
      <button class="po-button po-button-primary" @click="showModal = true">Connect</button>
    </div>
    <WalletModal v-if="showModal" @close="showModal = false" />
  </div>

  <div v-else-if="wallet.isWrongChain" class="po-callout po-callout-caution">
    <div class="po-fill">
      Your wallet is on another network. Switch to {{ TARGET_CHAIN.name }} to continue.
    </div>
    <button class="po-button po-button-small po-button-primary" @click="wallet.switchToTargetChain()">Switch</button>
  </div>
</template>
