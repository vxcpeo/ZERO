<script setup lang="ts">
/**
 * The floating dock: four destinations, fixed to the bottom of the viewport, with a geometric
 * mark and an accessible name for each. Same routes and labels as the previous route index.
 */
import { RouterLink } from "vue-router";

const links = [
  { to: "/mine", label: "Mine" },
  { to: "/art", label: "Artworks" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/docs", label: "How it works" },
];
</script>

<template>
  <nav class="po-dock" aria-label="Protocol routes">
    <ul class="po-dock-list">
      <li v-for="link in links" :key="link.to" class="po-dock-item">
        <RouterLink :to="link.to" class="po-dock-link">
          <span class="po-dock-dot" aria-hidden="true" />
          <span class="po-dock-label">{{ link.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
