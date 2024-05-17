<script setup lang="ts">
import { parse, stringify } from 'devalue'
import { Scope, UserRole } from '~/def/user'
import { ContentEditor } from '#components'
import type { ArticleProvider } from '$base/server'

definePageMeta({
  middleware: ['auth', 'admin'],
})
const app = useNuxtApp()
const { t } = useI18n()
const importArticleFile = shallowRef<HTMLInputElement | null>(null)
const editor = shallowRef<InstanceType<typeof ContentEditor> | null>(null)
const article = ref<{
  privilege: ArticleProvider.Meta['privilege']
  json?: ArticleProvider.Content['json']
  owner?: ArticleProvider.Meta['owner']
  dynamic: boolean
  slug: string
}>({
  privilege: {
    read: [Scope.Public],
    write: [UserRole.Staff],
  },

  json: undefined,
  dynamic: false,
  slug: '',
})

const access = shallowRef<Record<'write' | 'read', boolean>>()

const { data: content, refresh: refreshContent } = await useAsyncData(async () => {
  if (article.value.slug) {
    return app.$client.article.get.query(article.value.slug)
  }
  return undefined
})

const { data: articles, refresh: refreshTree } = app.$client.article.localSlugs.useQuery()

const privileges: Record<ArticleProvider.TWriteAccess, string> = {
  staff: app.$i18n.t(localeKey.role(UserRole.Staff)),
  moderator: app.$i18n.t(localeKey.role(UserRole.Moderator)),
  beatmapNominator: app.$i18n.t(localeKey.role(UserRole.BeatmapNominator)),
}
const readPrivileges: Record<ArticleProvider.TReadAccess, string> = {
  ...privileges,
  [Scope.Public]: app.$i18n.t(localeKey.scope(Scope.Public)),
}

useHead({
  title: () => t(localeKey.title.articles.__path__),
  titleTemplate: title => `${title} - ${localeKey.server.name}`,
})

// Helper function to convert privilege object to select options
function options(priv: typeof privileges | typeof readPrivileges) {
  return Object.entries(priv).map(([value, label]) => ({ label, value }))
}

// Export article data to a file
function exportArticle() {
  const file = new File(
    [stringify(article.value)],
    `${article.value.slug || 'unnamed'}.article`,
    { type: 'application/text' },
  )

  const url = URL.createObjectURL(file)

  const a = document.createElement('a')
  a.href = url
  a.download = `${article.value.slug || 'unnamed'}.article`
  a.click()
}

