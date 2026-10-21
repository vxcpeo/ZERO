<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";

import Colophon from "@/components/ledger/Colophon.vue";
import ConnectBanner from "@/components/ConnectBanner.vue";
import WalletButton from "@/components/WalletButton.vue";
import { TARGET_CHAIN } from "@/config/chain";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";

const wallet = useWalletStore();
const protocol = useProtocolStore();

/** Poll interval for on-chain reads: a block lands every ~3s, so 15s is 5 blocks. */
const POLL_MS = 15_000;
let timer: number | undefined;

onMounted(async () => {
  // Restore an existing wallet session, then prime the read paths.
  await wallet.restore();
  await protocol.refresh();
  timer = window.setInterval(() => {
    void protocol.refresh();
  }, POLL_MS);
});

onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer);
});

/** The index line: the same four destinations, in the order the ledger reads them. */
const links = [
  { to: "/mine", label: "Mine" },
  { to: "/art", label: "Artworks" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/docs", label: "How it works" },
];

/**
 * The wordmark anchor carries the real root path (so it is a working URL on any host and in the
 * browser's own link handling) while still routing client-side for a plain left click.
 */
function follow(event: MouseEvent, navigate: () => unknown): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void navigate();
}
</script>

<template>
  <div class="ct-shell">
    <header class="ct-masthead ct-topbar">
      <div class="ct-page ct-masthead-in">
        <RouterLink to="/" custom v-slot="{ navigate }">
          <a class="ct-brand" href="/" @click="follow($event, navigate)">
            <span class="ct-brand-mark" aria-hidden="true">
              <span class="ct-stamp">F</span>
            </span>
            <span class="ct-wordmark">Fractio</span>
          </a>
        </RouterLink>

        <div class="ct-masthead-tools">
          <span class="ct-tag ct-tag-paper" :title="`Connected to ${TARGET_CHAIN.name}`">
            {{ TARGET_CHAIN.shortName }}
          </span>
          <WalletButton />
        </div>
      </div>

      <nav class="ct-index" aria-label="Protocol routes">
        <div class="ct-page ct-index-in">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="ct-index-link">
            {{ link.label }}
          </RouterLink>
        </div>
      </nav>
    </header>

    <ConnectBanner />

    <main class="ct-stage">
      <RouterView />
    </main>

    <Colophon />
  </div>
</template>
