use std::fs;
use tauri::{AppHandle, Manager};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};

// ================================================================
// MACHINE ID — Identification unique de la machine (HWID)
// Méthode: WMIC -> PowerShell -> Registry (en cascade)
// ================================================================

#[cfg(target_os = "windows")]
fn get_machine_id_internal() -> String {
    use std::process::Command;

    if let Ok(output) = Command::new("wmic").args(&["csproduct", "get", "uuid"]).output() {
        let result = String::from_utf8_lossy(&output.stdout);
        let cleaned = result.replace("UUID", "").trim().to_string();
        if !cleaned.is_empty() && cleaned != "00000000-0000-0000-0000-000000000000" {
            return cleaned;
        }
    }

    if let Ok(output) = Command::new("powershell")
        .args(&["-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid"])
        .output() {
        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !result.is_empty() { return result; }
    }

    if let Ok(output) = Command::new("reg")
        .args(&["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
        .output() {
        let result = String::from_utf8_lossy(&output.stdout);
        if let Some(guid) = result.split_whitespace().last() {
            if guid.contains('-') { return guid.to_string(); }
        }
    }

    "YUMI-HWID-UNKNOWN".to_string()
}

#[cfg(not(target_os = "windows"))]
fn get_machine_id_internal() -> String {
    if let Ok(id) = fs::read_to_string("/etc/machine-id") { return id.trim().to_string(); }
    "FALLBACK-MACHINE-ID".to_string()
}

#[tauri::command]
fn get_machine_id() -> String {
    get_machine_id_internal().to_uppercase()
}

// ================================================================
// LICENCE — Vérification cryptographique Ed25519
// Clé publique Yumi Hub (partagée par tous les projets Hub)
// ================================================================

#[tauri::command]
fn verify_license(machine_id: String, license_key: String) -> bool {
    let pub_bytes = match hex::decode("eef17a2365fe4e7d9fbad5d87741f79979e00055108be650d57ece534d53360a") {
        Ok(b) => b, Err(_) => return false,
    };
    let mut pub_arr = [0u8; 32];
    pub_arr.copy_from_slice(&pub_bytes);
    let public_key = match VerifyingKey::from_bytes(&pub_arr) {
        Ok(pk) => pk, Err(_) => return false,
    };
    let sig_bytes = match hex::decode(&license_key) {
        Ok(b) => b, Err(_) => return false,
    };
    let signature = match Signature::from_slice(&sig_bytes) {
        Ok(s) => s, Err(_) => return false,
    };
    println!("[LICENSE_Backend] Verifying Message: {}", machine_id);
    println!("[LICENSE_Backend] With Key Hash: {}", &license_key[..10]);
    
    let valid = public_key.verify(machine_id.as_bytes(), &signature).is_ok();
    println!("[LICENSE_Backend] Result: {}", valid);
    valid
}

// ================================================================
// PERSISTANCE LICENCE — Lecture/Écriture du fichier .license
// ================================================================

#[tauri::command]
fn get_license_key(app_handle: AppHandle) -> String {
    let data_dir = match app_handle.path().app_data_dir() {
        Ok(dir) => dir, Err(_) => return String::new(),
    };
    fs::read_to_string(data_dir.join(".license")).unwrap_or_default().trim().to_string()
}

#[tauri::command]
fn save_license_key(app_handle: AppHandle, key: String) -> Result<(), String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !data_dir.exists() { fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?; }
    fs::write(data_dir.join(".license"), key).map_err(|e| e.to_string())?;
    Ok(())
}

// ================================================================
// UTILITAIRES — Hachage, UUID, Backup DB
// ================================================================

#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_password(password: String, hash: String) -> bool {
    bcrypt::verify(password, &hash).unwrap_or(false)
}

#[tauri::command]
fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Backup quotidien de la base de données avec rétention de 7 jours.
#[tauri::command]
fn backup_database(app_handle: tauri::AppHandle, db_name: String) -> Result<(), String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let backup_dir = data_dir.join("backups");
    if !backup_dir.exists() { fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?; }

    let db_path = data_dir.join(&db_name);
    if !db_path.exists() { return Ok(()); }

    let now = chrono::Local::now();
    let backup_path = backup_dir.join(format!("backup-{}.db", now.format("%Y-%m-%d")));
    if !backup_path.exists() { fs::copy(db_path, backup_path).map_err(|e| e.to_string())?; }

    // Suppression des backups > 7 jours
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(created) = metadata.created() {
                    if created.elapsed().map(|d| d.as_secs()).unwrap_or(0) > 7 * 86400 {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }
    Ok(())
}

