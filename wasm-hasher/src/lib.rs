use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

#[wasm_bindgen]
pub fn hash_chunk(chunk: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(chunk);
    let result = hasher.finalize();
    hex::encode(result)
}