#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use chrono::{Datelike, Local};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};
use tauri::Manager;

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

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_file(app)?).map_err(|err| format!("打开数据库失败: {err}"))?;
    init_database(&conn)?;
    Ok(conn)
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

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    if !db_file(&app)?.exists() {
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

fn init_database(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
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
            deleted_by_list_id TEXT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_list_deleted ON tasks(list_id, deleted);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE TABLE IF NOT EXISTS trash_lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT NULL,
            color TEXT NOT NULL,
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
        "#,
    )
    .map_err(|err| format!("初始化数据库失败: {err}"))?;
    run_database_migrations(conn)?;
    Ok(())
}

fn run_database_migrations(conn: &Connection) -> Result<(), String> {
    ensure_column(
        conn,
        "tasks",
        "comments",
        "ALTER TABLE tasks ADD COLUMN comments TEXT NOT NULL DEFAULT '[]'",
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
        DELETE FROM trash_lists;
        DELETE FROM tasks;
        DELETE FROM lists;
        DELETE FROM groups;
        DELETE FROM meta;
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
                "INSERT INTO trash_lists(id, name, group_id, color, sort_order, task_count, deleted_at)
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    string_field(list, "id", &format!("trash-list-{index}")),
                    string_field(list, "name", "未命名清单"),
                    opt_string_field(list, "groupId"),
                    string_field(list, "color", "#5fb8ad"),
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

    if let Some(settings) = data.get("settings").and_then(|value| value.as_object()) {
        for (key, value) in settings {
            tx.execute(
                "INSERT INTO settings(key, value) VALUES(?1, ?2)",
                params![key, value.to_string()],
            )
            .map_err(|err| format!("保存设置失败: {err}"))?;
        }
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
        "INSERT INTO lists(id, name, group_id, color, is_system, pinned, sort_order, created_at, updated_at, deleted_at)
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            string_field(list, "id", &format!("list-{index}")),
            string_field(list, "name", "未命名清单"),
            opt_string_field(list, "groupId"),
            string_field(list, "color", "#5fb8ad"),
            int_bool(list, "isSystem"),
            int_bool(list, "pinned"),
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
            pinned, important, my_day_date, list_id, due_date, reminder_at, repeat_rule, priority,
            comments, editor_mode, created_at, updated_at, deleted_by_list_id
         ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
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
            opt_string_field(task, "dueDate"),
            opt_string_field(task, "reminderAt"),
            opt_string_field(task, "repeatRule"),
            int_field(task, "priority", 0),
            json_field(task, "comments", "[]"),
            string_field(task, "editorMode", "detail"),
            string_field(task, "createdAt", &now),
            string_field(task, "updatedAt", &now),
            opt_string_field(task, "deletedByListId"),
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

    Ok(serde_json::json!({
        "schemaVersion": schema_version,
        "groups": groups,
        "lists": lists,
        "tasks": tasks,
        "trash": trash,
        "listTrash": list_trash,
        "viewOrders": view_orders,
        "settings": settings,
    }))
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

fn query_lists(conn: &Connection) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, group_id, color, is_system, pinned, sort_order FROM lists WHERE deleted_at IS NULL ORDER BY sort_order, rowid")
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
                "sortOrder": row.get::<_, i64>(6)?,
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
                pinned, important, my_day_date, list_id, due_date, reminder_at, repeat_rule, priority,
                comments, editor_mode, created_at, updated_at, deleted_by_list_id
         FROM tasks WHERE deleted = 1 ORDER BY deleted_at DESC, updated_at DESC"
    } else {
        "SELECT id, title, description, description_html, completed, completed_at, deleted, deleted_at,
                pinned, important, my_day_date, list_id, due_date, reminder_at, repeat_rule, priority,
                comments, editor_mode, created_at, updated_at, deleted_by_list_id
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
                "dueDate": row.get::<_, Option<String>>(12)?,
                "reminderAt": row.get::<_, Option<String>>(13)?,
                "repeatRule": row.get::<_, Option<String>>(14)?,
                "priority": row.get::<_, i64>(15)?,
                "tags": query_task_tags(conn, row.get::<_, String>(0)?.as_str()).unwrap_or_default(),
                "subtasks": query_subtasks(conn, row.get::<_, String>(0)?.as_str()).unwrap_or_default(),
                "attachments": attachments,
                "comments": parse_json_array(&row.get::<_, String>(16)?),
                "editorMode": row.get::<_, String>(17)?,
                "createdAt": row.get::<_, String>(18)?,
                "updatedAt": row.get::<_, String>(19)?,
                "deletedByListId": row.get::<_, Option<String>>(20)?,
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
        .prepare("SELECT id, name, group_id, color, sort_order, task_count, deleted_at FROM trash_lists ORDER BY deleted_at DESC")
        .map_err(|err| format!("读取回收站清单失败: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "groupId": row.get::<_, Option<String>>(2)?,
                "color": row.get::<_, String>(3)?,
                "isSystem": false,
                "sortOrder": row.get::<_, i64>(4)?,
                "taskCount": row.get::<_, i64>(5)?,
                "deleted": true,
                "deletedAt": row.get::<_, String>(6)?,
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
    let relative_path = format!(
        "images/{:04}/{:02}/{}.{}",
        now.year(),
        now.month(),
        sha256,
        ext
    );
    let destination = attachment_root(&app)?.join(relative_path.replace('/', "\\"));
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
fn read_attachment(app: tauri::AppHandle, relative_path: String) -> Result<Option<String>, String> {
    if relative_path.contains("..") || Path::new(&relative_path).is_absolute() {
        return Err("附件路径不合法".to_string());
    }
    let path = attachment_root(&app)?.join(relative_path.replace('/', "\\"));
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read(&path).map_err(|err| format!("读取附件失败: {err}"))?;
    let mime = mime_from_path(&path);
    let encoded = general_purpose::STANDARD.encode(data);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
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
                paths.insert(path.replace('\\', "/"));
            }
            for item in map.values() {
                collect_attachment_paths(item, paths);
            }
        }
        _ => {}
    }
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            select_image,
            read_image,
            import_image,
            read_attachment,
            cleanup_orphan_attachments
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
