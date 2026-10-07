# WORKFLOW — Clientes

Prefijo: CUSTOMERS
Alcance MVP: nucleo

> Contrato de comportamiento del módulo (encargo `PROMPT-WORKFLOW.md`, ERPlora/pm#621). Es índice:
> los flujos viven en [`workflow/fichas.md`](workflow/fichas.md),
> [`workflow/identidad-y-privacidad.md`](workflow/identidad-y-privacidad.md),
> [`workflow/con-otros-modulos.md`](workflow/con-otros-modulos.md) y
> [`workflow/segmentacion.md`](workflow/segmentacion.md), con la misma gramática y el mismo prefijo.
> Lo técnico (consultas, órdenes, tablas, eventos) vive en `architecture/modules/customers.md` y en
> `docs/` del módulo; aquí no se duplica. Escrito contra `origin/main` v2.3.67 (05/10/2026).

## Para qué sirve y para quién

Clientes es el fichero de personas y empresas del negocio y el dueño de su dato personal: la ficha
con contacto y datos fiscales, sus grupos, etiquetas y campos propios, sus notas y su actividad, su
consentimiento para recibir publicidad por cada canal y lo que ha comprado. Es el módulo del que más
dependen los demás: el TPV le pide el cliente de la venta y su copia fiscal para la factura, Citas
cuelga las visitas en la ficha, WhatsApp reconoce a quien escribe por su teléfono, y todos escuchan
cuándo se unen dos fichas o se borran los datos de una persona. Lo usan el **administrador** (todo,
también eliminar fichas y borrar datos personales), el **responsable** (edita fichas, une duplicados,
gestiona grupos, etiquetas y campos, exporta) y el **empleado** (consulta, da de alta, importa, añade
notas y asigna el cliente a la venta). El perfil **Cajero** del TPV puede además editar fichas y
registrar consentimientos. El **cliente** no usa esta pantalla: sus datos entran por el mostrador,
el TPV o su WhatsApp.

**Lo común y lo de cada negocio.** La misma ficha sirve a la peluquería (la clienta de la agenda)
y al restaurante (el comensal que reserva o pide factura). Cada flujo lo dice en su clave
`Vertical:`, y lo que comparten está en «Qué comparten los verticales», debajo del índice de flujos.

## Referencia adoptada

- **E.164** (UIT-T) para guardar y comparar teléfonos, con las reglas de **libphonenumber** —
  <https://www.itu.int/rec/T-REC-E.164>, <https://github.com/google/libphonenumber>. Manda sobre
  cualquier regla propia (familia «Teléfonos» de pm#621).
- **Borrado de datos por inventario**: Shopify obliga a toda app a responder a un único aviso
  `customers/redact` con lo que guarda de esa persona —
  <https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance>—, y Odoo recorre con su
  buscador de privacidad todos los modelos que referencian a un contacto (familia «Borrado de datos»
  de pm#621).
- **RGPD** arts. 7 (demostrar el consentimiento, retirarlo tan fácil como darlo) y 17 (supresión), y
  las Directrices 05/2020 del CEPD. El modelo de consentimiento por canal y por finalidad, con la
  frase guardada palabra por palabra, se contrastó con 14 referencias (Shopify, Klaviyo, Mailchimp,
  HubSpot, Dynamics…) en ERPlora/customers#52; se adopta tal cual.
- **Alta de ficha** (Odoo, Business Central, Shopify, WooCommerce, Square, Toast, Lightspeed, Fresha,
  Holded; contrastada para customers#51, resumen en `architecture/modules/customers.md`): solo el
  nombre es obligatorio; identidad, teléfono y NIF a la vista; el resto a un toque.
- **Unir fichas duplicadas** (Square, Shopify, Odoo, Fresha, Lightspeed, Mindbody; customers#86) —
  <https://www.odoo.com/documentation/18.0/applications/essentials/contacts/merge.html>: una ficha
  maestra que completa sus huecos con la otra, y cada módulo re-apunta lo suyo.
- **Cliente en el TPV** (Square, Toast, Lightspeed, Shopify POS, Fresha; customers#18): buscar por
  nombre o teléfono y «+ nuevo cliente» en dos toques, sin salir de la venta.

## Antes de empezar

1. Instalar **Clientes**. No necesita ningún otro módulo. Con **Venta** aparece el buscador en el TPV
   y las compras se apuntan solas; con **Citas**, el historial de visitas en la ficha; con la
   **Bandeja de WhatsApp**, el reconocimiento por teléfono.
2. Comprobar el **país del negocio** en los ajustes del hub: es el que se supone para todo teléfono
   escrito sin prefijo (F10). Si nunca se guardó, se toma España.
3. Si hace falta segmentar, crear los grupos y etiquetas (F27, F28) y los campos propios del negocio
   (F29): marcar como obligatorios solo los imprescindibles, porque se exigirán cada vez que se
   edite una ficha (no al darla de alta).
4. Traer los clientes que ya se tienen con **Importar CSV** (F08) o darlos de alta (F01).
5. Comprobar en el TPV que la ficha sale en el buscador y que la venta se cobra con ella (F17).

## Pantallas

### Clientes
Menú **Clientes**, pestaña **Clientes**. La ve todo el que vea clientes. Arriba, cuatro cifras:
«Clientes», «Activos», «VIP» e «Ingresos» (suma de lo gastado por las fichas vivas; si no cargan, no
salen). Debajo, la tabla: «Nombre», «Email», «Teléfono», «Etapa», «Gastado»; buscador «Buscar nombre o
email…» (busca también teléfono, NIF y empresa); **Filtros**; vista lista o tarjetas; elegir
columnas; 50 por página. En la barra, **Añadir** (abre el panel lateral del alta, F01) e **Importar
CSV** a quien puede crear, y **Exportar CSV** al administrador y al responsable (solo se esconde el
botón; ver F09). Por fila: tocarla o
**Ver** abre la ficha; **Eliminar** solo al administrador. Vacía: «Sin clientes.»; cargando:
«Cargando…»; error: la tabla enseña el error con **Reintentar**. Los avisos de la página
(«Cliente {nombre} eliminado», «Datos personales borrados.», el resumen de una importación) salen
encima de la tabla.

### Ficha de cliente
Se abre desde **Clientes** y ocupa la pestaña; su título es el nombre del cliente. Botones según el
perfil: **← Volver**, **Editar**, **Eliminar**, **Fusionar con…** y **Borrar datos personales**.
Bloques: los datos (o el formulario al editar; notas internas, cumpleaños, aniversario y campos
personalizados solo salen en el formulario); «Grupos» y «Etiquetas» con casillas y **Guardar
grupos** / **Guardar etiquetas**; «Consentimiento de marketing» con una línea por canal y «Todo lo
que se decidió»; «Añadir nota»; «Actividad»; y al final los bloques de otros módulos (hoy, el
«Historial de visitas» de Citas). Los paneles de fusión y de borrado de datos se abren encima de los
datos. Error al abrir: «Cliente no encontrado» o «No se pudo cargar el cliente»; los errores de una
acción salen arriba en rojo y las confirmaciones en verde.

### Grupos
Menú **Clientes**, pestaña **Grupos**. Tabla «Nombre», «Descripción», «Clientes» (cuántas fichas
vivas), «Orden»; buscador «Buscar grupo…»; **Añadir** y, por fila, **Editar** y **Eliminar** según
permisos. El alta y la edición van en el panel lateral. Vacía: «Sin grupos.».

### Etiquetas
Menú **Clientes**, pestaña **Etiquetas**. Tabla «Nombre», «Color»; buscador «Buscar etiqueta…»;
mismas acciones que Grupos. Vacía: «Sin etiquetas.».

### Campos
Menú **Clientes**, pestaña **Campos**. Tabla «Nombre», «Tipo», «Obligatorio» (Sí/No), «Orden»;
buscador «Buscar campo…»; filtros por tipo y obligatorio. Solo quien gestiona campos ve **Añadir**
y las acciones. Vacía: «Sin campos personalizados.».

### Buscador de cliente del TPV
Dentro de la pantalla de venta de **Venta**, que reserva el hueco y no sabe nada de Clientes. Un
botón con icono («Asignar cliente», o el nombre del cliente ya elegido) abre un buscador que tapa la
venta: campo «Buscar por nombre, teléfono, email…», la lista (nombre y teléfono o email), «+ Nuevo
cliente «…»» con su formulario de «Nombre» y «Teléfono», y al pie **Quitar cliente**. Buscando:
«Cargando…»; sin resultados: «Sin resultados.» o «No hay clientes.»; error: el motivo con
**Reintentar**; sin permiso: «No tienes permiso para consultar clientes.».

Pantallas de otros que usan estos flujos: **Venta: TPV** (la venta que lleva el cliente),
**Citas: Agenda** (el selector de clienta al dar una cita), **Citas: Historial de visitas** (bloque
que Citas pinta dentro de la ficha) y **WhatsApp: chat del cliente** (donde escribe quien acaba
teniendo ficha). No hay pestaña de **Ajustes**: el módulo no declara ajustes.

## Flujos

Índice. Cada flujo, con su gramática completa, está en el fichero que indica la tabla.

| ID | Flujo | Estado | Vertical | Fichero |
|---|---|---|---|---|
| CUSTOMERS-F01 | Dar de alta una ficha desde Clientes | parcial | comun | fichas |
| CUSTOMERS-F02 | Buscar y filtrar fichas | hecho | comun | fichas |
| CUSTOMERS-F03 | Abrir la ficha de un cliente | parcial | comun | fichas |
| CUSTOMERS-F04 | Editar la ficha y sus campos personalizados | parcial | comun | fichas |
| CUSTOMERS-F05 | Añadir una nota a la ficha | hecho | comun | fichas |
| CUSTOMERS-F06 | Poner grupos y etiquetas a una ficha | parcial | comun | fichas |
| CUSTOMERS-F07 | Eliminar una ficha | hecho | comun | fichas |
| CUSTOMERS-F08 | Importar fichas desde un CSV | parcial | comun | fichas |
| CUSTOMERS-F09 | Exportar la lista de fichas | parcial | comun | fichas |
| CUSTOMERS-F10 | Reconocer a una persona por su número de teléfono | parcial | comun | identidad-y-privacidad |
| CUSTOMERS-F11 | Guardar el teléfono en formato internacional (E.164) | parcial | comun | identidad-y-privacidad |
| CUSTOMERS-F12 | Evitar fichas duplicadas de la misma persona | parcial | comun | identidad-y-privacidad |
| CUSTOMERS-F13 | Unir dos fichas de la misma persona | hecho | comun | identidad-y-privacidad |
| CUSTOMERS-F14 | Registrar que un cliente da su consentimiento para un canal | parcial | comun | identidad-y-privacidad |
| CUSTOMERS-F15 | Retirar el consentimiento de un canal | hecho | comun | identidad-y-privacidad |
| CUSTOMERS-F16 | Borrar los datos personales de un cliente (RGPD) | parcial | comun | identidad-y-privacidad |
| CUSTOMERS-F17 | Asignar un cliente a la venta en el TPV | hecho | comun | con-otros-modulos |
| CUSTOMERS-F18 | Crear un cliente desde el buscador del TPV | hecho | comun | con-otros-modulos |
| CUSTOMERS-F19 | Enlazar el cliente al pedido abierto | hecho | comun | con-otros-modulos |
| CUSTOMERS-F20 | Sumar la compra a la ficha al cobrar | hecho | comun | con-otros-modulos |
| CUSTOMERS-F21 | Restar una venta anulada | hecho | comun | con-otros-modulos |
| CUSTOMERS-F22 | Restar una devolución | no hecho | comun | con-otros-modulos |
| CUSTOMERS-F23 | Ver el historial de compras de un cliente | parcial | comun | con-otros-modulos |
| CUSTOMERS-F24 | Ver en la ficha lo que otros módulos saben del cliente | hecho | comun | con-otros-modulos |
| CUSTOMERS-F25 | Crear la clienta sin salir de la agenda | no hecho | peluqueria | con-otros-modulos |
| CUSTOMERS-F26 | Crear la ficha de quien pide cita por WhatsApp | hecho | peluqueria | con-otros-modulos |
| CUSTOMERS-F27 | Crear, cambiar y eliminar grupos de clientes | parcial | comun | segmentacion |
| CUSTOMERS-F28 | Crear, cambiar y eliminar etiquetas de clientes | parcial | comun | segmentacion |
| CUSTOMERS-F29 | Definir los campos personalizados de la ficha | parcial | comun | segmentacion |
| CUSTOMERS-F30 | Dar la ficha de una clienta a otros módulos | hecho | comun | con-otros-modulos |

## Qué comparten los verticales

Tocar una pieza de esta tabla afecta a la peluquería **y** al restaurante: hay que revisar los flujos
de la segunda columna, y sus implicados, en la misma entrega.

| Pieza compartida | Flujos que la usan |
|---|---|
| Un solo formulario de ficha para el alta y la edición (mismos campos, mismo orden) | F01, F04, F11 |
| La búsqueda por número de teléfono: la misma consulta reconoce a la clienta que pide cita y al comensal que pide mesa, y su tabla de prefijos está copiada a mano en la Bandeja de WhatsApp | F10, F11, F12, F26 |
| La búsqueda de texto de la lista: la usan la tabla, el panel de fusión, el buscador del TPV y el selector de clienta de Citas (la agenda y las citas periódicas piden las 500 primeras por nombre) | F02, F13, F17, F18, F25 |
| El teléfono tal como se guarda: lo leen la búsqueda por número (F10), WhatsApp al unir conversaciones y Citas, que lo copia en la cita y con esa copia el aviso de cita confirmada busca la conversación | F01, F04, F08, F10, F11, F18, F26 |
| El aviso de ficha creada o actualizada, que escucha WhatsApp para unir conversaciones (la importación no lo emite) | F01, F04, F08, F18, F26 |
| La fusión y su aviso: lo escuchan Citas (peluquería), Reservas y Cocina (restaurante), y Ventas, WhatsApp, Servicios y Reservas online | F13 |
| El borrado de datos y su aviso, y la eliminación lógica | F07, F16 |
| El buscador del TPV, la copia fiscal y el historial de compras: los dos negocios cobran con el mismo TPV | F17, F18, F19, F20, F21, F22, F23 |
| El consentimiento por canal | F14, F15 |
| Grupos, etiquetas y campos personalizados | F06, F27, F28, F29 |

Lo que **no** se comparte: crear la ficha de quien escribe por WhatsApp (solo la cita, F26; la mesa
solo liga una ficha que ya exista), el historial de visitas en la ficha (solo Citas lo aporta, F24)
y el alta desde la agenda (F25, no hecho). En el restaurante, una reserva tomada a mano no usa la
ficha: Reservas guarda nombre y teléfono por su cuenta.

## Cobertura contra la referencia

**1 · Teléfonos contra E.164 y libphonenumber.** Lo que hace hoy el código, caso por caso.

| Elemento | Estado | Flujo |
|---|---|---|
| Guardar el número en E.164 (`+` y cifras) al dar de alta, editar, importar o crear en el TPV | hecho: toda escritura de la ficha pasa por las reglas de libphonenumber, y las fichas antiguas las reescribe una tarea programada con copia del texto viejo | F11, F01, F04, F08, F18 |
| Guardar en E.164 la ficha que crea WhatsApp | hecho: la misma alta lo normaliza | F26 |
| Comprobar que el número es posible para su país (longitud, tipo) | hecho al guardar (longitud posible de su país; el tipo, móvil o fijo, no se mira); al comparar solo se exigen 7 cifras | F10, F11 |
| Espacios, guiones, puntos y paréntesis | hecho al guardar, al comparar por número y al buscar (tabla de Clientes, TPV y fusionar fichas) | F10, F11, F02, F18 |
| Prefijo con `+` o con `00` | hecho al guardar y al comparar | F10, F11 |
| Enseñar el número con el formato de su país | no hecho: se enseña tal como se guarda (customers#127) | F11 |
| Cero nacional delante (`07700…` en Reino Unido) | hecho al guardar y al comparar cuando el número es del país del negocio; uno extranjero tecleado así se rechaza al guardar si no es posible en el país del negocio | F10, F11 |
| Cero nacional entre paréntesis en un número internacional (`+44 (0)7700…`) | hecho al guardar; al comparar un número que llega así, no: el cero se queda y no casa | F10, F11 |
| Países que conservan el cero tras el prefijo (Italia y otros 8) | hecho: al guardar, con los metadatos de libphonenumber; al comparar, con una lista propia de 9 países | F10, F11 |
| País que se supone para un número sin prefijo | parcial: siempre el del negocio; el «País» de la ficha no se usa para el teléfono | F10, F11 |
| Número extranjero guardado con su prefijo | hecho: casa solo con ese país | F10 |
| Número extranjero guardado sin su prefijo | parcial: al guardar se lee en el país del negocio; si no es posible allí se rechaza y se pide el prefijo, pero si lo es se guarda como del país del negocio y es otra persona | F10, F11 |
| Tabla de prefijos por país | parcial: al guardar, generada de los metadatos de libphonenumber; al comparar, escrita a mano en Clientes y copiada en la Bandeja de WhatsApp | F10, F11 |
| Extensión o dos números en el mismo campo | hecho al guardar: se rechaza | F10, F11 |
| Buscar en Clientes un teléfono escrito de otra forma | hecho: la tabla (buscador y filtro «Teléfono»), el TPV y fusionar fichas buscan sus cifras | F02, F18, F13 |
| Avisar de un teléfono repetido al crear | parcial: solo el alta rápida del TPV, entre los resultados en pantalla | F12, F18 |
| Comparar números ya normalizados en los demás módulos | parcial: la cita copia el teléfono ya normalizado y la conversación también lo está, pero el aviso de cita confirmada compara por «contiene» (whatsapp_inbox#279) y el buscador de Reservas compara texto | F11 |

**2 · Borrado de datos contra el inventario (Shopify `customers/redact`, buscador de privacidad de Odoo).**

| Elemento | Estado | Flujo |
|---|---|---|
| Un único aviso de borrado al que responde todo el que guarda algo de la persona | parcial: existe el aviso de ficha anonimizada; lo escuchan WhatsApp, Servicios y el historial del hub; Citas, Reservas y Reservas online no | F16 |
| Inventario declarado: cada módulo dice qué guarda de una persona | no hecho: no hay contrato; hoy solo lo dicen los apartados «Datos» de cada WORKFLOW | F16 |
| Buscar todo lo que el hub guarda de una persona | no hecho | — |
| Borrar desde la ficha, con motivo y auditoría de quién y cuándo | hecho | F16 |
| Borrar los datos de una ficha ya eliminada | parcial: la orden lo admite (asistente o API), ninguna pantalla lo ofrece | F07, F16 |
| Borrar los datos que se quedaron en la ficha absorbida al unir duplicados | parcial: la orden lo admite con su identificador (está en la actividad de la superviviente), ninguna pantalla lo ofrece; borrar la superviviente no los toca | F13, F16 |
| Notas, actividad, campos, grupos, etiquetas y consentimientos de la ficha | hecho | F16 |
| Historial de avisos y automatizaciones del hub que nombra la ficha | parcial: se vacían los avisos ya entregados o descartados y las automatizaciones terminadas (hub#2467); los pendientes, atascados o en curso no (hub#2484); lo que solo lleva su teléfono, tampoco (hub#2477) | F16 |
| Conversaciones de WhatsApp unidas a la ficha | hecho (WHATSAPP_INBOX-F11) | F16 |
| Nombre, teléfono, correo y notas copiados en citas y series | no hecho: Citas no escucha el aviso y no tiene flujo para ello (`appointments/WORKFLOW.md`, «Datos») | F16 |
| Nombre, teléfono, correo y notas copiados en reservas y lista de espera | no hecho (RESERVATIONS-F22) | F16 |
| Nombre, correo y teléfono copiados en reservas online | no hecho | F16 |
| Copia fiscal en ventas y facturas | se conserva a propósito: obligación de conservar los documentos | F16, F17 |
| Historial de compras y pedidos enlazados | se conserva por el identificador, sin datos personales | F16 |
| Eliminar sin borrar datos | hecho, y distinto del borrado de datos | F07 |
| Rectificar datos | hecho | F04 |
| Entregar a la persona sus datos (acceso y portabilidad) | fuera del MVP (re-alcance de customers#11, 06/08) | — |

**3 · La ficha contra el fichero de clientes de un TPV (Square, Shopify, Odoo, Fresha, Lightspeed).**

| Elemento | Estado | Flujo |
|---|---|---|
| Alta solo con el nombre, teléfono y NIF a la vista | hecho | F01 |
| Email comprobado al guardar | no hecho: un email mal formado se guarda en el alta, la edición y el TPV; solo la importación lo rechaza | F01, F04 |
| Alta desde el TPV en dos toques | hecho | F18 |
| Alta desde la agenda | no hecho (la agenda solo elige entre las 500 primeras fichas, APPOINTMENTS-F01) | F25 |
| Alta automática desde WhatsApp | hecho en peluquería; el restaurante no crea fichas | F26 |
| Aviso de posible duplicado al crear (teléfono, email, NIF) | fuera del MVP por el triaje de customers#12 (06/08); ver «Dudas abiertas» | F12 |
| Unir duplicados conservando todo | hecho | F13 |
| Consentimiento por canal con prueba y retirada en un toque | hecho | F14, F15 |
| Consentimiento de teléfono y correo postal desde la pantalla | parcial: solo con el asistente | F14 |
| Que quien escribe al cliente consulte el consentimiento | no hecho: WhatsApp no lo consulta (L-11) | F14 |
| Baja escrita por el cliente («BAJA», «STOP») | no hecho | F15 |
| Compras que suman y anulaciones que restan, una sola vez | hecho | F20, F21 |
| Devoluciones que restan | no hecho | F22 |
| Lista de compras con importe en la ficha | parcial: solo cifras y entradas sin importe | F23 |
| Etapas por tiempo sin comprar («En riesgo», «Inactivo», «Perdido») | no hecho: solo cambian con una compra o a mano | F20 |
| Grupos y etiquetas | hecho | F06, F27, F28 |
| Campos propios validados por tipo y obligatorios | parcial: solo al editar; ningún alta los pide | F04, F29 |
| Importar | parcial | F08 |
| Exportar todo el directorio | parcial: solo la página | F09 |
| Exportar protegido por permiso | no hecho: el permiso solo esconde el botón; quien puede ver clientes lee el directorio por la API | F09 |
| Notas y actividad | hecho | F05 |
| Historial de visitas en la ficha | hecho (lo aporta Citas, APPOINTMENTS-F20) | F24 |
| Descuento por grupo | fuera: retirado (customers#17), es de Precios | — |
| Segmentos dinámicos por reglas, campañas, puntos de fidelidad | fuera del MVP | — |

## Datos: de quién es cada dato

Inventario sacado de recorrer las nueve migraciones y lo que viaja en los avisos.

| Dato personal | Dónde vive | Dueño | Cómo se borra hoy |
|---|---|---|---|
| Nombre, email, teléfono, NIF, empresa, dirección, ciudad, código postal, país, foto, notas internas, cumpleaños, aniversario, canal preferido, marca y fecha de consentimiento | la ficha | Clientes | F16: marcador y vacíos; la fila y su identificador se quedan. F07 no borra nada |
| Origen, etapa, compras, gastado, última compra, fecha de alta y de baja, quién la creó y cambió | la ficha | Clientes (las cifras, derivadas del historial de compras) | F16 los conserva (no identifican por sí solos) |
| Valores de campos propios (pueden ser datos de salud: alergias, tinte, embarazo) | valores de campo | Clientes | F16: vaciados y ocultos |
| Teléfono tal como se tecleó antes de pasarlo a E.164 (solo las fichas que reescribió la tarea de F11) | copia de teléfonos | Clientes | F16: se borra |
| Notas, su autor (identificador del empleado) y el nombre del autor si se dio | notas | Clientes | F16: texto y nombre vaciados y ocultos; el identificador del autor se queda |
| Actividad: textos de notas, frase del consentimiento, motivo de una retirada o de una anulación de venta, importes, quién la hizo y a qué venta, nota o ficha apunta | actividad | Clientes | F16: descripción y datos vaciados y ocultos; el título, quién la hizo y a qué apunta se quedan |
| Entrada de auditoría del borrado, con el motivo tal como se escribió | actividad | Clientes | se queda visible a propósito |
| Pertenencia a grupos y etiquetas | grupos y etiquetas de la ficha | Clientes | F16: se quitan |
| Consentimientos: canal, dirección para la que se dio, frase, versión, origen, prueba, motivo, quién lo apuntó y cuándo lo dijo | registro de consentimientos | Clientes | F16: dirección, prueba y motivo vaciados; el resto se queda; hecho oculto |
| Ventas de la persona (identificador de venta, importe, moneda, estado) | historial de compras | Clientes | se conserva |
| Pedidos de la persona (identificador del pedido) | enlace cliente ↔ pedido | Clientes | se conserva |
| Quién creó y cambió cada fila (identificador de empleado) | todas las tablas | Clientes | se conserva (es del empleado) |
| Ficha absorbida en una fusión, con todos sus datos y los valores de campo que chocaban | la ficha retirada | Clientes | no se borra desde la pantalla; la orden de borrar datos sí la acepta por el asistente o la API con su identificador, que está en la actividad de la superviviente (F13, F16) |
| Ficha creada o actualizada con todos sus datos (el aviso de ficha actualizada lleva además los valores de los campos propios, p. ej. alergias); dirección y frase en los avisos de consentimiento; motivo en el de borrado | avisos que salen a otros módulos (historial del hub) | hub | al borrar los datos se vacían solo los ya entregados o descartados (hub#2467); los pendientes o atascados conservan los datos hasta que se procesan o los poda la retención (90 días) |
| Nombre, teléfono, correo y notas en citas y series | Citas | Citas | no se borran (no escucha) |
| Nombre, teléfono, correo, notas en reservas y lista de espera | Reservas | Reservas | no se borran (RESERVATIONS-F22) |
| Nombre, correo, teléfono en reservas online | Reservas online | Reservas online | no se borran |
| Conversaciones y mensajes | Bandeja de WhatsApp | WhatsApp | WHATSAPP_INBOX-F11 |
| Nombre en la venta; nombre, NIF, dirección y país en la factura | Ventas / Facturación | Ventas / Facturación | se conservan: documento fiscal |
| Identificador de la ficha en comandas y bonos | Cocina / Servicios | Cocina / Servicios | Servicios marca sus bonos; Cocina, nada |

Lee de otros: el país del negocio (ajustes del hub, para el teléfono) y las ventas completadas,
anuladas y los pedidos enlazados que anuncia Ventas. Escribe en otros: nada; cada módulo re-apunta o
borra lo suyo al oír los avisos de Clientes.

## Reglas que no se rompen

Solo lo que el código hace cumplir.

- **Aislamiento**: toda lectura y escritura va por negocio; una ficha, un grupo o un campo de otro
  negocio no existe («Ese cliente no está disponible en este negocio.»).
- **Permisos**, los aplica el servidor aunque la pantalla enseñe el botón: ver, dar de alta, añadir
  notas y asignar el cliente a la venta, cualquier perfil; editar la ficha, sus grupos y su
  consentimiento, administrador, responsable y cajero; unir fichas y gestionar grupos, etiquetas y
  campos, administrador y responsable; eliminar fichas, grupos y etiquetas y borrar datos
  personales, solo administrador. Lo que tiene el responsable, otro perfil lo puede hacer con la
  aprobación (PIN) de un responsable; lo que es solo del administrador, no. (Exportar no está en
  esta regla: solo esconde el botón, F09.)
- **Para crear basta el nombre.** Ninguna otra cosa se exige al dar de alta.
- **El teléfono se guarda en formato internacional o no se guarda**: toda escritura de la ficha lo
  normaliza, y uno que no es un número válido de su país rechaza el guardado (F11).
- **El consentimiento no se pone editando, creando ni importando.** Solo con su acción propia, que
  exige la frase mostrada; cada decisión es un hecho nuevo que ninguna orden de consentimiento
  edita ni borra (al unir fichas pasa a la superviviente; al borrar los datos se vacían su
  dirección, prueba y motivo y se oculta); quién lo apuntó sale de la sesión; el estado «Marcado
  antes de que hubiera registro» no lo puede escribir nadie.
- **Una venta cuenta una sola vez y una anulación resta una sola vez**; una venta sin cliente no toca ninguna ficha.
- **Un pedido tiene como mucho un cliente.**
- **Unir fichas es todo o nada**: las dos del mismo negocio, vivas y distintas, o no cambia nada; no se puede deshacer.
- **Borrar datos personales no se puede deshacer**; repetirlo no cambia los datos (pero vuelve a avisar), y conserva el historial de compras y los pedidos.
- **Eliminar o borrar datos con un identificador que no es de este negocio falla** y no avisa a nadie; sobre una ficha ya eliminada o absorbida, las dos órdenes funcionan y vuelven a avisar. **Unir exige dos fichas vivas.**
- **La edición de la ficha se guarda entera o nada**: un campo propio obligatorio vacío o de tipo incorrecto la rechaza (el alta no los mira).
- **Un nombre por negocio** entre los grupos, las etiquetas y los campos vivos y activos, sin distinguir mayúsculas ni espacios.
- **El dinero va en céntimos**; el filtro «Gastado» se escribe en euros.
- **Buscar por teléfono nunca devuelve a todos**: un número vacío o de menos de 7 cifras no casa con nadie.
- **Clientes no depende de ningún módulo**: se instala solo.

## Lo que NO hace, a propósito

- No envía nada (ni campañas, ni recordatorios, ni mensajes): guarda el consentimiento para que lo consulte quien envíe.
- No aplica descuentos por grupo: un grupo dice quién es el cliente, no lo que paga (customers#17).
- No lleva puntos de fidelidad ni saldo; los bonos son de Servicios.
- No guarda ni cambia facturas: la venta lleva una copia fiscal congelada.
- No tiene pantalla de ajustes ni widgets de escritorio.
- No entrega a la persona una copia de sus datos (acceso, portabilidad): fuera del MVP (customers#11).
- No relaciona personas con su empresa ni guarda varias direcciones por ficha.
- No tiene segmentos dinámicos por reglas.

## Dudas abiertas

Se resuelven con `market-decision`; no las decide el worker. (La del teléfono en E.164 se resolvió en
customers#121: país del negocio para el número sin prefijo, como libphonenumber y los TPV de
referencia; fichas existentes reescritas por una tarea programada; reglas con los metadatos de
libphonenumber dentro del módulo, y WhatsApp sigue con su copia, ver «Cobertura».)

1. **Aviso de duplicado al crear (F12).** customers#12 lo dejó fuera del MVP el 06/08; desde
   entonces la fusión entró como P1 (customers#86, 23/09) y pm#621 mide fichas repetidas por
   teléfono. ¿Vuelve como aviso que no bloquea?
2. **Inventario único de datos personales (F16).** ¿Contrato del hub —cada módulo declara qué guarda
   de una persona y responde a un único aviso— o cada módulo escucha el aviso por su cuenta, como hoy?
3. **Eliminar frente a borrar datos (F07, F16).** La orden ya borra los datos de una ficha eliminada
   o absorbida; lo que falta es la pantalla: ¿eliminar debe ofrecer también borrar los datos, y
   dónde se ofrece el borrado de una ficha eliminada o absorbida?
4. **Devoluciones (F22).** ¿«Gastado» neto de devoluciones, como hacen Shopify y Square?
5. **Perfiles.** El Cajero puede editar fichas y registrar consentimientos y el Empleado no. ¿Es lo buscado?
6. **Etapas por tiempo.** «En riesgo», «Inactivo» y «Perdido» no los pone nadie: ¿tarea programada o fuera de la lista?
7. **Datos de salud (F29, L-10).** ¿Marca de campo sensible con consentimiento explícito?
8. **Minimización de datos (F30).** Servicios pide la ficha entera de cada titular de un bono (con NIF, dirección, notas y cumpleaños) solo para pintar su nombre. ¿Una lectura que devuelva solo el nombre?

## Fuentes contrastadas

Contra `origin/main` v2.3.67 del módulo, `origin/main` de los módulos vecinos y `origin/develop`
del hub (05/10/2026). Manda el código; lo de abajo está desfasado o lo contradice.

- `docs/screens.md` («Create a customer»): «Use the quick-add on the list» — la lista no tiene alta rápida; está en el buscador del TPV (F18).
- `docs/screens.md` («Fields»), `docs/concepts.md` y `README.md`: los valores de los campos propios «no tienen pantalla» — se editan en la ficha desde customers#13 (F04).
- `docs/concepts.md` («Bulk creation… only through the API. There is no import screen») y `README.md`: sí hay **Importar CSV** en la lista (F08).
- `docs/screens.md` («Dashboard widgets») y `architecture/modules/customers.md` (§Widgets): tres widgets de escritorio — `module.json` no declara ninguno.
- `docs/overview.md`, `README.md` y `architecture/modules/customers.md`: lista de avisos que emite sin `customer.anonymized` ni los de consentimiento, y «no hay consumidores declarados» — la unión de fichas la escuchan WhatsApp, Servicios, Citas, Reservas, Ventas, Cocina y Reservas online (F13); el borrado de datos personales, solo WhatsApp, Servicios y el hub (F16).
- `docs/limits.md` («Nothing depends on Customers»): Citas, Reservas, Reservas online y la Bandeja de WhatsApp lo declaran como dependencia.
- `docs/limits.md` («The timeline records notes and activities, not sales»): cada compra y anulación deja entrada en la Actividad (F20, F21).
- `docs/limits.md` (roles): el responsable «todo menos los tres borrados y los ajustes» — tampoco puede borrar datos personales.
- `docs/screens.md` (consentimiento), y la frase de la pantalla «junto a tu nombre y la hora»: se guarda el identificador del empleado y el historial lo enseña tal cual, no su nombre (F14).
- `architecture/modules/customers.md`: `customers.orders.link` con permiso `change_customer` — el permiso es `customers.link_order` desde customers#59; filtros de lista «eq» que en el manifest son «contiene»; «`sales` no emite hoy `sale.refunded`» — sí lo emite (Ventas v2.16.154) y Clientes no lo escucha (F22).
- `hand-book/modulos/customers.md`: la etapa inicial se llama «Contacto» en pantalla, no «Potencial»; «En Clientes, use el alta rápida» (no existe en la lista); confirmar con **Registrar consentimiento** (el que confirma es **Ha dicho que sí**); no menciona unir fichas, importar ni exportar.
- `module.json`: declara el permiso `customers.manage_settings`, pero no hay bloque de ajustes ni pantalla que lo use.
- `queries/list.sql` (comentario): «más recientes primero» — la lista sale por nombre.
- `locales/es.json` (`ui.noTagsDefined`): «No hay etiquetas definidos.» (concordancia).
- `locales/es.json` (`errors.customers.field_*`): la frase española lleva dentro el detalle del servidor, que está en inglés («Falta un campo obligatorio: `Alergias` is required.», F04).
- `locales/es.json` (`ui.errLinkOrder`): «no aparecerá en su historial» — lo que se pierde es el enlace al pedido, que no sale en ninguna pantalla; la compra sí se suma al cobrar (F19, F20).
- `locales/es.json` (`ui.deleteGroupConfirm`, `ui.deleteTagConfirm`): «Los clientes asignados pierden el grupo / la etiqueta» — la pertenencia se queda guardada, y es lo que impide después guardar los grupos o etiquetas de esas fichas (F06, F27, F28).
- `locales/es.json` (`ui.mergeConfirm`): nombra citas, ventas, reservas, conversaciones y bonos; también pasan comandas y reservas online (F13).
- QA `WA-06` («hoy solo borrado lógico → FAIL citando whatsapp_inbox#262»): borrar datos personales existe y WhatsApp vacía las conversaciones unidas a la ficha (F16).
- QA `L-10` («datos de salud solo con consentimiento explícito o no se guardan»): un campo propio puede guardar alergias o embarazo sin ningún consentimiento (F29).
- Oleada 2 (Automatizaciones y Servicios, 05/10/2026): F01 decía que una ficha nueva puede arrancar una automatización con «plantilla de nota de bienvenida»; la tarjeta de bienvenida de Automatizaciones espera un día y crea una **tarea**, y la que escribe una nota en la ficha es la de visitas grandes, que arranca con la venta cobrada (F01, F05, FLOWS-F04). La lectura de la ficha por identificador que usan Citas y Servicios no tenía flujo: ahora es F30.
