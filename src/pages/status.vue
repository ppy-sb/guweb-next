<script setup lang="ts">
import { Monitored } from '$base/server/@extends'
import { useSession } from '~/store/session'

const session = useSession()
const app = useNuxtApp()
const { t } = useI18n()

const showAdminStatus = session.role.staff

const serverConfig = showAdminStatus
  ? await app.$client.status.config.query()
  : undefined

const { data: adminData, refresh: refreshAdmin } = await useAsyncData(async () =>
  showAdminStatus
    ? { metrics: await app.$client.status.metrics.query() }
    : {},
)

const { data: publicData, refresh } = await useAsyncData(async () => app.$client.status.public.query())

let publicInterval: ReturnType<typeof setInterval>
onBeforeMount(() => {
  clearInterval(publicInterval)
  publicInterval = setInterval(refresh, 60 * 1000)
  onBeforeUnmount(() => clearInterval(publicInterval))
})

if (showAdminStatus) {
  let adminInterval: ReturnType<typeof setInterval>
  onBeforeMount(() => {
    clearInterval(adminInterval)
    adminInterval = setInterval(refreshAdmin, 2000)
    onBeforeUnmount(() => clearInterval(adminInterval))
  })
}
function percentWidth(count: number) {
  return {
    width: `${count}%`,
  }
}
const fmtPercent = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 2,
})

const fmtCompact = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'megabyte',
  unitDisplay: 'narrow',
})

useHead({
  title: () => t(localeKey.title.status.__path__),
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
})
</script>

<i18n lang="yaml">
en-GB:
  system-load: System Load
  user: User
  system: System
  app-load: App Load
  total: Total
  other: Other
  memory: Memory
  active: Active
  cache: Cache
  free: Free
  app-config: App Config
  npm-env: npm env
  env: env

zh-CN:
  system-load: 系统负载
  user: 用户
  system: 系统
  app-load: 应用负载
  total: 总计
  other: 其他
  memory: 内存
  active: 活跃
  cache: 缓存
  free: 可用
  app-config: 应用配置
  npm-env: npm环境变量
  env: 环境变量

fr-FR:
  system-load: Charge Système
  user: Utilisateur
  system: Système
  app-load: Charge Application
  total: Total
  other: Autre
  memory: Mémoire
  active: Actif
  cache: Cache
  free: Libre
  app-config: Configuration App
  npm-env: Environnement npm
  env: Environnement

de-DE:
  system-load: Systemlast
  user: Nutzer
  system: System
  app-load: App-Last
  total: Gesamt
  other: Andere
  memory: Speicher
  active: Aktiv
  cache: Cache
  free: Frei
  app-config: App-Konfiguration
  npm-env: npm-Umgebung
  env: Umgebung
</i18n>

