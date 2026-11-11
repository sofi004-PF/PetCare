# Informe de Gestión y Productividad - Sprint 1

**Proyecto:** PetCare - Gestión de una Clínica Veterinaria
**Asignatura:** Ingeniería de Software I - Universidad Mariana
**Equipo:** Ivan Mauricio Jelpud · Esteban Alejandro Ordoñes · Sofia Fernanda Portilla · Juan Camilo Villota

---

## 1. Resumen de la Iteración

* **Sprint Activo:** Sprint 1 (duración fija de 2 semanas)
* **Velocidad Planeada:** 12 SP
* **Velocidad Lograda (Real):** 2 SP (HU03 completada)
* **Porcentaje de Cumplimiento:** 16.6%

**Cálculo de la velocidad real:**

```
V_real = Σ Story Points de HUs en estado Done = 2 SP (HU03)

Cumplimiento = (V_real / V_planeada) × 100% = (2 / 12) × 100% ≈ 16.6%
```

| Historia de Usuario | Sprint | Story Points | Estado al cierre |
| :--- | :---: | :---: | :---: |
| #3 HU03 - Parametrización de Zonas | Sprint 1 | 2 | Done |
| #1 HU01 - Fila Virtual (Parte 1) | Sprint 1 | 10 | In Progress |
| **Total comprometido en Sprint 1** | | **12** | |

---

## 2. Métricas y Seguimiento del Avance

### Gráfico Burn-up

> **[Insertar captura de pantalla extraída de GitHub Insights]**
>
> Configuración usada en *Projects → Insights*: **Eje Y (Burn up by)** = suma del campo *Story Points*; **Eje X (Group by)** = *Iteration*.

**Lectura del gráfico:** el Burn-up muestra dos líneas:

* **Alcance total (línea superior):** se mantiene plana en **12 SP** durante todo el Sprint 1, porque no se añadieron ni retiraron historias después de la planeación.
* **Trabajo completado (línea inferior):** permanece en **0 SP** hasta el **4 de noviembre de 2026**, cuando se fusiona el PR #21 y la HU03 pasa a *Done*; en ese momento la línea sube a **2 SP** y no vuelve a crecer antes del cierre.

La brecha final entre ambas líneas (**10 SP**) corresponde a la HU01, que no alcanzó la *Definition of Done*.

### Análisis de Desviaciones

