<script setup lang="ts">
import { computed } from "vue";

import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { formatUnits } from "@/utils/format";
import { explorerAddressUrl } from "@/utils/tx";

const protocol = useProtocolStore();
const wallet = useWalletStore();

const statusClass = computed(() => ({
  pending: "po-tag-warn",
  success: "po-tag-good",
  error: "po-tag-bad",
}));

function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
}
</script>

<template>
  <section class="po-slab" aria-label="Activity log">
    <div class="po-line po-gap-b2">
      <h3 class="po-gap-b0">Activity</h3>
      <span v-if="protocol.loading" class="po-pulse" />
    </div>

    <p v-if="!protocol.txLog.length" class="po-copy po-gap-b0">
      Transactions you sign from this page appear here with their BscScan links.
    </p>

    <div v-else class="po-stack po-stack-tight">
      <div v-for="(entry, index) in protocol.txLog" :key="entry.hash || index" class="po-line po-activity">
        <div class="po-stack" style="gap: 2px">
          <span class="po-copy">{{ entry.label }}</span>
          <a
            v-if="entry.hash"
            :href="entry.explorerUrl || explorerAddressUrl(wallet.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="po-mono po-micro po-quiet"
          >
            {{ shortHash(entry.hash) }}
          </a>
          <span v-if="entry.message" class="po-micro po-bad">{{ entry.message }}</span>
        </div>
        <span class="po-tag" :class="statusClass[entry.status]">{{ entry.status }}</span>
      </div>
    </div>

    <template v-if="wallet.isConnected">
      <div class="po-seam" />
      <div class="po-line po-copy">
        <span class="po-quiet">Wallet balance</span>
        <span class="po-num">
          {{ formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
          {{ protocol.rewardSymbol }}
        </span>
      </div>
      <div class="po-line po-copy">
        <span class="po-quiet">$ART balance</span>
        <span class="po-num">
          {{ formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 }) }} ART
        </span>
      </div>
    </template>
  </section>
</template>
