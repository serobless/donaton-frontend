# Persistencia de Datos — Donaton

## Estrategia general

Cada microservicio con base de datos tiene su propia instancia MySQL, siguiendo el patrón **Database per Service**. Ningún servicio accede directamente a la base de datos de otro.

| Servicio | Base de datos | Motor |
|---|---|---|
| ms-auth | `donaton_auth` | MySQL 8 |
| ms-donaciones | `donaton_db` | MySQL 8 |

## Base de datos `donaton_auth`

Gestionada por `donaton-ms-auth` mediante **Spring Data JPA** con `ddl-auto: update`.

### Tablas

**`usuarios`**

| Columna | Tipo | Restricción |
|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT |
| nombre | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL (BCrypt) |
| rut | VARCHAR(12) | NOT NULL |
| telefono | VARCHAR(20) | nullable |
| region | VARCHAR(50) | nullable |
| activo | BOOLEAN | DEFAULT true |

**`roles`**

| Columna | Tipo | Restricción |
|---|---|---|
| id | BIGINT | PK |
| nombre | VARCHAR(50) | NOT NULL, UNIQUE |

**`usuarios_roles`** (tabla de relación ManyToMany)

| Columna | Tipo |
|---|---|
| usuario_id | BIGINT (FK → usuarios) |
| rol_id | BIGINT (FK → roles) |

### Datos iniciales

`DataInitializer` crea al arrancar:
- Role `ADMIN` y `DONADOR`
- Usuario admin por defecto: `admin@donaton.cl`

---

## Base de datos `donaton_db`

Gestionada por `donaton-ms-donaciones` mediante **Spring Data JPA** con `ddl-auto: update`.

### Tablas

**`causas`**

| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGINT PK | |
| titulo | VARCHAR(200) | NOT NULL |
| descripcion | TEXT | |
| imagen | VARCHAR(500) | URL de imagen |
| meta | DECIMAL(15,2) | Monto objetivo |
| recaudado | DECIMAL(15,2) | DEFAULT 0 |
| categoria | VARCHAR(50) | |
| activa | BOOLEAN | DEFAULT true |
| fecha_fin | DATE | |

**`donaciones`**

| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGINT PK | |
| monto | DECIMAL(15,2) | NOT NULL |
| fecha | DATETIME | DEFAULT now() |
| tipo_donacion | ENUM | MONETARIA, ROPA, ALIMENTO, MEDICA |
| estado | ENUM | PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA |
| donante_alias | VARCHAR(100) | |
| donador_id | VARCHAR(50) | Viene de X-User-Id (gateway) |
| descripcion | VARCHAR(500) | |
| cantidad | INT | Para donaciones en especie |
| unidad | VARCHAR(20) | kg, unidades, etc. |
| causa_id | BIGINT FK | → causas.id |

**`testimonios`**

| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGINT PK | |
| titulo | VARCHAR(300) | NOT NULL |
| contenido | LONGTEXT | HTML generado por CKEditor |
| autor_id | VARCHAR(50) | Viene de X-User-Id (gateway) |
| autor_nombre | VARCHAR(100) | |
| fecha_creacion | DATETIME | DEFAULT now() |
| imagen_url | VARCHAR(500) | nullable |

---

## Gestión de migraciones

Actualmente se usa `spring.jpa.hibernate.ddl-auto: update`, que crea/actualiza las tablas automáticamente al levantar la aplicación. En producción se recomienda migrar a **Flyway** o **Liquibase** para control explícito de versiones de esquema.

## Backups y recuperación

En un entorno de producción con Docker:
- Cada base de datos se monta sobre un **volumen persistente** (ej: `donaton_auth_data`, `donaton_db_data`)
- Los backups se realizan con `mysqldump` programado (cron diario)
- Los dumps se almacenan en almacenamiento externo (S3 o similar)
- Para recuperar: `mysql -u root -p donaton_db < backup.sql`
