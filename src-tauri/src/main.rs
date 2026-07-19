#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use chrono::{Datelike, Local};
use rusqlite::{backup::Backup, params, Connection, OpenFlags, OptionalExtension};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::Manager;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(target_os = "windows")]
use notify_rust::{Notification, NotificationResponse};
#[cfg(target_os = "windows")]
use tauri::Emitter;

struct WindowCloseBehavior(AtomicBool);

impl Default for WindowCloseBehavior {
    fn default() -> Self {
        // 默认隐藏而不是退出，避免提醒调度器因误关窗口而停止。
        Self(AtomicBool::new(true))
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 在 Windows 使用带激活回调的原生 toast。notification 插件负责展示，
/// 但不会把点击通知正文的事件回传到 WebView，因而无法定位到对应任务。
#[tauri::command]
fn send_interactive_task_reminder(
    app: tauri::AppHandle,
    task_id: String,
    title: String,
    body: String,
) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let mut notification = Notification::new();
        notification
            .app_id("cn.duqimeng.simpletodo")
            .summary(&title)
            .body(&body);
        let handle = notification
            .show()
            .map_err(|err| format!("发送 Windows 提醒失败: {err}"))?;

        std::thread::spawn(move || {
            let _ = handle.wait_for_response(move |response: &NotificationResponse| {
                if matches!(
                    response,
                    NotificationResponse::Default | NotificationResponse::Action(_)
                ) {
                    show_main_window(&app);
                    let _ = app.emit(
                        "task-reminder:open",
                        serde_json::json!({ "taskId": task_id }),
                    );
                }
            });
        });
        return Ok(true);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, task_id, title, body);
        Ok(false)
    }
}

#[tauri::command]
fn set_window_close_behavior(
    app: tauri::AppHandle,
    behavior: String,
) -> Result<bool, String> {
    let hide_on_close = match behavior.as_str() {
        "hide" => true,
        "quit" => false,
        _ => return Err("无效的关闭窗口方式".to_string()),
    };
    app.state::<WindowCloseBehavior>()
        .0
        .store(hide_on_close, Ordering::Relaxed);
    Ok(true)
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取应用数据目录失败: {err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("创建应用数据目录失败: {err}"))?;
    Ok(dir)
}

fn db_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("simpletodo.db"))
}

const DATABASE_SCHEMA_VERSION: i64 = 1;

fn backup_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("backups");
    fs::create_dir_all(&dir).map_err(|err| format!("创建备份目录失败: {err}"))?;
    Ok(dir)
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let database = db_file(app)?;
    if !database.exists() {
        import_legacy_database(app, &database)?;
    }

    let current_version = if database.exists() {
        let version = inspect_database_schema_version(&database)?;
        if version > DATABASE_SCHEMA_VERSION {
            return Err(format!(
                "本机数据库结构版本 v{version} 高于当前应用支持的 v{DATABASE_SCHEMA_VERSION}，请升级应用后再打开"
            ));
        }
        if version < DATABASE_SCHEMA_VERSION {
            create_migration_backup(app, &database, version)?;
        }
        version
    } else {
        0
    };

    let mut conn = Connection::open(&database).map_err(|err| format!("打开数据库失败: {err}"))?;
    init_database(&mut conn, current_version)?;
    Ok(conn)
}

/// 对已有数据库做只读健康检查，并读取独立于前端业务 schemaVersion 的数据库结构版本。
fn inspect_database_schema_version(database: &Path) -> Result<i64, String> {
    let conn = Connection::open_with_flags(database, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|err| format!("打开本机数据库失败: {err}"))?;
    let quick_check: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|err| format!("检查本机数据库失败: {err}"))?;
    if quick_check != "ok" {
        return Err(format!("本机数据库完整性检查失败: {quick_check}"));
    }

    let meta_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta')",
            [],
            |row| row.get(0),
        )
        .map_err(|err| format!("读取数据库结构版本失败: {err}"))?;
    if !meta_exists {
        return Ok(0);
    }

    let version = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'databaseSchemaVersion'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| format!("读取数据库结构版本失败: {err}"))?;
    match version {
        Some(value) => value
            .parse::<i64>()
            .map_err(|_| "本机数据库结构版本无效，已阻止继续写入".to_string()),
        // 没有独立版本标记的历史 SQLite 数据库只迁移一次，用于建立迁移基线。
        None => Ok(0),
    }
}

/// 仅在有实际数据库结构迁移时创建一致性备份。
/// 备份失败时拒绝继续打开数据库，避免升级过程在未留下可恢复副本的情况下修改用户数据。
fn create_migration_backup(
    app: &tauri::AppHandle,
    database: &Path,
    from_version: i64,
) -> Result<(), String> {
    let backups = backup_dir(app)?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let backup = backups.join(format!(
        "simpletodo-schema-v{from_version}-to-v{DATABASE_SCHEMA_VERSION}-{timestamp}.db"
    ));
    copy_sqlite_database(database, &backup)?;
    Ok(())
}

/// 使用 SQLite Online Backup API 复制数据库，包含 WAL 中尚未 checkpoint 的提交。
fn copy_sqlite_database(source: &Path, destination: &Path) -> Result<(), String> {
    let source = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|err| format!("打开待备份数据库失败: {err}"))?;
    let mut destination =
        Connection::open(destination).map_err(|err| format!("创建数据库备份失败: {err}"))?;
    let backup = Backup::new(&source, &mut destination)
        .map_err(|err| format!("初始化数据库备份失败: {err}"))?;
    backup
        .run_to_completion(128, Duration::from_millis(10), None)
        .map_err(|err| format!("写入数据库备份失败: {err}"))?;
    Ok(())
}

/// 仅在当前数据目录不存在数据库时，从已知的历史 Tauri 标识目录导入 SQLite 数据。
/// 源数据库保留在原位置，导入使用 SQLite 备份 API，避免直接复制 WAL 文件造成不一致。
fn import_legacy_database(app: &tauri::AppHandle, destination: &Path) -> Result<(), String> {
    let current_data_dir = app_data_dir(app)?;
    let Some(parent) = current_data_dir.parent() else {
        return Ok(());
    };

    for identifier in ["com.simpletodo.desktop", "com.simpletodo.app"] {
        let legacy_dir = parent.join(identifier);
        let legacy_database = legacy_dir.join("simpletodo.db");
        if !legacy_database.is_file() {
            continue;
        }

        let staging_database = destination.with_extension("legacy-import.tmp");
        if staging_database.exists() {
            fs::remove_file(&staging_database)
                .map_err(|err| format!("清理上次迁移暂存文件失败: {err}"))?;
        }
        copy_sqlite_database(&legacy_database, &staging_database)?;
        for directory in ["attachments", "profile"] {
            copy_directory_if_present(
                &legacy_dir.join(directory),
                &current_data_dir.join(directory),
            )?;
        }
        fs::rename(&staging_database, destination)
            .map_err(|err| format!("完成历史数据库导入失败: {err}"))?;
        return Ok(());
    }
    Ok(())
}

fn copy_directory_if_present(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.is_dir() {
        return Ok(());
    }
    fs::create_dir_all(destination).map_err(|err| format!("创建迁移目录失败: {err}"))?;
    for entry in fs::read_dir(source).map_err(|err| format!("读取迁移目录失败: {err}"))? {
        let entry = entry.map_err(|err| format!("读取迁移目录失败: {err}"))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_directory_if_present(&source_path, &target_path)?;
        } else if !target_path.exists() {
            fs::copy(&source_path, &target_path)
                .map_err(|err| format!("复制迁移附件失败: {err}"))?;
        }
    }
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataBackupRecord {
    id: String,
    created_at: String,
    size_bytes: u64,
    reason: String,
}

fn copy_directory_tree(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|err| format!("创建备份目录失败: {err}"))?;
    if !source.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(source).map_err(|err| format!("读取备份目录失败: {err}"))? {
        let entry = entry.map_err(|err| format!("读取备份目录失败: {err}"))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_directory_tree(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)
                .map_err(|err| format!("复制备份文件失败: {err}"))?;
        }
    }
    Ok(())
}

fn directory_size(path: &Path) -> Result<u64, String> {
    if path.is_file() {
        return fs::metadata(path)
            .map(|metadata| metadata.len())
            .map_err(|err| format!("读取备份大小失败: {err}"));
    }
    if !path.is_dir() {
        return Ok(0);
    }
    let mut total = 0;
    for entry in fs::read_dir(path).map_err(|err| format!("读取备份目录失败: {err}"))? {
        total += directory_size(
            &entry
                .map_err(|err| format!("读取备份目录失败: {err}"))?
                .path(),
        )?;
    }
    Ok(total)
}

fn backup_id_is_safe(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 96
        && id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
}

fn create_data_snapshot(app: &tauri::AppHandle, reason: &str) -> Result<DataBackupRecord, String> {
    let database = db_file(app)?;
    if !database.is_file() {
        return Err("当前没有可备份的本机数据".to_string());
    }
    // 先打开并关闭连接，确保结构校验通过；实际复制使用 Online Backup API 保留 WAL 中的数据。
    drop(open_database(app)?);
    let now = Local::now();
    let id = format!("snapshot-{}-{}", now.format("%Y%m%d-%H%M%S%3f"), reason);
    let target = backup_dir(app)?.join(&id);
    fs::create_dir_all(&target).map_err(|err| format!("创建恢复点失败: {err}"))?;
    copy_sqlite_database(&database, &target.join("simpletodo.db"))?;
    let data_dir = app_data_dir(app)?;
    copy_directory_tree(&data_dir.join("attachments"), &target.join("attachments"))?;
    copy_directory_tree(&data_dir.join("profile"), &target.join("profile"))?;
    let record = DataBackupRecord {
        id,
        created_at: now.to_rfc3339(),
        size_bytes: directory_size(&target)?,
        reason: reason.to_string(),
    };
    let metadata =
        serde_json::to_vec_pretty(&record).map_err(|err| format!("写入恢复点信息失败: {err}"))?;
    fs::write(target.join("backup.json"), metadata)
        .map_err(|err| format!("写入恢复点信息失败: {err}"))?;
    Ok(record)
}

