export type SystemRole = 'admin' | 'gerant' | 'employe';

export interface User {
  id: string;
  name: string;
  role: SystemRole;
  avatar?: string;
}

export type JobSkill = string;

export interface StaffMember {
  id: string;
  name: string;
  systemRole: SystemRole;
  skills: JobSkill[];
  gender: 'homme' | 'femme';
  avatar?: string;
  isAvailable: boolean;
  phone?: string;
  email?: string;
  password?: string;
  isBlocked: boolean;
  blockingReason?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  loyalty_points?: number;
  last_visit?: string;
  is_deleted?: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  image: string;
  created_at?: string;
}

export interface QueueItem {
  id: string;
  client_id: string;
  client_name?: string;
  phone?: string;
  service_name: string;
  price: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled';
  position: number;
  created_at: string;
  started_at?: string;
  barber_name?: string;
  archived_at?: string;
  appointment_id?: string;
  scheduled_at?: string;
}

export interface ArchiveItem {
  id: string;
  client_id: string;
  client_name?: string;
  phone?: string;
  service_name: string;
  price: number;
  status: string;
  barber_name: string;
  appointment_id?: string;
  scheduled_at?: string;
  created_at: string;
  started_at?: string;
  archived_at: string;
}
