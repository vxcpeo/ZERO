<script setup lang="ts">
import { computed } from "vue";

import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { formatUnits } from "@/utils/format";
import { explorerAddressUrl } from "@/utils/tx";

const protocol = useProtocolStore();
const wallet = useWalletStore();

const statusClass = computed(() => ({
  pending: "ct-tag-warn",
  success: "ct-tag-good",
  error: "ct-tag-bad",
}));

function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
}
</script>

<template>
  <section class="ct-plate" aria-label="Activity log">
    <div class="ct-band-head">
      <h3 class="ct-gap-b0">Activity</h3>
      <span v-if="protocol.loading" class="ct-pulse" />
    </div>

    <p v-if="!protocol.txLog.length" class="ct-copy ct-gap-b0">
      Transactions you sign from this page appear here with their Solscan links.
    </p>

    <div v-else class="ct-stack ct-stack-tight">
      <div v-for="(entry, index) in protocol.txLog" :key="entry.hash || index" class="ct-activity">
        <div class="ct-stack" style="gap: 2px">
          <span class="ct-copy">{{ entry.label }}</span>
          <a
            v-if="entry.hash"
            :href="entry.explorerUrl || explorerAddressUrl(wallet.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="ct-mono ct-micro ct-quiet"
          >
            {{ shortHash(entry.hash) }}
          </a>
          <span v-if="entry.message" class="ct-micro ct-bad">{{ entry.message }}</span>
        </div>
        <span class="ct-tag" :class="statusClass[entry.status]">{{ entry.status }}</span>
      </div>
    </div>

    <template v-if="wallet.isConnected">
      <hr class="ct-seam" />
      <div class="ct-ledger">
        <div class="ct-ledger-row">
          <span class="ct-ledger-key">Wallet balance</span>
          <span class="ct-ledger-val">
            {{ formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            {{ protocol.rewardSymbol }}
          </span>
          <span />
        </div>
        <div class="ct-ledger-row">
          <span class="ct-ledger-key">$ART balance</span>
          <span class="ct-ledger-val">
            {{ formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 }) }} ART
          </span>
          <span />
        </div>
      </div>
    </template>
  </section>
</template>
