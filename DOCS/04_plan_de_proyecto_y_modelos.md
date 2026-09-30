# Planificación de Sprints y Cronograma del Proyecto

## 1. Planificación Detallada de Sprints (Cronograma Agile)

A partir del equipo asignado (2 Desarrolladores) y un esfuerzo total de **416 horas (52 SP)**, se define un esquema de **4 Sprints de 2 semanas de duración cada uno** (8 semanas en total), manteniendo una capacidad de **13 SP (104 horas de trabajo)** por iteración.

---

### **Sprint 1 (Semanas 1 y 2) · Capacidad: 13 SP**
* **[#11] HU-11: Gestión de Usuarios y Roles del Sistema** (8 SP - $2.880.000 COP)
  * *Justificación:* Fundamento de la arquitectura de seguridad, autenticación (login/logout), contraseñas y permisos (Administrador, Veterinario, Recepcionista).
* **[#7] HU-07: Registro y Gestión de Propietarios** (5 SP - $1.800.000 COP)
  * *Justificación:* Creación de la base de datos de clientes/dueños, necesaria para vincular pacientes y consultas en los sprints posteriores.

**Carga Total Sprint 1:** 13 SP | **Esfuerzo:** 104 Horas | **Costo Sprint 1:** $4.680.000 COP

---

### **Sprint 2 (Semanas 3 y 4) · Capacidad: 13 SP**
* **[#1] HU-01: Agendamiento de Citas Médicas en Línea** (5 SP - $1.800.000 COP)
  * *Justificación:* Lógica de disponibilidad de agenda, asignación de recursos y turnos.
* **[#8] HU-08: Registro de Consultas Veterinarias** (5 SP - $1.800.000 COP)
  * *Justificación:* Captura de datos durante la atención clínica directa del paciente.
* **[#3] HU-03: Notificaciones Automáticas de Vacunación y Desparasitación** (2 SP - $720.000 COP)
  * *Justificación:* Automatización de alertas vinculadas a la agenda y fichas de vacunación.
* **[#5] HU-05: Generación de Facturas por Servicios Prestados** (1 SP - $360.000 COP)
  * *Justificación:* Consolidación de cobros de consultas/citas e impresión de comprobantes.

**Carga Total Sprint 2:** 13 SP | **Esfuerzo:** 104 Horas | **Costo Sprint 2:** $4.680.000 COP

---

### **Sprint 3 (Semanas 5 y 6) · Capacidad: 13 SP**
* **[#2] HU-02: Registro de Historial Clínico por Paciente** (13 SP - $4.680.000 COP)
  * *Justificación:* Módulo central y de más alta complejidad. Requiere el 100% de la capacidad del Sprint para estructuración de datos médicos, antecedentes, almacenamiento seguro y trazabilidad del paciente.

**Carga Total Sprint 3:** 13 SP | **Esfuerzo:** 104 Horas | **Costo Sprint 3:** $4.680.000 COP

---

### **Sprint 4 (Semanas 7 y 8) · Capacidad: 13 SP**
* **[#9] HU-09: Registro y Seguimiento de Tratamientos** (5 SP - $1.800.000 COP)
  * *Justificación:* Control continuo de la evolución del paciente tras las consultas clínicas.
* **[#4] HU-04: Control de Inventario de Farmacia Veterinaria** (3 SP - $1.080.000 COP)
  * *Justificación:* CRUD de medicamentos, control de lotes, stock mínimo y alertas.
* **[#10] HU-10: Generación de Reportes Administrativos y Clínicos** (3 SP - $1.080.000 COP)
  * *Justificación:* Consultas agregadas, métricas e integración de descargas en PDF y Excel.
* **[#6] HU-06: Emisión de Recetas Médicas Digitales** (2 SP - $720.000 COP)
  * *Justificación:* Prescripción vinculada al inventario y generación de recetas firmadas en PDF.

**Carga Total Sprint 4:** 13 SP | **Esfuerzo:** 104 Horas | **Costo Sprint 4:** $4.680.000 COP

---

## 2. Cronograma de Hitos y Flujo de Caja por Sprint

| Sprint | Período | Carga (SP) | Horas | Inversión Sprint (COP) | Entregable Clave / Hito de Facturación |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Sprint 1** | Semanas 1 y 2 | 13 SP | 104 hrs | $4.680.000 | Módulo de Seguridad (Auth/Roles) + Base de Datos Propietarios |
| **Sprint 2** | Semanas 3 y 4 | 13 SP | 104 hrs | $4.680.000 | Agendamiento, Atenciones, Notificaciones y Facturación de Servicios |
| **Sprint 3** | Semanas 5 y 6 | 13 SP | 104 hrs | $4.680.000 | Núcleo del Historial Clínico Digitalizado e Integrado |
| **Sprint 4** | Semanas 7 y 8 | 13 SP | 104 hrs | $4.680.000 | Farmacia, Tratamientos, Recetas Digitales y Reportes |
| **TOTAL** | **8 Semanas** | **52 SP** | **416 hrs** | **$18.720.000** | **Sistema Veterinaria Completo y Listo para Producción** |

---

## 3. Matriz Temporal de Ejecución (Diagrama de Distribución)

| ID | Historia de Usuario | Story Points | Sprint 1 (Sem 1-2) | Sprint 2 (Sem 3-4) | Sprint 3 (Sem 5-6) | Sprint 4 (Sem 7-8) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **HU-11** | Gestión de usuarios y roles | 8 SP | **X** | | | |
| **HU-07** | Registro y gestión de propietarios | 5 SP | **X** | | | |
| **HU-01** | Agendamiento de citas en línea | 5 SP | | **X** | | |
| **HU-08** | Registro de consultas veterinarias | 5 SP | | **X** | | |
| **HU-03** | Notificaciones de vacunación | 2 SP | | **X** | | |
| **HU-05** | Generación de facturas | 1 SP | | **X** | | |
| **HU-02** | Registro de historial clínico | 13 SP | | | **X** | |
| **HU-09** | Registro y seguimiento de tratamientos | 5 SP | | | | **X** |
| **HU-04** | Control de inventario de farmacia | 3 SP | | | | **X** |
| **HU-10** | Generación de reportes | 3 SP | | | | **X** |
| **HU-06** | Emisión de recetas digitales | 2 SP | | | | **X** |

---

## 4. Consolidado Financiero Ajustado (Línea Base Final)

| Métrica Clave | Valor Ajustado |
| :--- | :--- |
| **Duración Total** | 8 Semanas (4 Sprints de 2 semanas) |
| **Equipo Asignado** | 2 Desarrolladores + Líder Técnico + Product Owner |
| **Carga Total Estimada** | **52 Story Points (SP)** |
| **Esfuerzo Total (E total)** | **416 Horas** *(52 SP × 8 hrs/SP)* |
| **Tarifa Hora (Th)** | $45.000 COP/Hora ($360.000 COP por SP) |
| **Presupuesto Comercial Total** | **$18.720.000 COP** |
