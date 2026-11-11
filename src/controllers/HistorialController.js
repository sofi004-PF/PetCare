const fs = require('fs');
const path = require('path');
const HistorialDAO = require('../dao/HistorialDAO');
const { exigir, exigirCampos } = require('../utils/errores');

const CARPETA_ARCHIVOS = process.env.PETCARE_UPLOADS || path.join(__dirname, '..', '..', 'uploads');
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const TIPOS_PERMITIDOS = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp'
};
const TIPOS_ENTRADA = ['Nota clínica', 'Vacuna', 'Desparasitación', 'Procedimiento', 'Examen'];

/**
 * Fachada del Historial clínico (HU-02).
 * Reúne en una línea de tiempo la información clínica de la mascota. Otros
 * módulos (consultas, tratamientos, recetas) aportan sus eventos mediante
 * "fuentes" registradas, sin que el historial dependa de ellos (bajo acoplamiento).
 */
class HistorialController {
  /**
   * @param {import('./PropietarioController')} propietarioController - Validación de mascotas.
   */
  constructor(propietarioController) {
    this.historialDAO = new HistorialDAO();
    this.propietarios = propietarioController;
    /** @type {Array<(mascotaId: number) => Array<Object>>} */
    this.fuentes = [
      (mascotaId) => this.historialDAO.listarEntradas(mascotaId).map((e) => ({
        tipo: e.tipo,
        fecha: e.creado_en,
        titulo: e.titulo,
        detalle: e.descripcion,
        autor: e.veterinario_nombre
      })),
      (mascotaId) => this.historialDAO.listarArchivos(mascotaId).map((a) => ({
        tipo: 'Archivo adjunto',
        fecha: a.creado_en,
        titulo: a.nombre,
        detalle: a.descripcion,
        autor: a.veterinario_nombre,
        archivoId: a.id
      }))
    ];
  }

  /**
   * Contrato: Registra una fuente de eventos para la línea de tiempo.
   * @param {(mascotaId: number) => Array<{tipo: string, fecha: string, titulo: string, detalle?: string, autor?: string}>} fuente
   */
  registrarFuente(fuente) {
    this.fuentes.push(fuente);
  }

  /**
   * Contrato: Historial clínico completo de una mascota en orden cronológico (más reciente primero).
   * @param {number} mascotaId - Mascota.
   * @param {Object} usuario - Usuario autenticado (el cliente solo ve sus mascotas).
   * @returns {{mascota: Object, eventos: Array<Object>, archivos: Array<Object>}} Historial.
   */
  obtenerHistorial(mascotaId, usuario) {
    const mascota = this.propietarios.verificarAccesoMascota(usuario, mascotaId);
    const eventos = this.fuentes
      .flatMap((fuente) => fuente(mascota.id))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return { mascota, eventos, archivos: this.historialDAO.listarArchivos(mascota.id).map(publicoArchivo) };
  }

  /**
   * Contrato: Agrega una entrada clínica. La fecha, hora y el veterinario se registran automáticamente.
   * @param {number} mascotaId - Mascota.
   * @param {{tipo: string, titulo: string, descripcion?: string}} datos - Contenido de la entrada.
   * @param {{id: number, rol: string}} veterinario - Usuario que crea la entrada.
   * @returns {Object} Entrada registrada.
   * @throws {ErrorNegocio} Si no es veterinario o faltan datos.
   */
  agregarEntrada(mascotaId, { tipo, titulo, descripcion }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede escribir en el historial clínico', 403);
    exigirCampos({ tipo, titulo }, { tipo: 'tipo de registro', titulo: 'título' });
    exigir(TIPOS_ENTRADA.includes(tipo), `El tipo debe ser uno de: ${TIPOS_ENTRADA.join(', ')}`);
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    return this.historialDAO.guardarEntrada({
      mascotaId: mascota.id,
      veterinarioId: veterinario.id,
      tipo,
      titulo: String(titulo).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null
    });
  }

