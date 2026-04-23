export interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: number; // 1=student, 10=admin, 100=root
  status: number; // 1=enabled, 2=disabled
  email?: string;
  github_id?: string;
  oidc_id?: string;
  wechat_id?: string;
  telegram_id?: string;
  created_at: Date;
  updated_at: Date;
}