fn read_data_backup_record(path: &Path) -> Result<Option<DataBackupRecord>, String> {
    let metadata = path.join("backup.json");
    if !metadata.is_file() || !path.join("simpletodo.db").is_file() {
        return Ok(None);
    }
    let value: serde_json::Value = serde_json::from_slice(
        &fs::read(&metadata).map_err(|err| format!("读取恢复点信息失败: {err}"))?,
    )
    .map_err(|err| format!("解析恢复点信息失败: {err}"))?;
    let id = value
        .get("id")
        .and_then(|item| item.as_str())
        .unwrap_or_default()
        .to_string();
    if !backup_id_is_safe(&id)
        || id
            != path
                .file_name()
                .and_then(|item| item.to_str())
                .unwrap_or_default()
    {
        return Ok(None);
    }
    Ok(Some(DataBackupRecord {
        id,
        created_at: value
            .get("createdAt")
            .and_then(|item| item.as_str())
            .unwrap_or_default()
            .to_string(),
        size_bytes: directory_size(path)?,
        reason: value
            .get("reason")
            .and_then(|item| item.as_str())
            .unwrap_or("manual")
            .to_string(),
    }))
}

#[tauri::command]
fn create_data_backup(app: tauri::AppHandle) -> Result<DataBackupRecord, String> {
    create_data_snapshot(&app, "manual")
}

#[tauri::command]
fn list_data_backups(app: tauri::AppHandle) -> Result<Vec<DataBackupRecord>, String> {
    let mut backups = Vec::new();
    for entry in fs::read_dir(backup_dir(&app)?).map_err(|err| format!("读取恢复点失败: {err}"))?
    {
        let entry = entry.map_err(|err| format!("读取恢复点失败: {err}"))?;
        if let Some(record) = read_data_backup_record(&entry.path())? {
            backups.push(record);
        }
    }
    backups.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(backups)
}

#[tauri::command]
fn data_backup_location(app: tauri::AppHandle) -> Result<String, String> {
    Ok(backup_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn open_data_backup_location(app: tauri::AppHandle) -> Result<bool, String> {
    open_path_in_file_manager(&backup_dir(&app)?, false)
}

fn open_path_in_file_manager(location: &Path, reveal: bool) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let argument = if reveal {
            format!("/select,{}", location.to_string_lossy())
        } else {
            location.to_string_lossy().to_string()
        };
        Command::new("explorer.exe")
            .arg(argument)
            .spawn()
            .map_err(|err| format!("打开恢复点目录失败: {err}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("open");
        if reveal {
            command.arg("-R");
        }
        command
            .arg(location)
            .spawn()
            .map_err(|err| format!("打开恢复点目录失败: {err}"))?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    Command::new("xdg-open")
        .arg(location)
        .spawn()
        .map_err(|err| format!("打开恢复点目录失败: {err}"))?;
    Ok(true)
}

#[tauri::command]
fn open_data_backup(app: tauri::AppHandle, backup_id: String) -> Result<bool, String> {
    if !backup_id_is_safe(&backup_id) {
        return Err("恢复点标识无效".to_string());
    }
    let snapshot = backup_dir(&app)?.join(&backup_id);
    if read_data_backup_record(&snapshot)?.is_none() {
        return Err("恢复点不存在或已损坏".to_string());
    }
    // 单项“打开”应直接进入快照目录，方便查看其中的数据库、附件和元数据。
    open_path_in_file_manager(&snapshot, false)
}

fn remove_path(path: &Path) -> Result<(), String> {
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|err| format!("清理临时恢复文件失败: {err}"))?;
    } else if path.exists() {
        fs::remove_file(path).map_err(|err| format!("清理临时恢复文件失败: {err}"))?;
    }
    Ok(())
}

#[tauri::command]
fn delete_data_backup(app: tauri::AppHandle, backup_id: String) -> Result<bool, String> {
    if !backup_id_is_safe(&backup_id) {
        return Err("恢复点标识无效".to_string());
    }
    let snapshot = backup_dir(&app)?.join(&backup_id);
    if read_data_backup_record(&snapshot)?.is_none() {
        return Err("恢复点不存在或已损坏".to_string());
    }
    remove_path(&snapshot)?;
    Ok(true)
}

#[tauri::command]
fn restore_data_backup(app: tauri::AppHandle, backup_id: String) -> Result<bool, String> {
    if !backup_id_is_safe(&backup_id) {
        return Err("恢复点标识无效".to_string());
    }
    let snapshot = backup_dir(&app)?.join(&backup_id);
    if read_data_backup_record(&snapshot)?.is_none() {
        return Err("恢复点不存在或已损坏".to_string());
    }
    let safety_backup = create_data_snapshot(&app, "before-restore")?;
    let data_dir = app_data_dir(&app)?;
    let stage = data_dir.join(format!(
        ".restore-stage-{}",
        Local::now().format("%Y%m%d-%H%M%S%3f")
    ));
    fs::create_dir_all(&stage).map_err(|err| format!("创建恢复暂存区失败: {err}"))?;
    copy_sqlite_database(
        &snapshot.join("simpletodo.db"),
        &stage.join("simpletodo.db"),
    )?;
    copy_directory_tree(&snapshot.join("attachments"), &stage.join("attachments"))?;
    copy_directory_tree(&snapshot.join("profile"), &stage.join("profile"))?;

    let rollback = data_dir.join(format!(
        ".restore-rollback-{}",
        Local::now().format("%Y%m%d-%H%M%S%3f")
    ));
    fs::create_dir_all(&rollback).map_err(|err| format!("创建恢复回滚区失败: {err}"))?;
    let components = ["simpletodo.db", "attachments", "profile"];
    let mut switched = Vec::new();
    for component in components {
        let current = data_dir.join(component);
        let staged = stage.join(component);
        let previous = rollback.join(component);
        let result = (|| -> Result<(), String> {
            if current.exists() {
                fs::rename(&current, &previous)
                    .map_err(|err| format!("准备恢复当前数据失败: {err}"))?;
            }
            fs::rename(&staged, &current).map_err(|err| format!("应用恢复点失败: {err}"))?;
            Ok(())
        })();
        if let Err(error) = result {
            // 当前组件可能已移入回滚区、但暂存文件尚未来得及替换；先把它复原，
            // 再处理此前已切换的组件，避免一次中断造成数据库或附件缺失。
            let current = data_dir.join(component);
            let previous = rollback.join(component);
            let _ = remove_path(&current);
            if previous.exists() {
                let _ = fs::rename(&previous, &current);
            }
            for restored in switched.iter().rev() {
                let current = data_dir.join(restored);
                let previous = rollback.join(restored);
                let _ = remove_path(&current);
                if previous.exists() {
                    let _ = fs::rename(previous, current);
                }
            }
            let _ = remove_path(&stage);
            let _ = remove_path(&rollback);
            return Err(format!(
                "恢复失败，已尝试回滚；恢复前安全点为 {}。{error}",
                safety_backup.id
            ));
        }
        switched.push(component);
    }
    remove_path(&stage)?;
    remove_path(&rollback)?;
    Ok(true)
}

fn attachment_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取应用数据目录失败: {err}"))?
        .join("attachments");
    fs::create_dir_all(&dir).map_err(|err| format!("创建附件目录失败: {err}"))?;
    Ok(dir)
}

fn attachment_file_path(app: &tauri::AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    let relative_path = normalize_attachment_relative_path(relative_path)?;
    let path = relative_path
        .split('/')
        .fold(attachment_root(app)?, |path, component| {
            path.join(component)
        });
    Ok(path)
}

fn profile_avatar_file_path(
    app: &tauri::AppHandle,
    relative_path: &str,
) -> Result<PathBuf, String> {
    if !relative_path.starts_with("profile/avatars/") || relative_path.contains("..") {
        return Err("无效的头像路径".to_string());
    }
    Ok(relative_path
        .split('/')
        .fold(app_data_dir(app)?, |path, component| path.join(component)))
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let database = db_file(&app)?;
    if !database.exists() {
        import_legacy_database(&app, &database)?;
    }
    if !database.exists() {
        return Ok(None);
    }

    let conn = open_database(&app)?;
    let mut data = load_state_from_db(&conn, &app)?;
    hydrate_attachment_urls(&app, &mut data);
    Ok(Some(data))
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: serde_json::Value) -> Result<bool, String> {
    let data = sanitize_save_data(data);
    let mut conn = open_database(&app)?;
    save_state_to_db(&mut conn, &data)?;
    Ok(true)
}

#[tauri::command]
fn save_migration_backup(app: tauri::AppHandle, data: serde_json::Value) -> Result<String, String> {
    let filename = format!(
        "migration-{}.json",
        Local::now().format("%Y%m%d-%H%M%S%.3f")
    );
    let path = backup_dir(&app)?.join(filename);
    let content =
        serde_json::to_vec_pretty(&data).map_err(|err| format!("序列化迁移备份失败: {err}"))?;
    fs::write(&path, content).map_err(|err| format!("写入迁移备份失败: {err}"))?;
    Ok(path.to_string_lossy().to_string())
}

