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
  <div class="po-veil" @click.self="emit('close')">
    <div
      ref="dialog"
      class="po-dialog"
      role="dialog"
      aria-labelledby="po-wallet-title"
      tabindex="-1"
    >
      <div class="po-line po-gap-b2">
        <h3 id="po-wallet-title" class="po-gap-b0">Connect a wallet</h3>
        <button class="po-button po-button-quiet po-button-small" @click="emit('close')">Close</button>
      </div>

      <p class="po-copy">
        Your wallet signs the transactions. Nothing is custodial — the contracts hold the funds,
        not this website.
      </p>

      <div class="po-stack po-stack-tight po-gap-t2">
        <button
          v-for="option in wallets"
          :key="option.id"
          class="po-wallet-choice"
          :disabled="wallet.connecting"
          @click="pick(option.id)"
        >
          <span class="po-wallet-glyph">{{ option.icon }}</span>
          <span class="po-fill">{{ option.name }}</span>
          <span v-if="wallet.walletId === option.id" class="po-tag po-tag-accent">Last used</span>
        </button>
      </div>

      <div v-if="noneInstalled" class="po-callout po-callout-caution po-gap-t2">
        <span>
          No BSC wallet detected. Install
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer noopener">MetaMask</a>
          or
          <a href="https://www.binance.com/en/web3wallet" target="_blank" rel="noreferrer noopener"
            >Binance Wallet</a
          >, then reload this page.
        </span>
      </div>

      <div v-if="wallet.error" class="po-callout po-callout-bad po-gap-t2">{{ wallet.error }}</div>
    </div>
  </div>
</template>
