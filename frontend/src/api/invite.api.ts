import client from './client';

export interface AgentInvitation {
  id: string;
  inviter_id: string;
  agent_email: string;
  agent_name: string | null;
  invitee_user_id: string | null;
  status: string;
  created_at: string;
}

/** 邀请海外代理 */
export function inviteAgent(data: { agent_email: string; agent_name?: string }) {
  return client.post('/invite-agent', data);
}

/** 我的邀请记录 */
export function fetchMyInvitations() {
  return client.get<{ data: AgentInvitation[] }>('/invite-agent/my-invitations');
}
