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
5. Al recargar la pantalla de venta (o reiniciarse la tableta) y al recuperar una cuenta aparcada, la
   cuenta vuelve con su cliente: el botón enseña otra vez su nombre y el TPV recibe la misma copia
   fiscal que en el paso 3, sin volver a elegirlo. Clientes lo sabe por el enlace de ese pedido
   (F19); una cuenta sin cliente quita el de la cuenta que se deja, pero no el elegido a mano para
   una venta que aún no se ha guardado.
Entra: la búsqueda y, al elegir, la ficha completa; al recuperar una cuenta, su pedido, y de él el
cliente enlazado (`customers.orders.customer`) y su ficha completa.
Sale: al TPV, el cliente y una COPIA de sus datos fiscales (nombre, NIF, dirección en una línea y
país en código de dos letras). La venta la lleva hasta la factura; cambiar la ficha después no
cambia una factura ya emitida.
Si falla: el motivo del fallo (o «No se pudieron cargar los clientes» si no trae ninguno) con
**Reintentar** (conserva lo escrito); sin
resultados, «Sin resultados.» o «No hay clientes.»; sin permiso, «No tienes permiso para consultar
clientes.». Si la ficha completa no se puede leer, el cliente NO se asigna y sale «No se pudieron
cargar los datos fiscales de {nombre}. Vuelve a pulsar para reintentar.». Si al recuperar una cuenta
no se puede leer su cliente, sale «No se pudo recuperar el cliente de esta cuenta. Vuelve a asignarlo
antes de cobrar.» y la cuenta sigue sin él (o con el que ya tenía, si es la misma cuenta).
Implicados: INVOICE-F02, SALES-F04, SALES-F05, SALES-F17, SERVICES-F22, REC_PELUQUERIA-F09, REC_PELUQUERIA-F10
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
Entra: nombre y teléfono. Buscar un teléfono tecleado con espacios, `00` o el cero nacional busca
sus cifras, que la ficha guardada en formato internacional contiene (F11).
Sale: la ficha con origen «En el local», el teléfono en formato internacional (F11), el aviso de
ficha creada (`customer.created`) y la venta con cliente.
Si falla: «El nombre es obligatorio.» sin nombre; si el teléfono es, como número, el de una ficha
viva del negocio (la búsqueda por número, F10; si esa búsqueda falla, se compara con la lista que
hay en pantalla quitando espacios), elige esa ficha en vez de crear otra (F12). Un teléfono que no es
un número válido de su país sale dentro del formulario («No es un teléfono válido de su país: revisa
las cifras o escríbelo con su prefijo internacional (+44…).») y no se crea nada. Otro fallo sale
dentro del formulario y lo tecleado se conserva. Sin permiso de crear no aparece el botón.
Implicados: SALES-F05, WHATSAPP_INBOX-F04
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
Entra: la pantalla del TPV avisa, en el propio navegador, de que hay un pedido, y el buscador de
Clientes lo enlaza con el cliente elegido en ese momento, con el permiso de quien está en la caja
(si no hay cliente elegido, no hace nada).
Sale: el enlace cliente ↔ pedido. No tiene pantalla propia: lo lee el buscador del TPV para devolver
el cliente a la cuenta al recargar o recuperarla (F17, `customers.orders.customer`), y el asistente o
la API. Volver a la cuenta con el mismo cliente no reescribe el enlace.
Si falla: la venta sigue; el TPV enseña «La venta sigue, pero el cliente no se pudo asociar al
pedido: no aparecerá en su historial.» o, sin permiso, «La venta sigue, pero no tienes permiso para
asociar clientes a pedidos: no aparecerá en su historial.».
Implicados: SALES-F17
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
vez; una ficha eliminada no suma. Un fallo no se ve en el TPV ni en la ficha: el hub reintenta el
aviso (hasta 8 veces, cada vez más espaciadas) y después lo deja atascado a la espera de que alguien lo mire.
Implicados: SALES-F01, REC_PELUQUERIA-F09, REC_RESTAURANTE-F11
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
Implicados: SALES-F30, REC_PELUQUERIA-F14, REC_RESTAURANTE-F15
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
Implicados: SALES-F31, REC_PELUQUERIA-F14, REC_RESTAURANTE-F15
QA: R-11, B-08

