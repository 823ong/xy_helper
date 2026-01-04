<template>
  <n-layout has-sider position="absolute">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :native-scrollbar="false"
      class="h-screen"
      collapsed
    >
      <n-menu
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleUpdateValue"
        collapsed
      />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered class="h-16 flex items-center px-6 justify-between">
        <h2 class="text-lg font-medium">{{ currentRouteName }}</h2>
        <div class="flex items-center gap-4">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </n-layout-header>
      <n-layout-content
        content-style="padding: 0px;"
        class="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)] h-[calc(100vh-64px)]"
      >
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="tsx">
import { BrowsersOutline } from '@vicons/ionicons5'
import { NIcon, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NMenu, useMessage } from 'naive-ui'
import { MenuMixedOption } from 'naive-ui/es/menu/src/interface'
import { computed, h, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { win } from '@renderer/win'
import { TransferLog } from '../../../preload/types/api'

(window as any).message = useMessage()

const router = useRouter()
const route = useRoute()

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon ?? BrowsersOutline) })
}

const menuOptions = computed((): MenuMixedOption[] => {
  const routes = router.getRoutes()

  return routes
    .filter((i) => !!i.name)
    .map((route) => {
      console.log(route.meta?.label ?? route.name, '===>', route.meta?.hidden === true)
      return {
        label: () => route.meta?.hidden === true ?
          (route.meta?.label ?? route.name) :
          (
            <RouterLink to={{ path: route.path }}>{route.meta?.label ?? route.name}</RouterLink>
          ),
        key: route.name,
        icon: renderIcon(route.meta?.icon)
      }
    }) as any
})

const activeKey = ref<string | null>(null)

const handleUpdateValue = (key: string) => {
  activeKey.value = key
  const routes = router.getRoutes()
  const targetRoute = routes.find((r) => r.name === key)
  if (targetRoute) {
    // Navigate to the route path - router will handle the path correctly
    router.push(targetRoute.path)
  }
}

// Sync menu with route
const updateMenuFromRoute = () => {
  const routes = router.getRoutes()
  const appRoutes = routes.filter((r) => r.meta && r.meta.label && r.name)

  // Find matching route
  const matchedRoute = appRoutes.find((r) => {
    return route.path === r.path || (r.path === '' && route.path === '/')
  })

  if (matchedRoute) {
    activeKey.value = matchedRoute.name as string
  }
}

onMounted(() => {
  updateMenuFromRoute()
})

router.afterEach(() => {
  updateMenuFromRoute()
})

const currentRouteName = computed(() => {
  return route.meta?.label ? String(route.meta?.label) : 'Dashboard'
})
onMounted(() => {
  win.api.onGlobalLog((logObj: TransferLog) => {
    switch (logObj.level) {
      case 'debug':
        win.message.info(logObj.content)
        break
      case 'info':
        win.message.success(logObj.content)
        break
      case 'warn':
        win.message.warning(logObj.content)
        break
      case 'error':
        win.message.error(logObj.content)
        break
      default:
        win.message.info(logObj.content)
    }
  })
})
</script>
