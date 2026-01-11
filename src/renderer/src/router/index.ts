import { PhonePortraitOutline, Planet, SettingsOutline } from "@vicons/ionicons5";
import { createRouter, createWebHashHistory } from "vue-router";

import MainLayout from "../layouts/MainLayout.vue";

const routes = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/ScanAccount',
    children: [
      {
        path: '/ScanAccount',
        name: 'ScanAccount',
        component: () => import('../views/ScanAccount/index.vue'),
        meta: {
          label: '扫号器',
          icon: Planet,
          hidden: true,
        }
      },
      // {
      //   path: '/CookieGetter',
      //   name: 'CookieGetter',
      //   component: () => import('../views/CookieGetter/index.vue'),
      //   meta: {
      //     label: '上号器',
      //     icon: Accessibility,
      //     hidden: true,
      //   }
      // },
      {
        path: '/PhoneData',
        name: 'PhoneData',
        component: () => import('../views/PhoneData/index.vue'),
        meta: {
          label: '账户管理',
          icon: PhonePortraitOutline,
          hidden: true,
        }
      },
      // {
      //   path: '/已采集数据',
      //   name: 'CollectedData',
      //   component: () => import('../views/PhoneData/index.vue'),
      //   meta: {
      //     label: '已采集数据',
      //     icon: Fish,
      //     hidden: true,
      //   }
      // },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings/index.vue'),
        meta: {
          label: '设置',
          icon: SettingsOutline
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