### CUSTOMERS-F23 Ver el historial de compras de un cliente
Estado: parcial — la ficha solo da «Compras», «Gastado», «Última compra» y entradas «Compra registrada» sin importe ni enlace a la venta; la lista de compras con importe y estado solo sale por el asistente o la API
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Ficha de cliente
Pasos:
1. Abre la ficha (F03).
2. Lee las cifras «Compras», «Gastado» y «Última compra», y en «Actividad» las entradas «Compra registrada» y «Compra anulada» con su fecha. Una devolución no resta nada: «Gastado» sigue con el importe cobrado (F22).
3. Para ver cada compra con su importe, su estado y la venta de la que viene, hoy hay que pedírselo al asistente.
Entra: el historial de compras de la ficha.
Sale: nada; solo lectura.
Si falla: si la actividad no carga, sale «Sin actividad registrada.» sin aviso de error.
Implicados: ninguno
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
Implicados: APPOINTMENTS-F20
QA: B-03, L-10

### CUSTOMERS-F25 Crear la clienta sin salir de la agenda
Estado: no hecho — al dar una cita (y al crear una cita periódica) solo se elige entre fichas ya creadas (la agenda las busca todas por nombre, teléfono o email desde appointments#306); una clienta nueva obliga a ir a Clientes, crearla y volver (appointments#318)
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
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F12, REC_PELUQUERIA-F06
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
   teléfono como nombre si no dio ninguno), su teléfono en formato internacional (F11) y origen «WhatsApp».
4. En el restaurante, la respuesta de mesas NO crea ficha: solo liga la reserva a la que ya exista.
Entra: el número y el mensaje (desde la respuesta automática de WhatsApp).
Sale: la ficha nueva, el aviso de ficha creada y la conversación unida a ella.
Si falla: el origen «WhatsApp» lo fija el permiso que el dueño concedió al activar la respuesta;
el nombre lo escribe el asistente siguiendo su guion; el teléfono lo pasa a formato internacional la
propia alta (F11), así que un número que no es válido no crea ficha. Si el
número casa con dos o más fichas, no crea ninguna (lo que contesta entonces es de REC_WA_CITA-F03).
Implicados: WHATSAPP_INBOX-F21, REC_WA_CITA-F03
QA: W-02

### CUSTOMERS-F30 Dar la ficha de una clienta a otros módulos
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Otro módulo pide la ficha de una clienta por su identificador: Citas al reservar una cita, al crear o reservar una serie y al reservar varias de golpe (la exige: sin ella no reserva), y Servicios al pintar el nombre de la titular de un bono. Dentro de Clientes la usan también la ficha (F03) y el buscador del TPV (F17); y el asistente.
2. Clientes contesta con la ficha de este negocio: nombre, email, teléfono, NIF, dirección, ciudad, código postal, país, avatar, notas, empresa, cumpleaños y aniversario, canal preferido, consentimiento de marketing, etapa, origen, si está activa y los acumulados de compra.
3. Una ficha eliminada, fusionada en otra o con los datos borrados no se devuelve; una desactivada sí, y Citas reserva con ella.
Entra: el identificador de la ficha. La consulta exige el permiso de ver clientes a quien la pide desde una pantalla o el asistente; cuando Citas la lee al reservar, corre como sistema y no mira el permiso de quien reserva.
Sale: nada guardado; solo lectura (`customers.get`).
Si falla: una ficha que no existe, eliminada, fusionada o con los datos borrados no se devuelve: Citas rechaza la reserva (APPOINTMENTS-F01) y Servicios enseña el identificador; a quien no tiene el permiso de ver clientes, Servicios ni siquiera se la pide.
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F12, APPOINTMENTS-F13, APPOINTMENTS-F21, SERVICES-F16, SERVICES-F19
QA: ninguno
