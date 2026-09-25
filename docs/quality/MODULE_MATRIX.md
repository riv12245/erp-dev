# ERP-DEV — Matriz Funcional de Módulos (Module Matrix)

---

| Módulo | Estado Real | Operaciones Implementadas | Operaciones Faltantes / En Progreso | Permisos IAM | Pruebas |
| --- | --- | --- | --- | --- | --- |
| **Auth & IAM** | Completo | Login, Logout, Session Refresh rotativo, Revocación Live, Keystore Nativo | — | `auth.*`, `iam.*` | 17 tests |
| **Tenancy & Companies** | Completo | Creación de Empresa, Pertenencia Explícita (`CompanyMembership`), Contexto Header | — | `tenancy.company.*` | 5 tests |
| **CRM** | Funcional | Crear, Listar, Buscar, Editar versión, Cambiar Estado (Clientes) | Flujo CRM deals/oportunidades | `crm.customers.*` | 7 tests |
| **Inventario** | Funcional | Productos, Almacenes, Balances, Movimientos Idempotentes | Reservas automáticas | `inventory.*` | 18 tests |
| **Ventas** | Funcional | Crear Borrador, Confirmar Pedido (Deducción Stock), Cancelar Borrador, Historial | Facturación fiscal | `sales.orders.*` | 8 tests |
| **Compras** | Parcial | Proveedores Crear/Listar/Editar | Recepción de Órdenes e Ingreso a Almacén | `purchasing.suppliers.*` | 7 tests |
| **Finanzas** | Estructura | Pantalla de aviso "En preparación", Contratos iniciales | Cuentas por Cobrar/Pagar, Pagos reales | `finance.*` | Contratos |
| **Producción** | Estructura | Contratos iniciales | Órdenes de Producción, Listas de Materiales | `production.*` | Pendiente |
| **Logística** | Estructura | Contratos iniciales | Despacho y Seguimiento de Guías | `logistics.*` | Pendiente |
