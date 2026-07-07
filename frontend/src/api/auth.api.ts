import client from './client';
import { LoginRequest, LoginResponse, UserPublic } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data).then((res) => res.data),

  userLogin: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/user-login', data).then((res) => res.data),

  me: () =>
    client.get<UserPublic>('/auth/me').then((res) => res.data),

  updateProfile: (data: FormData) =>
    client.put<{ message: string; user: UserPublic }>('/auth/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data),

  sendEmailCode: (email: string, role?: string) =>
    client.post<{ message: string }>('/auth/send-code', { email, role }).then((res) => res.data),

  checkEmailCode: (email: string, code: string) =>
    client.post<{ message: string }>('/auth/check-code', { email, code }).then((res) => res.data),
};
