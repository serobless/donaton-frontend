# Informe de Pruebas Unitarias — Donaton

## Resumen general

| Repo | Archivos test | Tests totales | Herramienta |
|---|---|---|---|
| donaton-frontend | 5 | 16 | Vitest 4 + Testing Library |
| donaton-gateway | 3 | 13 | JUnit 5 + Mockito |
| donaton-ms-auth | 2+ | TBD (Benja) | JUnit 5 + Mockito |
| donaton-ms-donaciones | 4+ | TBD (Carlos) | JUnit 5 + Mockito |

---

## donaton-frontend

**Ejecutar:** `npm run test:run`
**Cobertura:** `npm run test:coverage`

### Archivos y casos de prueba

| Archivo | Tests | Qué verifica |
|---|---|---|
| `CausaCard.test.tsx` | 4 | Título, porcentaje de progreso, badge de categoría, botón donar |
| `AuthContext.test.tsx` | 3 | Estado inicial sin sesión, recuperación de token desde localStorage, logout limpia estado y localStorage |
| `useCountUp.test.ts` | 2 | Valor inicial 0, alcanza el valor target |
| `ProtectedRoute.test.tsx` | 5 | Redirige a /login sin auth, renderiza outlet con auth, redirige a / con rol incorrecto, renderiza con rol correcto, retorna null mientras carga |
| `MapaCentros.test.tsx` | 2 | Renderiza contenedor del mapa, solo markers de centros activos |

**Resultado:** 16/16 tests pasan ✅

---

## donaton-gateway

**Ejecutar:** `mvn test`

### Archivos y casos de prueba

| Archivo | Tests | Qué verifica |
|---|---|---|
| `JwtUtilTest.java` | 7 | Valida claims de token válido, retorna claim "roles", lanza excepción con token expirado, lanza excepción con firma inválida, `isValid()` con token válido, expirado y malformado |
| `JwtAuthFilterTest.java` | 5 | Ruta pública pasa sin token, ruta protegida sin token → 401, token válido propaga X-User-Id, token expirado → 401, token malformado → 401 |
| `DonatonGatewayApplicationTests.java` | 1 | Contexto Spring carga correctamente |

**Resultado:** 13/13 tests pasan ✅

---

## donaton-ms-auth (Benja)

**Ejecutar:** `mvn test`

### Archivos existentes

| Archivo | Responsable |
|---|---|
| `AuthServiceTest.java` | existente |
| `JwtServiceTest.java` | existente |
| `AuthControllerTest.java` | **por implementar** |

### AuthControllerTest — casos esperados

| Método test | Qué verifica |
|---|---|
| `testLogin_validCredentials_returns200WithToken()` | POST /auth/login con credenciales correctas → 200 + token |
| `testLogin_wrongPassword_returns401()` | POST /auth/login con password incorrecto → 401 |
| `testLogin_userNotFound_returns401()` | POST /auth/login con email inexistente → 401 |
| `testRegister_newUser_returns201()` | POST /auth/register datos válidos → 201 |
| `testRegister_duplicateEmail_returns4xx()` | POST /auth/register email duplicado → 4xx |

---

## donaton-ms-donaciones (Carlos)

**Ejecutar:** `mvn test`

### Archivos a implementar

| Archivo | Casos de prueba |
|---|---|
| `DonacionServiceTest.java` | crear donación válida, causa inexistente lanza 404, actualizar estado, donación inexistente lanza 404, listar donaciones |
| `CausaServiceTest.java` | crear causa, obtener por id existente, obtener por id inexistente → 404, listar todas |
| `TestimonioServiceTest.java` | crear testimonio, listar testimonios |

---

## Cómo obtener métricas JaCoCo (backend)

```bash
mvn verify
# Reporte HTML en: target/site/jacoco/index.html
```

Abrir en el navegador para ver cobertura por clase y método.
