import { PlatformAPI } from "./smsCodePlatformAPI";

/**
 * test
 */
const api: PlatformAPI = {
  name: 'test',
  baseURL: '',
  token: '',
  username: '',
  password: '',
  projectId: '',
  async init() {
  },
  async getMoney(): Promise<string> {
    return '999.99'
  },
  async getPhone(): Promise<string> {
    const prefixes = ['13', '14', '15', '16', '17', '18', '19'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
    return prefix + suffix;
  },
  async blockPhone(_phone: string) {
    return true
  }
}

export default api
