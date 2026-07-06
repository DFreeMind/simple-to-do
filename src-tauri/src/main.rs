#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use std::{fs, io::Write, path::PathBuf};
use tauri::Manager;

fn data_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取应用数据目录失败: {err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("创建应用数据目录失败: {err}"))?;
    Ok(dir.join("todo-data.json"))
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let file = data_file(&app)?;
    if !file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&file).map_err(|err| format!("读取数据失败: {err}"))?;
    let data = serde_json::from_str(&content).map_err(|err| format!("解析数据失败: {err}"))?;
    Ok(Some(data))
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: serde_json::Value) -> Result<bool, String> {
    let file = data_file(&app)?;
    let content =
        serde_json::to_string_pretty(&data).map_err(|err| format!("序列化数据失败: {err}"))?;
    write_data_file(&file, content.as_bytes())?;
    Ok(true)
}

fn write_data_file(file: &PathBuf, content: &[u8]) -> Result<(), String> {
    let tmp_file = file.with_extension("json.tmp");
    let backup_file = file.with_extension("json.bak");

    {
        let mut tmp =
            fs::File::create(&tmp_file).map_err(|err| format!("创建临时数据文件失败: {err}"))?;
        tmp.write_all(content)
            .map_err(|err| format!("写入临时数据失败: {err}"))?;
        tmp.write_all(b"\n")
            .map_err(|err| format!("写入临时数据失败: {err}"))?;
        tmp.sync_all()
            .map_err(|err| format!("同步临时数据失败: {err}"))?;
    }

    if file.exists() {
        if backup_file.exists() {
            fs::remove_file(&backup_file).map_err(|err| format!("清理旧备份失败: {err}"))?;
        }
        fs::rename(file, &backup_file).map_err(|err| format!("备份现有数据失败: {err}"))?;
    }

    if let Err(err) = fs::rename(&tmp_file, file) {
        if backup_file.exists() && !file.exists() {
            let _ = fs::rename(&backup_file, file);
        }
        return Err(format!("替换数据文件失败: {err}"));
    }

    Ok(())
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
    let ext = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("jpeg")
        .to_ascii_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "jpeg",
        "png" => "png",
        "gif" => "gif",
        "webp" => "webp",
        _ => "jpeg",
    };
    let encoded = general_purpose::STANDARD.encode(data);
    Ok(Some(format!("data:image/{mime};base64,{encoded}")))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            select_image,
            read_image
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