  /**
   * Contrato: Adjunta un archivo (rayos X, exámenes de laboratorio) al perfil de la mascota.
   * @param {number} mascotaId - Mascota.
   * @param {{nombre: string, tipoMime: string, contenidoBase64: string, descripcion?: string}} archivo
   * @param {{id: number, rol: string}} veterinario - Usuario que adjunta.
   * @returns {Object} Archivo registrado (sin la ruta interna).
   * @throws {ErrorNegocio} Si el tipo no está permitido o supera 10 MB.
   */
  adjuntarArchivo(mascotaId, { nombre, tipoMime, contenidoBase64, descripcion }, veterinario) {
    exigir(veterinario.rol === 'veterinario', 'Solo un veterinario puede adjuntar archivos al historial', 403);
    exigirCampos({ nombre, tipoMime, contenidoBase64 }, { nombre: 'nombre del archivo', tipoMime: 'tipo de archivo', contenidoBase64: 'archivo' });
    exigir(TIPOS_PERMITIDOS[tipoMime], 'Solo se permiten archivos PDF o imágenes (PNG, JPG, GIF, WEBP)');
    const mascota = this.propietarios.obtenerMascota(mascotaId);
    const contenido = Buffer.from(String(contenidoBase64), 'base64');
    exigir(contenido.length > 0, 'El archivo está vacío');
    exigir(contenido.length <= TAMANO_MAXIMO, 'El archivo supera el tamaño máximo de 10 MB');

    const nombreSeguro = path.basename(String(nombre)).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, '_').slice(0, 120);
    const carpeta = path.join(CARPETA_ARCHIVOS, 'mascotas', String(mascota.id));
    fs.mkdirSync(carpeta, { recursive: true });
    const nombreDisco = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${TIPOS_PERMITIDOS[tipoMime]}`;
    fs.writeFileSync(path.join(carpeta, nombreDisco), contenido);

    return publicoArchivo(this.historialDAO.guardarArchivo({
      mascotaId: mascota.id,
      veterinarioId: veterinario.id,
      nombre: nombreSeguro,
      descripcion: descripcion ? String(descripcion).trim() : null,
      tipoMime,
      tamano: contenido.length,
      ruta: path.join('mascotas', String(mascota.id), nombreDisco)
    }));
  }

  /**
   * Contrato: Obtiene un archivo adjunto para descargarlo.
   * @param {number} archivoId - Archivo.
   * @param {Object} usuario - Usuario autenticado.
   * @returns {{nombre: string, tipoMime: string, rutaAbsoluta: string}} Datos para enviar el archivo.
   * @throws {ErrorNegocio} 404 si no existe; 403 si el cliente no es dueño de la mascota.
   */
  obtenerArchivo(archivoId, usuario) {
    const archivo = this.historialDAO.buscarArchivo(Number(archivoId));
    exigir(archivo, 'El archivo no existe', 404);
    this.propietarios.verificarAccesoMascota(usuario, archivo.mascota_id);
    const rutaAbsoluta = path.join(CARPETA_ARCHIVOS, archivo.ruta);
    exigir(fs.existsSync(rutaAbsoluta), 'El archivo ya no está disponible en el servidor', 404);
    return { nombre: archivo.nombre, tipoMime: archivo.tipo_mime, rutaAbsoluta };
  }

  /** @returns {Array<string>} Tipos de entrada clínica. */
  listarTiposEntrada() {
    return TIPOS_ENTRADA;
  }

  /**
   * Contrato: Registra entradas clínicas de ejemplo.
   * @param {Object} veterinario - Veterinario autor.
   */
  sembrar(veterinario) {
    if (this.historialDAO.contarEntradas() > 0 || !veterinario) return;
    const [max] = this.propietarios.buscarMascotas('Max');
    if (!max) return;
    this.agregarEntrada(max.id, { tipo: 'Vacuna', titulo: 'Vacuna múltiple (refuerzo anual)', descripcion: 'Lote VX-2291. Sin reacciones adversas.' }, veterinario);
    this.agregarEntrada(max.id, { tipo: 'Desparasitación', titulo: 'Desparasitación interna', descripcion: 'Tableta según peso (28 kg).' }, veterinario);
  }
}

/**
 * Datos de un archivo que se pueden enviar al navegador (sin la ruta interna).
 * @param {Object} archivo - Fila de historial_archivos.
 * @returns {Object} Datos públicos.
 */
function publicoArchivo(archivo) {
  return {
    id: archivo.id,
    mascotaId: archivo.mascota_id,
    nombre: archivo.nombre,
    descripcion: archivo.descripcion,
    tipoMime: archivo.tipo_mime,
    tamano: archivo.tamano,
    veterinarioNombre: archivo.veterinario_nombre,
    creadoEn: archivo.creado_en
  };
}

module.exports = HistorialController;
