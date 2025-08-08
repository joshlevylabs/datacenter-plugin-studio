// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::path::PathBuf;
use tauri::command;
use tauri_plugin_fs::FsExt;

#[derive(Serialize)]
struct NpmResult {
  success: bool,
  stdout: String,
  stderr: String,
}

#[command]
async fn list_plugins(workspace_root: String) -> Result<Vec<String>, String> {
  let root = PathBuf::from(workspace_root);
  let mut names = vec![];
  if root.exists() {
    for entry in std::fs::read_dir(root).map_err(|e| e.to_string())? {
      let entry = entry.map_err(|e| e.to_string())?;
      if entry.path().is_dir() {
        if let Some(name) = entry.file_name().to_str() {
          names.push(name.to_string());
        }
      }
    }
  }
  Ok(names)
}

#[command]
async fn run_npm(dir: String, script: String) -> Result<NpmResult, String> {
  // Windows runs npm via npm.cmd
  #[cfg(target_os = "windows")]
  let npm_bin = "npm.cmd";
  #[cfg(not(target_os = "windows"))]
  let npm_bin = "npm";

  let output = std::process::Command::new(npm_bin)
    .arg("run")
    .arg(script)
    .current_dir(&dir)
    .output()
    .map_err(|e| e.to_string())?;

  Ok(NpmResult {
    success: output.status.success(),
    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
    stderr: String::from_utf8_lossy(&output.stderr).to_string(),
  })
}

#[command]
fn allow_fs_dir(app: tauri::AppHandle, dir: String, recursive: Option<bool>) -> Result<(), String> {
  let scope = app.fs_scope();
  let _ = scope.allow_directory(dir, recursive.unwrap_or(true));
  Ok(())
}

#[command]
fn remove_plugin(workspace_root: String, name: String) -> Result<NpmResult, String> {
  let dir = PathBuf::from(&workspace_root).join(&name);
  if !dir.exists() {
    return Ok(NpmResult { success: true, stdout: "not found".into(), stderr: String::new() });
  }
  // Delete directory recursively
  match std::fs::remove_dir_all(&dir) {
    Ok(_) => Ok(NpmResult { success: true, stdout: format!("removed {}", dir.display()), stderr: String::new() }),
    Err(e) => Ok(NpmResult { success: false, stdout: String::new(), stderr: e.to_string() }),
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![list_plugins, run_npm, allow_fs_dir, remove_plugin])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}