# WORKFLOW — Clientes · Las fichas

Prefijo: CUSTOMERS

> Detalle de los flujos del directorio de fichas. Las pantallas que nombra `Pantalla:` están
> descritas en el índice, [`../WORKFLOW.md`](../WORKFLOW.md) («Pantallas»). Escrito contra
> `origin/main` v2.3.67 (05/10/2026).

## Flujos

### CUSTOMERS-F01 Dar de alta una ficha desde Clientes
Estado: parcial — un email mal formado se guarda igual: ni la pantalla ni el hub lo comprueban
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Clientes
Pasos:
1. En **Clientes** pulsa **Añadir**: se abre el panel lateral del alta.
2. A la vista: «Nombre», «Teléfono», «Email», «NIF/CIF» y «Empresa». Detrás de «Más datos» (plegado):
   «Dirección», «Ciudad», «Código postal», «País» (lista con buscador «Busca un país…»), «Cumpleaños»,
   «Aniversario», «Origen» (de fábrica «En el local»), «Etapa» (de fábrica «Contacto»), «Canal
   preferido» (de fábrica «Ninguno») y «Notas internas».
3. Solo el nombre es obligatorio: hasta que no lo hay, **Guardar** no se puede pulsar.
4. Pulsa **Guardar**: el panel se cierra y la ficha aparece en la lista; las cifras de arriba se recalculan.
Entra: lo que se teclea. El país se guarda como su código de dos letras (`ES`, `FR`). El teléfono,
el email y el NIF se guardan tal como se escriben, sin quitarles nada salvo los espacios de los
extremos (ver F11).
Sale: la ficha nueva, sin consentimiento de ningún tipo (no hay casilla, F14), y el aviso de ficha
creada (`customer.created`, con todos los datos tecleados). WhatsApp lo escucha para unir a la
ficha las conversaciones que ya tenía ese número.
Si falla: el motivo sale dentro del propio panel, encima del botón, y lo tecleado se conserva. Un
email mal formado NO falla: se guarda (el esquema declara el formato, pero el hub no lo aplica en
ese tipo de esquema y la pantalla no lo mira; solo la importación lo rechaza, F08). Los campos
personalizados no salen en el alta, así que los obligatorios no se piden aquí (F29). Nada avisa de
que ya existe otra ficha con el mismo teléfono, email o NIF (F12).
Implicados: pendiente
Pendiente de enlazar: whatsapp_inbox — WHATSAPP_INBOX-F04 une la conversación a la ficha recién creada (aviso de ficha creada)
Pendiente de enlazar: flows — una automatización puede dispararse con una ficha nueva (plantilla de nota de bienvenida)
QA: B-02

### CUSTOMERS-F02 Buscar y filtrar fichas
Estado: parcial — el buscador compara el teléfono como texto: «600111222» no encuentra una ficha guardada como «600 111 222» ni «+34 600-111-222»
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Clientes
Pasos:
1. En **Clientes**, escribe en el buscador («Buscar nombre o email…»). Busca a la vez en nombre,
   email, teléfono, NIF y empresa, sin distinguir mayúsculas ni acentos («garcia» encuentra «García»).
2. Con **Filtros**: nombre, email y teléfono por «contiene», etapa con lista y gastado por rango
   «Desde / Hasta», escrito en euros. (El servidor admite más filtros —NIF, empresa, origen, activo,
   compras, última compra— que la pantalla no ofrece.)
3. Ordena por cualquiera de las cinco columnas (Nombre, Email, Teléfono, Etapa, Gastado). De
   fábrica, por nombre de la A a la Z, 50 por página.
4. Toca una fila (o **Ver**) para abrir su ficha (F03).
Entra: el texto y los filtros.
Sale: nada; solo lectura. Las fichas eliminadas (F07) y las absorbidas en una fusión (F13) no salen;
las marcadas como no activas, sí.
Si falla: la tabla enseña el error con **Reintentar**. Sin resultados: «Sin clientes.».
Implicados: ninguno
QA: ninguno

### CUSTOMERS-F03 Abrir la ficha de un cliente
Estado: parcial — «Última compra» sale como fecha técnica sin formatear (año-mes-día, hora con nanosegundos y zona), a diferencia de la Actividad; y la vista de lectura no enseña notas internas, cumpleaños, aniversario ni campos personalizados, que solo aparecen al pulsar Editar (quien no puede editar no los ve nunca)
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. Desde **Clientes**, toca la fila o **Ver**.
2. La ficha enseña, de arriba abajo: el nombre y los botones que permite el perfil; los datos
   (Email, Teléfono, NIF/CIF, Empresa, Dirección en una línea con el nombre del país, Etapa,
   Origen, Canal preferido, Compras, Gastado, Última compra, Activo; las notas internas, cumpleaños,
   aniversario y campos personalizados no están aquí: solo se ven en **Editar**); Grupos y Etiquetas; el panel
   «Consentimiento de marketing»; «Añadir nota» y «Actividad» (las 100 entradas más recientes);
   y, si hay módulos que cuelgan algo de la ficha, su bloque al final (Citas pone el historial de
   visitas, F24).
