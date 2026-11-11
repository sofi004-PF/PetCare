import { get, post, put, patch } from '../api.js';
import { h, reemplazar, aviso, abrirModal, formulario, tabla, insignia, encabezado, confirmar, fecha, botonIcono } from '../ui.js';

/**
 * HU-11: Gestión de usuarios y roles del sistema (solo administrador).
 * Crear, modificar, activar y desactivar usuarios y asignarles un rol.
 */
export default {
  id: 'usuarios',
  titulo: 'Usuarios y roles',
  icono: 'escudo',
  descripcion: 'Cuentas del personal y permisos',

  async render(contenedor, ctx) {
    const [usuarios, roles] = await Promise.all([get('/usuarios'), get('/usuarios/roles')]);
    const opcionesRol = roles.map((r) => ({ valor: r.id, texto: r.nombre }));

    const abrirFormulario = (usuario = null) => {
      const modal = abrirModal(usuario ? 'Editar usuario' : 'Nuevo usuario', formulario([
        { nombre: 'nombre', etiqueta: 'Nombre completo', requerido: true, valor: usuario?.nombre },
        { nombre: 'correo', etiqueta: 'Correo', tipo: 'email', requerido: true, valor: usuario?.correo },
        { nombre: 'rol', etiqueta: 'Rol', tipo: 'select', requerido: true, opciones: opcionesRol, valor: usuario?.rol },
        {
          nombre: 'password',
          etiqueta: usuario ? 'Nueva contraseña' : 'Contraseña',
          tipo: 'password',
          requerido: !usuario,
          ayuda: usuario ? 'Déjela vacía para conservar la actual. Mínimo 8 caracteres.' : 'Mínimo 8 caracteres.'
        }
      ], async (datos) => {
        if (usuario) {
          await put(`/usuarios/${usuario.id}`, datos);
          aviso('Usuario actualizado', 'exito');
        } else {
          await post('/usuarios', datos);
          aviso('Usuario creado', 'exito');
        }
        modal.cerrar();
        ctx.recargar();
      }));
    };

    const cambiarEstado = async (usuario) => {
      const accion = usuario.activo ? 'desactivar' : 'activar';
      if (!confirmar(`¿Desea ${accion} a ${usuario.nombre}?`)) return;
      try {
        await patch(`/usuarios/${usuario.id}/estado`, { activo: !usuario.activo });
        aviso(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`, 'exito');
        ctx.recargar();
      } catch (error) {
        aviso(error.message, 'error');
      }
    };

    reemplazar(contenedor,
      encabezado('Usuarios y roles', 'Cree cuentas y asigne a cada persona el rol de su cargo.',
        botonIcono('mas', 'Nuevo usuario', { class: 'accion', onClick: () => abrirFormulario() })
      ),
      h('div', { class: 'tarjeta' }, tabla([
        { titulo: 'Nombre', valor: (u) => h('strong', {}, u.nombre) },
        { titulo: 'Correo', valor: (u) => u.correo },
        { titulo: 'Rol', valor: (u) => insignia(u.nombreRol, 'info') },
        { titulo: 'Estado', valor: (u) => (u.activo ? insignia('Activo', 'exito') : insignia('Inactivo', 'peligro')) },
        { titulo: 'Creado', valor: (u) => fecha(u.creadoEn) },
        {
          titulo: 'Acciones',
          valor: (u) => h('div', { class: 'acciones' },
            h('button', { class: 'secundario pequeno', onClick: () => abrirFormulario(u) }, 'Editar'),
            u.id === ctx.usuario.id ? null : h('button', { class: `pequeno ${u.activo ? 'peligro' : ''}`, onClick: () => cambiarEstado(u) }, u.activo ? 'Desactivar' : 'Activar')
          )
        }
      ], usuarios)),
      h('div', { class: 'tarjeta' },
        h('h2', {}, 'Permisos por rol'),
        h('p', { class: 'ayuda' }, 'Cada rol solo ve en el menú y puede usar en la API los módulos de su cargo.'),
        tabla([
          { titulo: 'Rol', valor: (r) => h('strong', {}, r.nombre) },
          { titulo: 'Descripción', valor: (r) => DESCRIPCION_ROLES[r.id] || '' }
        ], roles)
      )
    );
  }
};

const DESCRIPCION_ROLES = {
  administrador: 'Acceso completo: usuarios, inventario, reportes y todos los módulos.',
  veterinario: 'Atención clínica: pacientes, consultas, historial, tratamientos, recetas y recordatorios.',
  recepcionista: 'Atención al cliente: propietarios, agenda de citas, facturación y notificaciones.',
  cliente: 'Dueño de mascota: sus mascotas, agendamiento de citas y sus notificaciones.'
};