fn init_database(conn: &mut Connection, from_version: i64) -> Result<(), String> {
    // foreign_keys 是连接级设置，即使没有结构迁移也必须在每次打开数据库时启用。
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|err| format!("启用数据库外键约束失败: {err}"))?;
    if from_version == DATABASE_SCHEMA_VERSION {
        return Ok(());
    }
    if from_version > DATABASE_SCHEMA_VERSION {
        return Err(format!(
            "不支持从数据库结构版本 v{from_version} 降级到 v{DATABASE_SCHEMA_VERSION}"
        ));
    }

    let tx = conn
        .transaction()
        .map_err(|err| format!("开启数据库结构迁移事务失败: {err}"))?;
    tx.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            collapsed INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT NULL,
            color TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            view_mode TEXT NOT NULL DEFAULT 'list',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT '',
            deleted_at TEXT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_lists_group_sort ON lists(group_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_lists_deleted_at ON lists(deleted_at);
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            description_html TEXT NOT NULL DEFAULT '',
            completed INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT NULL,
            deleted INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            important INTEGER NOT NULL DEFAULT 0,
            my_day_date TEXT NULL,
            list_id TEXT NOT NULL,
            due_date TEXT NULL,
            reminder_at TEXT NULL,
            repeat_rule TEXT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            comments TEXT NOT NULL DEFAULT '[]',
            editor_mode TEXT NOT NULL DEFAULT 'detail',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_by_list_id TEXT NULL,
            reminder_disabled INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_list_deleted ON tasks(list_id, deleted);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE TABLE IF NOT EXISTS trash_lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT NULL,
            color TEXT NOT NULL,
            view_mode TEXT NOT NULL DEFAULT 'list',
            sort_order INTEGER NOT NULL DEFAULT 0,
            task_count INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS subtasks (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS task_tags (
            task_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            PRIMARY KEY(task_id, tag)
        );
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            mime TEXT NOT NULL,
            original_name TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            width INTEGER NULL,
            height INTEGER NULL,
            created_at TEXT NOT NULL,
            last_referenced_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_attachments_sha256 ON attachments(sha256);
        CREATE INDEX IF NOT EXISTS idx_attachments_relative_path ON attachments(relative_path);
        CREATE INDEX IF NOT EXISTS idx_attachments_kind_created ON attachments(kind, created_at);
        CREATE TABLE IF NOT EXISTS task_attachments (
            task_id TEXT NOT NULL,
            attachment_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            PRIMARY KEY(task_id, attachment_id)
        );
        CREATE TABLE IF NOT EXISTS view_orders (
            view_key TEXT NOT NULL,
            task_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            PRIMARY KEY(view_key, task_id)
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profile (
            id TEXT PRIMARY KEY,
            nickname TEXT NOT NULL,
            avatar_relative_path TEXT NULL,
            avatar_sha256 TEXT NULL,
            avatar_updated_at TEXT NULL,
            account_id TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task_groups (
            id TEXT PRIMARY KEY,
            list_id TEXT NOT NULL,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT 'auto',
            sort_order INTEGER NOT NULL DEFAULT 0,
            collapsed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_task_groups_list_sort ON task_groups(list_id, sort_order);
        "#,
    )
    .map_err(|err| format!("初始化数据库失败: {err}"))?;
    run_database_migrations(&tx)?;
    tx.execute(
        "INSERT INTO meta(key, value) VALUES('databaseSchemaVersion', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![DATABASE_SCHEMA_VERSION.to_string()],
    )
    .map_err(|err| format!("记录数据库结构版本失败: {err}"))?;
    tx.commit()
        .map_err(|err| format!("提交数据库结构迁移失败: {err}"))?;
    Ok(())
}

fn run_database_migrations(conn: &Connection) -> Result<(), String> {
    ensure_column(
        conn,
        "task_groups",
        "color",
        "ALTER TABLE task_groups ADD COLUMN color TEXT NOT NULL DEFAULT 'auto'",
    )?;
    ensure_column(
        conn,
        "tasks",
        "comments",
        "ALTER TABLE tasks ADD COLUMN comments TEXT NOT NULL DEFAULT '[]'",
    )?;
    ensure_column(
        conn,
        "lists",
        "view_mode",
        "ALTER TABLE lists ADD COLUMN view_mode TEXT NOT NULL DEFAULT 'list'",
    )?;
    ensure_column(
        conn,
        "trash_lists",
        "view_mode",
        "ALTER TABLE trash_lists ADD COLUMN view_mode TEXT NOT NULL DEFAULT 'list'",
    )?;
    ensure_column(
        conn,
        "lists",
        "created_at",
        "ALTER TABLE lists ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "lists",
        "updated_at",
        "ALTER TABLE lists ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        conn,
        "lists",
        "deleted_at",
        "ALTER TABLE lists ADD COLUMN deleted_at TEXT NULL",
    )?;
    ensure_column(
        conn,
        "tasks",
        "deleted_by_list_id",
        "ALTER TABLE tasks ADD COLUMN deleted_by_list_id TEXT NULL",
    )?;
    ensure_column(
        conn,
        "lists",
        "pinned",
        "ALTER TABLE lists ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        conn,
        "tasks",
        "task_group_id",
        "ALTER TABLE tasks ADD COLUMN task_group_id TEXT NULL",
    )?;
    ensure_column(
        conn,
        "tasks",
        "reminder_disabled",
        "ALTER TABLE tasks ADD COLUMN reminder_disabled INTEGER NOT NULL DEFAULT 0",
    )?;
    rebuild_attachments_without_relative_unique(conn)?;
    Ok(())
}

fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    alter_sql: &str,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|err| format!("检查数据库字段失败: {err}"))?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|err| format!("检查数据库字段失败: {err}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("检查数据库字段失败: {err}"))?;
    if !columns.iter().any(|name| name == column) {
        conn.execute_batch(alter_sql)
            .map_err(|err| format!("迁移数据库字段失败: {err}"))?;
    }
    Ok(())
}

fn rebuild_attachments_without_relative_unique(conn: &Connection) -> Result<(), String> {
    let create_sql = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attachments'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| format!("检查附件表失败: {err}"))?
        .unwrap_or_default();
    if !create_sql
        .to_ascii_lowercase()
        .contains("relative_path text not null unique")
    {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        ALTER TABLE attachments RENAME TO attachments_old;
        CREATE TABLE attachments (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            mime TEXT NOT NULL,
            original_name TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            width INTEGER NULL,
            height INTEGER NULL,
            created_at TEXT NOT NULL,
            last_referenced_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO attachments(
            id, kind, mime, original_name, relative_path, sha256, size_bytes,
            width, height, created_at, last_referenced_at
        )
        SELECT
            id, kind, mime, original_name, relative_path, sha256, size_bytes,
            width, height, created_at, last_referenced_at
        FROM attachments_old;
        DROP TABLE attachments_old;
        CREATE INDEX IF NOT EXISTS idx_attachments_sha256 ON attachments(sha256);
        CREATE INDEX IF NOT EXISTS idx_attachments_relative_path ON attachments(relative_path);
        CREATE INDEX IF NOT EXISTS idx_attachments_kind_created ON attachments(kind, created_at);
        "#,
    )
    .map_err(|err| format!("迁移附件表失败: {err}"))?;
    Ok(())
}

fn save_state_to_db(conn: &mut Connection, data: &serde_json::Value) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|err| format!("开启数据库事务失败: {err}"))?;
    tx.execute_batch(
        r#"
        DELETE FROM task_attachments;
        DELETE FROM attachments;
        DELETE FROM task_tags;
        DELETE FROM subtasks;
        DELETE FROM view_orders;
        DELETE FROM settings;
        DELETE FROM profile;
        DELETE FROM task_groups;
        DELETE FROM trash_lists;
        DELETE FROM tasks;
        DELETE FROM lists;
        DELETE FROM groups;
        DELETE FROM meta WHERE key != 'databaseSchemaVersion';
        "#,
    )
    .map_err(|err| format!("清空数据库失败: {err}"))?;

    let schema_version = data
        .get("schemaVersion")
        .and_then(|value| value.as_i64())
        .unwrap_or(2)
        .to_string();
    tx.execute(
        "INSERT INTO meta(key, value) VALUES('schemaVersion', ?1)",
        params![schema_version],
    )
    .map_err(|err| format!("保存数据库版本失败: {err}"))?;

    if let Some(groups) = data.get("groups").and_then(|value| value.as_array()) {
        for (index, group) in groups.iter().enumerate() {
            tx.execute(
                "INSERT INTO groups(id, name, collapsed, sort_order) VALUES(?1, ?2, ?3, ?4)",
                params![
                    string_field(group, "id", &format!("group-{index}")),
                    string_field(group, "name", "未命名分组"),
                    int_bool(group, "collapsed"),
                    int_field(group, "sortOrder", ((index + 1) * 1000) as i64),
                ],
            )
            .map_err(|err| format!("保存分组失败: {err}"))?;
        }
    }

    if let Some(lists) = data.get("lists").and_then(|value| value.as_array()) {
        for (index, list) in lists.iter().enumerate() {
            insert_list(&tx, list, index)?;
        }
    }

    let mut saved_task_ids = HashSet::new();
    if let Some(tasks) = data.get("tasks").and_then(|value| value.as_array()) {
        for task in tasks {
            insert_task_tree(&tx, task)?;
            if let Some(id) = task.get("id").and_then(|value| value.as_str()) {
                saved_task_ids.insert(id.to_string());
            }
        }
    }
    if let Some(trash) = data.get("trash").and_then(|value| value.as_array()) {
        for task in trash {
            let id = task
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            if !id.is_empty() && !saved_task_ids.contains(id) {
                insert_task_tree(&tx, task)?;
                saved_task_ids.insert(id.to_string());
            }
        }
    }

    if let Some(list_trash) = data.get("listTrash").and_then(|value| value.as_array()) {
        for (index, list) in list_trash.iter().enumerate() {
            tx.execute(
                "INSERT INTO trash_lists(id, name, group_id, color, view_mode, sort_order, task_count, deleted_at)
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    string_field(list, "id", &format!("trash-list-{index}")),
                    string_field(list, "name", "未命名清单"),
                    opt_string_field(list, "groupId"),
                    string_field(list, "color", "#5fb8ad"),
                    string_field(list, "viewMode", "list"),
                    int_field(list, "sortOrder", ((index + 1) * 1000) as i64),
                    int_field(list, "taskCount", 0),
                    string_field(list, "deletedAt", ""),
                ],
            )
            .map_err(|err| format!("保存回收站清单失败: {err}"))?;
        }
    }

    if let Some(view_orders) = data.get("viewOrders").and_then(|value| value.as_object()) {
        for (view_key, ids) in view_orders {
            if let Some(ids) = ids.as_array() {
                for (index, task_id) in ids.iter().filter_map(|value| value.as_str()).enumerate() {
                    tx.execute(
                        "INSERT INTO view_orders(view_key, task_id, sort_order) VALUES(?1, ?2, ?3)",
                        params![view_key, task_id, index as i64],
                    )
                    .map_err(|err| format!("保存视图排序失败: {err}"))?;
                }
            }
        }
    }

    if let Some(task_groups) = data.get("taskGroups").and_then(|value| value.as_array()) {
        for (index, group) in task_groups.iter().enumerate() {
            tx.execute(
                "INSERT INTO task_groups(id, list_id, name, emoji, color, sort_order, collapsed, created_at, updated_at)
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    string_field(group, "id", &format!("task-group-{index}")),
                    string_field(group, "listId", ""),
                    string_field(group, "name", "未命名分组"),
                    string_field(group, "emoji", ""),
                    string_field(group, "color", "auto"),
                    int_field(group, "sortOrder", ((index + 1) * 1000) as i64),
                    int_bool(group, "collapsed"),
                    string_field(group, "createdAt", ""),
                    string_field(group, "updatedAt", ""),
                ],
            )
            .map_err(|err| format!("保存任务分组失败: {err}"))?;
        }
    }

    if let Some(settings) = data.get("settings").and_then(|value| value.as_object()) {
        for (key, value) in settings {
            tx.execute(
                "INSERT INTO settings(key, value) VALUES(?1, ?2)",
                params![key, value.to_string()],
            )
            .map_err(|err| format!("保存设置失败: {err}"))?;
        }
    }

    if let Some(profile) = data.get("profile").and_then(|value| value.as_object()) {
        let now = Local::now().to_rfc3339();
        tx.execute(
            "INSERT INTO profile(id, nickname, avatar_relative_path, avatar_sha256, avatar_updated_at, account_id, created_at, updated_at)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                string_field(&serde_json::Value::Object(profile.clone()), "id", "profile-local"),
                string_field(&serde_json::Value::Object(profile.clone()), "nickname", "易简用户"),
                opt_string_field(&serde_json::Value::Object(profile.clone()), "avatarRelativePath"),
                opt_string_field(&serde_json::Value::Object(profile.clone()), "avatarSha256"),
                opt_string_field(&serde_json::Value::Object(profile.clone()), "avatarUpdatedAt"),
                opt_string_field(&serde_json::Value::Object(profile.clone()), "accountId"),
                string_field(&serde_json::Value::Object(profile.clone()), "createdAt", &now),
                string_field(&serde_json::Value::Object(profile.clone()), "updatedAt", &now),
            ],
        )
        .map_err(|err| format!("保存个人资料失败: {err}"))?;
    }

    tx.commit()
        .map_err(|err| format!("提交数据库事务失败: {err}"))?;
    Ok(())
}

