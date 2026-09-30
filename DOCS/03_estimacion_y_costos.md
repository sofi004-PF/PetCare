# **1. Integrantes y Asignación de Roles**

**Product Owner:** [Sofia Portilla]

**Líder Técnico:** [Mauricio Jelpud]

**Desarrollador(a) 1:** [Esteban Ordonez]

**Desarrollador(a) 2:** [Camilo Villota]


# **2. Parámetros Base de Estimación**

**Historia Pivote Seleccionada:** [Nombre e ID de la HU Pivote]

**Puntaje Pivote Asignado:** [1 SP o 2 SP]

**Factor de Conversión** (Fc): 1 SP = 8 Horas.

**Tarifa Hora** (Th): $45.000 COP/Hora.

# **3. Matriz Detallada de Estimación Formal y Presupuesto**

| ID Issue | Historia de usuario | Story Points | Factor(Fc) | Esfuerzo | Tarifa | Costo Total | Justificación técnica |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #1 | [HU-01] Agendamiento de citas médicas en línea | 5 SP | 8 hrs/SP | 40 hrs | $45.000 COP | $1.800.000  COP| Complejidad media ya que Se requiere realizar diferentes automatizaciones, asignación de recursos gestión de horarios, validaciones y disponibilidad  |
| #2 | [HU-02] Registro de historial clínico por paciente | 13 SP| 8 hrs/SP | 104 hrs | $45.000 COP | $4.680.000 COP |Complejidad alta por que centraliza toda la información médica de las mascotas y soporta procesos clínicos arduos por ello se requiere almacenamiento estructurado y seguro de la información|
| #3 | [HU-03] Notificaciones automáticas de vacunación y desparasitación | 2 SP | 8 hrs/SP | 16 hrs | $45.000 COP | $72.000 COP | Notificación y aviso simples |
| #4 | [HU-04] Control de inventario de farmacia veterinaria | 3 SP| 8 hrs/SP | 24 hrs | $45.000 COP |$1.080.000 COP |Complejidad media. Requiere la creación del CRUD para insumos y medicamentos, lógica de control de stock/lotes, alertas de vencimiento, umbrales mínimos y registro de entradas y salidas en inventario. |
| #5 | [HU-05] Generación de facturas por servicios prestados | 1 SP| 8hrs/SP | 8 hrs | $45.000 COP |$360.000 COP |Complejidad baja. Consiste en la consolidación de servicios consumidos durante la atención, cálculo de impuestos/totales y la generación de la plantilla de comprobante de pago para impresión o exportación. |
| #6 | [HU-06] Emisión de recetas médicas digitales | 2 SP| 8 hrs/SP | 16 hrs | $45.000 COP |$720.000 COP  |Complejidad baja-media. Formulario para la prescripción de medicamentos vinculado a la consulta activa, validación de dosis/frecuencia y generación del archivo PDF estructurado con firma/cédula profesional del veterinario. |
| #7 | [HU-07] Registro y gestión de propietarios | 5 SP | 8 hrs/SP | 40 hrs | $45.000 COP | $1.800.000  COP|Se requiere administrar información y asegurar su privacidad  |
| #8 | [HU-08] Registro de consultas veterinarias | 5 SP | 8 hrs/SP | 40 hrs | $45.000 COP | $1.800.000  COP|Registro sencillo y seguro |
| #9 | [HU-09] Registro y seguimiento de tratamientos | 5 SP | 8 hrs/SP | 40 hrs | $45.000 COP | $1.800.000  COP|Se requiere control y seguimiento de tratamiento |
| #10 | [HU-10] Generación de reportes administrativos y clínicos |3 SP| 8 hrs/SP | 24 hrs | $45.000 COP |$1.080.000 COP |Complejidad media. Consultas agregadas a la base de datos con filtros por rango de fechas, tipo de servicio o médico; e integración de módulo de exportación a formatos PDF y Excel para análisis financiero y clínico. |
| #11 | [HU-11] Gestión de usuarios y roles del sistema |8 SP| 8 hrs/SP | 64 hrs |$45.000 COP |$2.880.000 COP |Complejidad alta. Implementación de la arquitectura de seguridad, autenticación (login/logout), hashing de contraseñas, middleware de autorización basado en roles (Administrador, Veterinario, Recepcionista) y gestión del perfil de usuario. |


# **4. Consolidado Total del Proyecto**

Total Story Points (SP total): 53 SP.

Esfuerzo Total (E total): 416 Horas.

Presupuesto Comercial Total (C total): $XX.XXX.XXX COP.