3. **← Volver** regresa a la lista.
Entra: la ficha y, en paralelo, su actividad, sus grupos y etiquetas, sus campos personalizados y su consentimiento.
Sale: nada; solo lectura.
Si falla: «Cliente no encontrado» si ya no existe; si no carga, el motivo que da el servidor (o «No
se pudo cargar el cliente» si no da ninguno). Si uno de los
bloques secundarios no carga, sale vacío sin aviso (actividad, campos, grupos, consentimiento).
Abrir otra ficha antes de que acabe de cargar la anterior no mezcla los datos de las dos.
Implicados: pendiente
Pendiente de enlazar: appointments — APPOINTMENTS-F20 pinta el historial de visitas dentro de la ficha
QA: B-03

### CUSTOMERS-F04 Editar la ficha y sus campos personalizados
Estado: parcial — un email mal formado se guarda igual: ni la pantalla ni el hub lo comprueban
Vertical: comun
Actor: administrador, responsable, cajero
Pantalla: Ficha de cliente
Pasos:
1. En la ficha pulsa **Editar**: los datos pasan a ser un formulario con los mismos campos del alta,
   los «Campos personalizados» del negocio (cada uno con su forma: texto, número, fecha, sí/no,
   lista o texto largo; los obligatorios llevan `*`) y la casilla «Activo».
2. Cambia lo que haga falta. Vaciar un campo también es un cambio.
3. Pulsa **Guardar**. Sale «Cliente actualizado» y la ficha se relee.
Entra: la ficha entera y el valor de cada campo personalizado.
Sale: la ficha y sus campos guardados en una sola escritura, y el aviso de ficha actualizada
(`customer.updated`). WhatsApp lo escucha para unir conversaciones de un teléfono recién corregido.
El consentimiento queda anotado con la dirección para la que se dio: si se cambia el teléfono o el
email, el panel sigue diciendo «Dado» con la dirección antigua al lado (F14).
Si falla: un campo obligatorio vacío o un valor que no encaja con su tipo rechaza TODO el guardado
(nada queda a medias) y el motivo sale arriba de la ficha. La casilla «Activo» desmarcada solo
cambia la cifra «Activos» de la lista: la ficha sigue saliendo en búsquedas, en el TPV y en WhatsApp.
El empleado no ve **Editar**; el perfil Cajero sí puede editar. Un email mal formado no falla: se guarda.
Implicados: pendiente
Pendiente de enlazar: whatsapp_inbox — WHATSAPP_INBOX-F04 une la conversación cuando se corrige el teléfono de la ficha (aviso de ficha actualizada)
QA: L-10

### CUSTOMERS-F05 Añadir una nota a la ficha
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. En la ficha, en «Añadir nota», escribe en «Nota».
2. Pulsa **Añadir**. Sale «Nota añadida» y la nota aparece arriba de la «Actividad» como «Nota añadida · Nota».
Entra: el texto.
Sale: la nota y su entrada en la actividad, juntas o ninguna. Las notas no se editan ni se borran desde la pantalla.
Si falla: «No se pudo añadir la nota» o «Ese cliente no está disponible en este negocio.» si la ficha ya no existe.
Implicados: pendiente
Pendiente de enlazar: flows — una automatización puede añadir notas a una ficha (la nota sale igual en la Actividad)
QA: ninguno

### CUSTOMERS-F06 Poner grupos y etiquetas a una ficha
Estado: parcial — si la ficha estaba en un grupo o una etiqueta que después se eliminó, guardar falla con «Ese grupo no está disponible…» y no hay forma de quitarlo desde la pantalla (comprobado en el código: eliminar un grupo o una etiqueta no quita su pertenencia, y la ficha la reenvía sin pintarla)
Vertical: comun
Actor: administrador, responsable, cajero
Pantalla: Ficha de cliente
Pasos:
1. En la ficha, en «Grupos», marca o desmarca las casillas de los grupos activos.
2. Pulsa **Guardar grupos**. Sale «Grupos asignados».
3. Igual con «Etiquetas» y **Guardar etiquetas** («Etiquetas asignadas»).
Entra: la selección completa de grupos o de etiquetas.
Sale: la selección guardada SUSTITUYE a la anterior (no se añade). El recuento «Clientes» de la lista de Grupos se actualiza.
Si falla: «No se pudo guardar la asignación» o el motivo del servidor. Sin grupos o etiquetas
creados: «No hay grupos definidos.» / «No hay etiquetas definidos.». Quien no puede editar ve las
casillas sin poder tocarlas.
Implicados: ninguno
QA: ninguno

