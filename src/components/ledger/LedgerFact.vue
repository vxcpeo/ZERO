<script setup lang="ts">
/**
 * One published figure, set as a ledger fact: an eyebrow label, a tabular figure, a unit and a
 * provenance note. Same props as the previous entry component; presentation only.
 */
withDefaults(
  defineProps<{
    label: string;
    value: string;
    unit?: string;
    sub?: string;
    accent?: boolean;
    loading?: boolean;
  }>(),
  { unit: "", sub: "", accent: false, loading: false },
);
</script>

<template>
  <article class="ct-fact" :class="{ 'ct-fact-lead': accent }">
    <p class="ct-label">{{ label }}</p>
    <p v-if="loading" class="ct-fact-loading" />
    <p v-else class="ct-figure">
      {{ value }}
      <span v-if="unit" class="ct-unit">{{ unit }}</span>
    </p>
    <p v-if="sub" class="ct-note">{{ sub }}</p>
  </article>
</template>
