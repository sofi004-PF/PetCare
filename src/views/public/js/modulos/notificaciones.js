import { get } from '../api.js';
import { h, reemplazar, abrirModal, tabla, insignia, encabezado, fechaHora, listaDatos } from '../ui.js';
import { icono } from '../iconos.js';

const ETIQUETA_CANAL = { correo: 'Correo', sms: 'SMS', whatsapp: 'WhatsApp' };
const ICONO_CANAL = { correo: 'correo', sms: 'mensaje', whatsapp: 'telefono' };
const canal = (c) => h('span', { style: 'display:inline-flex;align-items:center;gap:0.4rem' }, icono(ICONO_CANAL[c] || 'correo', { tamano: 16 }), ETIQUETA_CANAL[c] || c);

/**
 * Bandeja de mensajes enviados a los clientes (confirmaciones de cita,
 * recordatorios, recetas, facturas). En el prototipo los mensajes no salen
 * a un servidor real: quedan registrados aquí con su canal y estado.
 */
export default {
  id: 'notificaciones',
  titulo: 'Notificaciones',
  icono: 'campana',
  descripcion: 'Mensajes enviados a los clientes',
  tituloPara: (rol) => (rol === 'cliente' ? 'Mis mensajes' : null),

  async render(contenedor, ctx) {
    const mensajes = await get('/notificaciones');

    const abrir = (mensaje) => {
      abrirModal(mensaje.asunto, [
        listaDatos([
          ['Canal', canal(mensaje.canal)],
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
        { titulo: 'Canal', valor: (m) => canal(m.canal) },
        { titulo: 'Destinatario', valor: (m) => (m.propietario_nombre ? `${m.propietario_nombre} · ${m.destinatario}` : m.destinatario) },
        { titulo: 'Asunto', valor: (m) => h('a', { href: '#', onClick: (e) => { e.preventDefault(); abrir(m); } }, m.asunto) },
        { titulo: 'Estado', valor: (m) => insignia(m.estado, 'exito') }
      ], mensajes, 'Aún no se han enviado mensajes'))
    );
  }
};
