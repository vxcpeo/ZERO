<script setup lang="ts">
/**
 * Site-wide notice for the two states that silently break a dApp: no wallet connected, and a
 * deployment whose contract addresses were never configured.
 */
import { IS_CONFIGURED, TARGET_CHAIN } from "@/config/chain";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";

const wallet = useWalletStore();
const protocol = useProtocolStore();
</script>

<template>
  <div v-if="!IS_CONFIGURED" class="po-callout po-callout-bad po-strip">
    <div class="po-gutter">
      <strong>Contract addresses are not configured.</strong>
      Deploy with <code>contracts/scripts/deploy.js</code> and run <code>npm run export:abi</code>,
      or set the <code>VITE_*</code> addresses in <code>website/.env.local</code>. Every read below
      will fail until then.
    </div>
  </div>

  <div v-else-if="protocol.lastError" class="po-callout po-callout-caution po-strip">
    <div class="po-gutter">
      <span><strong>RPC:</strong> {{ protocol.lastError }}</span>
      <button class="po-button po-button-small" @click="protocol.refresh()">Retry</button>
    </div>
  </div>

  <div v-else-if="wallet.isWrongChain" class="po-callout po-callout-caution po-strip">
    <div class="po-gutter">
      <span> Your wallet is on a different network. This deployment lives on {{ TARGET_CHAIN.name }}. </span>
      <button class="po-button po-button-small po-button-primary" @click="wallet.switchToTargetChain()">
        Switch network
      </button>
    </div>
  </div>
</template>
