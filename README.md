# PetCare
La clínica veterinaria PETCARE  presenta dificultades en la gestión de sus operaciones debido al uso de procesos manuales y registros físicos para administrar la información de pacientes, propietarios, consultas, diagnósticos, tratamientos, vacunas y demás procedimientos veterinarios. Esta situación incrementa el riesgo de pérdida, deterioro, duplicidad e inconsistencias en los datos, dificultando el acceso oportuno a la información clínica y el seguimiento adecuado de cada mascota.
Además, la consulta de historiales médicos requiere tiempo adicional para localizar y revisar documentos físicos lo que aumenta los tiempos de atención y puede afectar la continuidad del servicio por otra parte la gestión de citas se generan mediante llamadas telefónicas y registros manuales generando problemas como cruces de horarios, asignación simultánea de citas, dificultades para realizar cambios o cancelaciones y ausencias no notificadas por parte de los propietarios. Por otra parte, la información se encuentra dispersa entre diferentes registros administrativos y clínicos obligando al personal a realizar tareas repetitivas de búsqueda, registro y verificación de datos, generando cuellos de botella y reduciendo la eficiencia operativa asimismo la falta de información organizada limita la generación de reportes y el análisis de indicadores importantes, dificultando la toma de decisiones y el seguimiento de las actividades de la clínica.

* Ivan Mauricio Jelpud
* Esteban Alejandro Ordoñes
* Sofia Fernanda Portilla
* Juan Camilo Villota 

---

## Sistema web PetCare

Aplicación web construida con **Node.js + Express + SQLite** siguiendo una arquitectura en 3 capas:

```
src/
├── models/        → Entidades del dominio (SRP)
├── dao/           → Acceso a datos en SQLite (patrón DAO)
├── controllers/   → Reglas de negocio (patrón Facade)
├── routes/        → API REST que expone los controladores
├── middleware/    → Sesión y restricción por rol (HU-11)
├── config/        → Matriz de permisos por rol
└── views/public/  → Página web (HTML, CSS y JavaScript)
```

### Requisitos

* Node.js **22.13 o superior** (usa el módulo `node:sqlite` incluido en Node).

### Cómo ejecutarlo

```bash
npm install
npm start
```

Abrir **http://localhost:3000**. La base de datos se crea sola en `data/petcare.db` con datos de prueba.

Para reiniciar los datos, detener el servidor y borrar la carpeta `data/`.

### Pruebas automáticas

```bash
npm test
```

### Usuarios de prueba

Todos usan la contraseña **`PetCare2026*`**.

| Rol | Correo |
| :--- | :--- |
| Administrador | admin@petcare.com |
| Veterinario | veterinario@petcare.com |
| Veterinario | veterinario2@petcare.com |
| Personal administrativo | recepcion@petcare.com |
| Dueño de mascota (cliente) | cliente@petcare.com |

### Historias de usuario implementadas

| HU | Issue | Módulo |
| :--- | :---: | :--- |
| HU-11 Gestión de usuarios y roles | #20 | Usuarios y roles, inicio de sesión y permisos |
| HU-07 Registro y gestión de propietarios | #16 | Propietarios, mascotas y acceso del cliente |
| HU-01 Agendamiento de citas médicas en línea | #10 | Citas: calendario, servicios, confirmación por correo |
| HU-08 Registro de consultas veterinarias | #17 | Consultas: atención de citas y consultas anteriores |
| HU-02 Registro de historial clínico por paciente | #11 | Historial clínico: línea de tiempo y archivos adjuntos |
| HU-09 Registro y seguimiento de tratamientos | #18 | Tratamientos: actuales, anteriores y evolución |
| HU-06 Emisión de recetas médicas digitales | #15 | Recetas: PDF y envío por correo o WhatsApp |
| HU-03 Notificaciones automáticas de vacunación y desparasitación | #12 | Recordatorios: aviso 3 días antes y respuesta desde el mensaje |
| HU-04 Control de inventario de farmacia veterinaria | #13 | Inventario: lotes, caducidad, descuento automático y alertas |
| HU-05 Generación de facturas por servicios prestados | #14 | Facturación: IVA desglosado, métodos de pago, PDF y envío por correo |
| HU-10 Generación de reportes administrativos y clínicos | #19 | Reportes: filtros, gráfico y descarga CSV para Excel |

### Abrir el proyecto en Visual Studio Code o Visual Studio

1. **Visual Studio Code:** *File → Open Folder…* y elegir la carpeta del repositorio.
2. **Visual Studio 2022:** *File → Open → Folder…* (requiere la carga de trabajo *Desarrollo de Node.js*).
3. Abrir una terminal en la carpeta y ejecutar `npm install` y luego `npm start`.
4. Para que el servidor se reinicie solo al guardar cambios: `npm run dev`.

### Cómo agregar una nueva funcionalidad

Cada historia de usuario sigue el mismo recorrido por las capas:

1. `src/models/` → entidad del dominio.
2. `src/dao/` → tabla y consultas SQLite (hereda de `BaseDAO`).
3. `src/controllers/` → reglas de negocio con contratos JSDoc; registrar la instancia en `src/controllers/index.js`.
4. `src/routes/` → endpoints REST; registrarlos en `src/routes/index.js` y el permiso en `src/config/permisos.js`.
5. `src/views/public/js/modulos/` → página del módulo; registrarla en `modulos/index.js`.
6. `test/` → pruebas de los criterios de aceptación (`npm test`).

### Notas del prototipo

* Los correos, SMS y WhatsApp **no se envían a un servidor real**: quedan registrados en el módulo *Notificaciones* con su canal, destinatario y estado.
* Los recordatorios de vacunación se revisan al iniciar el servidor y cada hora; el administrador puede forzar el envío desde *Recordatorios*.
