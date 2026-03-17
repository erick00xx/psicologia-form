// --- FUNCIÓN DE PRUEBA (Para ejecutar desde el editor) ---
function probarCorreo() {
  const datosFalsos = {
    nombres_apellidos: "Juan Test",
    correo: "TU_CORREO_AQUI@gmail.com",
    carrera: "ADNI",
    motivo: "Prueba de sistema"
  };
  const fechaFalsa = new Date();
  const linkFalso = "https://google.com";

  enviarEmailConfirmacion(datosFalsos, fechaFalsa, linkFalso);
}

// --- MOTOR DEL SISTEMA ---
function doGet(e) {
  if (e.parameter.action === 'delete' && e.parameter.id) {
    return HtmlService.createHtmlOutput(eliminarReserva(e.parameter.id));
  }
  if (e.parameter.action === 'getAvailability') {
    const data = obtenerDisponibilidad();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput("Servidor de Reservas Activo.");
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const resultado = registrarReserva(d);
    return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function obtenerDisponibilidad() {
  const cal = CalendarApp.getDefaultCalendar();
  const ahora = new Date();
  const diasBusqueda = 14;
  const finBusqueda = new Date(ahora.getTime() + (diasBusqueda * 24 * 60 * 60 * 1000));
  const todosLosEventos = cal.getEvents(ahora, finBusqueda);
  const horasLaborales = [{ inicio: 8, fin: 13 }, { inicio: 14, fin: 18 }];
  let disponibilidad = [];

  for (let i = 0; i < diasBusqueda; i++) {
    let fecha = new Date();
    fecha.setDate(ahora.getDate() + i);
    if (fecha.getDay() === 0 || fecha.getDay() === 6) continue;
    let fechaStrCorto = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    let slotsDia = { fechaStr: fechaStrCorto, slots: [] };

    horasLaborales.forEach(bloque => {
      for (let h = bloque.inicio; h < bloque.fin; h++) {
        let inicioSlot = new Date(new Date(fecha).setHours(h, 0, 0, 0));
        let finSlot = new Date(new Date(fecha).setHours(h + 1, 0, 0, 0));
        if (inicioSlot < ahora) continue;
        
        let estaOcupado = todosLosEventos.some(ev => (inicioSlot < ev.getEndTime() && finSlot > ev.getStartTime()));
        
        if (!estaOcupado) { 
          slotsDia.slots.push({ iso: inicioSlot.toISOString() }); 
        }
      }
    });

    if (slotsDia.slots.length > 0) disponibilidad.push(slotsDia);
  }
  return disponibilidad;
}

function registrarReserva(d) {
  try {
    const idUnico = Utilities.getUuid();
    // d.fecha_hora_iso del frontend
    const inicio = new Date(d.fecha_hora_iso);
    const fin = new Date(inicio.getTime() + (60 * 60 * 1000));
    
    // Configuración de fecha y hora local
    const fechaOcurrencia = Utilities.formatDate(inicio, Session.getScriptTimeZone(), "dd/MM/yyyy");
    const horaOcurrencia = Utilities.formatDate(inicio, Session.getScriptTimeZone(), "hh:mm a");
    const fechaCreacion = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    const cal = CalendarApp.getDefaultCalendar();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Considerando la hoja "Reservas" que se ve en la captura
    const hoja = ss.getSheetByName("Reservas") || ss.getSheets()[0];

    // Orden de columnas en el Google Sheet (Base a la imagen de requerimiento):
    // ID (A) | Creado (B) | Fecha (C) | Hora (D) | Reservado por (E) | Correo (F) | Teléfono/Celular (G) | Edad (H) | Instituto (I) | Ciclo (J) | Carrera Profesional (K) | Motivo de consulta (L) | Con quién vives (M)
    
    // Mapeo de datos recibidos del formulario Mobile-first
    const filaNueva = [
      idUnico,                      // A - ID
      fechaCreacion,                // B - Creado
      fechaOcurrencia,              // C - Fecha
      horaOcurrencia,               // D - Hora
      d.nombres_apellidos,          // E - Reservado por
      d.correo,                     // F - Correo
      d.telefono,                   // G - Teléfono/Celular
      d.edad,                       // H - Edad
      d.instituto,                  // I - Instituto ("Jhonn Vonn Neumann" por defecto, o la otra empresa)
      d.ciclo,                      // J - Ciclo
      d.carrera,                    // K - Carrera Profesional
      d.motivo,                     // L - Motivo de consulta
      d.convivencia                 // M - Con quién vives
    ];

    hoja.appendRow(filaNueva);
    
    cal.createEvent("Psicología: " + d.nombres_apellidos, inicio, fin, { description: "ID: " + idUnico + "\nMotivo: " + d.motivo + "\nContacto: " + d.telefono });
    
    const urlApp = ScriptApp.getService().getUrl();
    enviarEmailConfirmacion(d, inicio, urlApp + "?action=delete&id=" + idUnico);
    
    return {status: "ok", msg: "Cita agendada correctamente."};
  } catch (e) { 
    return {status: "error", msg: e.toString()}; 
  }
}

function enviarEmailConfirmacion(d, fecha, linkAnulacion) {
  const isNeumann = d.instituto !== 'Instituto de la Empresa';
  const colorPrimario = isNeumann ? '#7c3aed' : '#f97316';
  const logo = isNeumann ? 'https://d30mzt1bxg5llt.cloudfront.net/public/uploads/images/LOGO-NEUMANN.png' : 'https://lh3.googleusercontent.com/a-/ALV-UjXPKtsLTepQWQmFSGHqytswW4w4BJnWkNPwXUzWp719hw98gvg=s80-c-mo';

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logo}" style="max-width: 150px; border-radius: 8px;">
      </div>
      <h2 style="color: ${colorPrimario}; text-align: center;">¡Cita Confirmada!</h2>
      <p>Hola <b>${d.nombres_apellidos}</b>, tu sesión en el <b>${d.instituto}</b> ha sido programada con éxito.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #475569;">📅 <b>Fecha:</b> ${Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}</p>
        <p style="margin: 10px 0 0 0; color: #475569;">⏳ <b>Duración:</b> 60 minutos</p>
      </div>
      
      <p style="font-size: 14px; color: #64748b; text-align: center;">Recuerda conectarte de forma puntual.</p>
      
      <div style="text-align: center; margin-top: 35px;">
        <a href="${linkAnulacion}" style="background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Anular Cita</a>
      </div>
    </div>`;

  MailApp.sendEmail({ 
    to: d.correo, 
    subject: "Cita Confirmada | Bienestar Estudiantil", 
    htmlBody: htmlBody 
  });
}

function eliminarReserva(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Reservas") || ss.getSheets()[0];
  const datos = hoja.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    // Busca en la columna A (índice 0)
    if (datos[i][0].toString() === id.toString()) {
      hoja.deleteRow(i + 1);
      
      // Eliminar el evento en el calendario buscando el ID en la descripción
      const eventos = CalendarApp.getDefaultCalendar().getEvents(new Date(), new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)));
      eventos.forEach(ev => { 
        if (ev.getDescription().includes(id)) {
          ev.deleteEvent(); 
        }
      });
      
      return `
        <div style='font-family: sans-serif; text-align:center; padding: 50px; background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;'>
          <h1 style='color: #ef4444; margin-bottom: 10px;'>Cita Anulada</h1>
          <p style='color: #64748b; font-size: 16px;'>Tu cita ha sido cancelada y el horario liberado correctamente.</p>
        </div>
      `;
    }
  }
  return `
    <div style='font-family: sans-serif; text-align:center; padding: 50px;'>
      <h1 style='color: #1e293b;'>No se encontró la reserva.</h1>
      <p>Es posible que ya haya sido eliminada o que el enlace haya expirado.</p>
    </div>
  `;
}