fn insert_list(
    tx: &rusqlite::Transaction,
    list: &serde_json::Value,
    index: usize,
) -> Result<(), String> {
    let now = Local::now().to_rfc3339();
    tx.execute(
        "INSERT INTO lists(id, name, group_id, color, is_system, pinned, view_mode, sort_order, created_at, updated_at, deleted_at)
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            string_field(list, "id", &format!("list-{index}")),
            string_field(list, "name", "未命名清单"),
            opt_string_field(list, "groupId"),
            string_field(list, "color", "#5fb8ad"),
            int_bool(list, "isSystem"),
            int_bool(list, "pinned"),
            string_field(list, "viewMode", "list"),
            int_field(list, "sortOrder", ((index + 1) * 1000) as i64),
            string_field(list, "createdAt", &now),
            string_field(list, "updatedAt", &now),
            opt_string_field(list, "deletedAt"),
        ],
    )
    .map_err(|err| format!("保存清单失败: {err}"))?;
    Ok(())
}

fn insert_task_tree(tx: &rusqlite::Transaction, task: &serde_json::Value) -> Result<(), String> {
    let id = string_field(task, "id", "");
    if id.is_empty() {
        return Ok(());
    }
    let now = Local::now().to_rfc3339();
    tx.execute(
        "INSERT OR REPLACE INTO tasks(
            id, title, description, description_html, completed, completed_at, deleted, deleted_at,
            pinned, important, my_day_date, list_id, task_group_id, due_date, reminder_at, repeat_rule, priority,
            comments, editor_mode, created_at, updated_at, deleted_by_list_id, reminder_disabled
         ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
            id,
            string_field(task, "title", "未命名任务"),
            string_field(task, "description", ""),
            string_field(task, "descriptionHtml", ""),
            int_bool(task, "completed"),
            opt_string_field(task, "completedAt"),
            int_bool(task, "deleted"),
            opt_string_field(task, "deletedAt"),
            int_bool(task, "pinned"),
            int_bool(task, "important"),
            opt_string_field(task, "myDayDate"),
            string_field(task, "listId", "inbox"),
            opt_string_field(task, "taskGroupId"),
            opt_string_field(task, "dueDate"),
            opt_string_field(task, "reminderAt"),
            opt_string_field(task, "repeatRule"),
            int_field(task, "priority", 0),
            json_field(task, "comments", "[]"),
            string_field(task, "editorMode", "detail"),
            string_field(task, "createdAt", &now),
            string_field(task, "updatedAt", &now),
            opt_string_field(task, "deletedByListId"),
            int_bool(task, "reminderDisabled"),
        ],
    )
    .map_err(|err| format!("保存任务失败: {err}"))?;

    if let Some(subtasks) = task.get("subtasks").and_then(|value| value.as_array()) {
        for (index, subtask) in subtasks.iter().enumerate() {
            tx.execute(
                "INSERT INTO subtasks(id, task_id, title, completed, sort_order) VALUES(?1, ?2, ?3, ?4, ?5)",
                params![
                    string_field(subtask, "id", &format!("{}-sub-{index}", id)),
                    id,
                    string_field(subtask, "title", ""),
                    int_bool(subtask, "completed"),
                    int_field(subtask, "sortOrder", ((index + 1) * 1000) as i64),
                ],
            )
            .map_err(|err| format!("保存子任务失败: {err}"))?;
        }
    }

    if let Some(tags) = task.get("tags").and_then(|value| value.as_array()) {
        for tag in tags
            .iter()
            .filter_map(|value| value.as_str())
            .filter(|value| !value.is_empty())
        {
            tx.execute(
                "INSERT OR IGNORE INTO task_tags(task_id, tag) VALUES(?1, ?2)",
                params![id, tag],
            )
            .map_err(|err| format!("保存标签失败: {err}"))?;
        }
    }

    if let Some(attachments) = task.get("attachments").and_then(|value| value.as_array()) {
        for (index, attachment) in attachments.iter().enumerate() {
            let attachment_id = string_field(attachment, "id", &format!("{}-att-{index}", id));
            let relative_path = string_field(attachment, "relativePath", "");
            if relative_path.is_empty() {
                continue;
            }
            let created_at = string_field(attachment, "createdAt", &Local::now().to_rfc3339());
            tx.execute(
                "INSERT OR IGNORE INTO attachments(
                    id, kind, mime, original_name, relative_path, sha256, size_bytes, width, height, created_at, last_referenced_at
                 ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    attachment_id,
                    string_field(attachment, "kind", "unknown"),
                    string_field(attachment, "mime", ""),
                    string_field(attachment, "originalName", "附件"),
                    relative_path,
                    string_field(attachment, "sha256", ""),
                    int_field(attachment, "sizeBytes", 0),
                    opt_i64_field(attachment, "width"),
                    opt_i64_field(attachment, "height"),
                    created_at,
                    string_field(attachment, "lastReferencedAt", &created_at),
                ],
            )
            .map_err(|err| format!("保存附件失败: {err}"))?;
            tx.execute(
                "INSERT OR REPLACE INTO task_attachments(task_id, attachment_id, sort_order, created_at) VALUES(?1, ?2, ?3, ?4)",
                params![id, attachment_id, index as i64, created_at],
            )
            .map_err(|err| format!("保存任务附件关联失败: {err}"))?;
        }
    }
    Ok(())
}

fn load_state_from_db(
    conn: &Connection,
    app: &tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    let schema_version = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'schemaVersion'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| format!("读取数据库版本失败: {err}"))?
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(2);

    let groups = query_groups(conn)?;
    let lists = query_lists(conn)?;
    let tasks = query_tasks(conn, app, false)?;
    let trash = query_tasks(conn, app, true)?;
    let list_trash = query_list_trash(conn)?;
    let view_orders = query_view_orders(conn)?;
    let settings = query_settings(conn)?;
    let task_groups = query_task_groups(conn)?;
    let profile = query_profile(conn)?;

    Ok(serde_json::json!({
        "schemaVersion": schema_version,
        "groups": groups,
        "lists": lists,
        "tasks": tasks,
        "trash": trash,
        "listTrash": list_trash,
        "viewOrders": view_orders,
        "taskGroups": task_groups,
        "profile": profile,
        "settings": settings,
    }))
}

fn query_profile(conn: &Connection) -> Result<serde_json::Value, String> {
    conn.query_row(
        "SELECT id, nickname, avatar_relative_path, avatar_sha256, avatar_updated_at, account_id, created_at, updated_at FROM profile LIMIT 1",
        [],
        |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "nickname": row.get::<_, String>(1)?,
            "avatarRelativePath": row.get::<_, Option<String>>(2)?,
            "avatarSha256": row.get::<_, Option<String>>(3)?,
            "avatarUpdatedAt": row.get::<_, Option<String>>(4)?,
            "accountId": row.get::<_, Option<String>>(5)?,
            "createdAt": row.get::<_, String>(6)?,
            "updatedAt": row.get::<_, String>(7)?,
        })),
    )
    .optional()
    .map_err(|err| format!("读取个人资料失败: {err}"))
    .map(|value| value.unwrap_or(serde_json::Value::Null))
}

