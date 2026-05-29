use serde::Deserialize;

const WIDTH: usize = 42;

#[derive(Deserialize)]
pub struct ItemTicket {
    pub descripcion: String,
    pub cantidad: f64,
    pub precio_unit_centavos: i64,
    pub subtotal_centavos: i64,
}

#[derive(Deserialize)]
pub struct DatosTicket {
    pub nombre_comercio: String,
    pub fecha: String,
    pub items: Vec<ItemTicket>,
    pub total_centavos: i64,
    pub descuento_centavos: i64,
    pub medio_pago: String,
    pub monto_recibido_centavos: i64,
    pub vuelto_centavos: i64,
}

// Strip accents/special chars so bytes are ASCII-safe for any ESC/POS printer
fn ascii(s: &str) -> String {
    s.chars().map(|c| match c {
        'á'|'à'|'â'|'ä' => 'a', 'Á'|'À'|'Â'|'Ä' => 'A',
        'é'|'è'|'ê'|'ë' => 'e', 'É'|'È'|'Ê'|'Ë' => 'E',
        'í'|'ì'|'î'|'ï' => 'i', 'Í'|'Ì'|'Î'|'Ï' => 'I',
        'ó'|'ò'|'ô'|'ö' => 'o', 'Ó'|'Ò'|'Ô'|'Ö' => 'O',
        'ú'|'ù'|'û'|'ü' => 'u', 'Ú'|'Ù'|'Û'|'Ü' => 'U',
        'ñ' => 'n', 'Ñ' => 'N',
        c if c.is_ascii() => c,
        _ => '?',
    }).collect()
}

fn pesos(centavos: i64) -> String {
    let sign = if centavos < 0 { "-" } else { "" };
    let abs = centavos.unsigned_abs();
    let pesos = abs / 100;
    let cents = abs % 100;
    if cents == 0 {
        format!("{}${}", sign, pesos)
    } else {
        format!("{}${}.{:02}", sign, pesos, cents)
    }
}

fn right_align(left: &str, right: &str) -> String {
    let spaces = WIDTH.saturating_sub(left.len() + right.len());
    format!("{}{}{}", left, " ".repeat(spaces.max(1)), right)
}

fn center(s: &str) -> String {
    let pad = WIDTH.saturating_sub(s.len()) / 2;
    format!("{}{}", " ".repeat(pad), s)
}

pub fn build_escpos(datos: &DatosTicket) -> Vec<u8> {
    let mut b: Vec<u8> = Vec::new();

    // ESC @ — init
    b.extend_from_slice(&[0x1B, 0x40]);

    // Center + bold: nombre comercio
    b.extend_from_slice(&[0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01]);
    b.extend_from_slice(ascii(&datos.nombre_comercio).as_bytes());
    b.push(0x0A);

    // Center, no bold: fecha
    b.extend_from_slice(&[0x1B, 0x45, 0x00]);
    b.extend_from_slice(ascii(&datos.fecha).as_bytes());
    b.push(0x0A);

    // Left alignment
    b.extend_from_slice(&[0x1B, 0x61, 0x00]);
    b.extend_from_slice("=".repeat(WIDTH).as_bytes());
    b.push(0x0A);

    // Items: "DESCRIPCION        x2    $1.500"
    for item in &datos.items {
        let desc = ascii(&item.descripcion);
        let desc = if desc.len() > 22 { &desc[..22] } else { &desc };
        let qty = if (item.cantidad - item.cantidad.floor()).abs() < 0.001 {
            format!("x{}", item.cantidad as i64)
        } else {
            format!("x{:.2}", item.cantidad)
        };
        let left  = format!("{} {}", desc, qty);
        let right = pesos(item.subtotal_centavos);
        b.extend_from_slice(right_align(&left, &right).as_bytes());
        b.push(0x0A);
    }

    b.extend_from_slice("-".repeat(WIDTH).as_bytes());
    b.push(0x0A);

    if datos.descuento_centavos > 0 {
        b.extend_from_slice(right_align("DESCUENTO:", &pesos(datos.descuento_centavos)).as_bytes());
        b.push(0x0A);
    }

    // Bold total
    b.extend_from_slice(&[0x1B, 0x45, 0x01]);
    b.extend_from_slice(right_align("TOTAL:", &pesos(datos.total_centavos)).as_bytes());
    b.push(0x0A);
    b.extend_from_slice(&[0x1B, 0x45, 0x00]);

    let medio_label = match datos.medio_pago.as_str() {
        "efectivo"        => "Efectivo",
        "debito"          => "Debito",
        "credito"         => "Credito",
        "qr_mercado_pago" => "QR / Mercado Pago",
        other             => other,
    };
    b.extend_from_slice(right_align("MEDIO DE PAGO:", medio_label).as_bytes());
    b.push(0x0A);

    if datos.medio_pago == "efectivo" {
        if datos.monto_recibido_centavos > 0 {
            b.extend_from_slice(right_align("RECIBIDO:", &pesos(datos.monto_recibido_centavos)).as_bytes());
            b.push(0x0A);
        }
        if datos.vuelto_centavos > 0 {
            b.extend_from_slice(right_align("VUELTO:", &pesos(datos.vuelto_centavos)).as_bytes());
            b.push(0x0A);
        }
    }

    b.extend_from_slice("=".repeat(WIDTH).as_bytes());
    b.push(0x0A);

    // Center: gracias
    b.extend_from_slice(&[0x1B, 0x61, 0x01]);
    b.extend_from_slice(center("Gracias por su compra!").as_bytes());
    b.push(0x0A);

    // 4 line feeds + partial cut
    b.extend_from_slice(&[0x0A, 0x0A, 0x0A, 0x0A]);
    b.extend_from_slice(&[0x1D, 0x56, 0x01]);

    b
}

