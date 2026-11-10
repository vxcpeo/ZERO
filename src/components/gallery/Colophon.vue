<script setup lang="ts">
/**
 * Colophon: the closing poster of every route. Brand note, the shortcut index, the deployed
 * contract addresses and the legal line, set on the warm wash ground that closes the page.
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
  <footer class="pt-colophon">
    <div class="pt-colophon-in">
      <div class="pt-colophon-brand">
        <div class="pt-brand">
          <span class="pt-mark" aria-hidden="true">
            <span class="pt-stamp">C</span>
          </span>
          <span class="pt-wordmark">Cimela</span>
        </div>
        <p class="pt-copy">
          Fractional ownership of vaulted physical artworks on {{ TARGET_CHAIN.name }}, with a
          fee-funded mining engine that pays stakers the platform's own revenue.
        </p>
      </div>

      <div class="pt-colophon-links">
        <span class="pt-label">Navigate</span>
        <RouterLink to="/mine">Mine fees</RouterLink>
        <RouterLink to="/art">Artworks</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink to="/docs">How it works</RouterLink>
      </div>

      <div>
        <span class="pt-label">Deployed contracts</span>
        <div class="pt-chain-list">
          <a
            v-for="item in contracts"
            :key="item.label"
            :href="explorerAddressUrl(item.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="pt-chain-item"
          >
            <strong>{{ item.label }}</strong>
            <span class="pt-mono pt-note pt-quiet">{{ item.address.slice(0, 10) }}…</span>
          </a>
        </div>
      </div>
    </div>

    <div class="pt-colophon-meta">
      <span>© {{ year }} Cimela. Open-source reference implementation.</span>
      <span>
        Nothing here is investment advice. Fractional art is illiquid and carries real risk.
      </span>
    </div>
  </footer>
</template>
