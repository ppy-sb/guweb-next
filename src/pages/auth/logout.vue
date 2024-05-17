<script lang="ts" setup>
import { useSession } from '~/store/session'

definePageMeta({
  layout: 'centered',
})

const router = useRouter()
const session = useSession()
const { t } = useI18n()

onMounted(async () => {
  await session.destroy()
  setTimeout(
    () => router.push(router.currentRoute.value.query.redirect?.toString() || '/'),
    1000
  )
})
</script>

<i18n lang="yaml">
en-GB:
  logging-out: Logging out...

zh-CN:
  logging-out: 正在登出...

fr-FR:
  logging-out: Déconnexion...

de-DE:
  logging-out: Abmelden...
</i18n>

<template>
  <div class="mx-auto">
    <div class="text-2xl">
      {{ t('logging-out') }}
    </div>
  </div>
</template>