fn query_groups(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, collapsed, sort_order FROM groups ORDER BY sort_order, rowid")
        .map_err(|err| format!("读取分组失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "collapsed": row.get::<_, i64>(2)? != 0,
                "sortOrder": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|err| format!("读取分组失败: {err}"))?;
    collect_rows(rows, "读取分组失败")
}

fn query_task_groups(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, list_id, name, emoji, color, sort_order, collapsed, created_at, updated_at FROM task_groups ORDER BY sort_order, rowid")
        .map_err(|err| format!("读取任务分组失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "listId": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "emoji": row.get::<_, String>(3)?,
                "color": row.get::<_, String>(4)?,
                "sortOrder": row.get::<_, i64>(5)?,
                "collapsed": row.get::<_, i64>(6)? != 0,
                "createdAt": row.get::<_, String>(7)?,
                "updatedAt": row.get::<_, String>(8)?,
            }))
        })
        .map_err(|err| format!("读取任务分组失败: {err}"))?;
    collect_rows(rows, "读取任务分组失败")
}

fn query_lists(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, group_id, color, is_system, pinned, view_mode, sort_order FROM lists WHERE deleted_at IS NULL ORDER BY sort_order, rowid")
        .map_err(|err| format!("读取清单失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "groupId": row.get::<_, Option<String>>(2)?,
                "color": row.get::<_, String>(3)?,
                "isSystem": row.get::<_, i64>(4)? != 0,
                "pinned": row.get::<_, i64>(5)? != 0,
                "viewMode": row.get::<_, String>(6)?,
                "sortOrder": row.get::<_, i64>(7)?,
            }))
        })
        .map_err(|err| format!("读取清单失败: {err}"))?;
    collect_rows(rows, "读取清单失败")
}

fn query_tasks(
    conn: &Connection,
    app: &tauri::AppHandle,
    deleted_only: bool,
) -> Result<Vec<serde_json::Value>, String> {
    let sql = if deleted_only {
        "SELECT id, title, description, description_html, completed, completed_at, deleted, deleted_at,
                pinned, important, my_day_date, list_id, task_group_id, due_date, reminder_at, repeat_rule, priority,
                comments, editor_mode, created_at, updated_at, deleted_by_list_id, reminder_disabled
         FROM tasks WHERE deleted = 1 ORDER BY deleted_at DESC, updated_at DESC"
    } else {
        "SELECT id, title, description, description_html, completed, completed_at, deleted, deleted_at,
                pinned, important, my_day_date, list_id, task_group_id, due_date, reminder_at, repeat_rule, priority,
                comments, editor_mode, created_at, updated_at, deleted_by_list_id, reminder_disabled
         FROM tasks ORDER BY created_at DESC"
    };
    let mut stmt = conn
        .prepare(sql)
        .map_err(|err| format!("读取任务失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let attachments = query_task_attachments(conn, app, &id).unwrap_or_default();
            Ok(serde_json::json!({
                "id": id,
                "title": row.get::<_, String>(1)?,
                "description": row.get::<_, String>(2)?,
                "descriptionHtml": row.get::<_, String>(3)?,
                "completed": row.get::<_, i64>(4)? != 0,
                "completedAt": row.get::<_, Option<String>>(5)?,
                "deleted": row.get::<_, i64>(6)? != 0,
                "deletedAt": row.get::<_, Option<String>>(7)?,
                "pinned": row.get::<_, i64>(8)? != 0,
                "important": row.get::<_, i64>(9)? != 0,
                "myDayDate": row.get::<_, Option<String>>(10)?,
                "listId": row.get::<_, String>(11)?,
                "taskGroupId": row.get::<_, Option<String>>(12)?,
                "dueDate": row.get::<_, Option<String>>(13)?,
                "reminderAt": row.get::<_, Option<String>>(14)?,
                "repeatRule": row.get::<_, Option<String>>(15)?,
                "priority": row.get::<_, i64>(16)?,
                "tags": query_task_tags(conn, row.get::<_, String>(0)?.as_str()).unwrap_or_default(),
                "subtasks": query_subtasks(conn, row.get::<_, String>(0)?.as_str()).unwrap_or_default(),
                "attachments": attachments,
                "comments": parse_json_array(&row.get::<_, String>(17)?),
                "editorMode": row.get::<_, String>(18)?,
                "createdAt": row.get::<_, String>(19)?,
                "updatedAt": row.get::<_, String>(20)?,
                "deletedByListId": row.get::<_, Option<String>>(21)?,
                "reminderDisabled": row.get::<_, i64>(22)? != 0,
            }))
        })
        .map_err(|err| format!("读取任务失败: {err}"))?;
    collect_rows(rows, "读取任务失败")
}

fn query_subtasks(conn: &Connection, task_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, title, completed, sort_order FROM subtasks WHERE task_id = ?1 ORDER BY sort_order, rowid")
        .map_err(|err| format!("读取子任务失败: {err}"))?;
    let rows = stmt
        .query_map(params![task_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "completed": row.get::<_, i64>(2)? != 0,
                "sortOrder": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|err| format!("读取子任务失败: {err}"))?;
    collect_rows(rows, "读取子任务失败")
}

fn query_task_tags(conn: &Connection, task_id: &str) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT tag FROM task_tags WHERE task_id = ?1 ORDER BY tag")
        .map_err(|err| format!("读取标签失败: {err}"))?;
    let rows = stmt
        .query_map(params![task_id], |row| row.get::<_, String>(0))
        .map_err(|err| format!("读取标签失败: {err}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("读取标签失败: {err}"))
}

fn query_task_attachments(
    conn: &Connection,
    app: &tauri::AppHandle,
    task_id: &str,
) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.kind, a.mime, a.original_name, a.relative_path, a.sha256, a.size_bytes,
                    a.width, a.height, a.created_at, a.last_referenced_at
             FROM task_attachments ta
             JOIN attachments a ON a.id = ta.attachment_id
             WHERE ta.task_id = ?1
             ORDER BY ta.sort_order, ta.rowid",
        )
        .map_err(|err| format!("读取附件失败: {err}"))?;
    let rows = stmt
        .query_map(params![task_id], |row| {
            let relative_path: String = row.get(4)?;
            let url = read_attachment(app.clone(), relative_path.clone())
                .ok()
                .flatten();
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "kind": row.get::<_, String>(1)?,
                "mime": row.get::<_, String>(2)?,
                "originalName": row.get::<_, String>(3)?,
                "path": row.get::<_, String>(3)?,
                "relativePath": relative_path,
                "sha256": row.get::<_, String>(5)?,
                "sizeBytes": row.get::<_, i64>(6)?,
                "width": row.get::<_, Option<i64>>(7)?,
                "height": row.get::<_, Option<i64>>(8)?,
                "createdAt": row.get::<_, String>(9)?,
                "lastReferencedAt": row.get::<_, String>(10)?,
                "url": url.unwrap_or_default(),
            }))
        })
        .map_err(|err| format!("读取附件失败: {err}"))?;
    collect_rows(rows, "读取附件失败")
}

fn query_list_trash(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, group_id, color, view_mode, sort_order, task_count, deleted_at FROM trash_lists ORDER BY deleted_at DESC")
        .map_err(|err| format!("读取回收站清单失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "groupId": row.get::<_, Option<String>>(2)?,
                "color": row.get::<_, String>(3)?,
                "isSystem": false,
                "viewMode": row.get::<_, String>(4)?,
                "sortOrder": row.get::<_, i64>(5)?,
                "taskCount": row.get::<_, i64>(6)?,
                "deleted": true,
                "deletedAt": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|err| format!("读取回收站清单失败: {err}"))?;
    collect_rows(rows, "读取回收站清单失败")
}

fn query_view_orders(conn: &Connection) -> Result<serde_json::Value, String> {
    let mut stmt = conn
        .prepare("SELECT view_key, task_id FROM view_orders ORDER BY view_key, sort_order")
        .map_err(|err| format!("读取视图排序失败: {err}"))?;
    let mut rows = stmt
        .query([])
        .map_err(|err| format!("读取视图排序失败: {err}"))?;
    let mut map = serde_json::Map::new();
    while let Some(row) = rows
        .next()
        .map_err(|err| format!("读取视图排序失败: {err}"))?
    {
        let key: String = row
            .get(0)
            .map_err(|err| format!("读取视图排序失败: {err}"))?;
        let task_id: String = row
            .get(1)
            .map_err(|err| format!("读取视图排序失败: {err}"))?;
        map.entry(key)
            .or_insert_with(|| serde_json::Value::Array(Vec::new()))
            .as_array_mut()
            .expect("view order entry must be array")
            .push(serde_json::Value::String(task_id));
    }
    Ok(serde_json::Value::Object(map))
}

fn query_settings(conn: &Connection) -> Result<serde_json::Value, String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings ORDER BY key")
        .map_err(|err| format!("读取设置失败: {err}"))?;
    let mut rows = stmt
        .query([])
        .map_err(|err| format!("读取设置失败: {err}"))?;
    let mut map = serde_json::Map::new();
    while let Some(row) = rows.next().map_err(|err| format!("读取设置失败: {err}"))? {
        let key: String = row.get(0).map_err(|err| format!("读取设置失败: {err}"))?;
        let raw: String = row.get(1).map_err(|err| format!("读取设置失败: {err}"))?;
        let value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::String(raw));
        map.insert(key, value);
    }
    Ok(serde_json::Value::Object(map))
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
    context: &str,
) -> Result<Vec<T>, String> {
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("{context}: {err}"))
}