<template>
  <div>
    <div class="container mx-auto font-mono custom-container">
      <div class="text-xl">
        Services
      </div>
      <div class="grid grid-flow-row gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="(service, key) in publicData"
          :key="key"
          class="flex-grow w-full px-3 py-2 text-black bg-gray-100 border-l-8 rounded-md"
          :class="{
            'border-green-500': service[0] === Monitored.Status.Up,
            'border-orange-500': service[0] === Monitored.Status.Degraded,
            'border-red-500': service[0] === Monitored.Status.Down,
            'border-gray-200': service[0] === Monitored.Status.Unknown,
          }"
        >
          {{ $t(localeKey.service(key as string)) }}
          <div class="pt-1 text-sm font-thin text-gray-500">
            <span>{{ service[1] }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="adminData?.metrics" class="container mx-auto font-mono custom-container">
      <div class="flex flex-wrap items-baseline gap-1 my-1 drop-shadow-lg">
        <h1 class="text-xl">
          {{ t('system-load') }}
        </h1>
        <span class="bg-blue-500 border-blue-500 badge text-blue-50">{{ t('user') }}: {{ fmtPercent.format(adminData.metrics.load.system.user / 100) }}</span>
        <span class="bg-teal-500 border-teal-500 badge text-teal-50">{{ t('system') }}: {{ fmtPercent.format(adminData.metrics.load.system.system / 100) }}</span>
      </div>
      <div class="shadow-lg multi-progress-bar-container bg-gbase-500/10">
        <div
          :style="percentWidth(adminData.metrics.load.system.user)"
          class="text-white bg-blue-500 multi-progress-bar"
        >
          {{ t('user') }}
        </div>
        <div
          :style="percentWidth(adminData.metrics.load.system.system)"
          class="text-white bg-teal-500 multi-progress-bar"
        >
          {{ t('system') }}
        </div>
      </div>
      <h1 class="flex flex-wrap items-baseline gap-1 my-1 drop-shadow-lg">
        <div class="text-xl">
          {{ t('app-load') }}
        </div>
        <span class="badge">{{ t('total') }}: {{ fmtPercent.format(adminData.metrics.load.system.current / 100) }}</span>
        <span
          v-for="(_data, key) of adminData.metrics.load.app" :key="key"
          class="badge"
        >{{ key }}: {{ fmtPercent.format(_data.current / adminData.metrics.load.system.current) }}</span>
      </h1>
      <div class="shadow-lg multi-progress-bar-container bg-gbase-500/10">
        <div
          v-for="(_data, key) of adminData.metrics.load.app"
          :key="key"
          :style="percentWidth(_data.current / adminData.metrics.load.system.current * 100)"
          class="text-white bg-blue-500 multi-progress-bar"
        >
          {{ key }}
        </div>
        <div
          :style="percentWidth((adminData.metrics.load.system.current - adminData.metrics.load.app.web.current) / adminData.metrics.load.system.current * 100)"
          class="multi-progress-bar bg-gbase-300/10"
        >
          {{ t('other') }}
        </div>
      </div>
      <div class="flex flex-wrap items-baseline gap-1 my-1 drop-shadow-lg">
        <h1 class="text-xl">
          {{ t('memory') }}
        </h1>
        <span class="bg-blue-500 border-blue-500 badge text-blue-50">{{ t('active') }}: {{ fmtCompact.format(adminData.metrics.memory.system.active / 1_000_000) }}</span>
        <span class="bg-teal-500 border-teal-500 badge text-teal-50">{{ t('cache') }}: {{ fmtCompact.format(adminData.metrics.memory.system.buffcache / 1_000_000) }}</span>
        <span class="badge">{{ t('total') }}: {{ fmtCompact.format(adminData.metrics.memory.system.total / 1_000_000) }}</span>
        <span class="badge">{{ t('free') }}: {{ fmtCompact.format(adminData.metrics.memory.system.free / 1_000_000) }}</span>
      </div>
      <div class="shadow-lg multi-progress-bar-container bg-gbase-500/10">
        <div
          :style="percentWidth(adminData.metrics.memory.system.active / adminData.metrics.memory.system.total * 100)"
          class="text-white bg-blue-500 multi-progress-bar"
        >
          {{ t('active') }}
        </div>
        <div
          :style="percentWidth(adminData.metrics.memory.system.buffcache / adminData.metrics.memory.system.total * 100)"
          class="text-white bg-teal-500 multi-progress-bar"
        >
          {{ t('cache') }}
        </div>
        <div
          :style="percentWidth((adminData.metrics.memory.system.free) / adminData.metrics.memory.system.total * 100)"
          class="multi-progress-bar bg-gbase-300/10"
        >
          {{ t('free') }}
        </div>
      </div>
      <h1 class="my-1 text-xl drop-shadow-lg">
        {{ t('app-config') }}
      </h1>
      <JsonViewer
        :value="$config"
        :expand-depth="999"
        theme="light"
        copyable
        boxed
        class="rounded-xl"
      />
      <h1 class="my-1 text-xl drop-shadow-lg">
        {{ t('npm-env') }}
      </h1>
      <JsonViewer
        :value="serverConfig?.npm"
        :expand-depth="999"
        theme="light"
        copyable
        boxed
        class="rounded-xl"
      />
      <h1 class="my-1 text-xl drop-shadow-lg">
        {{ t('env') }}
      </h1>
      <JsonViewer
        :value="{
          ...serverConfig,
          npm: '...',
        }"
        :expand-depth="999"
        theme="light"
        copyable
        boxed
        class="rounded-xl"
      />
    </div>
  </div>
</template>

<style scoped lang="postcss">
.multi-progress-bar-container {
  @apply overflow-hidden h-4 mb-4 text-xs flex rounded-xl shadow;
  .multi-progress-bar {
    @apply shadow-none flex flex-col text-center whitespace-nowrap justify-center transition-[width] duration-300 overflow-hidden text-clip;
  }
}
</style>
$base/server/@traits
