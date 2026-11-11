# PetCare · Sistema de diseño

Interfaz de trabajo clínico (modo *Operate*): la prioridad es escanear rápido, no equivocarse y actuar con pocos toques. La marca vive en el icono y en los detalles; todo lo demás es sobrio.

Implementación: `src/views/public/css/styles.css` (tokens en `:root`), `js/ui.js` (componentes) y `js/iconos.js` (iconos SVG y logotipo).

## Icono

`src/views/public/img/petcare-icono.svg` (también `favicon.svg`): huella sobre un cuadrado redondeado teal; la almohadilla principal es una **cruz médica**. Une los dos mundos de la clínica (mascota + rigor médico) y se lee desde 16 px.

## Color

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--marino-900` | `#0F172A` | Estructura: barra lateral, títulos, botones elegidos. Texto blanco 17.9:1 |
| `--teal-600` | `#0D9488` | Marca: icono, foco, indicador de navegación activa |
| `--teal-700` | `#0F766E` | Botones primarios y enlaces (5.5:1 con blanco) |
| `--coral-600` | `#EA580C` | Acento de acción en iconos y bordes de alerta |
| `--coral-700` | `#C2410C` | Botones de llamada a la acción con texto (5.2:1). `#EA580C` con texto blanco da 3.6:1 y no cumple AA |
| `--menta-500` | `#10B981` | Indicadores positivos (iconos, bordes) |
| `--menta-700` | `#047857` | Texto de estados positivos (5.5:1) |
| `--pizarra-50` | `#F8FAFC` | Fondo clínico |
| `--pizarra-200` | `#E2E8F0` | Bordes de tarjetas |
| `--pizarra-500` | `#64748B` | Bordes de controles de formulario (4.8:1, cumple 3:1 de componentes) |

Reglas: el color nunca es la única señal (las insignias siempre llevan texto); el coral se reserva para **una** acción principal por vista (agendar, nuevo registro, confirmar) y para alertas.

## Tipografía

Una sola familia: **Plus Jakarta Sans** (Google Fonts), geométrica y sin adornos. Prohibidas las fuentes cursivas, manuscritas o decorativas.

Escala 1.25 con base 16 px: 13 · 14 · 16 · 20 · 25 · 31 px. Títulos en 700 con interlineado 1.25; texto en 1.5. Cifras tabulares en tablas y montos. Encabezados de tabla en minúscula inicial, nunca en mayúsculas sostenidas.

## Espacio y forma

Espaciado base 4 px (4 · 8 · 12 · 16 · 24 · 32 · 48). Radios: 6 px (detalles), 10 px (controles), 14 px (tarjetas y modales). Las tarjetas usan borde de 1 px, **sin sombra**; la sombra se reserva a capas flotantes (modales, avisos, cajón).

## Layout

| Ancho | Navegación |
| :--- | :--- |
| ≥ 1024 px | Barra lateral marina agrupada (Atención clínica, Clientes, Administración) |
| 768–1023 px | Cajón lateral con botón de menú |
| < 768 px | Barra inferior con 4 accesos del rol + "Más"; modales como hoja inferior; tablas como tarjetas apiladas |

Áreas de toque: 48 px en pantallas táctiles (`pointer: coarse`), 40 px con ratón. Sin desplazamiento horizontal de página.

## Movimiento

| Interacción | Duración | Curva |
| :--- | :--- | :--- |
| Hover, foco, color | 150 ms | `ease` |
| Pulsar botón | 160 ms | `scale(0.97)` |
| Abrir modal | 240 ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Cerrar modal | 150 ms | `ease-out` (la salida es más rápida que la entrada) |
| Cajón y hoja inferior | 280 ms | `cubic-bezier(0.32, 0.72, 0, 1)` |

Solo se animan `transform` y `opacity`. Los efectos de hover se limitan a dispositivos con ratón (`hover: hover`). Con `prefers-reduced-motion` se eliminan los desplazamientos y se conservan los cambios de opacidad.

## Accesibilidad (WCAG 2.1 AA)

* Enlace "Saltar al contenido", `main`, `nav` y `aside` con etiquetas.
* Foco visible de 2 px teal en todos los controles; nunca se elimina.
* Modales con `role="dialog"`, `aria-modal`, título asociado, foco atrapado, cierre con Escape y retorno del foco al botón que los abrió.
* Formularios con etiqueta visible, marca de obligatorio, mensaje de error junto al campo (`aria-invalid` + `aria-describedby`) y foco en el primer error.
* Filtros y calendario con `aria-pressed`; avisos con `role="status"` y errores con `role="alert"`.
* Iconos SVG decorativos con `aria-hidden`; los botones de solo icono llevan `aria-label`.
