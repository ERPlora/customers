-- Campos personalizados de UN cliente: la DEFINICIÓN del campo + el VALOR de este cliente (ADR-0132).
--
-- LEFT JOIN a propósito: devuelve TODOS los campos activos del hub, tengan valor o no. La peluquera
-- necesita ver «Tinte habitual: —» para poder rellenarlo; si solo devolviéramos los que ya tienen
-- valor, un campo recién definido no aparecería nunca en ninguna ficha y no habría forma de darle uno.
--
-- El sentido de esto: un salón necesita saber qué tinte usa el cliente; un restaurante solo su NIF.
-- Los campos fijos (nombre, NIF, dirección) son iguales para todos; lo que cambia por negocio son
-- estos. Hasta ahora la tabla de valores no se leía desde ningún sitio: campos que se definían y
-- nunca se rellenaban.
SELECT
  f.id,
  f.name,
  f.field_type,
  f.options,
  f.is_required,
  f.sort_order,
  COALESCE(v.value, '') AS value
FROM customers_customerfield f
LEFT JOIN customers_customerfieldvalue v
  ON v.field_id = f.id
 AND v.customer_id = :customer_id
 AND v.hub_id = f.hub_id
 AND v.is_deleted = 0
WHERE f.hub_id = :hub_id AND f.is_deleted = 0 AND f.is_active = 1
ORDER BY f.sort_order, f.name
