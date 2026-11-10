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
  <div v-if="!wallet.isConnected" class="pt-sheet" :class="{ 'pt-sheet--tight': compact }">
    <div class="pt-row">
      <div class="pt-fill">
        <strong>Connect a wallet</strong>
        <p class="pt-copy pt-gap-b0">
          {{ message || `Read-only mode. Connect to sign transactions on ${TARGET_CHAIN.name}.` }}
        </p>
      </div>
      <button class="pt-btn pt-btn--solid" @click="showModal = true">Connect</button>
    </div>
    <WalletModal v-if="showModal" @close="showModal = false" />
  </div>

  <div v-else-if="wallet.isWrongChain" class="pt-callout pt-callout--caution">
    <div class="pt-fill">
      Your wallet is on another network. Switch to {{ TARGET_CHAIN.name }} to continue.
    </div>
    <button class="pt-btn pt-btn--small pt-btn--solid" @click="wallet.switchToTargetChain()">Switch</button>
  </div>
</template>
