use std::ffi::OsStr;
use std::path::Path;

use serde_json::Value;

use crate::models::{CreateIndexRequest, DropIndexRequest, IndexInfo, QueryParams, QueryResult};

pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn create_hidden_command<S: AsRef<OsStr>>(program: S) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

pub struct ProcessRunner;

impl ProcessRunner {
    /// Builds safe mongosh evaluation command for querying documents
    pub fn build_query_script(params: &QueryParams) -> String {
        let filter_str = if params.filter.trim().is_empty() {
            "{}"
        } else {
            params.filter.trim()
        };

        let sort_expr = if let Some(ref s) = params.sort {
            if !s.trim().is_empty() {
                format!(".sort({})", s.trim())
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let proj_expr = if let Some(ref p) = params.projection {
            if !p.trim().is_empty() {
                format!(".project({})", p.trim())
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        format!(
            r#"
            try {{
                const targetDb = db.getSiblingDB({:?});
                const coll = targetDb.getCollection({:?});
                const startTime = Date.now();
                const filter = {};
                let cursor = coll.find(filter){}{}.skip({}).limit({});
                const docs = cursor.toArray();
                let total = 0;
                try {{
                    total = coll.countDocuments(filter);
                }} catch(e) {{
                    total = docs.length;
                }}
                const elapsed = Date.now() - startTime;
                print("MONGOQUERY_RESULT:" + JSON.stringify({{
                    documents: docs,
                    total_count: total,
                    page: Math.floor({} / {}) + 1,
                    page_size: {},
                    elapsed_ms: elapsed
                }}));
            }} catch (e) {{
                print("MONGOQUERY_RESULT:ERROR:" + e.message);
            }}
            "#,
            params.database,
            params.collection,
            filter_str,
            sort_expr,
            proj_expr,
            params.skip,
            params.limit,
            params.skip,
            params.limit,
            params.limit
        )
    }

    /// Execute document query via mongosh or fallback
    pub async fn execute_query(
        uri: &str,
        params: &QueryParams,
        mongosh_path: Option<&Path>,
    ) -> Result<QueryResult, String> {
        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = Self::build_query_script(params);
                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh process: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(json_content) = line.strip_prefix("MONGOQUERY_RESULT:") {
                        if let Some(err_msg) = json_content.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err_msg));
                        }
                        if let Ok(res) = serde_json::from_str::<QueryResult>(json_content) {
                            return Ok(res);
                        }
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!(
                    "Query failed (exit code {:?}): {}",
                    output.status.code(),
                    err_detail
                ));
            }
        }