// ================================================================
// POINT D'ENTRÉE TAURI
// ================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }
            Ok(())
        })
        // Remplacer {{DB_NAME}} par le nom réel de la base (ex: "pharma_pro_v1.db")
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:barber_elite.db", vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "create_initial_tables",
                    sql: "
                        CREATE TABLE users (
                            id TEXT PRIMARY KEY,
                            username TEXT UNIQUE NOT NULL,
                            password_hash TEXT NOT NULL,
                            role TEXT NOT NULL CHECK(role IN ('admin', 'barber'))
                        );
                        CREATE TABLE services (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            price REAL NOT NULL,
                            duration INTEGER
                        );
                        CREATE TABLE clients (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            phone TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                        CREATE TABLE sessions (
                            id TEXT PRIMARY KEY,
                            client_id TEXT NOT NULL,
                            barber_id TEXT NOT NULL,
                            service_id TEXT NOT NULL,
                            total_price REAL NOT NULL,
                            payment_method TEXT CHECK(payment_method IN ('cash', 'mobile_money')),
                            status TEXT DEFAULT 'unpaid',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(client_id) REFERENCES clients(id),
                            FOREIGN KEY(barber_id) REFERENCES users(id),
                            FOREIGN KEY(service_id) REFERENCES services(id)
                        );
                        CREATE TABLE queue (
                            id TEXT PRIMARY KEY,
                            client_id TEXT NOT NULL,
                            status TEXT CHECK(status IN ('waiting', 'in_progress', 'completed')),
                            position INTEGER NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(client_id) REFERENCES clients(id)
                        );
                    ",
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 2,
                    description: "staff_and_live_flow_updates",
                    sql: "
                        -- Table pour l'équipe (Staff)
                        CREATE TABLE staff (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            phone TEXT,
                            email TEXT,
                            skills TEXT, -- JSON array
                            system_role TEXT NOT NULL,
                            gender TEXT NOT NULL,
                            avatar TEXT,
                            is_available BOOLEAN DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );

                        -- Ajout de l'image pour les services
                        ALTER TABLE services ADD COLUMN image TEXT;

                        -- Mise à jour de la table utilisateurs pour le lien staff et nouveaux rôles
                        -- SQLite ne permet pas de modifier les contraintes CHECK facilement.
                        -- On ajoute une colonne optionnelle pour le staff_id.
                        ALTER TABLE users ADD COLUMN staff_id TEXT;

                        -- Mise à jour de la file d'attente
                        -- Pour ajouter 'cancelled' et les détails, on recrée la table avec le nouveau schéma
                        CREATE TABLE queue_new (
                            id TEXT PRIMARY KEY,
                            client_id TEXT NOT NULL,
                            service_name TEXT,
                            price REAL,
                            status TEXT CHECK(status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
                            position INTEGER NOT NULL,
                            barber_name TEXT,
                            started_at DATETIME,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(client_id) REFERENCES clients(id)
                        );

                        -- Migration des données existantes (le cas échéant)
                        INSERT INTO queue_new (id, client_id, status, position, created_at)
                        SELECT id, client_id, status, position, created_at FROM queue;

                        DROP TABLE queue;
                        ALTER TABLE queue_new RENAME TO queue;
                    ",
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 3,
                    description: "staff_blocking_and_client_avatars",
                    sql: "
                        -- Extension de la table Staff pour le blocage
                        ALTER TABLE staff ADD COLUMN is_blocked BOOLEAN DEFAULT 0;
                        ALTER TABLE staff ADD COLUMN blocking_reason TEXT;

                        -- Extension de la table Clients pour les avatars et suppression logique
                        ALTER TABLE clients ADD COLUMN avatar TEXT;
                        ALTER TABLE clients ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
                    ",
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }
            ])
            .build()
        )
        .invoke_handler(tauri::generate_handler![
            get_machine_id,
            verify_license,
            get_license_key,
            save_license_key,
            hash_password,
            verify_password,
            generate_id,
            backup_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
