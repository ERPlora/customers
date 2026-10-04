# WORKFLOW — Clientes · Con el TPV, la agenda y WhatsApp

Prefijo: CUSTOMERS

> Detalle de los flujos en los que Clientes trabaja dentro de la pantalla de otro módulo o reacciona
> a lo que hace otro módulo. Las pantallas están en el índice, [`../WORKFLOW.md`](../WORKFLOW.md).
> Escrito contra `origin/main` v2.3.67 (05/10/2026); Ventas leído en `origin/main` v2.16.154.

## Flujos

### CUSTOMERS-F17 Asignar un cliente a la venta en el TPV
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Buscador de cliente del TPV
Pasos:
1. En la pantalla de venta, el cajero o la camarera toca el botón de cliente («Asignar cliente»). Si
   el negocio exige cliente en cada venta, al cobrar sin cliente el buscador se abre solo.
2. Se abre el buscador («Buscar por nombre, teléfono, email…») con las 20 primeras fichas por nombre;
   al escribir, busca en nombre, email, teléfono, NIF y empresa.
3. Toca la ficha. El buscador se cierra y el botón pasa a enseñar el nombre del cliente.
4. **Quitar cliente** (al pie del buscador) deja la venta sin cliente. Tras cobrar, el TPV lo quita solo.
Entra: la búsqueda y, al elegir, la ficha completa.
Sale: al TPV, el cliente y una COPIA de sus datos fiscales (nombre, NIF, dirección en una línea y
país en código de dos letras). La venta la lleva hasta la factura; cambiar la ficha después no
cambia una factura ya emitida.
Si falla: «No se pudieron cargar los clientes» con **Reintentar** (conserva lo escrito); sin
resultados, «Sin resultados.» o «No hay clientes.»; sin permiso, «No tienes permiso para consultar
clientes.». Si la ficha completa no se puede leer, el cliente NO se asigna y sale «No se pudieron
cargar los datos fiscales de {nombre}. Vuelve a pulsar para reintentar.».
Implicados: pendiente
Pendiente de enlazar: sales — el TPV monta el buscador en su hueco de asignar, adjunta el cliente a la venta y lo quita tras cobrar
Pendiente de enlazar: sales — con «Exigir cliente en cada venta», abre el buscador al cobrar sin cliente
Pendiente de enlazar: invoice — la factura copia nombre, NIF, dirección y país del cliente de la venta
QA: R-09, B-06, BD-09

### CUSTOMERS-F18 Crear un cliente desde el buscador del TPV
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Buscador de cliente del TPV
Pasos:
1. En el buscador del TPV escribe algo que no encuentra.
2. Pulsa **+ Nuevo cliente «{lo escrito}»**. Si lo escrito parece un teléfono, va a «Teléfono»; si no, a «Nombre».
3. Completa «Nombre» (obligatorio) y «Teléfono» y pulsa **Crear y asignar** (o **Cancelar**).
4. La ficha nueva queda asignada a la venta como en F17.
Entra: nombre y teléfono.
Sale: la ficha con origen «En el local», el aviso de ficha creada (`customer.created`) y la venta con cliente.
Si falla: «El nombre es obligatorio.» sin nombre; si el teléfono coincide, quitando espacios, con el
de una ficha de la lista que hay en pantalla, elige esa ficha en vez de crear otra (F12). Otro fallo
sale dentro del formulario y lo tecleado se conserva. Sin permiso de crear no aparece el botón.
Implicados: pendiente
Pendiente de enlazar: sales — el TPV recibe el cliente recién creado como asignado a la venta
QA: B-02

### CUSTOMERS-F19 Enlazar el cliente al pedido abierto
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Con un cliente asignado, el TPV abre o guarda el pedido (la cuenta de la mesa, el carrito).
2. Clientes anota qué cliente tiene ese pedido; reasignar otro cliente al mismo pedido sustituye el
   anterior (un pedido, como mucho un cliente).
Entra: el aviso del TPV de pedido enlazado, con el pedido; el cliente elegido.
Sale: el enlace cliente ↔ pedido, que solo se consulta con el asistente o la API (no hay pantalla).
Si falla: la venta sigue; el TPV enseña «La venta sigue, pero el cliente no se pudo asociar al
pedido: no aparecerá en su historial.» o, sin permiso, «La venta sigue, pero no tienes permiso para
asociar clientes a pedidos: no aparecerá en su historial.».
Implicados: pendiente
Pendiente de enlazar: sales — el TPV avisa de que el pedido existe para que Clientes lo enlace
QA: ninguno

### CUSTOMERS-F20 Sumar la compra a la ficha al cobrar
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Se cobra una venta con cliente.
2. En su ficha suben «Compras» en una y «Gastado» en el total de la venta, «Última compra» pasa a
   ese momento y la «Actividad» gana «Compra registrada · Compra».
3. La etapa avanza sola: «Contacto» o «Prospecto» → «1ª compra»; «1ª compra», «En riesgo» o
   «Inactivo» → «Activo». «Perdido» y «VIP» no se tocan.
Entra: la venta completada, con su cliente y su total en céntimos (`sale.completed`).
Sale: una línea en el historial de compras por venta, las cifras y la etapa de la ficha y la entrada de actividad.
Si falla: una venta sin cliente no hace nada; la misma venta entregada dos veces cuenta una sola
vez; una ficha eliminada no suma. El fallo no se ve en el TPV: el aviso se reintenta en el hub.
Implicados: pendiente
Pendiente de enlazar: sales — la venta cobrada avisa con su cliente y su total
QA: B-03, R-09

