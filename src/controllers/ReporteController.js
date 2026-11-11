const ReporteDAO = require('../dao/ReporteDAO');
const { exigir } = require('../utils/errores');
const { esFechaValida } = require('../utils/fechas');

const TIPOS = {
  consultas: 'Consultas veterinarias',
  pacientes: 'Pacientes',
  servicios: 'Servicios y citas',
  inventario: 'Inventario'
};

/**
 * Agrupa filas y cuenta o suma un valor por grupo.
 * @param {Array<Object>} filas - Datos.
 * @param {string} clave - Campo de agrupación.
 * @param {(fila: Object) => number} [valor] - Valor a sumar (por defecto cuenta).
 * @returns {Array<{etiqueta: string, valor: number}>} Grupos ordenados de mayor a menor.
 */
function agrupar(filas, clave, valor = () => 1) {
  const grupos = new Map();
  for (const fila of filas) grupos.set(fila[clave], (grupos.get(fila[clave]) || 0) + valor(fila));
  return [...grupos.entries()].map(([etiqueta, total]) => ({ etiqueta, valor: total })).sort((a, b) => b.valor - a.valor);
}

/**
 * Fachada de reportes administrativos y clínicos (HU-10).
 * Cada reporte devuelve la misma estructura: columnas, filas, resumen y datos
 * para un gráfico, lo que permite verlo en pantalla o descargarlo.
 */
class ReporteController {
  /**
   * @param {import('./InventarioController')} inventarioController - Stock y alertas.
   */
  constructor(inventarioController) {
    this.reporteDAO = new ReporteDAO();
    this.inventario = inventarioController;
  }

  /** @returns {Array<{id: string, nombre: string}>} Tipos de reporte. */
  listarTipos() {
    return Object.entries(TIPOS).map(([id, nombre]) => ({ id, nombre }));
  }

  /**
   * Contrato: Genera un reporte con filtros.
   * @param {string} tipo - consultas, pacientes, servicios o inventario.
   * @param {{desde?: string, hasta?: string, servicioId?: number, estado?: string, especie?: string, veterinarioId?: number}} filtros
   * @returns {{tipo: string, titulo: string, filtros: Object, columnas: Array<{clave: string, titulo: string}>,
   *            filas: Array<Object>, resumen: Array<{etiqueta: string, valor: *}>, grafico: {titulo: string, datos: Array}}}
   * @throws {ErrorNegocio} Si el tipo no existe o las fechas no son válidas.
   */
  generar(tipo, filtros = {}) {
    exigir(TIPOS[tipo], `El reporte "${tipo}" no existe`, 404);
    const limpios = this.limpiarFiltros(filtros);
    const reporte = this[`reporte${tipo[0].toUpperCase()}${tipo.slice(1)}`](limpios);
    return { tipo, titulo: TIPOS[tipo], filtros: limpios, ...reporte };
  }

  reporteConsultas(f) {
    const filas = this.reporteDAO.consultas(f);
    return {
      columnas: [
        { clave: 'fecha', titulo: 'Fecha' }, { clave: 'mascota', titulo: 'Mascota' }, { clave: 'especie', titulo: 'Especie' },
        { clave: 'propietario', titulo: 'Propietario' }, { clave: 'veterinario', titulo: 'Veterinario' },
        { clave: 'motivo', titulo: 'Motivo' }, { clave: 'diagnostico', titulo: 'Diagnóstico' }
      ],
      filas,
      resumen: [
        { etiqueta: 'Consultas', valor: filas.length },
        { etiqueta: 'Pacientes atendidos', valor: new Set(filas.map((x) => `${x.mascota}|${x.propietario}`)).size }
      ],
      grafico: { titulo: 'Consultas por veterinario', datos: agrupar(filas, 'veterinario') }
    };
  }

  reportePacientes(f) {
    const filas = this.reporteDAO.pacientes(f);
    return {
      columnas: [
        { clave: 'mascota', titulo: 'Mascota' }, { clave: 'especie', titulo: 'Especie' }, { clave: 'raza', titulo: 'Raza' },
        { clave: 'propietario', titulo: 'Propietario' }, { clave: 'telefono', titulo: 'Teléfono' },
        { clave: 'consultas', titulo: 'Consultas' }, { clave: 'ultima_consulta', titulo: 'Última consulta' },
        { clave: 'tratamientos_activos', titulo: 'Tratamientos activos' }
      ],
      filas,
      resumen: [
        { etiqueta: 'Pacientes', valor: filas.length },
        { etiqueta: 'Con tratamiento activo', valor: filas.filter((x) => x.tratamientos_activos > 0).length },
        { etiqueta: 'Sin consultas registradas', valor: filas.filter((x) => x.consultas === 0).length }
      ],
      grafico: { titulo: 'Pacientes por especie', datos: agrupar(filas, 'especie') }
    };
  }

