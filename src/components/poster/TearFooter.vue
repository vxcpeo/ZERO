<script setup lang="ts">
/**
 * Tear-off colophon: the poster's bottom edge. Brand note, route shortcuts, deployed addresses
 * and the legal line, printed on the ink block that closes every route.
 */
import { RouterLink } from "vue-router";

import { ADDRESSES, TARGET_CHAIN } from "@/config/chain";
import { explorerAddressUrl } from "@/utils/tx";

const year = new Date().getFullYear();

const contracts = [
  { label: "MiningPool", address: ADDRESSES.miningPool, note: "fee-funded emission engine" },
  { label: "FeeRouter", address: ADDRESSES.feeRouter, note: "fee intake + 50/20/30 split" },
  { label: "ArtworkVault", address: ADDRESSES.artworkVault, note: "fractional art registry" },
  { label: "ArtToken", address: ADDRESSES.artToken, note: "$ART ownership token" },
];
</script>

<template>
  <footer class="po-tear">
    <div class="po-gutter po-tear-grid">
      <div class="po-tear-brand">
        <div class="po-mark">
          <span class="po-stamp" aria-hidden="true">T</span>
          <span class="po-wordmark">Tessella</span>
        </div>
        <p class="po-copy po-quiet">
          Fractional ownership of vaulted physical artworks on {{ TARGET_CHAIN.name }}, with a
          fee-funded mining engine that pays stakers the platform's own revenue.
        </p>
      </div>

      <div class="po-tear-links">
        <span class="po-label">Navigate</span>
        <RouterLink to="/mine">Mine fees</RouterLink>
        <RouterLink to="/art">Artworks</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink to="/docs">How it works</RouterLink>
      </div>

      <div class="po-tear-chain">
        <span class="po-label">Deployed contracts</span>
        <div class="po-chain-list">
          <a
            v-for="item in contracts"
            :key="item.label"
            :href="explorerAddressUrl(item.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="po-chain"
          >
            <strong>{{ item.label }}</strong>
            <span class="po-mono po-micro po-quiet">{{ item.address.slice(0, 10) }}…</span>
          </a>
        </div>
      </div>
    </div>

    <div class="po-gutter po-tear-meta">
      <span>© {{ year }} Tessella. Open-source reference implementation.</span>
      <span>
        Nothing here is investment advice. Fractional art is illiquid and carries real risk.
      </span>
    </div>
  </footer>
</template>