fn string_field(value: &serde_json::Value, key: &str, fallback: &str) -> String {
    value
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn opt_string_field(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

fn json_field(value: &serde_json::Value, key: &str, fallback: &str) -> String {
    value
        .get(key)
        .map(|value| value.to_string())
        .unwrap_or_else(|| fallback.to_string())
}

fn parse_json_array(raw: &str) -> serde_json::Value {
    serde_json::from_str(raw).unwrap_or_else(|_| serde_json::Value::Array(Vec::new()))
}

fn int_field(value: &serde_json::Value, key: &str, fallback: i64) -> i64 {
    value
        .get(key)
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_f64().map(|value| value as i64))
        })
        .unwrap_or(fallback)
}

fn opt_i64_field(value: &serde_json::Value, key: &str) -> Option<i64> {
    value.get(key).and_then(|value| {
        value
            .as_i64()
            .or_else(|| value.as_f64().map(|value| value as i64))
    })
}

fn int_bool(value: &serde_json::Value, key: &str) -> i64 {
    if value
        .get(key)
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
    {
        1
    } else {
        0
    }
}

#[tauri::command]
fn select_image() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "webp"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_image(file_path: String) -> Result<Option<String>, String> {
    let path = PathBuf::from(file_path);
    let data = fs::read(&path).map_err(|err| format!("读取图片失败: {err}"))?;
    let mime = mime_from_path(&path);
    let encoded = general_purpose::STANDARD.encode(data);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedAttachment {
    kind: String,
    mime: String,
    original_name: String,
    relative_path: String,
    sha256: String,
    size_bytes: u64,
    width: Option<u32>,
    height: Option<u32>,
    created_at: String,
    last_referenced_at: String,
}

#[tauri::command]
fn import_image(app: tauri::AppHandle, file_path: String) -> Result<ImportedAttachment, String> {
    let source = PathBuf::from(file_path);
    let data = fs::read(&source).map_err(|err| format!("读取图片失败: {err}"))?;
    let mime = mime_from_path(&source);
    if !mime.starts_with("image/") {
        return Err("请选择图片文件".to_string());
    }

    let sha256 = hex_sha256(&data);
    let ext = extension_for_mime(&mime)
        .or_else(|| source.extension().and_then(|value| value.to_str()))
        .unwrap_or("bin")
        .to_ascii_lowercase();
    let now = Local::now();
    let short_hash = &sha256[..16.min(sha256.len())];
    let relative_path = format!(
        "images/{:04}/{:02}/{}.{}",
        now.year(),
        now.month(),
        short_hash,
        ext
    );
    let destination = attachment_file_path(&app, &relative_path)?;
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建附件分组目录失败: {err}"))?;
    }
    if !destination.exists() {
        fs::write(&destination, &data).map_err(|err| format!("写入附件失败: {err}"))?;
    }

    let (width, height) = image::image_dimensions(&destination)
        .map(|(width, height)| (Some(width), Some(height)))
        .unwrap_or((None, None));
    let timestamp = now.to_rfc3339();

    Ok(ImportedAttachment {
        kind: "image".to_string(),
        mime,
        original_name: source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("image")
            .to_string(),
        relative_path,
        sha256,
        size_bytes: data.len() as u64,
        width,
        height,
        created_at: timestamp.clone(),
        last_referenced_at: timestamp,
    })
}

#[tauri::command]
fn import_profile_avatar(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<ImportedAttachment, String> {
    let source = PathBuf::from(file_path);
    let data = fs::read(&source).map_err(|err| format!("读取头像失败: {err}"))?;
    let mime = mime_from_path(&source);
    if !mime.starts_with("image/") {
        return Err("请选择图片文件".to_string());
    }
    let sha256 = hex_sha256(&data);
    let ext = extension_for_mime(&mime)
        .or_else(|| source.extension().and_then(|value| value.to_str()))
        .unwrap_or("bin")
        .to_ascii_lowercase();
    let relative_path = format!(
        "profile/avatars/{}.{}",
        &sha256[..16.min(sha256.len())],
        ext
    );
    let destination = profile_avatar_file_path(&app, &relative_path)?;
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建头像目录失败: {err}"))?;
    }
    if !destination.exists() {
        fs::write(&destination, &data).map_err(|err| format!("写入头像失败: {err}"))?;
    }
    let (width, height) = image::image_dimensions(&destination)
        .map(|(width, height)| (Some(width), Some(height)))
        .unwrap_or((None, None));
    let timestamp = Local::now().to_rfc3339();
    Ok(ImportedAttachment {
        kind: "image".to_string(),
        mime,
        original_name: source
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("avatar")
            .to_string(),
        relative_path,
        sha256,
        size_bytes: data.len() as u64,
        width,
        height,
        created_at: timestamp.clone(),
        last_referenced_at: timestamp,
    })
}

#[tauri::command]
fn cleanup_profile_avatars(
    app: tauri::AppHandle,
    current_relative_path: Option<String>,
) -> Result<u32, String> {
    let current = current_relative_path
        .as_deref()
        .filter(|path| path.starts_with("profile/avatars/"))
        .map(|path| profile_avatar_file_path(&app, path))
        .transpose()?;
    let avatar_dir = app_data_dir(&app)?.join("profile").join("avatars");
    if !avatar_dir.is_dir() {
        return Ok(0);
    }
    let mut removed = 0;
    for entry in fs::read_dir(&avatar_dir).map_err(|err| format!("读取头像目录失败: {err}"))?
    {
        let path = entry
            .map_err(|err| format!("读取头像目录失败: {err}"))?
            .path();
        if path.is_file() && current.as_ref().map_or(true, |active| active != &path) {
            fs::remove_file(&path).map_err(|err| format!("清理旧头像失败: {err}"))?;
            removed += 1;
        }
    }
    Ok(removed)
}

#[tauri::command]
fn import_image_data(
    app: tauri::AppHandle,
    data: String,
    mime: String,
) -> Result<ImportedAttachment, String> {
    let bytes = general_purpose::STANDARD
        .decode(&data)
        .map_err(|err| format!("解码图片数据失败: {err}"))?;

    if !mime.starts_with("image/") {
        return Err("请选择图片文件".to_string());
    }

    let sha256 = hex_sha256(&bytes);
    let ext = extension_for_mime(&mime)
        .unwrap_or("bin")
        .to_ascii_lowercase();
    let now = Local::now();
    let short_hash = &sha256[..16.min(sha256.len())];
    let relative_path = format!(
        "images/{:04}/{:02}/{}.{}",
        now.year(),
        now.month(),
        short_hash,
        ext
    );
    let destination = attachment_file_path(&app, &relative_path)?;
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建附件分组目录失败: {err}"))?;
    }
    if !destination.exists() {
        fs::write(&destination, &bytes).map_err(|err| format!("写入附件失败: {err}"))?;
    }

    let (width, height) = image::image_dimensions(&destination)
        .map(|(width, height)| (Some(width), Some(height)))
        .unwrap_or((None, None));
    let timestamp = now.to_rfc3339();

    Ok(ImportedAttachment {
        kind: "image".to_string(),
        mime,
        original_name: format!("paste-{}.{}", sha256[..8].to_string(), ext),
        relative_path,
        sha256,
        size_bytes: bytes.len() as u64,
        width,
        height,
        created_at: timestamp.clone(),
        last_referenced_at: timestamp,
    })
}

#[tauri::command]
fn resolve_html_images(app: tauri::AppHandle, html: String) -> Result<String, String> {
    if !html.contains("attachments/") && !html.contains("src=\"images/") {
        return Ok(html);
    }

    let mut result = html;
    let mut search_start = 0;

    loop {
        // 匹配 src="attachments/..." 或 src="images/..."
        let pos_a = result[search_start..].find("src=\"attachments/");
        let pos_b = result[search_start..].find("src=\"images/");
        let pos = match (pos_a, pos_b) {
            (Some(a), Some(b)) => Some(a.min(b)),
            (Some(a), None) => Some(a),
            (None, Some(b)) => Some(b),
            (None, None) => None,
        };

        let Some(offset) = pos else { break };
        let abs_pos = search_start + offset;
        let value_start = abs_pos + 5; // skip 'src="'
        let Some(value_end) = result[value_start..].find('"') else {
            break;
        };

        let raw_path = &result[value_start..value_start + value_end];
        let relative_path = normalize_attachment_relative_path(raw_path)?;

        if let Ok(Some(data_url)) = read_attachment(app.clone(), relative_path.clone()) {
            let tag_start = result[..abs_pos].rfind('<').unwrap_or(abs_pos);
            let tag_end = result[abs_pos..]
                .find('>')
                .map(|offset| abs_pos + offset)
                .unwrap_or(value_start + value_end);
            let tag = &result[tag_start..=tag_end.min(result.len() - 1)];
            let storage_src = format!("attachments/{relative_path}");
            let replacement = if tag.contains("data-attachment-src=") {
                format!("src=\"{data_url}\"")
            } else {
                format!("src=\"{data_url}\" data-attachment-src=\"{storage_src}\"")
            };
            result = format!(
                "{}{}{}",
                &result[..abs_pos],
                replacement,
                &result[value_start + value_end + 1..]
            );
            search_start = abs_pos + replacement.len();
        } else {
            search_start = value_start + value_end + 1;
        }
    }

    Ok(result)
}

#[tauri::command]
fn read_attachment(app: tauri::AppHandle, relative_path: String) -> Result<Option<String>, String> {
    let path = attachment_file_path(&app, &relative_path)?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read(&path).map_err(|err| format!("读取附件失败: {err}"))?;
    let mime = mime_from_path(&path);
    let encoded = general_purpose::STANDARD.encode(data);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
}

