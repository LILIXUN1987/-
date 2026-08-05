import client from './client';

export interface CompanyMate {
  display_name: string;
  company_name: string;
}

export const registerApi = {
  /** 注册时查询同公司同事 */
  companyMates: (q: string) =>
    client.get<{ data: CompanyMate[] }>('/auth/company-mates', { params: { q } }).then(r => r.data.data),

  register: (data: {
    username: string;
    password: string;
    display_name: string;
    gender?: string;
    company_name: string;
    phone: string;
    email: string;
    emailCode: string;
    role?: string;
    card_image?: File;
    jc_trans_id?: string;
    wca_id?: string;
    ref?: string;
    is_newbie?: boolean;
    is_enterprise?: boolean;
    license_image?: File;
  }) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('display_name', data.display_name);
    formData.append('gender', data.gender);
    formData.append('company_name', data.company_name);
    if (data.phone) formData.append('phone', data.phone);
    if (data.email) formData.append('email', data.email);
    if (data.emailCode) formData.append('email_code', data.emailCode);
    if (data.role) formData.append('role', data.role);
    if (data.jc_trans_id) formData.append('jc_trans_id', data.jc_trans_id);
    if (data.wca_id) formData.append('wca_id', data.wca_id);
    if (data.ref) formData.append('ref', data.ref);
    if (data.is_newbie) formData.append('is_newbie', 'true');
    if (data.is_enterprise) formData.append('is_enterprise', 'true');
    if (data.card_image) formData.append('card_image', data.card_image);
    if (data.license_image) formData.append('license_image', data.license_image);
    return client.post('/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
