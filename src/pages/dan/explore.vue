<script setup lang="ts">
const app = useNuxtApp()
const v = ref({
  keyword: '',
  page: 0,
  perPage: 10,
})
const { data, loading, error } = await app.$client.dan.search.useQuery(v)
</script>

<template>
  <div>
    {{ data }}
  </div>
</template>

<style scoped>

</style>