// ── Windows-only: list printers and raw print ──────────────────────────────

#[cfg(target_os = "windows")]
pub fn listar_impresoras_os() -> Vec<String> {
    use std::ptr;
    use winapi::um::winspool::{
        EnumPrintersW, PRINTER_ENUM_LOCAL, PRINTER_ENUM_CONNECTIONS, PRINTER_INFO_4W,
    };

    let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
    let mut needed: u32 = 0;
    let mut count: u32  = 0;

    unsafe {
        EnumPrintersW(flags, ptr::null_mut(), 4, ptr::null_mut(), 0, &mut needed, &mut count);
        if needed == 0 { return Vec::new(); }

        let mut buf: Vec<u8> = vec![0u8; needed as usize];
        if EnumPrintersW(flags, ptr::null_mut(), 4, buf.as_mut_ptr(), needed, &mut needed, &mut count) == 0 {
            return Vec::new();
        }

        let info = std::slice::from_raw_parts(buf.as_ptr() as *const PRINTER_INFO_4W, count as usize);
        info.iter().filter_map(|p| {
            if p.pPrinterName.is_null() { return None; }
            let mut len = 0;
            while *p.pPrinterName.add(len) != 0 { len += 1; }
            let s = std::slice::from_raw_parts(p.pPrinterName, len);
            Some(String::from_utf16_lossy(s))
        }).collect()
    }
}

#[cfg(target_os = "windows")]
pub fn raw_print_os(printer_name: &str, data: &[u8]) -> Result<(), String> {
    use std::ptr;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winspool::{
        OpenPrinterW, StartDocPrinterW, StartPagePrinter,
        WritePrinter, EndPagePrinter, EndDocPrinter, ClosePrinter, DOC_INFO_1W,
    };

    let wide = |s: &str| -> Vec<u16> { OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect() };
    let name  = wide(printer_name);
    let doc   = wide("Ticket KioscApp");
    let dtype = wide("RAW");

    let mut handle = ptr::null_mut();

    unsafe {
        if OpenPrinterW(name.as_ptr() as *mut _, &mut handle, ptr::null_mut()) == 0 {
            return Err(format!("No se pudo abrir '{}'", printer_name));
        }

        let info = DOC_INFO_1W {
            pDocName:    doc.as_ptr() as *mut _,
            pOutputFile: ptr::null_mut(),
            pDatatype:   dtype.as_ptr() as *mut _,
        };

        if StartDocPrinterW(handle, 1, &info as *const _ as *mut _) == 0 {
            ClosePrinter(handle);
            return Err("Error al iniciar trabajo de impresión".into());
        }
        if StartPagePrinter(handle) == 0 {
            EndDocPrinter(handle);
            ClosePrinter(handle);
            return Err("Error al iniciar página".into());
        }

        let mut written = 0u32;
        WritePrinter(handle, data.as_ptr() as *mut _, data.len() as u32, &mut written);

        EndPagePrinter(handle);
        EndDocPrinter(handle);
        ClosePrinter(handle);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn listar_impresoras_os() -> Vec<String> { vec![] }

#[cfg(not(target_os = "windows"))]
pub fn raw_print_os(_printer_name: &str, _data: &[u8]) -> Result<(), String> {
    Err("Impresión solo disponible en Windows".into())
}
