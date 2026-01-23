import api from './api';

interface UserData {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  full_name?: string;
  phone?: string;
  organization_id?: number;
}

export const createUser = async (userData: UserData) => {
  const response = await api.post('/sysadmin/users', userData);
  return response.data;
};

export const updateUser = async (userId: number | string, userData: Partial<UserData>) => {
  const response = await api.put(`/sysadmin/users/${userId}`, userData);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/sysadmin/users');
  return response.data?.data || response.data || [];
};

export const deleteUser = async (userId: number | string) => {
  const response = await api.delete(`/sysadmin/users/${userId}`);
  return response.data;
};

export default {
  createUser,
  updateUser,
  getUsers,
  deleteUser,
};