| Factor | Descripción | Impacto |
| :--- | :--- | :--- |
| **Historia sobredimensionada** | La HU01 se estimó en 10 SP y concentró el 83% de la capacidad del Sprint. Al no dividirse en tareas más pequeñas, ningún avance parcial pudo marcarse como *Done*. | Alto |
| **Configuración de entornos locales** | Se presentaron las incidencias técnicas documentadas en la guía: identidad de Git sin configurar (`fatal: unable to auto-detect email address`), archivos guardados vacíos (*Empty file*) y PR abierto antes del `git push` (*There isn't anything to compare*). | Medio |
| **Integración concentrada al final** | El único incremento (HU03) se integró en un solo commit y un solo PR al final del periodo, lo que dejó poco margen para continuar con la HU01. | Medio |
| **Revisión de código** | El PR #21 se abrió y fusionó el mismo día (15:50 → 15:54), sin demoras en revisión; la desviación no proviene de esta etapa. | Bajo |

---

## 3. Incremento Entregado (Definition of Done)

| Issue ID | Historia de Usuario | Story Points | Estado Final | Commit / PR de Cierre |
| :--- | :--- | :--- | :--- | :--- |
| #3 | Parametrización de Zonas | 2 SP | Done | PR #21 (Merged) · Commit d202213 |
| #1 | Fila Virtual (Parte 1) | 10 SP | In Progress | Sin commit integrado en `main` |

**Criterios de la Definition of Done cumplidos por la HU03:**

- [x] Código desarrollado en rama de característica `feature/issue-3-parametrizacion-zonas` (sin modificar `main` directamente).
- [x] Commit con Story Points e Issue referenciados: `feat: [2 SP] implementacion de arquitectura 3 capas para HU03 (#3)`.
- [x] Pull Request con trazabilidad automática (`Closes #3`) aprobado y fusionado en `main`.
- [x] Issue asociado cerrado automáticamente y tarjeta movida a la columna *Done*.
- [x] Contratos de métodos documentados con JSDoc.

---

## 4. Mantenibilidad del Código Fuente

* **Arquitectura:** Implementación en 3 Capas (`/models`, `/dao`, `/controllers`).
* **Patrones Usados:** Facade (`ZonaController.js`) y Acceso a Datos (`ZonaDAO.js`).
* **Buenas Prácticas:** Contratos documentados con JSDoc y modularización CommonJS (`module.exports`).

### Estructura entregada

```
src/
├── models/
│   └── Zona.js              → Entidad del dominio (id, nombre, capacidad, precioBase)
├── dao/
│   └── ZonaDAO.js           → Persistencia simulada en memoria (zonasBD)
└── controllers/
    └── ZonaController.js    → Fachada: listarZonas() y crearZona(...)
```

| Capa | Archivo | Responsabilidad | Principio / Patrón |
| :--- | :--- | :--- | :--- |
| Modelo | `src/models/Zona.js` | Representa la estructura de datos de la entidad *Zona*. No contiene lógica de acceso a datos ni de presentación. | SOLID - SRP |
| Acceso a Datos | `src/dao/ZonaDAO.js` | Encapsula la persistencia (`zonasBD` con VIP, Preferencial y General). Expone `obtenerTodas()` y `guardar(nuevaZona)`. La lógica de negocio no sabe cómo ni dónde se almacenan los datos. | DAO |
| Lógica / Fachada | `src/controllers/ZonaController.js` | Punto único de entrada para las vistas: `listarZonas()` y `crearZona(id, nombre, capacidad, precio)`. Construye la entidad y delega la persistencia al DAO. | Facade |

**Beneficios para la mantenibilidad:**

* **Integración simulada con base de datos:** sustituir la lista en memoria por una base de datos real solo requiere modificar `ZonaDAO.js`; el controlador y las vistas no cambian.
* **Contratos explícitos:** los bloques JSDoc (`@param`, `@returns`) documentan entradas, salidas y responsabilidad de cada método, facilitando la extensión y la revisión por otros miembros del equipo.
* **Bajo acoplamiento:** cada capa depende únicamente de la inmediatamente inferior mediante `require(...)`.

**Oportunidad de refactorización identificada:** los métodos de `ZonaController.js` documentan su contrato con una descripción, pero aún no incluyen las etiquetas `@param` y `@returns`. Se propone completarlas en el Sprint 2 para igualar el nivel de documentación de `ZonaDAO.js`.

---

## 5. Reajustes para el Sprint 2

### Factores técnicos que afectaron el desempeño del equipo

1. **Curva de aprendizaje del flujo Git + GitHub Projects:** la configuración de la identidad de Git, la creación de ramas y el ciclo *push → Pull Request → Merge* consumieron tiempo del Sprint que se había asignado a desarrollo.
2. **Granularidad insuficiente del Sprint Backlog:** la HU01 (10 SP) debió dividirse en historias o tareas de máximo 5 SP para poder entregar valor de forma incremental.
3. **Integración tardía:** el trabajo se concentró al final del Sprint en lugar de integrarse de manera continua.

### Lecciones aprendidas

* Dividir toda historia mayor a 5 SP antes de iniciar el Sprint.
* Realizar commits y Pull Requests pequeños y frecuentes, cada uno vinculado a su Issue (`Closes #ID`).
* Actualizar el tablero (*Backlog → In progress → In review → Done*) diariamente para que el Burn-up refleje el avance real.
* Verificar el entorno local (Git, VS Code, archivos guardados) al inicio del Sprint para evitar las incidencias técnicas #1, #2 y #3.

### Reajuste de la velocidad estimada para la siguiente iteración

Se recalibra la velocidad tomando como referencia la velocidad real observada, con un margen por la reducción esperada de los problemas de configuración:

| Concepto | Valor |
| :--- | :---: |
| Velocidad planeada Sprint 1 | 12 SP |
| Velocidad real Sprint 1 | 2 SP |
| Trabajo arrastrado (HU01 restante) | 10 SP |
| **Velocidad planeada Sprint 2 (recalibrada)** | **8 SP** |

**Propuesta de Sprint Backlog para el Sprint 2 (8 SP):**

| Issue | Historia de Usuario | Story Points |
| :--- | :--- | :---: |
| #2 | HU02 - Generación de QR Dinámico | 5 |
| #5 | HU05 - Validación de Boletas | 3 |
| **Total** | | **8** |

La HU01 (10 SP) se devuelve al Product Backlog para dividirse en partes de máximo 5 SP antes de volver a comprometerse en una iteración.