#[tauri::command]
fn read_profile_avatar(
    app: tauri::AppHandle,
    relative_path: String,
) -> Result<Option<String>, String> {
    let path = profile_avatar_file_path(&app, &relative_path)?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read(&path).map_err(|err| format!("读取头像失败: {err}"))?;
    Ok(Some(format!(
        "data:{};base64,{}",
        mime_from_path(&path),
        general_purpose::STANDARD.encode(data)
    )))
}

#[tauri::command]
fn cleanup_orphan_attachments(
    app: tauri::AppHandle,
    data: serde_json::Value,
) -> Result<u32, String> {
    let mut referenced = std::collections::HashSet::new();
    collect_attachment_paths(&data, &mut referenced);
    let root = attachment_root(&app)?;
    let mut removed = 0;
    remove_unreferenced_files(&root, &root, &referenced, &mut removed)?;
    Ok(removed)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageItem {
    id: String,
    relative_path: String,
    name: String,
    size_bytes: u64,
    modified_at: String,
    is_image: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageHealth {
    supported: bool,
    attachment_bytes: u64,
    orphan_bytes: u64,
    orphan_attachments: Vec<StorageItem>,
    missing_references: Vec<String>,
    quarantined_attachments: Vec<StorageItem>,
    quarantined_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageOperation {
    affected_count: usize,
    affected_bytes: u64,
}

fn cleanup_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("cleanup-bin");
    fs::create_dir_all(&dir).map_err(|err| format!("创建清理站目录失败: {err}"))?;
    Ok(dir)
}

fn referenced_attachment_paths(app: &tauri::AppHandle) -> Result<HashSet<String>, String> {
    let conn = open_database(app)?;
    let mut referenced = HashSet::new();
    let mut embedded_hashes = HashSet::new();
    let mut attachment_stmt = conn.prepare(
        "SELECT a.relative_path FROM attachments a INNER JOIN task_attachments ta ON ta.attachment_id = a.id"
    ).map_err(|err| format!("读取附件引用失败: {err}"))?;
    let paths = attachment_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("读取附件引用失败: {err}"))?;
    for path in paths {
        if let Ok(path) = normalize_attachment_relative_path(
            &path.map_err(|err| format!("读取附件引用失败: {err}"))?,
        ) {
            referenced.insert(path);
        }
    }
    let mut html_stmt = conn
        .prepare("SELECT description_html FROM tasks")
        .map_err(|err| format!("读取备注图片引用失败: {err}"))?;
    let htmls = html_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("读取备注图片引用失败: {err}"))?;
    for html in htmls {
        let html = html.map_err(|err| format!("读取备注图片引用失败: {err}"))?;
        collect_html_attachment_paths(&html, &mut referenced);
        embedded_hashes.extend(collect_embedded_image_hash_prefixes(&html));
    }
    // 兼容旧富文本：部分历史备注只保存 data URL，附件路径已被 base64 覆盖。
    // 附件文件名使用内容 SHA-256 的前 16 位，借此恢复引用关系，避免误清理。
    if !embedded_hashes.is_empty() {
        let root = attachment_root(app)?;
        let mut files = Vec::new();
        collect_files(&root, &mut files)?;
        for file in files {
            let stem = file
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("");
            if embedded_hashes
                .iter()
                .any(|prefix| stem.starts_with(prefix))
            {
                let relative = file
                    .strip_prefix(&root)
                    .map_err(|err| format!("计算附件相对路径失败: {err}"))?
                    .to_string_lossy()
                    .replace('\\', "/");
                referenced.insert(relative);
            }
        }
    }
    Ok(referenced)
}

fn storage_item(root: &Path, path: &Path, id: String) -> Result<StorageItem, String> {
    let relative_path = path
        .strip_prefix(root)
        .map_err(|err| format!("计算附件相对路径失败: {err}"))?
        .to_string_lossy()
        .replace('\\', "/");
    let metadata = fs::metadata(path).map_err(|err| format!("读取附件信息失败: {err}"))?;
    let modified_at = metadata
        .modified()
        .ok()
        .map(|time| chrono::DateTime::<Local>::from(time).to_rfc3339())
        .unwrap_or_default();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    Ok(StorageItem {
        id,
        name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("附件")
            .to_string(),
        relative_path,
        size_bytes: metadata.len(),
        modified_at,
        is_image: matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "gif" | "webp"),
    })
}

fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(dir).map_err(|err| format!("读取附件目录失败: {err}"))? {
        let path = entry
            .map_err(|err| format!("读取附件目录失败: {err}"))?
            .path();
        if path.is_dir() {
            collect_files(&path, files)?;
        } else {
            files.push(path);
        }
    }
    Ok(())
}

fn compact_empty_dirs(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                compact_empty_dirs(&path);
                let _ = fs::remove_dir(&path);
            }
        }
    }
}

#[tauri::command]
fn scan_storage_health(app: tauri::AppHandle) -> Result<StorageHealth, String> {
    let referenced = referenced_attachment_paths(&app)?;
    let attachment_root = attachment_root(&app)?;
    let mut files = Vec::new();
    collect_files(&attachment_root, &mut files)?;
    let mut attachment_bytes = 0;
    let mut orphan_attachments = Vec::new();
    let mut present = HashSet::new();
    for path in files {
        let item = storage_item(&attachment_root, &path, String::new())?;
        attachment_bytes += item.size_bytes;
        present.insert(item.relative_path.clone());
        if !referenced.contains(&item.relative_path) {
            orphan_attachments.push(StorageItem {
                id: item.relative_path.clone(),
                ..item
            });
        }
    }
    let missing_references = referenced
        .into_iter()
        .filter(|path| !present.contains(path))
        .collect();
    let cleanup_root = cleanup_root(&app)?;
    let mut cleanup_files = Vec::new();
    collect_files(&cleanup_root, &mut cleanup_files)?;
    let mut quarantined_bytes = 0;
    let mut quarantined_attachments = Vec::new();
    for path in cleanup_files {
        let item = storage_item(&cleanup_root, &path, String::new())?;
        quarantined_bytes += item.size_bytes;
        quarantined_attachments.push(StorageItem {
            id: item.relative_path.clone(),
            ..item
        });
    }
    let orphan_bytes = orphan_attachments.iter().map(|item| item.size_bytes).sum();
    Ok(StorageHealth {
        supported: true,
        attachment_bytes,
        orphan_bytes,
        orphan_attachments,
        missing_references,
        quarantined_attachments,
        quarantined_bytes,
    })
}

#[tauri::command]
fn quarantine_orphan_attachments(
    app: tauri::AppHandle,
    relative_paths: Vec<String>,
) -> Result<StorageOperation, String> {
    let referenced = referenced_attachment_paths(&app)?;
    let root = attachment_root(&app)?;
    let batch = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let cleanup = cleanup_root(&app)?.join(batch);
    let mut affected_count = 0;
    let mut affected_bytes = 0;
    for relative in relative_paths {
        let relative = normalize_attachment_relative_path(&relative)?;
        if referenced.contains(&relative) {
            continue;
        }
        let source = attachment_file_path(&app, &relative)?;
        if !source.is_file() {
            continue;
        }
        let target = relative
            .split('/')
            .fold(cleanup.clone(), |path, part| path.join(part));
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|err| format!("创建清理站目录失败: {err}"))?;
        }
        affected_bytes += fs::metadata(&source)
            .map_err(|err| format!("读取附件信息失败: {err}"))?
            .len();
        fs::rename(&source, &target).map_err(|err| format!("移入清理站失败: {err}"))?;
        affected_count += 1;
    }
    compact_empty_dirs(&root);
    Ok(StorageOperation {
        affected_count,
        affected_bytes,
    })
}

fn cleanup_item_path(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    let relative = normalize_attachment_relative_path(id)?;
    let path = relative
        .split('/')
        .fold(cleanup_root(app)?, |path, part| path.join(part));
    Ok(path)
}

#[tauri::command]
fn read_quarantined_attachment(
    app: tauri::AppHandle,
    item_id: String,
) -> Result<Option<String>, String> {
    let path = cleanup_item_path(&app, &item_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read(&path).map_err(|err| format!("读取清理站附件失败: {err}"))?;
    let mime = mime_from_path(&path);
    let encoded = general_purpose::STANDARD.encode(data);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
}

#[tauri::command]
fn restore_quarantined_attachments(
    app: tauri::AppHandle,
    item_ids: Vec<String>,
) -> Result<StorageOperation, String> {
    let mut affected_count = 0;
    let mut affected_bytes = 0;
    for id in item_ids {
        let source = cleanup_item_path(&app, &id)?;
        if !source.is_file() {
            continue;
        }
        let relative = id
            .split_once('/')
            .map(|(_, path)| path)
            .ok_or("清理站项目不合法")?;
        let target = attachment_file_path(&app, relative)?;
        if target.exists() {
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|err| format!("恢复附件失败: {err}"))?;
        }
        affected_bytes += fs::metadata(&source)
            .map_err(|err| format!("读取附件信息失败: {err}"))?
            .len();
        fs::rename(&source, &target).map_err(|err| format!("恢复附件失败: {err}"))?;
        affected_count += 1;
    }
    compact_empty_dirs(&cleanup_root(&app)?);
    Ok(StorageOperation {
        affected_count,
        affected_bytes,
    })
}

#[tauri::command]
fn purge_quarantined_attachments(
    app: tauri::AppHandle,
    item_ids: Vec<String>,
) -> Result<StorageOperation, String> {
    let mut affected_count = 0;
    let mut affected_bytes = 0;
    for id in item_ids {
        let path = cleanup_item_path(&app, &id)?;
        if !path.is_file() {
            continue;
        }
        affected_bytes += fs::metadata(&path)
            .map_err(|err| format!("读取附件信息失败: {err}"))?
            .len();
        fs::remove_file(path).map_err(|err| format!("永久删除附件失败: {err}"))?;
        affected_count += 1;
    }
    compact_empty_dirs(&cleanup_root(&app)?);
    Ok(StorageOperation {
        affected_count,
        affected_bytes,
    })
}

