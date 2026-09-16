# Unidad 2: Estimación Formal en la Construcción de Software
## Guía de Aprendizaje - Clase 2: Valor de Negocio, Priorización y Estimación Empírica

### 2.1. Matriz de Priorización y Estimación Empírica

| ID Issue | Historia de Usuario | Categoría MoSCoW | Criterio de Impacto (Valor de Negocio) | Justificación Estratégica | Estimación Empírica (Cualitativa) |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **#1** | **HU01** - Agendamiento de citas médicas en línea | **Must Have** | Impacto Operativo | Es el canal de entrada principal para la atención de pacientes; organiza la demanda y elimina la saturación presencial/telefónica. | **Alta** |
| **#2** | **HU02** - Registro de historial clínico por paciente | **Must Have** | Impacto Operativo | Corazón operativo del sistema. Garantiza la calidad médica, trazabilidad legal y continuidad del cuidado de las mascotas. | **Media** |
| **#3** | **HU03** - Notificaciones automáticas de vacunación y desparasitación | **Should Have** | Impacto en UX / Fidelización | Aumenta el retorno de clientes y cumplimiento de citas, pero el MVP puede operar de forma básica mediante recordatorios manuales. | **Media** |
| **#4** | **HU04** - Control de inventario de farmacia veterinaria | **Should Have** | Impacto Financiero | Evita pérdidas por vencimiento o desabastecimiento, pero requiere un control logístico maduro previo a su automatización total. | **Media** |
| **#5** | **HU05** - Generación de facturas por servicios | **Must Have** | Impacto Financiero | Habilita el recaudo económico directo e indispensable para el cierre de atención antes de que el cliente abandone el recinto. | **Baja-Media** |
| **#6** | **HU06** - Emisión de recetas médicas digitales | **Should Have** | Impacto en UX | Optimiza la entrega de indicaciones al cliente, aunque inicialmente puede entregarse la orden médica en formato físico. | **Baja-Media** |
| **#7** | **HU07** - Registro y gestión de propietarios | **Must Have** | Impacto Operativo | Entidad base del sistema. Es imposible agendar, atender o facturar sin la información del cliente y la asociación a sus mascotas. | **Baja** |
| **#8** | **HU08** - Registro de consultas veterinarias | **Must Have** | Impacto Operativo | Permite la captura inmediata de datos clínicos durante la atención presencial; alimenta directamente el historial médico (HU02). | **Baja-Media** |
| **#9** | **HU09** - Registro y seguimiento de tratamientos | **Could Have** | Impacto Operativo | Aporta valor al seguimiento médico a largo plazo, pero no detiene la operación diaria si se gestiona dentro de la consulta. | **Baja-Media** |
| **#10** | **HU10** - Generación de reportes administrativos y clínicos | **Could Have** | Impacto Financiero / Directivo | Apoya la toma de decisiones estratégicas a nivel gerencial, sin embargo no afecta la transacción o atención inmediata del día a día. | **Media** |
| **#11** | **HU11** - Gestión de usuarios y roles del sistema | **Must Have** | Impacto Operativo y Seguridad | Transversal y vital. Garantiza la seguridad, privacidad de datos y la restricción de accesos según las funciones de cada empleado. | **Baja** |

---

### 2.2. Alcance del Producto Mínimo Viable (MVP)

El **Producto Mínimo Viable (MVP)** para la primera versión funcional de la clínica se compondrá únicamente de las historias clasificadas como **Must Have**:

* **#1 - HU01:** Agendamiento de citas médicas en línea
* **#2 - HU02:** Registro de historial clínico por paciente
* **#5 - HU05:** Generación de facturas por servicios
* **#7 - HU07:** Registro y gestión de propietarios
* **#8 - HU08:** Registro de consultas veterinarias
* **#11 - HU11:** Gestión de usuarios y roles del sistema

#### Justificación de Selección
1. **Seguridad y Accesos (#11):** Permite autenticar administradores, veterinarios y recepcionistas con permisos delimitados.
2. **Entidades Base (#7):** Registra a los dueños y mascotas necesarios para cualquier transacción.
3. **Flujo Operativo de Atención (#1, #8 y #2):** Permite reservar el cupo, atender al paciente en el consultorio y guardar la evolución médica en su expediente digital.
4. **Cierre Financiero (#5):** Asegura el cobro y la emisión de comprobantes antes de que el usuario finalice la visita.

#### Funcionalidades Postergadas (Fases Posteriores)
* **Segunda Iteración (Should Have - #3, #4, #6):** Se integrará el control automático de stock de medicamentos, la generación de recetas digitales enviadas por correo/WhatsApp y el motor automático de recordatorios preventivos de vacunación.
* **Tercera Iteración (Could Have - #9, #10):** Módulos analíticos de reportes gerenciales para administración y seguimiento especializado a tratamientos de largo plazo.
