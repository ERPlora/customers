# WORKFLOW — Clientes · Identidad y privacidad

Prefijo: CUSTOMERS

> Detalle de los flujos que deciden quién es quién (teléfono, duplicados, fusión) y qué se hace con
> sus datos (consentimiento, borrado). Las pantallas están en el índice,
> [`../WORKFLOW.md`](../WORKFLOW.md). Las dos familias de huecos medidas en ERPlora/pm#621
> (teléfonos y borrado de datos) se cierran en la «Cobertura contra la referencia» del índice.
> Escrito contra `origin/main` v2.3.67 (05/10/2026).

## Flujos

### CUSTOMERS-F10 Reconocer a una persona por su número de teléfono
Estado: parcial — las fichas ya guardan el teléfono en E.164 (F11), pero la búsqueda por número sigue comparando con su propia regla escrita a mano (una tabla de prefijos copiada en la Bandeja de WhatsApp), no con la del alta: no entiende el «(0)» de un número internacional que llegue a preguntar, y una ficha antigua que la tarea de F11 no pudo leer se sigue comparando como texto tecleado
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Otro módulo (WhatsApp, o su respuesta automática) pregunta qué fichas llevan un número; nadie lo hace a mano.
2. Los dos lados se reducen a cifras (fuera espacios, guiones, puntos, paréntesis y el `+`) y se les
   quitan los ceros iniciales (el `00` internacional y el `0` nacional de, por ejemplo, Reino Unido).
3. Casan si quedan iguales, o si uno es el otro con el prefijo del país DEL NEGOCIO delante. En un
   negocio de España, `600 111 222`, `+34 600-111-222`, `0034600111222` y `34600111222` son la misma.
4. En Italia, San Marino, Vaticano y otros seis países que conservan el `0` tras el prefijo, el lado
   sin prefijo se compara con su `0` (`06 1234567` es `+39 06 1234567`).
5. Los mismos dígitos detrás del prefijo de otro país son otra persona: un `+33 600 111 222` no es
   la ficha `600 111 222` de un salón español.
Entra: el número tal como llegue, y el país del negocio (ajustes del hub; si nunca se guardaron, España).
Sale: las fichas que casan (nombre, email, teléfono), ordenadas por nombre. Si son dos o más, decide
quien pregunta: WhatsApp no une la conversación a ninguna.
Si falla: un número vacío, o con menos de 7 cifras en cualquiera de los dos lados, no casa con nadie
(nunca devuelve la lista entera). Un país sin prefijo conocido solo casa el número exacto. Las fichas
eliminadas o absorbidas no salen; las no activas, sí. Una ficha extranjera guardada sin su prefijo
nunca casa con el número que da WhatsApp, y en cambio casa con quien escriba desde esas mismas
cifras en el país del negocio, que es otra persona (una ficha francesa `612 345 678` en un salón
español casa con `+34 612 345 678`).
Implicados: RESERVATIONS-F17, WHATSAPP_INBOX-F04, WHATSAPP_INBOX-F21, WHATSAPP_INBOX-F24, REC_WA_CITA-F03, REC_WA_MESA-F03
QA: W-02

