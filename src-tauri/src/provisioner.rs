use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use futures_util::StreamExt;
use reqwest::Client;
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::models::{DownloadProgress, ToolBundle, ToolKind, ToolStatus};

pub struct Provisioner {
    local_bin_dir: PathBuf,
    client: Client,
    lock: Arc<Mutex<()>>,
}

impl Provisioner {
    pub fn new() -> io::Result<Self> {
        let local_bin_dir = Self::resolve_local_bin_dir()?;
        fs::create_dir_all(&local_bin_dir)?;

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .map_err(|e| io::Error::other(e.to_string()))?;

        Ok(Self {
            local_bin_dir,
            client,
            lock: Arc::new(Mutex::new(())),
        })
    }

    pub fn resolve_local_bin_dir() -> io::Result<PathBuf> {
        if let Some(data_dir) = dirs::data_local_dir() {
            Ok(data_dir.join("Mongox").join("bin"))
        } else if let Some(home_dir) = dirs::home_dir() {
            Ok(home_dir.join(".mongox").join("bin"))
        } else {
            Err(io::Error::new(
                io::ErrorKind::NotFound,
                "Unable to determine user local application data directory",
            ))
        }
    }

    pub fn get_local_bin_dir(&self) -> &Path {
        &self.local_bin_dir
    }

    /// Check if a specific tool executable is present on disk or in PATH
    pub fn find_tool(&self, tool: ToolKind) -> Option<(PathBuf, String)> {
        let exe_name = tool.executable_name();

        // 1. Check local application bin directory first
        let local_path = self.local_bin_dir.join(exe_name);
        if local_path.is_file() {
            return Some((local_path, "local_bin".to_string()));
        }

        // 2. Check system PATH
        if let Ok(system_path) = which::which(exe_name) {
            if system_path.is_file() {
                return Some((system_path, "system_path".to_string()));
            }
        }

        None
    }

    /// Get status for all known tools
    pub fn get_all_tool_statuses(&self) -> Vec<ToolStatus> {
        let tools = [
            ToolKind::Mongosh,
            ToolKind::Mongodump,
            ToolKind::Mongorestore,
            ToolKind::Mongoexport,
            ToolKind::Mongoimport,
        ];

        tools
            .iter()
            .map(|&tool| {
                let found = self.find_tool(tool);
                let (path, source) = match found {
                    Some((p, s)) => (Some(p.to_string_lossy().to_string()), Some(s)),
                    None => (None, None),
                };

                ToolStatus {
                    name: tool.executable_name().replace(".exe", ""),
                    bundle: tool.bundle(),
                    is_available: path.is_some(),
                    path,
                    source,
                }
            })
            .collect()
    }

    /// Ensure a specific tool is ready on disk. If missing or deleted, downloads the respective bundle on-demand.
    pub async fn ensure_tool_ready<F>(
        &self,
        tool: ToolKind,
        on_progress: F,
    ) -> Result<PathBuf, String>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
        // Check disk presence
        if let Some((path, _)) = self.find_tool(tool) {
            if path.is_file() {
                return Ok(path);
            }
        }

        // Acquire lock to avoid concurrent downloads for the same bundle
        let _guard = self.lock.lock().await;

        // Re-check after acquiring lock in case another task completed the download
        if let Some((path, _)) = self.find_tool(tool) {
            if path.is_file() {
                return Ok(path);
            }
        }

        let bundle = tool.bundle();
        self.download_and_extract_bundle(bundle, on_progress)
            .await?;

