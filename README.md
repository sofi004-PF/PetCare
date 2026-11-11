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
