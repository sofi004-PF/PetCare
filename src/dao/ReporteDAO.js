const { BaseDAO } = require('./db');

/**
 * DAO de Reportes administrativos y clínicos (HU-10).
 * Solo consultas de lectura agregadas sobre las tablas de los demás módulos.
 */
class ReporteDAO extends BaseDAO {
  /**
   * Contrato: Consultas veterinarias en un rango de fechas.
   * @param {{desde?: string, hasta?: string, veterinarioId?: number}} filtros
   * @returns {Array<Object>} Consultas.
   */
  consultas({ desde = null, hasta = null, veterinarioId = null }) {
    return this.todos(`
      SELECT c.fecha, m.nombre AS mascota, m.especie, p.nombre AS propietario, u.nombre AS veterinario,
             c.motivo, c.diagnostico
      FROM consultas c
      JOIN mascotas m ON m.id = c.mascota_id
      JOIN propietarios p ON p.id = m.propietario_id
      JOIN usuarios u ON u.id = c.veterinario_id
      WHERE (? IS NULL OR date(c.fecha) >= ?) AND (? IS NULL OR date(c.fecha) <= ?) AND (? IS NULL OR c.veterinario_id = ?)
      ORDER BY c.fecha DESC`, desde, desde, hasta, hasta, veterinarioId, veterinarioId);
  }

  /**
   * Contrato: Pacientes con su actividad clínica.
   * @param {{especie?: string}} filtros
   * @returns {Array<Object>} Pacientes.
   */
  pacientes({ especie = null }) {
    return this.todos(`
      SELECT m.nombre AS mascota, m.especie, m.raza, p.nombre AS propietario, p.telefono,
             (SELECT COUNT(*) FROM consultas c WHERE c.mascota_id = m.id) AS consultas,
             (SELECT MAX(c.fecha) FROM consultas c WHERE c.mascota_id = m.id) AS ultima_consulta,
             (SELECT COUNT(*) FROM tratamientos t WHERE t.mascota_id = m.id AND t.estado = 'Activo') AS tratamientos_activos
      FROM mascotas m JOIN propietarios p ON p.id = m.propietario_id
      WHERE (? IS NULL OR m.especie = ?)
      ORDER BY m.nombre`, especie, especie);
  }

  /**
   * Contrato: Citas por tipo de servicio y estado en un rango de fechas.
   * @param {{desde?: string, hasta?: string, servicioId?: number, estado?: string}} filtros
   * @returns {Array<Object>} Citas.
   */
  servicios({ desde = null, hasta = null, servicioId = null, estado = null }) {
    return this.todos(`
      SELECT c.fecha, c.hora, s.nombre AS servicio, c.estado, m.nombre AS mascota, p.nombre AS propietario,
             u.nombre AS veterinario, c.costo
      FROM citas c
      JOIN servicios s ON s.id = c.servicio_id
      JOIN mascotas m ON m.id = c.mascota_id
      JOIN propietarios p ON p.id = m.propietario_id
      JOIN usuarios u ON u.id = c.veterinario_id
      WHERE (? IS NULL OR c.fecha >= ?) AND (? IS NULL OR c.fecha <= ?)
        AND (? IS NULL OR c.servicio_id = ?) AND (? IS NULL OR c.estado = ?)
      ORDER BY c.fecha DESC, c.hora`, desde, desde, hasta, hasta, servicioId, servicioId, estado, estado);
  }

  /**
   * Contrato: Total facturado en un rango de fechas.
   * @param {{desde?: string, hasta?: string}} filtros
   * @returns {{facturas: number, total: number}} Totales.
   */
  totalFacturado({ desde = null, hasta = null }) {
    return this.uno(`SELECT COUNT(*) AS facturas, COALESCE(SUM(total), 0) AS total FROM facturas
      WHERE (? IS NULL OR date(creado_en) >= ?) AND (? IS NULL OR date(creado_en) <= ?)`, desde, desde, hasta, hasta);
  }

  /**
   * Contrato: Unidades vendidas o usadas por producto en un rango de fechas.
   * @param {{desde?: string, hasta?: string}} filtros
   * @returns {Array<{producto_id: number, salidas: number}>} Salidas por producto.
   */
  salidasInventario({ desde = null, hasta = null }) {
    return this.todos(`SELECT producto_id, SUM(cantidad) AS salidas FROM movimientos_inventario
      WHERE tipo = 'Salida' AND (? IS NULL OR date(creado_en) >= ?) AND (? IS NULL OR date(creado_en) <= ?)
      GROUP BY producto_id`, desde, desde, hasta, hasta);
  }
}

module.exports = ReporteDAO;
