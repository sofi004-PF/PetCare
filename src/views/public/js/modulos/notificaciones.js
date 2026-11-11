import { get } from '../api.js';
import { h, reemplazar, abrirModal, tabla, insignia, encabezado, fechaHora, listaDatos } from '../ui.js';

const ETIQUETA_CANAL = { correo: '✉️ Correo', sms: '💬 SMS', whatsapp: '📱 WhatsApp' };

/**
 * Bandeja de mensajes enviados a los clientes (confirmaciones de cita,
 * recordatorios, recetas, facturas). En el prototipo los mensajes no salen
 * a un servidor real: quedan registrados aquí con su canal y estado.
 */
export default {
  id: 'notificaciones',
  titulo: 'Notificaciones',
  icono: '🔔',
  descripcion: 'Mensajes enviados a los clientes',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis mensajes' : null),

  async render(contenedor, ctx) {
    const mensajes = await get('/notificaciones');

    const abrir = (mensaje) => {
      abrirModal(mensaje.asunto, [
        listaDatos([
          ['Canal', ETIQUETA_CANAL[mensaje.canal] || mensaje.canal],
          ['Destinatario', mensaje.destinatario],
          ['Enviado', fechaHora(mensaje.creado_en)],
          ['Estado', mensaje.estado]
        ]),
        h('pre', { style: 'white-space:pre-wrap;font-family:inherit;background:#f9fafb;padding:1rem;border-radius:8px;margin-top:1rem' }, mensaje.cuerpo),
        mensaje.enlace ? h('a', { class: 'boton', href: mensaje.enlace }, 'Abrir en PetCare') : null
      ]);
    };

    reemplazar(contenedor,
      encabezado(ctx.usuario.rol === 'cliente' ? 'Mis mensajes' : 'Notificaciones enviadas',
        'Historial de mensajes enviados con su fecha, canal y estado de entrega.'),
      h('div', { class: 'tarjeta' }, tabla([
        { titulo: 'Fecha', valor: (m) => fechaHora(m.creado_en) },
        { titulo: 'Canal', valor: (m) => ETIQUETA_CANAL[m.canal] || m.canal },
        { titulo: 'Destinatario', valor: (m) => (m.propietario_nombre ? `${m.propietario_nombre} · ${m.destinatario}` : m.destinatario) },
        { titulo: 'Asunto', valor: (m) => h('a', { href: '#', onClick: (e) => { e.preventDefault(); abrir(m); } }, m.asunto) },
        { titulo: 'Estado', valor: (m) => insignia(m.estado, 'exito') }
      ], mensajes, 'Aún no se han enviado mensajes'))
    );
  }
};
