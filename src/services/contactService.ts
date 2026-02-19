import { api } from "@/services";
import type { Contact, ContactFormState } from "@/types";

const RESOURCE = "/contacts";

export default {
  async getAll() {
    return api.get<Contact[]>(RESOURCE);
  },
  async get(uuid: string) {
    return api.get<Contact>(`${RESOURCE}/${uuid}`);
  },
  async create(data: ContactFormState) {
    return api.post<Contact>(RESOURCE, data);
  },
  async update(uuid: string, data: ContactFormState) {
    return api.put<Contact>(`${RESOURCE}/${uuid}`, data);
  },
  async delete(uuid: string) {
    return api.delete(`${RESOURCE}/${uuid}`);
  },
};