### CUSTOMERS-F11 Guardar el teléfono en formato internacional (E.164)
Estado: parcial — la ficha enseña el número tal como se guarda, todo junto, y no con el formato de su país (customers#127); y el buscador de la tabla de Clientes no encuentra un teléfono tecleado con espacios (customers#126)
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. Al dar de alta o editar una ficha (F01, F04), en el alta rápida del TPV (F18), al importar (F08)
   o cuando la crea la respuesta de WhatsApp (F26), la persona escribe el teléfono como lo tenga
   (`600 111 222`, `0034 600-111-222`, `+44 (0)7700 900123`).
2. Al guardar, el número se lee con las reglas de libphonenumber (sus metadatos de cada país, dentro
   del módulo): con el prefijo que lleve (`+` o el `00` que se marca desde el país del negocio) o, si
   no lleva, en el país del negocio (ajustes del hub; España si nunca se guardó), nunca en el «País»
   de la ficha. Se quitan espacios, guiones, puntos, barras, paréntesis y el cero nacional, y se
   guarda en E.164 (`+34600111222`). Vaciar el teléfono está permitido: solo el nombre es obligatorio.
3. La ficha y la tabla lo enseñan tal como se guarda (`+34600111222`).
4. Un número que no es posible para su país (`600111` en España), con letras (una extensión) o con
   dos números en el mismo campo se rechaza con el motivo y no se guarda nada.
5. Las fichas que ya existían las reescribe sola una tarea programada (cada 15 minutos; la primera
   pasada tras actualizar hace el trabajo y las siguientes no encuentran nada): con las mismas reglas
   y el mismo país, guardando aparte el texto viejo de cada ficha que cambia. Un número que no sabe
   leer se queda como estaba, y la ficha pedirá uno válido la próxima vez que se edite.
6. Reconocer por número (F10) compara con la ficha ya normalizada. Los buscadores del TPV (F18) y de
   fusionar fichas (F13) mandan un teléfono tecleado como sus cifras, que el número guardado contiene;
   el de la tabla de Clientes (F02) aún no.
Entra: el teléfono tecleado y el país del negocio.
Sale: el teléfono en E.164 en la ficha y en los avisos de ficha creada o actualizada; por cada ficha
reescrita por la tarea, una copia de su texto anterior (se borra con los datos personales, F16, y
deshacer la actualización del módulo devuelve los textos). Quien lo copia lo copia ya normalizado:
Citas guarda en la cita el teléfono de la ficha al reservar (APPOINTMENTS-F01) y el aviso de cita
confirmada de WhatsApp busca la conversación, que ya guarda su número en E.164, con esa copia, así
que una ficha escrita con espacios o guiones ya no deja a la clienta sin aviso. Lo que no depende de
Clientes sigue abierto en whatsapp_inbox#279: el aviso busca la conversación por «contiene», así que
el teléfono de una cita tecleado a mano o una ficha antigua incompleta pueden dar con otra persona.
La Bandeja de WhatsApp compara además con su propia copia de la tabla de prefijos (WHATSAPP_INBOX-F04).
Reservas no lee el teléfono de la ficha: guarda el que se teclea o el número de WhatsApp.
Si falla: «No es un teléfono válido de su país: revisa las cifras o escríbelo con su prefijo
internacional (+44…).» en el formulario (o en el alta rápida del TPV), y lo tecleado se conserva. En la
importación, la fila se omite con «el teléfono no es válido — escríbelo con su prefijo internacional
(+44…)» y las demás se crean. Por el asistente o la API, el código `customers.phone_invalid`.
Implicados: APPOINTMENTS-F01, WHATSAPP_INBOX-F04, WHATSAPP_INBOX-F23, REC_WA_CITA-F07
QA: ninguno

### CUSTOMERS-F12 Evitar fichas duplicadas de la misma persona
Estado: parcial — solo dos caminos miran antes de crear: el alta rápida del TPV y la respuesta de WhatsApp de citas, los dos por número (F10). El alta desde Clientes y la importación no avisan de nada
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Clientes
Pasos:
1. Antes de crear, la persona busca por nombre, teléfono, email o NIF (F02); nada se lo pide.
2. En el TPV, si el teléfono del alta rápida es, como número, el de una ficha viva del negocio (F10),
   se elige esa ficha en vez de crear otra.
3. Por WhatsApp, la respuesta de citas solo crea ficha si la búsqueda por número no encuentra a nadie.
4. Si ya hay dos fichas de la misma persona, se juntan con F13.
Entra: lo que se teclea.
Sale: nada propio; ninguna regla del servidor impide dos fichas con el mismo teléfono, email o NIF.
Si falla: la ficha duplicada se crea sin aviso.
Implicados: WHATSAPP_INBOX-F21
QA: ninguno

### CUSTOMERS-F13 Unir dos fichas de la misma persona
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Ficha de cliente
Pasos:
1. Abre la ficha que se va a QUEDAR y pulsa **Fusionar con…**.
2. Sale «Fusionar una ficha duplicada» y la frase «Elige la ficha duplicada de {nombre}. Se queda
   {nombre}; la que elijas se fusiona en ella.». Busca en «Buscar la ficha duplicada» (nombre,
   email, teléfono, NIF o empresa; 20 resultados) y toca la duplicada.
3. Lee el aviso: «{absorbida} se fusionará en {superviviente}: sus citas, ventas, reservas,
   conversaciones, bonos, notas y consentimientos pasan a {superviviente}, los datos que falten se
   completan con los suyos y {absorbida} desaparece de la lista. No se puede deshacer.».
4. Pulsa **Fusionar** (o **Elegir otra**, o **Cancelar**). Sale «{nombre} se ha fusionado en esta
   ficha.» y la ficha se relee con lo que ha ganado.
Entra: las dos fichas, del mismo negocio, vivas y distintas.
Sale: la que se queda conserva sus datos y solo rellena sus campos VACÍOS con los de la otra; las
notas internas se juntan una detrás de otra; compras y gastado se suman y la última compra es la
más reciente. Pasan a ella las notas, la actividad, los campos personalizados que no tenía, los
grupos y etiquetas (unidos), el historial de compras, los pedidos enlazados y todos los
consentimientos (que conservan la dirección para la que se dieron). Nombre, etapa, origen y
«Activo» son los suyos. En su actividad queda «Ficha duplicada fusionada en esta · Fusión». La
absorbida queda retirada, con totales a cero, pero CONSERVA sus datos personales y los valores de
campo que chocaban: ninguna pantalla deja borrarlos, aunque la orden de borrar datos sí los acepta
por el asistente o la API con su identificador, que queda en la actividad de la superviviente (F16). El aviso de fichas unidas (`customer.merged`) hace que Citas, Ventas,
Reservas, WhatsApp, Servicios (bonos), Cocina y Reservas online re-apunten sus propias filas.
Si falla: «No se pudieron fusionar las fichas.», o «Ese cliente no está disponible en este negocio.»
si una de las dos ya no existe o es la misma; el panel queda abierto para elegir otra. Si la
búsqueda falla: «No se pudieron buscar las fichas. Vuelve a intentarlo.» con **Reintentar**.
Implicados: APPOINTMENTS-F23, KITCHEN-F30, RESERVATIONS-F21, SALES-F33, SERVICES-F28, WHATSAPP_INBOX-F12, ONLINE_BOOKING-F09
QA: ninguno

### CUSTOMERS-F14 Registrar que un cliente da su consentimiento para un canal
Estado: parcial — «Teléfono» y «Correo postal» solo se registran con el asistente o la API; en el historial, quién lo apuntó sale como identificador interno, no como nombre; y ningún módulo que escribe a clientes consulta todavía este consentimiento
Vertical: comun
Actor: administrador, responsable, cajero
Pantalla: Ficha de cliente
Pasos:
1. En la ficha, panel «Consentimiento de marketing»: una línea para Email, WhatsApp y SMS (y otra
   por cada canal que ya tenga algo apuntado), con su estado: «Nunca se le ha preguntado», «Dado»,
   «Retirado» o «Marcado antes de que hubiera registro — no sirve como prueba. Vuelve a preguntar.»,
   y la fecha y la dirección si las hay.
2. En el canal, pulsa **Registrar consentimiento**. Sale la frase «Quiero recibir ofertas y novedades
   de este negocio por este canal. Puedo darme de baja cuando quiera.» y la indicación «Léelo en voz
   alta y pulsa solo si dice que sí. Esta frase exacta es la que queda guardada como prueba, junto a
   tu nombre y la hora.».
3. Si el cliente dice que sí, pulsa **Ha dicho que sí** (o **Cancelar**).
4. Sale «Consentimiento registrado.»; la línea pasa a «Dado» y el hecho aparece arriba de «Todo lo que se decidió».
Entra: el canal, la dirección actual de la ficha para ese canal (el email, o el teléfono para
WhatsApp y SMS; vacía si no la hay), la frase exacta y su versión, el origen «en el mostrador» y
quién lo apunta (de la sesión, no se teclea).
Sale: un hecho nuevo que nunca se edita ni se borra, la marca «consentimiento de marketing» de la
ficha recalculada, una entrada «Consentimiento dado» en la actividad y el aviso de consentimiento
dado (`customer.consent_granted`), que hoy solo pueden usar las automatizaciones como disparador.
Si falla: «No se ha podido registrar el consentimiento.» o «Ese cliente no está disponible en este
negocio.». Sin permiso de editar (empleado) se ve el estado pero no hay botones.
Implicados: FLOWS-F13
QA: L-10, WA-05

### CUSTOMERS-F15 Retirar el consentimiento de un canal
Estado: hecho
Vertical: comun
Actor: administrador, responsable, cajero
Pantalla: Ficha de cliente
Pasos:
1. En el panel «Consentimiento de marketing», en un canal «Dado», pulsa **Retirar**: un solo toque,
   sin diálogo y sin pedir motivo.
2. En la línea heredada «Canal sin especificar» (la casilla antigua), el botón es **Cerrarlo**.
3. Sale «Consentimiento retirado. Está en vigor desde ya.» y la línea pasa a «Retirado».
Entra: el canal y la dirección actual.
Sale: un hecho nuevo (el «Dado» anterior se conserva: es la prueba del tiempo en que sí se podía
escribir), la marca de la ficha recalculada, «Consentimiento retirado» en la actividad y el aviso
de consentimiento retirado (`customer.consent_withdrawn`). Volver a darlo después es otro hecho.
Si falla: como F14.
Implicados: FLOWS-F13
QA: L-10, WA-05

### CUSTOMERS-F16 Borrar los datos personales de un cliente (RGPD)
Estado: parcial — la pantalla solo ofrece el borrado en una ficha viva: una ficha eliminada (F07) o absorbida (F13) conserva sus datos y no hay botón para borrarlos, aunque la orden sí los acepta (asistente o API, con su identificador); y de los módulos que guardan copias, Citas, Reservas y Reservas online no escuchan el aviso
Vertical: comun
Actor: administrador
Pantalla: Ficha de cliente
Pasos:
1. En la ficha pulsa **Borrar datos personales**.
2. Sale «Borrar datos personales (RGPD)» con el texto «Sustituye los datos personales de {nombre} por
   marcadores, vacía sus notas, historial y campos personalizados, y no se puede deshacer. Las
   ventas y facturas conservan su referencia. Queda una entrada de auditoría con quién, cuándo y
   por qué.» y el campo «Motivo (queda en la auditoría)».
3. Pulsa **Borrar datos personales** (o **Cancelar**). La ficha se cierra y sale «Datos personales borrados.».
Entra: la ficha y el motivo (opcional, hasta 500 caracteres).
Sale: en Clientes, la ficha se queda con su identificador, el nombre cambiado por el marcador fijo
`Deleted customer` y sin contacto,
NIF, dirección, fechas, notas internas, canal ni consentimiento, y desaparece de todas las listas;
notas, actividad, valores de campos y consentimientos se vacían y se ocultan; grupos y etiquetas se
quitan. Se conservan en la ficha el origen, la etapa, las compras, el gastado, la última compra, la
fecha de alta y quién la creó; y aparte, el historial de compras y los pedidos enlazados (prueba
comercial y fiscal) y una única entrada de auditoría visible (quién, cuándo, el motivo tal como se
escribió, qué se borró y qué se guardó). El aviso de ficha anonimizada (`customer.anonymized`) lo
escuchan WhatsApp (vacía y cierra sus conversaciones, WHATSAPP_INBOX-F11), Servicios (marca sus bonos) y el propio hub,
que vacía en su historial los avisos ya entregados o descartados y las automatizaciones terminadas
que nombraban a esa ficha; los avisos pendientes o atascados y las automatizaciones en curso
conservan los datos hasta que se procesan o los poda la retención. Citas, Reservas y Reservas online
no lo escuchan: el nombre, el teléfono, el correo y las notas copiados en citas y series, reservas y
lista de espera (RESERVATIONS-F22, no hecho) y reservas online se quedan. Ventas y facturas guardan
su copia fiscal a propósito.
Si falla: «No se pudieron borrar los datos personales» o «Ese cliente no está disponible en este
negocio.» si el identificador no es de este negocio. Sobre una ficha ya eliminada, absorbida o
borrada no falla. Repetirlo no cambia los datos ni duplica la auditoría, pero vuelve a emitir el aviso.
Implicados: RESERVATIONS-F22, SERVICES-F29, WHATSAPP_INBOX-F11, HUB-F248, HUB-F249, HUB-F250
Pendiente de enlazar: online_booking — no escucha el aviso: nombre, correo y teléfono se quedan en sus reservas online
QA: L-10, WA-06 (discrepa)