        Err(
            "mongosh engine is not available. Please ensure it is installed via Settings."
                .to_string(),
        )
    }

    /// Insert document into MongoDB collection
    pub async fn insert_document(
        uri: &str,
        database: &str,
        collection: &str,
        document_json: &str,
        mongosh_path: Option<&Path>,
    ) -> Result<String, String> {
        // Validate JSON
        let parsed: Value = serde_json::from_str(document_json)
            .map_err(|e| format!("Invalid JSON syntax in document: {}", e))?;

        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        const res = coll.insertOne({});
                        print("MONGOINSERT_RESULT:" + JSON.stringify({{ insertedId: res.insertedId }}));
                    }} catch (e) {{
                        print("MONGOINSERT_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    database, collection, parsed
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(res) = line.strip_prefix("MONGOINSERT_RESULT:") {
                        if let Some(err) = res.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err));
                        }
                        return Ok(res.to_string());
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!(
                    "Insert failed (exit code {:?}): {}",
                    output.status.code(),
                    err_detail
                ));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }

    /// Update document in MongoDB collection
    pub async fn update_document(
        uri: &str,
        database: &str,
        collection: &str,
        id: &str,
        patch_json: &str,
        mongosh_path: Option<&Path>,
    ) -> Result<u64, String> {
        let mut parsed: Value = serde_json::from_str(patch_json)
            .map_err(|e| format!("Invalid JSON syntax in update patch: {}", e))?;

        // Prevent MongoDB error: Performing an update on the path '_id' would modify the immutable field '_id'
        if let Value::Object(ref mut map) = parsed {
            map.remove("_id");
        }

        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        let filterId;
                        try {{
                            filterId = ObjectId({:?});
                        }} catch(e) {{
                            filterId = {:?};
                        }}
                        const updatePayload = {};
                        delete updatePayload._id;
                        const res = coll.updateOne({{ _id: filterId }}, {{ $set: updatePayload }});
                        print("MONGOUPDATE_RESULT:" + JSON.stringify({{ modifiedCount: res.modifiedCount }}));
                    }} catch (e) {{
                        print("MONGOUPDATE_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    database, collection, id, id, parsed
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(res) = line.strip_prefix("MONGOUPDATE_RESULT:") {
                        if let Some(err) = res.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err));
                        }
                        return Ok(1);
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!(
                    "Update failed (exit code {:?}): {}",
                    output.status.code(),
                    err_detail
                ));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }

    /// Delete document in MongoDB collection
    pub async fn delete_document(
        uri: &str,
        database: &str,
        collection: &str,
        id: &str,
        mongosh_path: Option<&Path>,
    ) -> Result<u64, String> {
        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        let filterId;
                        try {{
                            filterId = ObjectId({:?});
                        }} catch(e) {{
                            filterId = {:?};
                        }}
                        const res = coll.deleteOne({{ _id: filterId }});
                        print("MONGODELETE_RESULT:" + JSON.stringify({{ deletedCount: res.deletedCount }}));
                    }} catch (e) {{
                        print("MONGODELETE_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    database, collection, id, id
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(res) = line.strip_prefix("MONGODELETE_RESULT:") {
                        if let Some(err) = res.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err));
                        }
                        return Ok(1);
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!(
                    "Delete failed (exit code {:?}): {}",
                    output.status.code(),
                    err_detail
                ));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }

    /// List collection indexes with key directions, options, and memory sizes
    pub async fn list_indexes(
        uri: &str,
        database: &str,
        collection: &str,
        mongosh_path: Option<&Path>,
    ) -> Result<Vec<IndexInfo>, String> {
        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        const indexes = coll.getIndexes();
                        let indexSizes = {{}};
                        try {{
                            const stats = coll.stats();
                            indexSizes = stats.indexSizes || {{}};
                        }} catch(e) {{}}

                        const result = indexes.map(idx => {{
                            const keyObj = idx.key || {{}};
                            const keys = Object.entries(keyObj).map(([k, v]) => [k, typeof v === 'number' ? v : 1]);
                            return {{
                                name: idx.name || '',
                                keys: keys,
                                unique: !!idx.unique,
                                sparse: !!idx.sparse,
                                size_bytes: indexSizes[idx.name] || 0
                            }};
                        }});
                        print("MONGOINDEX_RESULT:" + JSON.stringify(result));
                    }} catch(e) {{
                        print("MONGOINDEX_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    database, collection
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(json_content) = line.strip_prefix("MONGOINDEX_RESULT:") {
                        if let Some(err_msg) = json_content.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err_msg));
                        }
                        if let Ok(res) = serde_json::from_str::<Vec<IndexInfo>>(json_content) {
                            return Ok(res);
                        }
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!("Failed to list indexes: {}", err_detail));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }

    /// Create index on collection
    pub async fn create_index(
        uri: &str,
        req: &CreateIndexRequest,
        mongosh_path: Option<&Path>,
    ) -> Result<String, String> {
        if req.keys.is_empty() {
            return Err("At least one key is required to create an index".to_string());
        }

        if let Some(path) = mongosh_path {
            if path.is_file() {
                let mut keys_obj = serde_json::Map::new();
                for (k, v) in &req.keys {
                    keys_obj.insert(k.clone(), serde_json::json!(v));
                }
                let keys_json =
                    serde_json::to_string(&keys_obj).unwrap_or_else(|_| "{}".to_string());

                let mut options_obj = serde_json::Map::new();
                if let Some(ref name) = req.name {
                    if !name.trim().is_empty() {
                        options_obj.insert("name".to_string(), serde_json::json!(name));
                    }
                }
                if req.unique {
                    options_obj.insert("unique".to_string(), serde_json::json!(true));
                }
                if req.sparse {
                    options_obj.insert("sparse".to_string(), serde_json::json!(true));
                }
                let options_json =
                    serde_json::to_string(&options_obj).unwrap_or_else(|_| "{}".to_string());

                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        const name = coll.createIndex({}, {});
                        print("MONGOCREATEINDEX_RESULT:" + JSON.stringify({{ name: name }}));
                    }} catch(e) {{
                        print("MONGOCREATEINDEX_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    req.database, req.collection, keys_json, options_json
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(json_content) = line.strip_prefix("MONGOCREATEINDEX_RESULT:") {
                        if let Some(err_msg) = json_content.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err_msg));
                        }
                        if let Ok(res) = serde_json::from_str::<serde_json::Value>(json_content) {
                            return Ok(res["name"].as_str().unwrap_or("index_created").to_string());
                        }
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!("Create index failed: {}", err_detail));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }

    /// Drop index from collection
    pub async fn drop_index(
        uri: &str,
        req: &DropIndexRequest,
        mongosh_path: Option<&Path>,
    ) -> Result<String, String> {
        if req.index_name == "_id_" {
            return Err("Cannot drop default _id_ index".to_string());
        }

        if let Some(path) = mongosh_path {
            if path.is_file() {
                let script = format!(
                    r#"
                    try {{
                        const targetDb = db.getSiblingDB({:?});
                        const coll = targetDb.getCollection({:?});
                        const res = coll.dropIndex({:?});
                        print("MONGODROPINDEX_RESULT:" + JSON.stringify(res));
                    }} catch(e) {{
                        print("MONGODROPINDEX_RESULT:ERROR:" + e.message);
                    }}
                    "#,
                    req.database, req.collection, req.index_name
                );

                let output = create_hidden_command(path)
                    .arg(uri)
                    .arg("--quiet")
                    .arg("--eval")
                    .arg(&script)
                    .output()
                    .await
                    .map_err(|e| format!("Failed to spawn mongosh: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                for line in stdout.lines() {
                    if let Some(json_content) = line.strip_prefix("MONGODROPINDEX_RESULT:") {
                        if let Some(err_msg) = json_content.strip_prefix("ERROR:") {
                            return Err(format!("MongoDB error: {}", err_msg));
                        }
                        return Ok(req.index_name.clone());
                    }
                }
                let err_detail = if stderr.trim().is_empty() {
                    stdout.trim()
                } else {
                    stderr.trim()
                };
                return Err(format!("Drop index failed: {}", err_detail));
            }
        }

        Err("mongosh engine is not available. Please install it via Settings.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_query_script() {
        let params = QueryParams {
            connection_id: "test-conn".to_string(),
            database: "test_db".to_string(),
            collection: "users".to_string(),
            filter: "{\"status\": \"active\"}".to_string(),
            sort: Some("{\"createdAt\": -1}".to_string()),
            projection: Some("{\"password\": 0}".to_string()),
            limit: 50,
            skip: 0,
        };

        let script = ProcessRunner::build_query_script(&params);
        assert!(script.contains("test_db"));
        assert!(script.contains("users"));
        assert!(script.contains(".sort({\"createdAt\": -1})"));
        assert!(script.contains(".project({\"password\": 0})"));
        assert!(script.contains(".limit(50)"));
    }
}