  reporteServicios(f) {
    const filas = this.reporteDAO.servicios(f);
    const facturado = this.reporteDAO.totalFacturado(f);
    const atendidas = filas.filter((x) => x.estado === 'Atendida');
    return {
      columnas: [
        { clave: 'fecha', titulo: 'Fecha' }, { clave: 'hora', titulo: 'Hora' }, { clave: 'servicio', titulo: 'Servicio' },
        { clave: 'estado', titulo: 'Estado' }, { clave: 'mascota', titulo: 'Mascota' }, { clave: 'propietario', titulo: 'Propietario' },
        { clave: 'veterinario', titulo: 'Veterinario' }, { clave: 'costo', titulo: 'Costo (COP)', moneda: true }
      ],
      filas,
      resumen: [
        { etiqueta: 'Citas', valor: filas.length },
        { etiqueta: 'Atendidas', valor: atendidas.length },
        { etiqueta: 'Canceladas', valor: filas.filter((x) => x.estado === 'Cancelada').length },
        { etiqueta: 'Valor de servicios atendidos', valor: atendidas.reduce((a, x) => a + x.costo, 0), moneda: true },
        { etiqueta: `Total facturado (${facturado.facturas} facturas)`, valor: facturado.total, moneda: true }
      ],
      grafico: { titulo: 'Citas por tipo de servicio', datos: agrupar(filas, 'servicio') }
    };
  }

  reporteInventario(f) {
    const salidas = new Map(this.reporteDAO.salidasInventario(f).map((s) => [s.producto_id, s.salidas]));
    let filas = this.inventario.listarProductos().map((p) => ({
      producto: p.nombre,
      tipo: p.tipo,
      stock: p.stock,
      stock_minimo: p.stock_minimo,
      estado: p.bajoMinimo ? 'Stock bajo' : 'Normal',
      proxima_caducidad: p.proxima_caducidad || '',
      salidas: salidas.get(p.id) || 0,
      valor_inventario: p.stock * p.precio_venta
    }));
    if (f.estado) filas = filas.filter((x) => x.estado === f.estado);
    return {
      columnas: [
        { clave: 'producto', titulo: 'Producto' }, { clave: 'tipo', titulo: 'Tipo' }, { clave: 'stock', titulo: 'Stock' },
        { clave: 'stock_minimo', titulo: 'Stock mínimo' }, { clave: 'estado', titulo: 'Estado' },
        { clave: 'proxima_caducidad', titulo: 'Próxima caducidad' }, { clave: 'salidas', titulo: 'Unidades vendidas o usadas' },
        { clave: 'valor_inventario', titulo: 'Valor en inventario (COP)', moneda: true }
      ],
      filas,
      resumen: [
        { etiqueta: 'Productos', valor: filas.length },
        { etiqueta: 'Con stock bajo', valor: filas.filter((x) => x.estado === 'Stock bajo').length },
        { etiqueta: 'Valor total del inventario', valor: filas.reduce((a, x) => a + x.valor_inventario, 0), moneda: true }
      ],
      grafico: { titulo: 'Unidades vendidas o usadas por producto', datos: filas.map((x) => ({ etiqueta: x.producto, valor: x.salidas })).sort((a, b) => b.valor - a.valor) }
    };
  }

  /**
   * Contrato: Convierte un reporte a CSV compatible con Excel en español
   * (separador punto y coma y marca UTF-8).
   * @param {Object} reporte - Resultado de generar().
   * @returns {string} Contenido CSV.
   */
  aCSV(reporte) {
    const celda = (valor) => {
      const texto = valor === null || valor === undefined ? '' : String(valor);
      return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const lineas = [
      reporte.columnas.map((c) => celda(c.titulo)).join(';'),
      ...reporte.filas.map((fila) => reporte.columnas.map((c) => celda(fila[c.clave])).join(';'))
    ];
    return `﻿${lineas.join('\r\n')}\r\n`;
  }

  limpiarFiltros({ desde, hasta, servicioId, estado, especie, veterinarioId }) {
    if (desde) exigir(esFechaValida(desde), 'La fecha inicial no es válida');
    if (hasta) exigir(esFechaValida(hasta), 'La fecha final no es válida');
    if (desde && hasta) exigir(desde <= hasta, 'La fecha inicial no puede ser posterior a la final');
    return {
      desde: desde || null,
      hasta: hasta || null,
      servicioId: servicioId ? Number(servicioId) : null,
      estado: estado || null,
      especie: especie || null,
      veterinarioId: veterinarioId ? Number(veterinarioId) : null
    };
  }
}

module.exports = ReporteController;