        // Verify the binary exists after extraction
        match self.find_tool(tool) {
            Some((path, _)) if path.is_file() => Ok(path),
            _ => Err(format!(
                "Failed to locate '{}' after bundle extraction into {:?}",
                tool.executable_name(),
                self.local_bin_dir
            )),
        }
    }

    /// Download and unpack a specific tool bundle
    pub async fn download_and_extract_bundle<F>(
        &self,
        bundle: ToolBundle,
        on_progress: F,
    ) -> Result<(), String>
    where
        F: Fn(DownloadProgress) + Send + Sync + 'static,
    {
        let (url, expected_sha256, is_zip) = Self::get_bundle_metadata(bundle)?;

        on_progress(DownloadProgress {
            bundle,
            stage: "downloading".to_string(),
            downloaded_bytes: 0,
            total_bytes: 0,
            progress_percent: 0.0,
            speed_bytes_per_sec: 0,
            message: format!(
                "Connecting to official MongoDB CDN for {}...",
                bundle.display_name()
            ),
        });

        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed to {}: {}", url, e))?;

        if !response.status().is_success() {
            return Err(format!(
                "CDN returned error status {} for URL: {}",
                response.status(),
                url
            ));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut stream = response.bytes_stream();

        let temp_archive_path = self.local_bin_dir.join(format!(
            "temp_{}_{}",
            match bundle {
                ToolBundle::Shell => "mongosh",
                ToolBundle::DatabaseTools => "database_tools",
            },
            if is_zip { "bundle.zip" } else { "bundle.tgz" }
        ));

        let mut temp_file = File::create(&temp_archive_path)
            .map_err(|e| format!("Failed to create temporary archive file: {}", e))?;

        let mut hasher = Sha256::new();
        let mut downloaded_bytes: u64 = 0;
        let start_time = Instant::now();
        let mut last_emit_time = Instant::now();

        while let Some(chunk_result) = stream.next().await {
            let chunk =
                chunk_result.map_err(|e| format!("Error streaming archive chunk: {}", e))?;
            temp_file
                .write_all(&chunk)
                .map_err(|e| format!("Error writing archive to disk: {}", e))?;
            hasher.update(&chunk);
            downloaded_bytes += chunk.len() as u64;

            if last_emit_time.elapsed().as_millis() > 100 || downloaded_bytes == total_size {
                last_emit_time = Instant::now();
                let elapsed_secs = start_time.elapsed().as_secs_f64().max(0.001);
                let speed_bytes_per_sec = (downloaded_bytes as f64 / elapsed_secs) as u64;
                let percent = if total_size > 0 {
                    (downloaded_bytes as f32 / total_size as f32) * 100.0
                } else {
                    0.0
                };

                on_progress(DownloadProgress {
                    bundle,
                    stage: "downloading".to_string(),
                    downloaded_bytes,
                    total_bytes: total_size,
                    progress_percent: percent,
                    speed_bytes_per_sec,
                    message: format!(
                        "Downloading {} ({:.1} MB / {:.1} MB)",
                        bundle.display_name(),
                        downloaded_bytes as f64 / 1_048_576.0,
                        total_size as f64 / 1_048_576.0
                    ),
                });
            }
        }

        drop(temp_file);

        // Verify SHA-256 hash
        on_progress(DownloadProgress {
            bundle,
            stage: "verifying".to_string(),
            downloaded_bytes,
            total_bytes: total_size,
            progress_percent: 100.0,
            speed_bytes_per_sec: 0,
            message: "Verifying SHA-256 cryptographic checksum...".to_string(),
        });

        let calculated_hash = hex::encode(hasher.finalize());
        if let Some(expected_hash) = expected_sha256 {
            if !calculated_hash.eq_ignore_ascii_case(expected_hash) {
                let _ = fs::remove_file(&temp_archive_path);
                return Err(format!(
                    "SHA-256 checksum mismatch for {}.\nExpected: {}\nCalculated: {}",
                    bundle.display_name(),
                    expected_hash,
                    calculated_hash
                ));
            }
        }

        // Extract archive
        on_progress(DownloadProgress {
            bundle,
            stage: "extracting".to_string(),
            downloaded_bytes,
            total_bytes: total_size,
            progress_percent: 100.0,
            speed_bytes_per_sec: 0,
            message: "Extracting binaries to local storage...".to_string(),
        });

        let extract_result = if is_zip {
            Self::extract_zip(&temp_archive_path, &self.local_bin_dir)
        } else {
            Self::extract_tar_gz(&temp_archive_path, &self.local_bin_dir)
        };

        // Clean up temporary archive file
        let _ = fs::remove_file(&temp_archive_path);

        extract_result.map_err(|e| format!("Failed to extract archive: {}", e))?;

        on_progress(DownloadProgress {
            bundle,
            stage: "ready".to_string(),
            downloaded_bytes,
            total_bytes: total_size,
            progress_percent: 100.0,
            speed_bytes_per_sec: 0,
            message: format!(
                "{} successfully installed and ready.",
                bundle.display_name()
            ),
        });

        Ok(())
    }

    /// Extract a zip file, flattening nested bin directories into target_dir
    fn extract_zip(archive_path: &Path, target_dir: &Path) -> Result<(), String> {
        let file = File::open(archive_path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        for i in 0..zip.len() {
            let mut zip_file = zip.by_index(i).map_err(|e| e.to_string())?;
            let enclosed_name = match zip_file.enclosed_name() {
                Some(path) => path.to_owned(),
                None => continue,
            };

            // Only extract executable files or files directly inside bin/
            let file_name = match enclosed_name.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => continue,
            };

            if zip_file.is_file() && Self::is_executable_file(&file_name) {
                let outpath = target_dir.join(&file_name);
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;

                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(0o755));
                }
            }
        }

        Ok(())
    }

    /// Extract a tar.gz file, flattening executable files into target_dir
    fn extract_tar_gz(archive_path: &Path, target_dir: &Path) -> Result<(), String> {
        let file = File::open(archive_path).map_err(|e| e.to_string())?;
        let tar_gz = flate2::read::GzDecoder::new(file);
        let mut archive = tar::Archive::new(tar_gz);

        for entry_result in archive.entries().map_err(|e| e.to_string())? {
            let mut entry = entry_result.map_err(|e| e.to_string())?;
            let path = entry.path().map_err(|e| e.to_string())?.to_path_buf();

            if let Some(file_name_os) = path.file_name() {
                let file_name = file_name_os.to_string_lossy().to_string();
                if entry.header().entry_type().is_file() && Self::is_executable_file(&file_name) {
                    let outpath = target_dir.join(&file_name);
                    let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                    io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;

                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(0o755));
                    }
                }
            }
        }

        Ok(())
    }

    fn is_executable_file(name: &str) -> bool {
        let lower = name.to_lowercase();
        lower.starts_with("mongosh")
            || lower.starts_with("mongodump")
            || lower.starts_with("mongorestore")
            || lower.starts_with("mongoexport")
            || lower.starts_with("mongoimport")
    }

    /// Return official MongoDB CDN release URLs and manifests per platform
    fn get_bundle_metadata(
        bundle: ToolBundle,
    ) -> Result<(&'static str, Option<&'static str>, bool), String> {
        #[cfg(target_os = "windows")]
        {
            match bundle {
                ToolBundle::Shell => Ok((
                    "https://downloads.mongodb.com/compass/mongosh-2.3.8-win32-x64.zip",
                    Some("6a65575514f094572212b7754b232675eb1491cfeb5b7965aaefb28416caabfa"),
                    true,
                )),
                ToolBundle::DatabaseTools => Ok((
                    "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-100.10.0.zip",
                    Some("f43fc160868f000b9a67a0aa46039ea8b52f6d2e8b2b73347b70bc6504b2c12a"),
                    true,
                )),
            }
        }

        #[cfg(target_os = "macos")]
        {
            #[cfg(target_arch = "aarch64")]
            match bundle {
                ToolBundle::Shell => Ok((
                    "https://downloads.mongodb.com/compass/mongosh-2.3.8-darwin-arm64.zip",
                    None,
                    true,
                )),
                ToolBundle::DatabaseTools => Ok((
                    "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-macos-arm64-100.10.0.zip",
                    None,
                    true,
                )),
            }

            #[cfg(not(target_arch = "aarch64"))]
            match bundle {
                ToolBundle::Shell => Ok((
                    "https://downloads.mongodb.com/compass/mongosh-2.3.8-darwin-x64.zip",
                    None,
                    true,
                )),
                ToolBundle::DatabaseTools => Ok((
                    "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-macos-x86_64-100.10.0.zip",
                    None,
                    true,
                )),
            }
        }

        #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
        {
            match bundle {
                ToolBundle::Shell => Ok((
                    "https://downloads.mongodb.com/compass/mongosh-2.3.8-linux-x64.tgz",
                    None,
                    false,
                )),
                ToolBundle::DatabaseTools => Ok((
                    "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.tgz",
                    None,
                    false,
                )),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_local_bin_dir() {
        let dir = Provisioner::resolve_local_bin_dir();
        assert!(dir.is_ok());
        let path = dir.unwrap();
        assert!(
            path.to_string_lossy().contains("Mongox") || path.to_string_lossy().contains(".mongox")
        );
    }

    #[test]
    fn test_is_executable_file() {
        assert!(Provisioner::is_executable_file("mongosh.exe"));
        assert!(Provisioner::is_executable_file("mongodump.exe"));
        assert!(Provisioner::is_executable_file("mongorestore"));
        assert!(Provisioner::is_executable_file("mongoexport"));
        assert!(Provisioner::is_executable_file("mongoimport"));
        assert!(!Provisioner::is_executable_file("README.md"));
        assert!(!Provisioner::is_executable_file("THIRD_PARTY_NOTICES.txt"));
    }
}
