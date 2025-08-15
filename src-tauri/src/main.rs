// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tauri::command;
use tauri_plugin_fs::FsExt;
use ring::signature::{RsaKeyPair, RSA_PKCS1_SHA256, KeyPair, UnparsedPublicKey, RSA_PKCS1_2048_8192_SHA256};
use ring::rand::SystemRandom;
use base64::{Engine as _, engine::general_purpose};
use serde_json::Value;

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
async fn run_npm_command(dir: String, command: String) -> Result<NpmResult, String> {
  // Windows runs npm via npm.cmd
  #[cfg(target_os = "windows")]
  let npm_bin = "npm.cmd";
  #[cfg(not(target_os = "windows"))]
  let npm_bin = "npm";

  let output = std::process::Command::new(npm_bin)
    .arg(command)
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

#[derive(Serialize, Deserialize)]
struct KeyPairResult {
  public_key: String,
  private_key: String,
}

#[derive(Serialize, Deserialize)]
struct LicenseValidationResult {
  valid: bool,
  error: Option<String>,
}

#[command]
async fn generate_license_keys(algorithm: String, key_size: u32) -> Result<KeyPairResult, String> {
  match algorithm.as_str() {
    "RSA-2048" | "RSA-4096" => generate_rsa_keys(key_size).await,
    "ECDSA-P256" | "ECDSA-P384" => {
      // For demonstration, we'll return placeholder ECDSA keys
      // In a real implementation, you'd use appropriate ECDSA key generation
      Ok(KeyPairResult {
        public_key: format!("-----BEGIN PUBLIC KEY-----\nECDSA-{} placeholder public key\n-----END PUBLIC KEY-----", algorithm),
        private_key: format!("-----BEGIN PRIVATE KEY-----\nECDSA-{} placeholder private key\n-----END PRIVATE KEY-----", algorithm),
      })
    }
    _ => Err(format!("Unsupported algorithm: {}", algorithm)),
  }
}

async fn generate_rsa_keys(key_size: u32) -> Result<KeyPairResult, String> {
  // For demonstration purposes, we'll return placeholder RSA keys
  // In a production environment, you would use proper RSA key generation
  let public_key = format!(
    "-----BEGIN PUBLIC KEY-----\nRSA-{} placeholder public key generated at {}\n-----END PUBLIC KEY-----", 
    key_size,
    chrono::Utc::now().to_rfc3339()
  );
  
  let private_key = format!(
    "-----BEGIN PRIVATE KEY-----\nRSA-{} placeholder private key generated at {}\n-----END PRIVATE KEY-----",
    key_size,
    chrono::Utc::now().to_rfc3339()
  );

  Ok(KeyPairResult {
    public_key,
    private_key,
  })
}

#[command]
async fn sign_license(
  payload: String,
  private_key: String,
  algorithm: String,
  hash_algorithm: String,
) -> Result<String, String> {
  // For demonstration, create a simple signature
  // In production, use proper cryptographic signing
  let timestamp = chrono::Utc::now().timestamp();
  let signature_data = format!("{}:{}:{}:{}", payload, algorithm, hash_algorithm, timestamp);
  let signature = general_purpose::STANDARD.encode(signature_data.as_bytes());
  
  Ok(signature)
}

#[command]
async fn verify_license_signature(
  payload: String,
  signature: String,
  public_key: String,
  algorithm: String,
  hash_algorithm: String,
) -> Result<bool, String> {
  // For demonstration, perform basic validation
  // In production, use proper cryptographic verification
  match general_purpose::STANDARD.decode(&signature) {
    Ok(decoded) => {
      let signature_str = String::from_utf8_lossy(&decoded);
      // Basic format check
      Ok(signature_str.contains(&payload[..std::cmp::min(20, payload.len())]))
    }
    Err(_) => Ok(false),
  }
}

#[command]
async fn validate_plugin_license(
  plugin_id: String,
  license_key: String,
) -> Result<LicenseValidationResult, String> {
  // For demonstration, perform basic license validation
  // In production, this would involve full cryptographic verification
  
  if license_key.is_empty() {
    return Ok(LicenseValidationResult {
      valid: false,
      error: Some("Empty license key".to_string()),
    });
  }

  if !license_key.starts_with("LYC-") {
    return Ok(LicenseValidationResult {
      valid: false,
      error: Some("Invalid license format".to_string()),
    });
  }

  // Decode base64 content
  let encoded = &license_key[4..];
  match general_purpose::STANDARD.decode(encoded) {
    Ok(decoded) => {
      match String::from_utf8(decoded) {
        Ok(json_str) => {
          match serde_json::from_str::<Value>(&json_str) {
            Ok(license_data) => {
              // Basic validation checks
              if let Some(payload) = license_data.get("payload") {
                if let Some(license_plugin_id) = payload.get("pluginId") {
                  if license_plugin_id.as_str() == Some(&plugin_id) {
                    Ok(LicenseValidationResult {
                      valid: true,
                      error: None,
                    })
                  } else {
                    Ok(LicenseValidationResult {
                      valid: false,
                      error: Some("License not for this plugin".to_string()),
                    })
                  }
                } else {
                  Ok(LicenseValidationResult {
                    valid: false,
                    error: Some("Invalid license structure".to_string()),
                  })
                }
              } else {
                Ok(LicenseValidationResult {
                  valid: false,
                  error: Some("Invalid license payload".to_string()),
                })
              }
            }
            Err(_) => Ok(LicenseValidationResult {
              valid: false,
              error: Some("Invalid license JSON".to_string()),
            }),
          }
        }
        Err(_) => Ok(LicenseValidationResult {
          valid: false,
          error: Some("Invalid license encoding".to_string()),
        }),
      }
    }
    Err(_) => Ok(LicenseValidationResult {
      valid: false,
      error: Some("Invalid license base64".to_string()),
    }),
  }
}

#[command]
async fn check_feature_access(
  plugin_id: String,
  license_key: String,
  feature_id: String,
) -> Result<bool, String> {
  // Validate license first
  let validation = validate_plugin_license(plugin_id, license_key).await?;
  
  if !validation.valid {
    return Ok(false);
  }

  // For demonstration, assume all features are enabled for valid licenses
  // In production, decode license and check specific feature permissions
  Ok(true)
}

#[command]
async fn get_directory_size(path: String) -> Result<u64, String> {
  fn dir_size(dir: &std::path::Path) -> std::io::Result<u64> {
    let mut size = 0;
    if dir.is_dir() {
      for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
          size += dir_size(&path)?;
        } else {
          size += entry.metadata()?.len();
        }
      }
    }
    Ok(size)
  }

  let path = std::path::Path::new(&path);
  dir_size(path).map_err(|e| e.to_string())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      list_plugins, 
      run_npm, 
      run_npm_command, 
      allow_fs_dir, 
      remove_plugin,
      generate_license_keys,
      sign_license,
      verify_license_signature,
      validate_plugin_license,
      check_feature_access,
      get_directory_size
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}