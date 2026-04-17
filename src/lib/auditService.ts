import { getDb } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

/**
 * centralize activity tracking for the Salon.
 */
export async function logAction(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any,
  forceUser?: any
) {
  try {
    const db = await getDb();
    
    // tentative de récupération de l'utilisateur (Store ou LocalStorage en fallback)
    let currentUser = forceUser || useAuthStore.getState().user;
    
    if (!currentUser) {
       try {
          const storage = localStorage.getItem('elite-auth-storage');
          if (storage) {
             const parsed = JSON.parse(storage);
             if (parsed?.state?.user) {
                currentUser = parsed.state.user;
             }
          }
       } catch (e) {
          console.warn("[Audit] Fallback user detection failed");
       }
    }

    const id = Math.random().toString(36).substr(2, 9);
    const user_id = currentUser?.id || 'system';
    const user_name = currentUser?.name || 'Système';
    const user_role = currentUser?.role || (user_id === 'system' ? 'system' : 'employe');
    const processedDetails = typeof details === 'string' ? details : JSON.stringify(details);

    await db.execute(
      'INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, user_id, user_name, user_role, action, entityType || null, entityId || null, processedDetails || null]
    );
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}

/**
 * Build a human-readable diff of changes.
 */
export function buildDiff(oldData: any, newData: any, fields: string[]): string {
  const changes: string[] = [];
  for (const field of fields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    const isDifferent = typeof oldVal === 'object' && oldVal !== null
      ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
      : oldVal !== newVal;

    if (newVal !== undefined && isDifferent) {
      const displayOld = typeof oldVal === 'object' ? JSON.stringify(oldVal) : (oldVal ?? 'Vide');
      const displayNew = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal;
      changes.push(`${field.toUpperCase()}: "${displayOld}" → "${displayNew}"`);
    }
  }
  return changes.join(', ');
}

export async function getLogs(limit: number = 200): Promise<AuditLog[]> {
  try {
    const db = await getDb();
    return await db.select<AuditLog[]>(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error("[Audit] Failed to fetch logs:", error);
    return [];
  }
}

export async function clearAuditLogs(user?: any) {
  try {
    const db = await getDb();
    await db.execute('DELETE FROM audit_logs');
    await logAction('PURGE_JOURNAL', 'system', undefined, 'Effacement complet du journal d\'audit', user);
  } catch (error) {
    console.error("[Audit] Clear failed:", error);
  }
}
