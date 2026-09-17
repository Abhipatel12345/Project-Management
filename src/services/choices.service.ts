import api from './api';
import { MasterChoicesConfig, DEFAULT_MASTER_CHOICES } from '@/config/charter-choices.config';

class ChoicesService {
  async getMasterChoices(): Promise<MasterChoicesConfig> {
    try {
      const res = await api.get<MasterChoicesConfig>('/api/choices');
      return res || DEFAULT_MASTER_CHOICES;
    } catch {
      return DEFAULT_MASTER_CHOICES;
    }
  }

  async updateMasterChoices(choices: Partial<MasterChoicesConfig>): Promise<MasterChoicesConfig> {
    const res = await api.put<MasterChoicesConfig>('/api/choices', choices);
    return res;
  }
}

export const choicesService = new ChoicesService();
export default choicesService;
