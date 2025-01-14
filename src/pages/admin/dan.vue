<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'staff'],
})
</script>

<template>
  <div class="container mx-auto custom-container">
    <a class="btn" href="/api/admin/dan/export">
      Export all
    </a>
  </div>
</template>
