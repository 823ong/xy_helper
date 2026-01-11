<template>
  <div class="p-4 h-full flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <div class="flex gap-2">
        <n-input v-model:value="searchPhone" placeholder="搜索手机号" clearable @keydown.enter="fetchData" />
        <n-select v-model:value="searchStatus" :options="statusOptions" placeholder="选择状态" class="w-32" />
        <n-button type="primary" @click="fetchData">搜索</n-button>
      </div>
      <div class="flex gap-2">
        <n-button type="primary" @click="handleBatchAdd">增加新号码</n-button>
        <n-button type="primary" @click="handleAdd">新增数据</n-button>
      </div>
    </div>

    <n-data-table size="small" :bordered="false" :single-line="false" :columns="columns" :data="dataList"
      :pagination="pagination" :loading="loading" :scroll-x="1200" remote class="flex-1" flex-height />

    <n-modal v-model:show="showModal" preset="card" :title="modalTitle" class="w-[600px]">
      <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="80">
        <n-form-item label="手机号" path="phone">
          <n-input v-model:value="formData.phone" placeholder="请输入手机号" />
        </n-form-item>
        <n-form-item label="PT" path="pt">
          <n-input v-model:value="formData.pt" placeholder="请输入PT" />
        </n-form-item>
        <n-form-item label="XMID" path="xmid">
          <n-input v-model:value="formData.xmid" placeholder="请输入XMID" />
        </n-form-item>
        <n-form-item label="状态" path="status">
          <n-select v-model:value="formData.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="原因" path="reason">
          <n-input v-model:value="formData.reason" type="textarea" placeholder="请输入原因" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
        </div>
      </template>
    </n-modal>


    <n-modal v-model:show="showBatchModal" preset="card" title="增加新号码" class="w-[500px]">
      <n-form :model="batchData" label-placement="left" label-width="100">
        <n-form-item label="获取方式">
          <n-radio-group v-model:value="batchData.type">
            <n-space>
              <n-radio value="single">选择已有的平台</n-radio>
              <n-radio value="all">每个平台获取</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <n-form-item v-if="batchData.type === 'single'" label="选择平台">
          <n-select v-model:value="batchData.platform" :options="platformOptions" placeholder="请选择平台" />
        </n-form-item>

        <n-form-item label="获取数量">
          <n-input-number v-model:value="batchData.count" :min="1" placeholder="请输入数量" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showBatchModal = false">取消</n-button>
          <n-button type="primary" :loading="batchSubmitting" @click="handleBatchSubmit">确定</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from "vue";
import {
  DataTableColumns,
  FormInst,
  NButton,
  NInputNumber,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  useMessage
} from "naive-ui";
import dayjs from "dayjs";

interface PhoneData {
  id: number
  phone: string
  pt: string | null
  xmid: string | null
  status: number
  reason: string | null
  createAt: string
  updateAt: string
}

const message = useMessage()
const loading = ref(false)
const dataList = ref<PhoneData[]>([])
const searchPhone = ref('')
const searchStatus = ref(2) // 默认为已认证
const showModal = ref(false)
const submitting = ref(false)
const formRef = ref<FormInst | null>(null)
const editingId = ref<number | null>(null)

// Batch Add State
const showBatchModal = ref(false)
const batchSubmitting = ref(false)
const platformOptions = ref<{ label: string, value: string }[]>([])
const batchData = reactive({
  type: 'single', // 'single' | 'all'
  platform: null as string | null,
  count: 10
})

const modalTitle = computed(() => editingId.value ? '编辑数据' : '新增数据')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    fetchData()
  }
})

const formData = reactive({
  phone: '',
  pt: '',
  xmid: '',
  status: 0,
  reason: ''
})

const rules = {
  phone: { required: true, message: '请输入手机号', trigger: 'blur' },
  status: { type: 'number', required: true, message: '请选择状态', trigger: 'change' }
}

const statusOptions = [
  { label: '不可用', value: -1 },
  { label: '未检查', value: 0 },
  { label: '检查中', value: 1 },
  { label: '已认证', value: 2 },
  { label: '未认证', value: 3 }
]

const columns: DataTableColumns<PhoneData> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '手机号', key: 'phone', width: 150 },
  { title: '平台', key: 'pt', width: 120 },
  { title: '项目ID', key: 'xmid', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const option = statusOptions.find(o => o.value === row.status)
      return option ? option.label : row.status
    }
  },
  { title: '原因', key: 'reason' },
  {
    title: '更新时间',
    key: 'updateAt',
    width: 180,
    render(row) {
      return dayjs(row.updateAt).format('YYYY-MM-DD HH:mm:ss')
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleEdit(row)
          }, { default: () => '编辑' }),
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row)
          }, { default: () => '删除' })
        ]
      })
    }
  }
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await window.electron.ipcRenderer.invoke('phone-data:get-list', {
      page: pagination.page,
      pageSize: pagination.pageSize,
      phone: searchPhone.value,
      status: searchStatus.value
    })
    dataList.value = res.items
    pagination.itemCount = res.total
  } catch (error) {
    console.error(error)
    message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  editingId.value = null
  formData.phone = ''
  formData.pt = ''
  formData.xmid = ''
  formData.status = 0
  formData.reason = ''
  showModal.value = true
}

const handleEdit = (row: PhoneData) => {
  editingId.value = row.id
  formData.phone = row.phone
  formData.pt = row.pt || ''
  formData.xmid = row.xmid || ''
  formData.status = row.status
  formData.reason = row.reason || ''
  showModal.value = true
}

const handleDelete = async (row: PhoneData) => {
  try {
    await window.electron.ipcRenderer.invoke('phone-data:delete', row.id)
    message.success('删除成功')
    fetchData()
  } catch (error) {
    message.error('删除失败')
  }
}

const handleSubmit = () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      submitting.value = true
      try {
        const payload = { ...formData }
        if (editingId.value) {
          Object.assign(payload, { id: editingId.value })
        }
        await window.electron.ipcRenderer.invoke('phone-data:save', payload)
        message.success(editingId.value ? '修改成功' : '新增成功')
        showModal.value = false
        fetchData()
      } catch (error) {
        message.error('保存失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleBatchAdd = async () => {
  try {
    const platforms = await window.electron.ipcRenderer.invoke('phone-data:get-platforms')
    platformOptions.value = platforms
    batchData.type = 'single'
    batchData.platform = platforms.length > 0 ? platforms[0].value : null
    batchData.count = 10
    showBatchModal.value = true
  } catch (error) {
    message.error('获取平台列表失败')
  }
}

const handleBatchSubmit = async () => {
  if (batchData.type === 'single' && !batchData.platform) {
    message.warning('请选择平台')
    return
  }

  batchSubmitting.value = true
  try {
    const res = await window.electron.ipcRenderer.invoke('phone-data:batch-fetch', {
      type: batchData.type,
      platform: batchData.platform,
      count: batchData.count
    })

    if (res.success) {
      message.success('任务已提交')
      showBatchModal.value = false
      fetchData()
    } else {
      message.error(res.error || '获取失败')
    }
  } catch (error) {
    console.error(error)
    message.error('操作失败')
  } finally {
    batchSubmitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
