CREATE TABLE "cajas" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"usuario_id" text,
	"apertura_at" text NOT NULL,
	"cierre_at" text,
	"monto_apertura_centavos" integer NOT NULL,
	"monto_cierre_centavos" integer,
	"estado" text DEFAULT 'abierta' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"nombre" text NOT NULL,
	"icono" text DEFAULT 'Package' NOT NULL,
	"color" text,
	"orden" integer DEFAULT 100 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "descuentos" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"user_id" text NOT NULL,
	"sucursal_id" text,
	"objetivo" text NOT NULL,
	"producto_id" text,
	"categoria" text,
	"tipo" text NOT NULL,
	"valor" integer NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_caja" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"caja_id" text NOT NULL,
	"tipo" text NOT NULL,
	"monto_centavos" integer NOT NULL,
	"descripcion" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"codigo_barras" text,
	"descripcion" text NOT NULL,
	"categoria" text NOT NULL,
	"precio_centavos" integer NOT NULL,
	"fraccionable" boolean DEFAULT false NOT NULL,
	"precio_variable" boolean DEFAULT false NOT NULL,
	"unidad_medida" text DEFAULT 'unidad' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"nombre" text NOT NULL,
	"telefono" text,
	"email" text,
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puntos_venta" (
	"id" text PRIMARY KEY NOT NULL,
	"sucursal_id" text NOT NULL,
	"nombre" text DEFAULT 'Caja' NOT NULL,
	"sync_secret" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" text PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"producto_id" text NOT NULL,
	"cantidad" real DEFAULT 0 NOT NULL,
	"alerta_minimo" real DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sucursales" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text,
	"ciudad" text,
	"provincia" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venta_items" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"venta_id" text NOT NULL,
	"producto_id" text NOT NULL,
	"descripcion" text NOT NULL,
	"precio_unit_centavos" integer NOT NULL,
	"categoria" text DEFAULT 'varios' NOT NULL,
	"cantidad" real NOT NULL,
	"subtotal_centavos" integer NOT NULL,
	"descuento_centavos" integer DEFAULT 0 NOT NULL,
	"descuento_origen" text,
	"descuento_detalle" text
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"local_id" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"caja_id" text NOT NULL,
	"total_centavos" integer NOT NULL,
	"descuento_centavos" integer DEFAULT 0 NOT NULL,
	"medio_pago" text NOT NULL,
	"monto_recibido_centavos" integer DEFAULT 0 NOT NULL,
	"vuelto_centavos" integer DEFAULT 0 NOT NULL,
	"anulada" boolean DEFAULT false NOT NULL,
	"venta_anulacion_id" text
);
--> statement-breakpoint
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "descuentos" ADD CONSTRAINT "descuentos_sucursal_id_sucursales_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_venta" ADD CONSTRAINT "puntos_venta_sucursal_id_sucursales_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cajas_local" ON "cajas" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "idx_categorias_local" ON "categorias" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "idx_descuentos_user" ON "descuentos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_descuentos_sucursal" ON "descuentos" USING btree ("sucursal_id");--> statement-breakpoint
CREATE INDEX "idx_movimientos_caja" ON "movimientos_caja" USING btree ("caja_id");--> statement-breakpoint
CREATE INDEX "idx_productos_barcode" ON "productos" USING btree ("codigo_barras");--> statement-breakpoint
CREATE INDEX "idx_productos_local" ON "productos" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "idx_proveedores_local" ON "proveedores" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "idx_pv_sucursal" ON "puntos_venta" USING btree ("sucursal_id");--> statement-breakpoint
CREATE INDEX "idx_stock_producto" ON "stock" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "idx_sucursales_user" ON "sucursales" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_venta_items_venta" ON "venta_items" USING btree ("venta_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_caja" ON "ventas" USING btree ("caja_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_local" ON "ventas" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_created" ON "ventas" USING btree ("created_at");