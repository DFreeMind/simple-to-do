use base64::{engine::general_purpose, Engine as _};
use std::{fs, path::PathBuf};
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
    fs::write(file, content).map_err(|err| format!("保存数据失败: {err}"))?;
    Ok(true)
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
