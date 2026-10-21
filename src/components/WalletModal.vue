<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useWalletStore } from "@/stores/wallet";
import { hasInjectedProvider } from "@/wallet/connectors";

const emit = defineEmits<{ close: [] }>();
const wallet = useWalletStore();

const wallets = computed(() => wallet.availableWallets);
const noneInstalled = computed(() => !hasInjectedProvider());

const dialog = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") emit("close");
}

onMounted(() => {
  dialog.value?.focus();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});

async function pick(id: string): Promise<void> {
  const ok = await wallet.connect(id);
  if (ok) emit("close");
}
</script>

<template>
  <div class="ct-veil" @click.self="emit('close')">
    <div
      ref="dialog"
      class="ct-dialog"
      role="dialog"
      aria-labelledby="ct-wallet-title"
      tabindex="-1"
    >
      <div class="ct-band-head">
        <h3 id="ct-wallet-title" class="ct-gap-b0">Connect a wallet</h3>
        <button class="ct-btn ct-btn-quiet ct-btn-small" @click="emit('close')">Close</button>
      </div>

      <p class="ct-copy">
        Your wallet signs the transactions. Nothing is custodial — the contracts hold the funds,
        not this website.
      </p>

      <div class="ct-stack ct-stack-tight ct-gap-t2">
        <button
          v-for="option in wallets"
          :key="option.id"
          class="ct-wallet-choice"
          :disabled="wallet.connecting"
          @click="pick(option.id)"
        >
          <span class="ct-wallet-glyph">{{ option.icon }}</span>
          <span class="ct-fill">{{ option.name }}</span>
          <span v-if="wallet.walletId === option.id" class="ct-tag ct-tag-accent">Last used</span>
        </button>
      </div>

      <div v-if="noneInstalled" class="ct-callout ct-callout-caution ct-gap-t2">
        <span>
          No Solana wallet detected. Install
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer noopener">MetaMask</a>
          or
          <a href="https://phantom.app/download" target="_blank" rel="noreferrer noopener"
            >Phantom</a
          >, then reload this page.
        </span>
      </div>

      <div v-if="wallet.error" class="ct-callout ct-callout-bad ct-gap-t2">{{ wallet.error }}</div>
    </div>
  </div>
</template>
