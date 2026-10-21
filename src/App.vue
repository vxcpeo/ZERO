<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";

import DockNav from "@/components/poster/DockNav.vue";
import TearFooter from "@/components/poster/TearFooter.vue";
import ConnectBanner from "@/components/ConnectBanner.vue";
import WalletButton from "@/components/WalletButton.vue";
import { TARGET_CHAIN } from "@/config/chain";
import { useProtocolStore } from "@/stores/protocol";
import { useWalletStore } from "@/stores/wallet";

const wallet = useWalletStore();
const protocol = useProtocolStore();

/** Poll interval for on-chain reads: one BSC block is ~3s, so 15s is 5 blocks. */
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
  <div class="po-wall">
    <div class="po-cover">
      <div class="po-gutter po-cover-inner">
        <RouterLink to="/" custom v-slot="{ navigate }">
          <a class="po-mark" href="/" @click="follow($event, navigate)">
            <span class="po-stamp" aria-hidden="true">T</span>
            <span class="po-wordmark">Tessella</span>
          </a>
        </RouterLink>

        <div class="po-cover-tools">
          <span class="po-tag po-tag-paper" :title="`Connected to ${TARGET_CHAIN.name}`">
            {{ TARGET_CHAIN.shortName }}
          </span>
          <WalletButton />
        </div>
      </div>
    </div>

    <ConnectBanner />

    <main class="po-stage">
      <div class="po-run">
        <RouterView />
      </div>
    </main>

    <DockNav />
    <TearFooter />
  </div>
</template>
