# Informe de Gestión y Productividad - Sprint 1

**Proyecto:** PetCare - Gestión de una Clínica Veterinaria
**Asignatura:** Ingeniería de Software I - Universidad Mariana
**Equipo:** Ivan Mauricio Jelpud · Esteban Alejandro Ordoñes · Sofia Fernanda Portilla · Juan Camilo Villota

---

## 1. Resumen de la Iteración

* **Sprint Activo:** Sprint 1 (duración fija de 2 semanas)
* **Velocidad Planeada:** 13 SP
* **Velocidad Lograda (Real):** 5 SP (HU-07 completada)
* **Porcentaje de Cumplimiento:** 38.5%

**Cálculo de la velocidad real:**

```
V_real = Σ Story Points de HUs en estado Done = 5 SP (HU-07)

Cumplimiento = (V_real / V_planeada) × 100% = (5 / 13) × 100% ≈ 38.5%
```

El Sprint Backlog del Sprint 1 corresponde a lo definido en el plan del proyecto (`DOCS/04_plan_de_proyecto_y_modelos.md`):

| Issue | Historia de Usuario | Sprint | Story Points | Estado al cierre |
| :--- | :--- | :---: | :---: | :---: |
| #16 | [HU-07] Registro y gestión de propietarios | Sprint 1 | 5 | Done |
| #20 | [HU-11] Gestión de usuarios y roles del sistema | Sprint 1 | 8 | In Progress |
| **Total comprometido en Sprint 1** | | | **13** | |

---

## 2. Métricas y Seguimiento del Avance

### Gráfico Burn-up

> **[Insertar captura de pantalla extraída de GitHub Insights]**
>
> Gráfico **"Burn-up Sprint 1"** configurado en *Projects → Insights*: **Eje X** = *Iteration*; **Agrupación (Group by)** = *Status*; **Eje Y** = suma del campo *Story Points*; **Tipo** = columnas apiladas; **Filtro** = `iteration:"Sprint 1"`.

**Lectura del gráfico:** la columna del Sprint 1 alcanza **13 SP**, que corresponden al alcance total comprometido en la planeación. Esa columna se divide en dos segmentos según el estado de las historias al cierre:

* **Done (segmento inferior): 5 SP.** Corresponde a la HU-07, que cumplió la *Definition of Done* al fusionarse el PR #22 el **11 de noviembre de 2026**. Es la **velocidad real** del Sprint.
* **In progress (segmento superior): 8 SP.** Corresponde a la HU-11, que se inició pero no se terminó dentro del Sprint.

La proporción entre ambos segmentos refleja directamente el porcentaje de cumplimiento: solo **5 de los 13 SP** planeados (≈38.5%) llegaron a *Done*. Los **8 SP** restantes (HU-11) son la brecha entre lo planeado y lo entregado.

### Análisis de Desviaciones

