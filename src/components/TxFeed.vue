<script setup lang="ts">
import { computed } from "vue";

import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";
import { formatUnits } from "@/utils/format";
import { explorerAddressUrl } from "@/utils/tx";

const protocol = useProtocolStore();
const wallet = useWalletStore();

const statusClass = computed(() => ({
  pending: "pt-tag--warn",
  success: "pt-tag--good",
  error: "pt-tag--bad",
}));

function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
}
</script>

<template>
  <section class="pt-sheet" aria-label="Activity log">
    <div class="pt-sheet-head">
      <h3 class="pt-gap-b0">Activity</h3>
      <span v-if="protocol.loading" class="pt-pulse" />
    </div>

    <p v-if="!protocol.txLog.length" class="pt-copy pt-gap-b0">
      Transactions you sign from this page appear here with their Solscan links.
    </p>

    <div v-else class="pt-stack pt-stack--tight">
      <div v-for="(entry, index) in protocol.txLog" :key="entry.hash || index" class="pt-activity">
        <div class="pt-stack" style="gap: 2px">
          <span class="pt-copy">{{ entry.label }}</span>
          <a
            v-if="entry.hash"
            :href="entry.explorerUrl || explorerAddressUrl(wallet.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="pt-mono pt-note pt-quiet"
          >
            {{ shortHash(entry.hash) }}
          </a>
          <span v-if="entry.message" class="pt-note pt-bad">{{ entry.message }}</span>
        </div>
        <span class="pt-tag" :class="statusClass[entry.status]">{{ entry.status }}</span>
      </div>
    </div>

    <template v-if="wallet.isConnected">
      <hr class="pt-seam" />
      <div class="pt-ledger">
        <div class="pt-ledger-row">
          <span class="pt-ledger-key">Wallet balance</span>
          <span class="pt-ledger-val">
            {{ formatUnits(protocol.feeTokenBalance, protocol.rewardDecimals, { maxFractionDigits: 2 }) }}
            {{ protocol.rewardSymbol }}
          </span>
          <span />
        </div>
        <div class="pt-ledger-row">
          <span class="pt-ledger-key">$ART balance</span>
          <span class="pt-ledger-val">
            {{ formatUnits(protocol.artTokenBalance, 18, { maxFractionDigits: 2 }) }} ART
          </span>
          <span />
        </div>
      </div>
    </template>
  </section>
</template>
