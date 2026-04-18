import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase() {
  if (db) return db;

  try {
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
      throw new Error("L'application doit être lancée via Tauri pour accéder à SQLite.");
    }

    db = await Database.load('sqlite:barber_elite.db');

    // 1. CONFIGURATION SYSTÈME
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 2. ÉQUIPE (STAFF)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS staff (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        phone           TEXT,
        email           TEXT,
        password        TEXT, -- Mot de passe pour la connexion
        skills          TEXT, -- JSON string
        system_role     TEXT NOT NULL,
        gender          TEXT DEFAULT 'homme',
        avatar          TEXT,
        is_available    INTEGER DEFAULT 1,
        is_blocked      INTEGER DEFAULT 0,
        blocking_reason TEXT,
        created_at      TEXT NOT NULL
      );
    `);

    // 3. PRESTATIONS (SERVICES)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        price       INTEGER NOT NULL,
        duration    INTEGER DEFAULT 30,
        image       TEXT,
        created_at  TEXT NOT NULL
      );
    `);

    // 4. CLIENTS
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        phone       TEXT,
        avatar      TEXT,
        is_deleted  INTEGER DEFAULT 0,
        created_at  TEXT NOT NULL
      );
    `);

    // 5. FILE D'ATTENTE (QUEUE)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS queue (
        id            TEXT PRIMARY KEY,
        client_id     TEXT NOT NULL,
        service_name  TEXT,
        price         INTEGER,
        status        TEXT DEFAULT 'waiting',
        position      INTEGER,
        barber_name   TEXT,
        created_at    TEXT NOT NULL,
        started_at    TEXT,
        appointment_id TEXT UNIQUE,
        scheduled_at  TEXT
      );
    `);

    // 6. ARCHIVE QUEUE
    await db.execute(`
      CREATE TABLE IF NOT EXISTS archive_queue (
        id            TEXT PRIMARY KEY,
        client_id     TEXT NOT NULL,
        service_name  TEXT,
        price         INTEGER,
        status        TEXT,
        barber_name   TEXT,
        created_at    TEXT,
        started_at    TEXT,
        appointment_id TEXT,
        scheduled_at  TEXT,
        archived_at   TEXT NOT NULL
      );
    `);

    // 7. AUDIT LOGS
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id            TEXT PRIMARY KEY,
        user_id       TEXT,
        user_name     TEXT,
        user_role     TEXT,
        action        TEXT NOT NULL,
        entity_type   TEXT,
        entity_id     TEXT,
        details       TEXT,
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. RENDEZ-VOUS (APPOINTMENTS)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id            TEXT PRIMARY KEY,
        day           TEXT NOT NULL, -- ISO String
        hour          INTEGER NOT NULL,
        client_name   TEXT NOT NULL,
        service_id    TEXT,
        service_name  TEXT NOT NULL,
        price         INTEGER,
        staff_id      TEXT,
        staff_name    TEXT NOT NULL,
        note          TEXT,
        status        TEXT DEFAULT 'confirmed'
      );
    `);
 
     // =============================================
     // MIGRATIONS (Mise à jour du schéma existant)
     // =============================================
     try {
       const staffInfo: any[] = await db.select('PRAGMA table_info(staff)');
       if (!staffInfo.some(col => col.name === 'password')) {
         await db.execute('ALTER TABLE staff ADD COLUMN password TEXT');
         await db.execute("UPDATE staff SET password = LOWER(name) WHERE password IS NULL");
       }
       if (!staffInfo.some(col => col.name === 'gender')) {
         await db.execute("ALTER TABLE staff ADD COLUMN gender TEXT DEFAULT 'homme'");
       }
       if (!staffInfo.some(col => col.name === 'avatar')) {
         await db.execute("ALTER TABLE staff ADD COLUMN avatar TEXT");
       }

       const serviceInfo: any[] = await db.select('PRAGMA table_info(services)');
       if (!serviceInfo.some(col => col.name === 'created_at')) {
         await db.execute("ALTER TABLE services ADD COLUMN created_at TEXT");
         await db.execute("UPDATE services SET created_at = DATETIME('now') WHERE created_at IS NULL");
       }

       const clientInfo: any[] = await db.select('PRAGMA table_info(clients)');
       if (!clientInfo.some(col => col.name === 'created_at')) {
         await db.execute("ALTER TABLE clients ADD COLUMN created_at TEXT");
         await db.execute("UPDATE clients SET created_at = DATETIME('now') WHERE created_at IS NULL");
       }

       const queueInfo: any[] = await db.select('PRAGMA table_info(queue)');
       if (!queueInfo.some(col => col.name === 'barber_name')) {
         await db.execute("ALTER TABLE queue ADD COLUMN barber_name TEXT");
       }
       if (!queueInfo.some(col => (col.name || '').toLowerCase() === 'appointment_id')) {
         await db.execute("ALTER TABLE queue ADD COLUMN appointment_id TEXT").catch(() => {});
       }
       if (!queueInfo.some(col => (col.name || '').toLowerCase() === 'scheduled_at')) {
         await db.execute("ALTER TABLE queue ADD COLUMN scheduled_at TEXT").catch(() => {});
       }
       
       const auditInfo: any[] = await db.select('PRAGMA table_info(audit_logs)');
       if (!auditInfo.some(col => col.name === 'user_role')) {
         await db.execute("ALTER TABLE audit_logs ADD COLUMN user_role TEXT");
       }

       const archiveInfo: any[] = await db.select('PRAGMA table_info(archive_queue)');
       if (!archiveInfo.some(col => (col.name || '').toLowerCase() === 'appointment_id')) {
         await db.execute("ALTER TABLE archive_queue ADD COLUMN appointment_id TEXT").catch(() => {});
       }
       if (!archiveInfo.some(col => (col.name || '').toLowerCase() === 'scheduled_at')) {
         await db.execute("ALTER TABLE archive_queue ADD COLUMN scheduled_at TEXT").catch(() => {});
       }
     } catch (err) {
       console.warn('[DB] Migration Notice (Partial):', err);
     }

     // =============================================
     // CORRECTION DOUBLONS & UNIQUE CONSTRAINT
     // =============================================
     try {
        let needsQueueMigration = false;
        try {
           // Sonde triple : support 'scheduled' + support 'appointment_id' + contrainte UNIQUE
           await db.execute("INSERT INTO queue (id, client_id, status, created_at, appointment_id) VALUES ('probe_1', 'p', 'scheduled', 'now', 'probe_unique')");
           try {
              await db.execute("INSERT INTO queue (id, client_id, status, created_at, appointment_id) VALUES ('probe_2', 'p', 'scheduled', 'now', 'probe_unique')");
              // Si pas d'erreur ici, la contrainte UNIQUE manque
              needsQueueMigration = true;
           } catch (e) {
              // Erreur attendue si UNIQUE est présent
           }
           await db.execute("DELETE FROM queue WHERE appointment_id = 'probe_unique'");
        } catch (e) {
           needsQueueMigration = true;
        }

        if (needsQueueMigration) {
           console.log('[DB] Migration forcée : Reconstruction de "queue" avec UNIQUE constraint...');
           await db.execute("DROP TABLE IF EXISTS queue_backup");
           await db.execute("CREATE TABLE queue_backup AS SELECT * FROM queue");
           await db.execute("DROP TABLE queue");
           await db.execute(`
             CREATE TABLE queue (
               id            TEXT PRIMARY KEY,
               client_id     TEXT NOT NULL,
               service_name  TEXT,
               price         INTEGER,
               status        TEXT DEFAULT 'waiting',
               position      INTEGER,
               barber_name   TEXT,
               created_at    TEXT NOT NULL,
               started_at    TEXT,
               appointment_id TEXT UNIQUE,
               scheduled_at  TEXT
             )
           `);
           
           try {
              // Nettoyage des doublons avant restauration
              await db.execute(`
                 DELETE FROM queue_backup 
                 WHERE appointment_id IS NOT NULL 
                 AND id NOT IN (
                    SELECT MIN(id) FROM queue_backup GROUP BY appointment_id
                 )
              `);
              await db.execute("INSERT INTO queue SELECT * FROM queue_backup");
           } catch (injectErr) {
              console.warn('[DB] Injection partial failure:', injectErr);
           }
           await db.execute("DROP TABLE queue_backup");
        }

        let needsArchiveMigration = false;
        try {
           await db.execute("INSERT INTO archive_queue (id, client_id, status, archived_at) VALUES ('temp_test_status_archive', 'passage', 'scheduled', DATETIME('now'))");
           await db.execute("DELETE FROM archive_queue WHERE id = 'temp_test_status_archive'");
        } catch (e) {
           needsArchiveMigration = true;
        }

        if (needsArchiveMigration) {
           await db.execute("DROP TABLE IF EXISTS archive_backup");
           await db.execute("CREATE TABLE archive_backup AS SELECT * FROM archive_queue");
           await db.execute("DROP TABLE archive_queue");
           await db.execute(`
             CREATE TABLE archive_queue (
               id            TEXT PRIMARY KEY,
               client_id     TEXT NOT NULL,
               service_name  TEXT,
               price         INTEGER,
               status        TEXT,
               barber_name   TEXT,
               created_at    TEXT,
               started_at    TEXT,
               appointment_id TEXT,
               scheduled_at  TEXT,
               archived_at   TEXT NOT NULL
             )
           `);
           await db.execute("INSERT INTO archive_queue SELECT * FROM archive_backup");
           await db.execute("DROP TABLE archive_backup");
        }
     } catch (migrationErr) {
        console.error('[DB] Erreur lors de la migration complexe :', migrationErr);
     }

    // =============================================
    // SEEDING
    // =============================================
    const adminExists = await db.select('SELECT id FROM staff WHERE id = "admin-id"');
    if (Array.isArray(adminExists) && adminExists.length === 0) {
      await db.execute(`
        INSERT INTO staff (id, name, system_role, password, skills, gender, created_at) 
        VALUES ("admin-id", "Administrateur", "admin", "admin", '["barbier"]', "homme", DATETIME('now'))
      `);
    }

    const passageExists = await db.select('SELECT id FROM clients WHERE id = "passage"');
    if (Array.isArray(passageExists) && passageExists.length === 0) {
       await db.execute(`
          INSERT INTO clients (id, name, is_deleted, created_at)
          VALUES ("passage", "Client de Passage", 0, DATETIME('now'))
       `);
    }

    const servicesCount: any[] = await db.select('SELECT count(*) as count FROM services');
    if (servicesCount[0].count === 0) {
       const initialServices = [
          { id: 'srv-001', name: 'Coupe Simple', price: 2000 },
          { id: 'srv-002', name: 'Taille Barbe', price: 1500 },
          { id: 'srv-003', name: 'Soin Premium', price: 5000 },
          { id: 'srv-004', name: 'Coupe Enfant', price: 1000 }
       ];
       for (const s of initialServices) {
          await db.execute('INSERT INTO services (id, name, price, created_at) VALUES (?, ?, ?, DATETIME("now"))', [s.id, s.name, s.price]);
       }
    }

    // =============================================
    // MAINTENANCE (Nettoyage automatique)
    // =============================================
    // Archivage automatique du journal d'audit (Supprime logs > 30 jours)
    await db.execute("DELETE FROM audit_logs WHERE created_at < DATETIME('now', '-30 days')");

    console.log('[DB] Success: SQLite Core fully restored and initialized.');
    return db;
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    throw error;
  }
}

export async function getDb(): Promise<Database> {
  if (!db) return await initDatabase();
  return db;
}
