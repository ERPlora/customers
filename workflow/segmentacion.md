# WORKFLOW — Clientes · Grupos, etiquetas y campos

Prefijo: CUSTOMERS

> Detalle de los flujos de configuración que dan forma a las fichas: grupos, etiquetas y campos
> personalizados. Las pantallas están en el índice, [`../WORKFLOW.md`](../WORKFLOW.md). Escrito
> contra `origin/main` v2.3.67 (05/10/2026).

## Flujos

### CUSTOMERS-F27 Crear, cambiar y eliminar grupos de clientes
Estado: parcial — desmarcar «Activo» al editar un grupo lo hace desaparecer de la lista y de las fichas, y ninguna pantalla deja volver a activarlo; y eliminar un grupo no quita la pertenencia de sus fichas, aunque el diálogo dice que la pierden, y esas fichas ya no pueden guardar sus grupos (F06)
Vertical: comun
Actor: administrador, responsable
Pantalla: Grupos
Pasos:
1. En **Clientes → Grupos** pulsa **Añadir**; el panel se titula «Nuevo grupo».
2. Rellena «Nombre» (obligatorio), «Descripción», «Color» (texto libre; de fábrica `primary`) y «Orden».
3. **Guardar**: sale «Grupo creado» y el grupo aparece con su recuento de «Clientes».
4. Para cambiarlo, toca la fila (o **Editar**): el panel se titula «Editar · {nombre}» y añade la
   casilla «Activo». **Guardar** → «Grupo actualizado».
5. Para quitarlo (solo el administrador), **Eliminar** en la fila: «Eliminar grupo» — «¿Eliminar
   {nombre}? Los clientes asignados pierden el grupo.» → «Grupo {nombre} eliminado». El grupo deja de
   verse, pero la pertenencia sigue guardada en cada ficha.
Entra: los datos del grupo.
Sale: el grupo, que se asigna desde cada ficha (F06). Un grupo no lleva descuento ni precio.
Si falla: un nombre ya usado (sin distinguir mayúsculas ni espacios de los extremos) se dice debajo
de «Nombre»: «Ya hay un grupo con ese nombre. Elige otro nombre.». Otro rechazo, en el aviso del
formulario. Las fichas que estaban en un grupo eliminado no pueden volver a guardar sus grupos (F06).
Implicados: ninguno
QA: ninguno

### CUSTOMERS-F28 Crear, cambiar y eliminar etiquetas de clientes
Estado: parcial — igual que los grupos: desmarcar «Activa» esconde la etiqueta sin vuelta atrás desde la pantalla, y eliminarla no quita la pertenencia aunque el diálogo dice que sí, lo que impide guardar las etiquetas de esas fichas (F06)
Vertical: comun
Actor: administrador, responsable
Pantalla: Etiquetas
Pasos:
1. En **Clientes → Etiquetas** pulsa **Añadir**; el panel se titula «Nueva etiqueta».
2. Rellena «Nombre» y «Color». **Guardar** → «Etiqueta creada».
3. Al editar («Editar · {nombre}») aparece «Activa». **Guardar** → «Etiqueta actualizada».
4. **Eliminar** (solo el administrador): «Eliminar etiqueta» — «¿Eliminar {nombre}? Los clientes
   asignados pierden la etiqueta.» → «Etiqueta {nombre} eliminada». La pertenencia sigue guardada en cada ficha.
Entra: nombre y color.
Sale: la etiqueta, que se asigna desde cada ficha (F06).
Si falla: «Ya hay una etiqueta con ese nombre. Elige otro nombre.» debajo de «Nombre»; otro rechazo, en el aviso del formulario.
Implicados: ninguno
QA: ninguno

### CUSTOMERS-F29 Definir los campos personalizados de la ficha
Estado: parcial — cambiar el tipo de un campo no convierte los valores ya guardados (una ficha con un valor que ya no encaja no se puede guardar hasta corregirlo); desmarcar «Activo» lo esconde de la lista de Campos y de las fichas sin vuelta atrás desde la pantalla; y nada distingue un campo con datos de salud (alergias, embarazo) que pida consentimiento explícito
Vertical: comun
Actor: administrador, responsable
Pantalla: Campos
Pasos:
1. En **Clientes → Campos** pulsa **Añadir**; el panel se titula «Nuevo campo personalizado».
2. Rellena «Nombre», «Tipo» («Texto», «Número», «Fecha», «Sí/No», «Selección» o «Texto largo»), las
   «Opciones (separadas por coma)» si es de selección, «Orden» y, si hace falta, «Obligatorio».
3. **Guardar** → «Campo creado». El campo aparece en la edición de TODAS las fichas (F04), con su
   forma: una casilla, una lista, una fecha…
4. Al editar («Editar · {nombre}») aparece «Activo». **Eliminar** → «Eliminar campo» — «¿Eliminar
   {nombre}? Los valores guardados dejan de mostrarse.» → «Campo {nombre} eliminado».
Entra: la definición del campo.
Sale: el campo. «Obligatorio» solo se exige al EDITAR una ficha (F04), nunca al darla de alta
(Clientes, TPV, importación ni WhatsApp: el alta ni siquiera enseña los campos propios). Un campo desactivado o eliminado deja de pintarse, pero sus
valores se quedan guardados.
Si falla: «Ya hay un campo con ese nombre. Elige otro nombre.» debajo de «Nombre»; otro rechazo, en
el aviso del formulario. La lista la ve cualquiera que vea clientes; sin permiso de gestionar campos
no hay **Añadir** ni acciones.
Implicados: ninguno
QA: L-10 (discrepa)
