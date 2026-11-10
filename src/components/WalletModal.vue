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
  <div class="pt-veil" @click.self="emit('close')">
    <div
      ref="dialog"
      class="pt-dialog"
      role="dialog"
      aria-labelledby="pt-wallet-title"
      tabindex="-1"
    >
      <div class="pt-sheet-head">
        <h3 id="pt-wallet-title" class="pt-gap-b0">Connect a wallet</h3>
        <button class="pt-btn pt-btn--quiet pt-btn--small" @click="emit('close')">Close</button>
      </div>

      <p class="pt-copy">
        Your wallet signs the transactions. Nothing is custodial — the contracts hold the funds,
        not this website.
      </p>

      <div class="pt-stack pt-stack--tight pt-gap-t2">
        <button
          v-for="option in wallets"
          :key="option.id"
          class="pt-wallet-choice"
          :disabled="wallet.connecting"
          @click="pick(option.id)"
        >
          <span class="pt-wallet-glyph">{{ option.icon }}</span>
          <span class="pt-fill">{{ option.name }}</span>
          <span v-if="wallet.walletId === option.id" class="pt-tag pt-tag--accent">Last used</span>
        </button>
      </div>

      <div v-if="noneInstalled" class="pt-callout pt-callout--caution pt-gap-t2">
        <span>
          No Solana wallet detected. Install
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer noopener">MetaMask</a>
          or
          <a href="https://phantom.app/download" target="_blank" rel="noreferrer noopener"
            >Phantom</a
          >, then reload this page.
        </span>
      </div>

      <div v-if="wallet.error" class="pt-callout pt-callout--bad pt-gap-t2">{{ wallet.error }}</div>
    </div>
  </div>
</template>
