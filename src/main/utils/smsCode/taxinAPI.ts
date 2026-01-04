import { axiosRequest, PlatformAPI } from "./smsCodePlatformAPI";

/**
 * 参考: https://s.apifox.cn/83d98dd3-464a-410f-80d0-a277c8979f15
 */
const api: PlatformAPI & Record<string, any> = {
  name: '他信',
  baseURL: 'http://api.my531.com',
  projectId: '',
  token: '',
  username: '',
  password: '',
  async init() {
    if (!this.token) {
      try {
        const response = await axiosRequest({
          url: `${this.baseURL}/Login/?username=${this.username}&password=${this.password}&type=json`
        })
        if (response.data.code === 1) {
          this.token = response.data.data.token
        } else {
          throw new Error(`接口失败${JSON.stringify(response.data)}`)
        }
      } catch (e) {
        console.log('登录失败', e)
        throw new Error(`${e}`)
      }
    }
  },
  async getMoney(): Promise<string> {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/Balance/?token=${this.token}&type=json`
    })
    return response.data.data.money
  },
  async getPhone(): Promise<string> {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/GetPhone/?token=${this.token}&id=${this.projectId}&type=json`
    })
    if (response.data.code === 1) {
      return response.data.data
    } else {
      throw new Error(`接口失败${JSON.stringify(response.data)}`)
    }
  },
  async blockPhone(phone: string): Promise<boolean> {
    await this.init()
    const response = await axiosRequest({
      url: `${this.baseURL}/Addblack/?token=${this.token}&id=${this.projectId}&phone=${phone}&type=json`
    })
    if (response.data.code === 1) {
      return true
    } else {
      throw new Error(`接口失败${JSON.stringify(response.data)}`)
    }
  }
}

export default api