fn sanitize_save_data(mut data: serde_json::Value) -> serde_json::Value {
    strip_hydrated_urls(&mut data);
    data
}

fn strip_hydrated_urls(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Array(items) => {
            for item in items {
                strip_hydrated_urls(item);
            }
        }
        serde_json::Value::Object(map) => {
            if map.contains_key("relativePath") || map.contains_key("relative_path") {
                map.remove("url");
            }
            for item in map.values_mut() {
                strip_hydrated_urls(item);
            }
        }
        _ => {}
    }
}

fn hydrate_attachment_urls(app: &tauri::AppHandle, data: &mut serde_json::Value) {
    match data {
        serde_json::Value::Array(items) => {
            for item in items {
                hydrate_attachment_urls(app, item);
            }
        }
        serde_json::Value::Object(map) => {
            let relative_path = map
                .get("relativePath")
                .or_else(|| map.get("relative_path"))
                .and_then(|value| value.as_str())
                .map(|value| value.to_string());
            if let Some(relative_path) = relative_path {
                if !map.contains_key("url") {
                    if let Ok(Some(url)) = read_attachment(app.clone(), relative_path) {
                        map.insert("url".to_string(), serde_json::Value::String(url));
                    }
                }
            }
            for item in map.values_mut() {
                hydrate_attachment_urls(app, item);
            }
        }
        _ => {}
    }
}

fn collect_attachment_paths(
    value: &serde_json::Value,
    paths: &mut std::collections::HashSet<String>,
) {
    match value {
        serde_json::Value::Array(items) => {
            for item in items {
                collect_attachment_paths(item, paths);
            }
        }
        serde_json::Value::Object(map) => {
            if let Some(path) = map
                .get("relativePath")
                .or_else(|| map.get("relative_path"))
                .and_then(|value| value.as_str())
            {
                if let Ok(path) = normalize_attachment_relative_path(path) {
                    paths.insert(path);
                }
            }
            // 扫描 HTML 字符串中的附件路径
            for item in map.values() {
                if let serde_json::Value::String(s) = item {
                    collect_html_attachment_paths(s, paths);
                }
                collect_attachment_paths(item, paths);
            }
        }
        serde_json::Value::String(s) => {
            collect_html_attachment_paths(s, paths);
        }
        _ => {}
    }
}

fn collect_html_attachment_paths(html: &str, paths: &mut std::collections::HashSet<String>) {
    // 富文本在展示时会把 src 解析为 data URL，并保留 data-attachment-src。
    // 保存时通常会还原 src，但旧数据或未触发重序列化的数据仍可能只剩该属性。
    for attribute in ["src", "data-attachment-src"] {
        for quote in ['\"', '\''] {
            let marker = format!("{attribute}={quote}");
            let mut remaining = html;
            while let Some(offset) = remaining.find(&marker) {
                let value_start = offset + marker.len();
                let Some(value_end) = remaining[value_start..].find(quote) else {
                    break;
                };
                let raw = &remaining[value_start..value_start + value_end];
                if raw.starts_with("attachments/") || raw.starts_with("images/") {
                    if let Ok(path) = normalize_attachment_relative_path(raw) {
                        paths.insert(path);
                    }
                }
                remaining = &remaining[value_start + value_end + 1..];
            }
        }
    }
}

fn collect_embedded_image_hash_prefixes(html: &str) -> HashSet<String> {
    let mut prefixes = HashSet::new();
    let mut remaining = html;
    while let Some(offset) = remaining.find("data:image/") {
        let source = &remaining[offset..];
        let Some(base64_offset) = source.find(";base64,") else {
            remaining = &source["data:image/".len()..];
            continue;
        };
        let encoded_start = base64_offset + ";base64,".len();
        let encoded = &source[encoded_start..];
        let end = encoded
            .find(|ch: char| matches!(ch, '\"' | '\'' | '<' | '>' | ' '))
            .unwrap_or(encoded.len());
        if let Ok(bytes) = general_purpose::STANDARD.decode(&encoded[..end]) {
            let hash = hex_sha256(&bytes);
            prefixes.insert(hash[..16.min(hash.len())].to_string());
        }
        remaining = &encoded[end..];
    }
    prefixes
}

fn normalize_attachment_relative_path(path: &str) -> Result<String, String> {
    let normalized = path.trim().replace('\\', "/");
    let relative = normalized
        .strip_prefix("attachments/")
        .unwrap_or(&normalized)
        .trim_start_matches('/');
    if relative.contains("..") || Path::new(relative).is_absolute() || relative.is_empty() {
        return Err("附件路径不合法".to_string());
    }
    Ok(relative.to_string())
}

fn remove_unreferenced_files(
    root: &Path,
    dir: &Path,
    referenced: &std::collections::HashSet<String>,
    removed: &mut u32,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|err| format!("读取附件目录失败: {err}"))? {
        let entry = entry.map_err(|err| format!("读取附件目录失败: {err}"))?;
        let path = entry.path();
        if path.is_dir() {
            remove_unreferenced_files(root, &path, referenced, removed)?;
            if fs::read_dir(&path)
                .map_err(|err| format!("读取附件目录失败: {err}"))?
                .next()
                .is_none()
            {
                let _ = fs::remove_dir(&path);
            }
            continue;
        }
        let relative = path
            .strip_prefix(root)
            .map_err(|err| format!("计算附件相对路径失败: {err}"))?
            .to_string_lossy()
            .replace('\\', "/");
        if !referenced.contains(&relative) {
            fs::remove_file(&path).map_err(|err| format!("删除未引用附件失败: {err}"))?;
            *removed += 1;
        }
    }
    Ok(())
}

fn hex_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

fn mime_from_path(path: &Path) -> String {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        "txt" => "text/plain",
        "md" | "markdown" => "text/markdown",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt" => "application/vnd.ms-powerpoint",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn extension_for_mime(mime: &str) -> Option<&'static str> {
    match mime {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "application/pdf" => Some("pdf"),
        "text/plain" => Some("txt"),
        "text/markdown" => Some("md"),
        "application/msword" => Some("doc"),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => Some("docx"),
        "application/vnd.ms-excel" => Some("xls"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => Some("xlsx"),
        "application/vnd.ms-powerpoint" => Some("ppt"),
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" => Some("pptx"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "simple-to-do-{name}-{}",
            Local::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn sqlite_backup_preserves_wal_data() {
        let root = test_root("backup-test");
        let source_path = root.join("source.db");
        let backup_path = root.join("backup.db");

        let source = Connection::open(&source_path).unwrap();
        source.execute_batch("PRAGMA journal_mode = WAL; CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL);").unwrap();
        source
            .execute(
                "INSERT INTO tasks (title) VALUES (?1)",
                params!["升级前任务"],
            )
            .unwrap();

        copy_sqlite_database(&source_path, &backup_path).unwrap();
        let backup = Connection::open(&backup_path).unwrap();
        let count: i64 = backup
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);

        drop(backup);
        drop(source);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn schema_version_is_persisted_and_up_to_date_database_is_not_migrated_again() {
        let root = test_root("schema-version-test");
        let database = root.join("simpletodo.db");
        let mut conn = Connection::open(&database).unwrap();

        init_database(&mut conn, 0).unwrap();
        let version: String = conn
            .query_row(
                "SELECT value FROM meta WHERE key = 'databaseSchemaVersion'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version, DATABASE_SCHEMA_VERSION.to_string());

        conn.execute(
            "INSERT INTO groups(id, name, collapsed, sort_order) VALUES('preserved', '保留的数据', 0, 0)",
            [],
        )
        .unwrap();
        init_database(&mut conn, DATABASE_SCHEMA_VERSION).unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM groups WHERE id = 'preserved'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        drop(conn);
        assert_eq!(
            inspect_database_schema_version(&database).unwrap(),
            DATABASE_SCHEMA_VERSION
        );
        fs::remove_dir_all(&root).unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        .manage(WindowCloseBehavior::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let show_item = MenuItemBuilder::new("显示主窗口").id("show").build(app)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItemBuilder::new("退出").id("quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&separator)
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("易简清单")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        show_main_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_main_window(&app);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            save_migration_backup,
            create_data_backup,
            list_data_backups,
            data_backup_location,
            open_data_backup_location,
            open_data_backup,
            delete_data_backup,
            restore_data_backup,
            select_image,
            read_image,
            import_image,
            import_profile_avatar,
            cleanup_profile_avatars,
            import_image_data,
            read_attachment,
            read_profile_avatar,
            resolve_html_images,
            cleanup_orphan_attachments,
            scan_storage_health,
            quarantine_orphan_attachments,
            read_quarantined_attachment,
            restore_quarantined_attachments,
            purge_quarantined_attachments,
            send_interactive_task_reminder,
            set_window_close_behavior
        ])
        .build(tauri::generate_context!())
        .expect("初始化 Tauri 应用失败")
        .run(|_app, _event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } = &_event
            {
                if label == "main"
                    && _app
                        .state::<WindowCloseBehavior>()
                        .0
                        .load(Ordering::Relaxed)
                {
                    api.prevent_close();
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }

                // macOS 的原生习惯是关闭窗口但保留应用。用户选择“直接退出”
                // 时才显式结束进程，保持两个选项在两端语义一致。
                #[cfg(target_os = "macos")]
                if label == "main"
                    && !_app
                        .state::<WindowCloseBehavior>()
                        .0
                        .load(Ordering::Relaxed)
                {
                    api.prevent_close();
                    _app.exit(0);
                }
            }

            // macOS 从 Dock 重新激活一个已隐藏窗口时会发出 Reopen；此前没有
            // 处理这个事件，导致只能通过菜单栏恢复主窗口。
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows: false,
                ..
            } = &_event
            {
                show_main_window(_app);
            }
        });
}