// Import article data from a file
async function importArticle() {
  const file = importArticleFile.value?.files?.[0]
  if (!file) {
    return
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const decode = new TextDecoder('utf-8')
  const code = decode.decode(data)

  const value = parse(code)
  article.value = value

  editor.value?.reload()
}

// Create a new article
async function create() {
  article.value.json = {} as ArticleProvider.JSONContent
}

// Update article data from server
async function update() {
  await refreshContent()
  if (!content.value) {
    return
  }

  access.value = content.value.access
  article.value = {
    ...content.value,
    slug: article.value.slug,
  }
  nextTick(() => {
    editor.value?.reload()
  })
}

// Save article data to server
async function save() {
  if (!article.value.slug) {
    return
  }
  if (!article.value.json) {
    return
  }

  await app.$client.article.save.mutate(article.value as Required<typeof article['value']>)
}

// Delete article from server
async function del() {
  if (!article.value.slug) {
    return
  }

  // eslint-disable-next-line no-alert
  const conf = confirm('Are you sure? You cannot revert this process.')
  if (!conf) {
    return
  }

  await app.$client.article.delete.mutate({
    slug: article.value.slug,
  })
}
async function postFetch() {
  await refreshTree()
}
</script>

<i18n lang="yaml">
en-GB:
  editing: Editing
  load: Load
  new: New
  save: Save
  delete: Delete
  import: Import
  export: Export
  dynamic-content: Dynamic Content
  read-access: Read Access
  write-access: Write Access
  selecting: select

zh-CN:
  editing: 正在编辑
  load: 载入
  new: 新建
  save: 保存
  delete: 删除
  import: 导入
  export: 导出
  dynamic-content: 动态内容
  read-access: 访问权限
  write-access: 写入权限
  selecting: 请选择

fr-FR:
  editing: En Train de Modifier
  load: Charger
  new: Nouveau
  save: Sauvegarder
  delete: Supprimer
  import: Importer
  export: Exporter
  dynamic-content: Contenu Dynamique
  read-access: Accès à la Lecture
  write-access: Accès à l'Écriture
  selecting: Sélectionner

de-DE:
  editing: Bearbeiten
  load: Laden
  new: Neu
  save: Speichern
  delete: Löschen
  import: Importieren
  export: Exportieren
  dynamic-content: Dynamischer Inhalt
  read-access: Lesezugriff
  write-access: Schreibzugriff
  selecting: Auswählen
</i18n>

<template>
  <section v-if="articles" class="container pb-8 mx-auto custom-container">
    <input ref="importArticleFile" type="file" hidden @change="importArticle">
    <div class="flex flex-col lg:flex-row">
      <ul class="menu menu-xs bg-base-100 rounded-lg min-w-max">
        <tree
          v-bind="articles" @select="(entry) => {
            article.slug = entry.path
            update()
            postFetch()
          }"
        />
      </ul>
      <div class="divider divider-horizontal mx-2" />
      <div class="w-full">
        <div class="flex flex-wrap gap-2">
          <span class="whitespace-nowrap align-middle">{{ t('editing') }}:</span>
          <div class="join align-middle">
            <input
              v-model="article.slug" type="text" class="join-item input input-shadow input-sm shadow-lg" :class="{
                'input-error': !article.slug,
              }"
            >
            <button class="join-item btn btn-shadow btn-sm btn-info" @click="() => { update(); postFetch() }">
              {{ t('load') }}
            </button>
            <button class="join-item btn btn-shadow btn-sm btn-primary" @click="() => { create(); postFetch() }">
              {{ t('new') }}
            </button>
          </div>
          <div class="join align-middle">
            <button class="join-item btn btn-shadow btn-sm btn-primary" @click="importArticleFile?.click">
              {{ t('import') }}
            </button>
            <button class="join-item btn btn-shadow btn-sm btn-secondary" @click="exportArticle">
              {{ t('export') }}
            </button>
          </div>
          <div class="flex gap-2 ms-auto">
            <button
              class="btn btn-shadow btn-sm btn-success" :class="{
                'btn-disabled': !(article.slug && article.json),
              }" @click="() => { save(); postFetch() }"
            >
              {{ t('save') }}
            </button>
            <button
              class="btn btn-shadow btn-sm btn-error" :class="{
                'btn-disabled': !(article.slug && access?.write),
              }" @click="() => { del().then(postFetch) }"
            >
              {{ t('delete') }}
            </button>
          </div>
        </div>
        <div class="divider" />
        <div class="flex flex-col md:flex-row gap-3 flex-wrap">
          <div class="form-control flex-row items-center gap-2">
            <input v-model="article.dynamic" class="checkbox" type="checkbox">
            <label class="label whitespace-nowrap">{{ t('dynamic-content') }}</label>
          </div>
          <div class="form-control flex flex-row items-center gap-2">
            <label class="label whitespace-nowrap">{{ t('read-access') }}</label>
            <t-multi-select v-model="article.privilege.read" size="sm" :options="options(readPrivileges)" />
          </div>
          <div class="form-control flex flex-row items-center gap-2">
            <label class="label whitespace-nowrap">{{ t('write-access') }}</label>
            <t-multi-select v-model="article.privilege.write" size="sm" :options="options(privileges)" />
          </div>
        </div>
      </div>
    </div>
    <client-only>
      <ContentEditor v-if="article.json" ref="editor" v-model="article.json" class="safari-performance-boost mt-2" />
    </client-only>
  </section>
</template>
