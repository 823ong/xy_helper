import { axiosRequest, PlatformAPI } from './smsCodePlatformAPI'

/**
 * https://www.showdoc.com.cn/haozhuma/11558943706462592
 */
const api: PlatformAPI = {
  name: '豪猪',
  // baseURL: "https://api.haozhuma.com",
  baseURL: 'https://api.haozhuyun.com',
  token: '',
  username: '',
  password: '',
  projectId: '',
  async init() {
    if (!this.token) {
      try {
        const response = await axiosRequest({
          url: `${this.baseURL}/sms/?api=login&user=${this.username}&pass=${this.password}`,
          method: 'GET'
        })
        if (response.data.code == 0) {
          this.token = response.data.token
        } else {
          throw new Error(`获取token失败,${JSON.stringify(response?.data)}`)
        }
      } catch (e: any) {
        if (e instanceof Object && e.response) {
          console.error('登录失败', e.response.data)
          throw new Error(`登录失败${JSON.stringify(e.response.data)}`)
        } else {
          throw e
        }
      }
    }
  },
  async getMoney(): Promise<string> {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/sms/?api=getSummary&token=${this.token}&sid=${this.projectId}`,
      method: 'POST'
    })
    return response.data.money
  },
  async getPhone(): Promise<string> {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/sms/?api=getPhone&token=${this.token}&sid=${this.projectId}`,
      method: 'POST'
    })
    return response.data.phone
  },
  async blockPhone(phone: string) {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/sms/?api=addBlacklist&token=${this.token}&phone=${phone}&sid=${this.projectId}`,
      method: 'POST'
    })
    return response.data.code == 0
  }
}

export default api