### CUSTOMERS-F07 Eliminar una ficha
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Ficha de cliente
Pasos:
1. En la ficha pulsa **Eliminar** (o, en la lista, la acción **Eliminar** de la fila).
2. Un diálogo pregunta «Eliminar cliente» — «¿Eliminar {nombre}? La ficha deja de estar disponible
   (borrado lógico).» con **Cancelar** y **Eliminar**.
3. Al confirmar, la ficha se cierra, sale «Cliente {nombre} eliminado» y desaparece de la lista, del
   TPV y de la búsqueda por teléfono.
Entra: la ficha.
Sale: la ficha marcada como eliminada CONSERVANDO todos sus datos personales, su actividad, notas,
grupos y consentimientos; y el aviso de ficha eliminada (`customer.deleted`). Lo escucha Servicios
para marcar los bonos de esa ficha. WhatsApp, Citas y Reservas no hacen nada. No es el borrado de
datos personales: eso es F16. Una ficha ya eliminada no se puede abrir, así que no hay botón para
borrarle los datos; la orden sí lo admite por el asistente o la API.
Si falla: el motivo sale en la página; un identificador que no es de este negocio da «Ese cliente no
está disponible en este negocio.» y no avisa a nadie. Sobre una ficha ya eliminada, absorbida o con
los datos borrados (solo alcanzable por el asistente o la API, la pantalla ya no la enseña) NO falla:
responde bien y vuelve a emitir el aviso de ficha eliminada (Servicios lo ignora: ya la había marcado).
Implicados: pendiente
Pendiente de enlazar: services — marca los bonos de una ficha eliminada para que no se pierdan de vista
QA: L-10

### CUSTOMERS-F08 Importar fichas desde un CSV
Estado: parcial — no emite el aviso de ficha creada: las conversaciones de WhatsApp que ya existían no se unen a la ficha importada hasta que esa persona vuelve a escribir (el repaso de cada 15 minutos solo mira una vez cada conversación); no detecta duplicados (repetir el fichero duplica las fichas) y guarda los teléfonos tal como vienen
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Clientes
Pasos:
1. En **Clientes** pulsa **Importar CSV** y elige el fichero.
2. Cabeceras que entiende: `name`/«Nombre», `email`/«Email»/«correo», `phone`/«Teléfono»/«tel»,
   `tax_id`/«NIF»/«CIF», `company_name`/«Empresa», `address`/«Dirección», `city`/«Ciudad»,
   `postal_code`/«CP»/«Código postal», `country`/«País», `lifecycle_stage`, `notes`/«Notas».
3. Mientras trabaja sale «Importando…». Al acabar, un resumen «Importación: {total} filas — {creadas}
   creadas, {omitidas} omitidas, {fallidas} fallidas.» con la lista de filas omitidas y su motivo
   («falta el nombre», «el email no es válido»), las que tienen algo que revisar («país no
   reconocido — importado tal cual, revísalo en la ficha») y los bloques que fallaron. **Cerrar** lo quita.
Entra: el fichero. Va al servidor en bloques de 50 filas.
Sale: las fichas creadas, con origen «Importación» y sin consentimiento (aunque el fichero traiga una
columna de consentimiento). No se emite ningún aviso de ficha creada.
Si falla: un bloque rechazado se cuenta con su rango de filas y su motivo, y los siguientes siguen.
Un corte a mitad deja creadas las filas de los bloques ya enviados: volver a importar el fichero las duplica.
Implicados: ninguno
QA: ninguno

### CUSTOMERS-F09 Exportar la lista de fichas
Estado: parcial — exporta solo la página que está en pantalla (50 por defecto, hasta 100 si se cambia el tamaño de página) y cinco columnas (nombre, email, teléfono, etapa en código y gastado en céntimos), no el directorio; y el permiso de exportar solo esconde el botón: nada en el servidor lo exige, quien puede ver clientes puede leer el directorio entero por la API
Vertical: comun
Actor: administrador, responsable
Pantalla: Clientes
Pasos:
1. En **Clientes**, con la búsqueda y los filtros que se quieran, pulsa **Exportar CSV**.
2. El navegador descarga `customers.csv`.
Entra: la página visible de la tabla.
Sale: un fichero con las cabeceras técnicas (`name`, `email`, `phone`, `lifecycle_stage`, `total_spent`).
Si falla: no llama al servidor: escribe lo que ya está en pantalla; sin filas, sale un fichero solo con las cabeceras.
Implicados: ninguno
QA: ninguno
