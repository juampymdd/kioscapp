mod print;
use print::{DatosTicket, build_escpos, listar_impresoras_os, raw_print_os};

#[tauri::command]
fn listar_impresoras() -> Vec<String> {
    listar_impresoras_os()
}

#[tauri::command]
fn imprimir_ticket(impresora: String, datos: DatosTicket, ancho: Option<String>) -> Result<(), String> {
    // 58 mm = 32 cols (default), 80 mm = 48 cols
    let width: usize = if ancho.as_deref() == Some("80") { 48 } else { 32 };
    let bytes = build_escpos(&datos, width);
    raw_print_os(&impresora, &bytes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![listar_impresoras, imprimir_ticket])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
