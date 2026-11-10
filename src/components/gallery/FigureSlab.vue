<script setup lang="ts">
/**
 * One published figure, set as a poster plaque: a mono eyebrow, an oversized tabular figure, a
 * unit line and a provenance note. Presentation only; the props are unchanged.
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
  <article class="pt-figure-slab" :class="{ 'pt-figure-slab--lead': accent }">
    <p class="pt-figure-label">{{ label }}</p>
    <p v-if="loading" class="pt-loading-bar" />
    <p v-else class="pt-figure-value">
      {{ value }}
      <span v-if="unit" class="pt-figure-unit">{{ unit }}</span>
    </p>
    <p v-if="sub" class="pt-figure-note">{{ sub }}</p>
  </article>
</template>
