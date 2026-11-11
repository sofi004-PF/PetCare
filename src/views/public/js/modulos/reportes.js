import { get } from '../api.js';
import { h, reemplazar, aviso, tabla, encabezado, moneda, botonIcono } from '../ui.js';

/** Filtros disponibles por tipo de reporte. */
const FILTROS = {
  consultas: ['fechas', 'veterinario'],
  pacientes: ['especie'],
  servicios: ['fechas', 'servicio', 'estadoCita'],
  inventario: ['fechas', 'estadoStock']
};

/**
 * HU-10: Generación de reportes administrativos y clínicos.
 * Reportes de consultas, pacientes, servicios e inventario con filtros,
 * visualización (resumen, gráfico y tabla) y descarga en CSV para Excel.
 */
export default {
  id: 'reportes',
  titulo: 'Reportes',
  icono: 'grafico',
  descripcion: 'Indicadores para la toma de decisiones',

  async render(contenedor, ctx) {
    const tipo = ctx.parametros[0] || 'consultas';
    const [tipos, veterinarios, servicios, especies] = await Promise.all([
      get('/reportes'), get('/usuarios/veterinarios'), get('/citas/servicios'), get('/propietarios/especies')
    ]);

    const controles = {
      desde: h('input', { type: 'date', id: 'rep-desde' }),
      hasta: h('input', { type: 'date', id: 'rep-hasta' }),
      veterinarioId: h('select', { id: 'rep-vet' }, h('option', { value: '' }, 'Todos'), veterinarios.map((v) => h('option', { value: v.id }, v.nombre))),
      servicioId: h('select', { id: 'rep-servicio' }, h('option', { value: '' }, 'Todos'), servicios.map((s) => h('option', { value: s.id }, s.nombre))),
      estado: h('select', { id: 'rep-estado' }, h('option', { value: '' }, 'Todos'),
        (tipo === 'inventario' ? ['Stock bajo', 'Normal'] : ['Programada', 'Atendida', 'Cancelada']).map((e) => h('option', { value: e }, e))),
      especie: h('select', { id: 'rep-especie' }, h('option', { value: '' }, 'Todas'), especies.map((e) => h('option', { value: e }, e)))
    };
    const campo = (etiqueta, id, control) => h('div', { class: 'campo' }, h('label', { for: id }, etiqueta), control);
    const filtrosVisibles = FILTROS[tipo] || [];

    const resultado = h('div', { style: 'display:flex;flex-direction:column;gap:1rem' });
    const descarga = botonIcono('descargar', 'Descargar CSV (Excel)', { class: 'secundario', href: '#', download: '' });

    const parametros = () => {
      const p = new URLSearchParams();
      for (const [clave, control] of Object.entries(controles)) {
        if (control.value && control.isConnected) p.set(clave, control.value);
      }
      return p;
    };

    const generar = async () => {
      try {
        const p = parametros();
        const reporte = await get(`/reportes/${tipo}?${p}`);
        descarga.href = `/api/reportes/${tipo}/csv?${p}`;
        pintar(resultado, reporte);
      } catch (error) {
        aviso(error.message, 'error');
      }
    };

    reemplazar(contenedor,
      encabezado('Reportes administrativos y clínicos', 'Elija el reporte, aplique los filtros y descárguelo para analizarlo.',
        descarga,
        botonIcono('imprimir', 'Imprimir', { class: 'secundario no-imprimir', onClick: () => window.print() })
      ),
      h('div', { class: 'pestanas no-imprimir', role: 'tablist' },
        tipos.map((t) => h('button', { type: 'button', role: 'tab', class: t.id === tipo ? 'activa' : '', 'aria-selected': String(t.id === tipo), onClick: () => ctx.ir(`#/reportes/${t.id}`) }, t.nombre))
      ),
      h('div', { class: 'tarjeta no-imprimir' },
        h('div', { class: 'barra-filtros' },
          filtrosVisibles.includes('fechas') ? [campo('Desde', 'rep-desde', controles.desde), campo('Hasta', 'rep-hasta', controles.hasta)] : null,
          filtrosVisibles.includes('veterinario') ? campo('Veterinario', 'rep-vet', controles.veterinarioId) : null,
          filtrosVisibles.includes('servicio') ? campo('Tipo de servicio', 'rep-servicio', controles.servicioId) : null,
          filtrosVisibles.includes('estadoCita') || filtrosVisibles.includes('estadoStock') ? campo('Estado', 'rep-estado', controles.estado) : null,
          filtrosVisibles.includes('especie') ? campo('Especie', 'rep-especie', controles.especie) : null,
          h('button', { class: 'accion', onClick: generar }, 'Generar reporte')
        )
      ),
      resultado
    );
    await generar();
  }
};

function pintar(contenedor, reporte) {
  const formato = (valor, esMoneda) => (esMoneda ? moneda(valor) : valor);
  const maximo = Math.max(1, ...reporte.grafico.datos.map((d) => d.valor));
  reemplazar(contenedor,
    h('div', { class: 'rejilla' }, reporte.resumen.map((r) => h('div', { class: 'tarjeta metrica' },
      h('span', { class: 'valor' }, String(formato(r.valor, r.moneda))),
      h('span', { class: 'etiqueta' }, r.etiqueta)
    ))),
    h('div', { class: 'tarjeta' },
      h('h2', {}, reporte.grafico.titulo),
      reporte.grafico.datos.length
        ? h('div', { style: 'display:flex;flex-direction:column;gap:0.4rem', role: 'img', 'aria-label': reporte.grafico.titulo },
          reporte.grafico.datos.map((d) => h('div', { style: 'display:grid;grid-template-columns:200px 1fr 60px;gap:0.75rem;align-items:center' },
            h('span', { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap', title: d.etiqueta }, d.etiqueta),
            h('div', { style: 'background:#e5e7eb;border-radius:6px;height:14px' },
              h('div', { style: `background:var(--color-primario);height:100%;border-radius:6px;width:${(d.valor / maximo) * 100}%` })),
            h('strong', { style: 'text-align:right' }, d.valor)
          )))
        : h('p', { class: 'vacio' }, 'Sin datos para graficar')
    ),
    h('div', { class: 'tarjeta' },
      h('h2', {}, `${reporte.titulo} (${reporte.filas.length} registros)`),
      tabla(reporte.columnas.map((c) => ({
        titulo: c.titulo,
        clase: c.moneda ? 'numero' : '',
        valor: (fila) => formato(fila[c.clave] ?? '—', c.moneda)
      })), reporte.filas, 'No hay datos con esos filtros')
    )
  );
}
