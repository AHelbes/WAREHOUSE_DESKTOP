use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            let app_handle = app.handle().clone();

            app.deep_link().on_open_url(move |event| {
                // event.urls() gives a list (usually just one link)
                if let Some(url) = event.urls().first() {
                    println!("Deep link received: {}", url);

                    // Send it to the frontend (App.tsx is listening for this)
                    app_handle
                        .emit("deep-link-received", url.to_string())
                        .unwrap();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
