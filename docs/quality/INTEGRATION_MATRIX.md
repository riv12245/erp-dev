# ERP-DEV — Matriz de Integración Intermodular (Integration Matrix)

---

## Flujos de Comunicación e Integración

1. **CRM → Ventas:**
   - *Evento/Acción:* Selección de cliente CRM en creación de pedido de venta.
   - *Validación:* Servidor verifica que `customerId` exista en la misma empresa autorizada (`companyId`).
   - *Manejo de Errores:* Si el cliente pertenece a otra empresa o está bloqueado, devuelve 400 Bad Request / 403 Forbidden.

2. **Ventas → Inventario:**
   - *Borrador (`DRAFT`):* Consulta informativa de existencias (`stock` / `availability`). No reserva ni deduce inventario.
   - *Confirmación de Venta (`CONFIRMED`):* Emisión de evento de dominio `sales.order.confirmed` e impacto idempotente en movimientos de inventario.

3. **Compras → Inventario:**
   - *Recepción de Compras:* Entrada de mercancía a almacén mediante `inventory.movement.create` con `idempotencyKey` única.

4. **Outbox & Worker:**
   - *Mecanismo:* Persistencia transaccional en `outbox` collection dentro de la misma transacción de MongoDB de la mutación.
   - *Garantías:* At-least-once delivery con leasing y fencing en `worker`.