### CUSTOMERS-F21 Restar una venta anulada
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Se anula una venta que tenía cliente.
2. En su ficha bajan «Compras» y «Gastado», «Última compra» vuelve a la compra anterior que siga en
   pie, y la «Actividad» gana «Compra anulada · Anulación» con el motivo de la anulación.
3. La etapa retrocede: sin compras, «1ª compra» o «Activo» → «Contacto»; con una, «Activo» → «1ª compra».
Entra: la venta anulada (`sale.voided`).
Sale: la línea del historial de compras marcada como anulada (no se borra), las cifras y la etapa.
Si falla: anular dos veces la misma venta resta una sola vez.
Implicados: pendiente
Pendiente de enlazar: sales — anular una venta avisa con la venta y su motivo
QA: R-11

### CUSTOMERS-F22 Restar una devolución
Estado: no hecho — Ventas avisa de las devoluciones, pero Clientes no lo escucha: «Gastado» y «Compras» no bajan cuando se devuelve todo o parte de una venta
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Se devuelve todo o parte de una venta que tenía cliente.
2. En su ficha, «Gastado» baja en lo devuelto; «Compras» no cambia; la «Actividad» gana una entrada de devolución con el importe.
Entra: la devolución de la venta (`sale.refunded`).
Sale: una línea de devolución en el historial de compras, con importe negativo, y el gastado corregido.
Si falla: la misma devolución entregada dos veces cuenta una sola vez.
Implicados: pendiente
Pendiente de enlazar: sales — la devolución de una venta avisa con su importe
QA: R-11, B-08

### CUSTOMERS-F23 Ver el historial de compras de un cliente
Estado: parcial — la ficha solo da «Compras», «Gastado», «Última compra» y entradas «Compra registrada» sin importe ni enlace a la venta; la lista de compras con importe y estado solo sale por el asistente o la API
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. Abre la ficha (F03).
2. Lee las cifras «Compras», «Gastado» y «Última compra», y en «Actividad» las entradas «Compra registrada» y «Compra anulada» con su fecha.
3. Para ver cada compra con su importe, su estado y la venta de la que viene, hoy hay que pedírselo al asistente.
Entra: el historial de compras de la ficha.
Sale: nada; solo lectura.
Si falla: si la actividad no carga, sale «Sin actividad registrada.» sin aviso de error.
Implicados: pendiente
Pendiente de enlazar: sales — abrir la venta desde la compra de la ficha
QA: B-03

### CUSTOMERS-F24 Ver en la ficha lo que otros módulos saben del cliente
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. Abre la ficha (F03).
2. Al final aparece el bloque que aporta cada módulo instalado que lo ofrece. Hoy solo Citas lo
   hace: «Historial de visitas», con las últimas citas, su servicio, profesional, estado y notas.
3. Sin ningún módulo que aporte bloque, no hay nada al final de la ficha.
Entra: qué cliente está abierto (Clientes se lo dice al bloque; no le pasa más datos).
Sale: nada; solo lectura.
Si falla: cada bloque enseña su propio error (Citas: «No se pudo cargar el historial de visitas.»).
Implicados: pendiente
Pendiente de enlazar: appointments — APPOINTMENTS-F20 pinta el historial de visitas en la ficha
QA: B-03, L-10

### CUSTOMERS-F25 Crear la clienta sin salir de la agenda
Estado: no hecho — al dar una cita solo se elige entre fichas ya creadas (la agenda carga las 500 primeras por nombre); una clienta nueva obliga a ir a Clientes, crearla y volver
Vertical: peluqueria
Actor: administrador, responsable, empleado
Pantalla: Citas: Agenda
Pasos:
1. En **Añadir cita**, en «Cliente», la recepcionista escribe un nombre o un teléfono que no está.
2. La lista ofrece crear la clienta con nombre y teléfono, como el alta rápida del TPV (F18).
3. Al crearla queda elegida en la cita y se sigue reservando.
Entra: nombre y teléfono.
Sale: la ficha nueva (origen «En el local») y la cita con ella.
Si falla: el motivo sale en el panel de la cita sin perder lo ya elegido.
Implicados: pendiente
Pendiente de enlazar: appointments — APPOINTMENTS-F01 elegir la clienta de la lista de fichas al reservar
QA: B-02, BD-06

### CUSTOMERS-F26 Crear la ficha de quien pide cita por WhatsApp
Estado: hecho
Vertical: peluqueria
Actor: asistente
Pantalla: ninguna
Pasos:
1. Una clienta escribe al WhatsApp del salón con la respuesta automática de citas encendida.
2. La respuesta busca su ficha por el número (F10). Si la encuentra, la usa.
3. Si no la encuentra, crea una ficha con el nombre que la clienta haya dado en el mensaje (o su
   teléfono como nombre si no dio ninguno), su teléfono con `+` delante y origen «WhatsApp».
4. En el restaurante, la respuesta de mesas NO crea ficha: solo liga la reserva a la que ya exista.
Entra: el número y el mensaje (desde la respuesta automática de WhatsApp).
Sale: la ficha nueva, el aviso de ficha creada y la conversación unida a ella.
Si falla: el origen «WhatsApp» lo fija el permiso que el dueño concedió al activar la respuesta;
el nombre y el `+` del teléfono los escribe el asistente siguiendo su guion (nada lo impone). Si el
número casa con dos o más fichas, no crea ninguna (lo que contesta entonces es de REC_WA_CITA-F03).
Implicados: pendiente
Pendiente de enlazar: whatsapp_inbox — WHATSAPP_INBOX-F21 crea la ficha con origen WhatsApp antes de reservar
Pendiente de enlazar: REC_WA_CITA — REC_WA_CITA-F03 se reconoce a la clienta por su teléfono y, si no tiene ficha, se le crea
QA: W-02