| Factor | Descripción | Impacto |
| :--- | :--- | :--- |
| **Historia de alta complejidad** | La HU-11 (8 SP) concentró el 62% de la capacidad del Sprint. Incluye autenticación, cifrado de contraseñas y autorización por roles (Administrador, Veterinario, Recepcionista), y no se dividió en tareas más pequeñas, por lo que ningún avance parcial pudo marcarse como *Done*. | Alto |
| **Retrabajo sobre la plantilla de la guía** | El primer incremento integrado (PR #21) replicó el ejemplo de la guía (zonas de boletería) en lugar de una historia de PetCare. Fue necesario reemplazarlo por la implementación de la HU-07 (PR #22), lo que consumió tiempo del Sprint. | Medio |
| **Configuración de entornos locales** | Se presentaron las incidencias técnicas documentadas en la guía: identidad de Git sin configurar (`fatal: unable to auto-detect email address`), archivos guardados vacíos (*Empty file*) y PR abierto antes del `git push` (*There isn't anything to compare*). | Medio |
| **Integración concentrada al final** | El incremento de la HU-07 se integró al cierre del Sprint en un solo commit y un solo PR, sin margen para avanzar en la HU-11. | Medio |

---

## 3. Incremento Entregado (Definition of Done)

| Issue ID | Historia de Usuario | Story Points | Estado Final | Commit / PR de Cierre |
| :--- | :--- | :--- | :--- | :--- |
| #16 | [HU-07] Registro y gestión de propietarios | 5 SP | Done | PR #22 (Merged) · Commit 53b48dd |
| #20 | [HU-11] Gestión de usuarios y roles del sistema | 8 SP | In Progress | Sin commit integrado en `main` |

**Criterios de la Definition of Done cumplidos por la HU-07:**

- [x] Código desarrollado en la rama de característica `feature/issue-16-registro-propietarios` (sin modificar `main` directamente).
- [x] Commit con Story Points e Issue referenciados: `feat: [5 SP] implementacion de arquitectura 3 capas para HU-07 (#16)`.
- [x] Pull Request con trazabilidad automática (`Closes #16`) fusionado en `main`.
- [x] Issue #16 cerrado automáticamente al realizar el *merge*.
- [x] Contratos de métodos documentados con JSDoc (`@param`, `@returns`, `@throws`).
- [x] Criterios de aceptación del issue #16 cubiertos:
  - [x] Registrar un propietario con nombre, documento, teléfono, correo electrónico y dirección.
  - [x] Consultar y actualizar la información de un propietario.
  - [x] Asociar una o varias mascotas a un propietario y consultar dicha relación.

---

## 4. Mantenibilidad del Código Fuente

* **Arquitectura:** Implementación en 3 Capas (`/models`, `/dao`, `/controllers`).
* **Patrones Usados:** Facade (`PropietarioController.js`) y Acceso a Datos (`PropietarioDAO.js`).
* **Buenas Prácticas:** Contratos documentados con JSDoc y modularización CommonJS (`module.exports`).

### Estructura entregada

```
src/
├── models/
│   └── Propietario.js              → Entidad del dominio (id, nombre, documento, telefono, correo, direccion, mascotas)
├── dao/
│   └── PropietarioDAO.js           → Persistencia simulada en memoria (propietariosBD)
└── controllers/
    └── PropietarioController.js    → Fachada con las operaciones de la HU-07
```

| Capa | Archivo | Responsabilidad | Principio / Patrón |
| :--- | :--- | :--- | :--- |
| Modelo | `src/models/Propietario.js` | Representa la estructura de datos del propietario y sus mascotas asociadas. No contiene lógica de acceso a datos ni de presentación. | SOLID - SRP |
| Acceso a Datos | `src/dao/PropietarioDAO.js` | Encapsula la persistencia (`propietariosBD`, con propietarios de ejemplo). Expone `obtenerTodos()`, `buscarPorDocumento()`, `guardar()` y `actualizar()`. La lógica de negocio no sabe cómo ni dónde se almacenan los datos. | DAO |
| Lógica / Fachada | `src/controllers/PropietarioController.js` | Punto único de entrada para las vistas: `listarPropietarios()`, `consultarPropietario()`, `registrarPropietario()`, `actualizarPropietario()`, `asociarMascota()` y `listarMascotas()`. Aplica las reglas de negocio (datos obligatorios, documento único) y delega la persistencia al DAO. | Facade |

**Beneficios para la mantenibilidad:**

* **Integración simulada con base de datos:** sustituir la lista en memoria por una base de datos real solo requiere modificar `PropietarioDAO.js`; el controlador y las vistas no cambian.
* **Contratos explícitos:** los bloques JSDoc documentan entradas (`@param`), salidas (`@returns`) y errores (`@throws`) de cada método, facilitando la extensión y la revisión por otros miembros del equipo.
* **Reglas de negocio centralizadas:** las validaciones (campos obligatorios, documento no repetido, campos editables) viven en la fachada y en el DAO, no en las vistas.
* **Bajo acoplamiento:** cada capa depende únicamente de la inmediatamente inferior mediante `require(...)`.
* **Refactorización aplicada:** se eliminó el código de ejemplo de la guía (`Zona`, `ZonaDAO`, `ZonaController`), que no pertenecía al dominio de la clínica veterinaria.

---

## 5. Reajustes para el Sprint 2

### Factores técnicos que afectaron el desempeño del equipo

1. **Curva de aprendizaje del flujo Git + GitHub Projects:** la configuración de la identidad de Git, la creación de ramas y el ciclo *push → Pull Request → Merge* consumieron tiempo del Sprint que se había asignado a desarrollo.
2. **Granularidad insuficiente del Sprint Backlog:** la HU-11 (8 SP) debió dividirse en tareas de máximo 5 SP (por ejemplo: autenticación, gestión de roles y autorización) para entregar valor de forma incremental.
3. **Retrabajo e integración tardía:** el reemplazo del código de la plantilla y la integración al final del Sprint redujeron el tiempo disponible para la HU-11.

### Lecciones aprendidas

* Implementar directamente historias del Product Backlog de PetCare y usar la guía solo como referencia de estructura.
* Dividir toda historia mayor a 5 SP antes de iniciar el Sprint.
* Realizar commits y Pull Requests pequeños y frecuentes, cada uno vinculado a su Issue (`Closes #ID`).
* Actualizar el tablero (*Backlog → In progress → In review → Done*) diariamente para que el Burn-up refleje el avance real.

### Reajuste de la velocidad estimada para la siguiente iteración

El plan original asumía una capacidad de 13 SP por Sprint. Se recalibra tomando como referencia la velocidad real observada, con un margen por la reducción esperada de los problemas de configuración:

| Concepto | Valor |
| :--- | :---: |
| Velocidad planeada Sprint 1 | 13 SP |
| Velocidad real Sprint 1 | 5 SP |
| Trabajo arrastrado (HU-11 restante) | 8 SP |
| **Velocidad planeada Sprint 2 (recalibrada)** | **8 SP** |

**Propuesta de Sprint Backlog para el Sprint 2 (8 SP):**

| Issue | Historia de Usuario | Story Points |
| :--- | :--- | :---: |
| #20 | [HU-11] Gestión de usuarios y roles del sistema (dividida en tareas de máximo 5 SP) | 8 |
| **Total** | | **8** |

La HU-11 se prioriza porque es la base de seguridad del sistema. Las historias planeadas originalmente para el Sprint 2 (HU-01, HU-08, HU-03 y HU-05; 13 SP) se desplazan una iteración, por lo que el cronograma del MVP debe revisarse con el Product Owner.
