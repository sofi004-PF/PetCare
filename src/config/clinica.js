/**
 * Datos de la clínica que aparecen en facturas y documentos.
 */
const CLINICA = {
  nombre: 'Clínica Veterinaria PetCare',
  nit: '900.123.456-7',
  direccion: 'Calle 20 # 30-15, Pasto, Nariño',
  telefono: '(602) 731 0000',
  correo: 'contacto@petcare.com'
};

/** IVA aplicado a los servicios veterinarios (porcentaje). */
const IVA_SERVICIOS = 19;

module.exports = { CLINICA, IVA_SERVICIOS };
