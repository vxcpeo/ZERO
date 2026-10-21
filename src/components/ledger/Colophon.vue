<script setup lang="ts">
/**
 * Colophon: the closing leaf of every route. Brand note, an index of shortcuts, the deployed
 * contract addresses and the legal line — set as a ledger footer rather than a poster tear-off.
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
  <footer class="ct-colophon">
    <div class="ct-page ct-colophon-grid">
      <div class="ct-colophon-brand">
        <div class="ct-brand">
          <span class="ct-brand-mark" aria-hidden="true">
            <span class="ct-stamp">F</span>
          </span>
          <span class="ct-wordmark">Fractio</span>
        </div>
        <p class="ct-copy">
          Fractional ownership of vaulted physical artworks on {{ TARGET_CHAIN.name }}, with a
          fee-funded mining engine that pays stakers the platform's own revenue.
        </p>
      </div>

      <div class="ct-colophon-links">
        <span class="ct-label">Navigate</span>
        <RouterLink to="/mine">Mine fees</RouterLink>
        <RouterLink to="/art">Artworks</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink to="/docs">How it works</RouterLink>
      </div>

      <div>
        <span class="ct-label">Deployed contracts</span>
        <div class="ct-chain-list">
          <a
            v-for="item in contracts"
            :key="item.label"
            :href="explorerAddressUrl(item.address)"
            target="_blank"
            rel="noreferrer noopener"
            class="ct-chain"
          >
            <strong>{{ item.label }}</strong>
            <span class="ct-mono ct-micro ct-quiet">{{ item.address.slice(0, 10) }}…</span>
          </a>
        </div>
      </div>
    </div>

    <div class="ct-page ct-colophon-meta">
      <span>© {{ year }} Fractio. Open-source reference implementation.</span>
      <span>
        Nothing here is investment advice. Fractional art is illiquid and carries real risk.
      </span>
    </div>
  </footer>
</template>
