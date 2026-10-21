<script setup lang="ts">
/**
 * One published figure, set as a poster fact: an eyebrow label, a very large tabular figure and a
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
  <article class="po-fact" :class="{ 'po-fact-lead': accent }">
    <p class="po-label">{{ label }}</p>
    <p v-if="loading" class="po-fact-loading" />
    <p v-else class="po-figure">
      {{ value }}
      <span v-if="unit" class="po-unit">{{ unit }}</span>
    </p>
    <p v-if="sub" class="po-note">{{ sub }}</p>
  </article>
</template>
