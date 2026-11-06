# SubsRecon Backend API Specification & Audit

> **Audit Date:** 2026-11-01  
> **Source Files Audited:**
> - `package.json`
> - `subsrecon.js`
> - `includes/server.js`
> - `includes/dbgateway.js`
> - `includes/runner.js`
> - `includes/utils.js`
> - `includes/config.yaml`
> - `includes/banner.js`
>
> All contracts, endpoints, status codes, schemas, and line numbers documented below are directly traced from these source files without extrapolation.

---

## 1. Server Architecture & Network Configuration

| Setting | Value / Implementation | Source Reference |
| :--- | :--- | :--- |
| **Default Port** | `9090` | `includes/server.js#L27`, `subsrecon.js#L61` |
| **Default Host** | `127.0.0.1` | `includes/server.js#L22,L658` |
| **CORS Policy** | Fully open (`origin: "*"`), methods: `GET, POST, PATCH, PUT, DELETE, OPTIONS`, allowed headers: `Content-Type, Authorization`, `maxAge: 86400` | `includes/server.js#L38-L43` |
| **Security Headers** | `x-powered-by` disabled, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` | `includes/server.js#L51,L57-L61` |
| **Body Parser** | JSON only, strict mode enabled, payload limit `10kb` (`MAX_BODY_SIZE`) | `includes/server.js#L24,L45-L48,L52-L55` |
| **Error Handling** | Payload `>10kb` returns `413 Request body too large`; Malformed JSON returns `400 Invalid JSON request`; Uncaught exceptions return `500 Internal server error`; Unmatched routes return `404 Route not found` | `includes/server.js#L617-L656` |

---

## 2. Authentication & Authorization Contract

### 2.1 Credential Verification & Storage
- Credentials configuration is loaded from `~/db/maindb.json` (`CONFIG_PATH`, `includes/server.js#L16-L20,L63-L80`).
- Database format:
  ```json
  {
    "username": "<string>",
    "password": "<32-char hex MD5 hash>"
  }
  ```
- Comparison logic (`includes/server.js#L184-L219`):
  - Password: `crypto.createHash("md5").update(password, "utf8").digest()` is compared against `Buffer.from(config.password, "hex")` using `crypto.timingSafeEqual`.
  - Username: SHA-256 hash of submitted username is compared against SHA-256 hash of `config.username` using `crypto.timingSafeEqual`.
  - Stored password format is validated against `/^[a-f0-9]{32}$/i`; if invalid, returns `500 Authentication configuration error`.

### 2.2 JWT Token Generation & Login Contract
- **Endpoint:** `POST /login` (`includes/server.js#L151-L250`)
- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Validation:**
  - `typeof username !== "string" || typeof password !== "string" || !username || !password` -> `400 Bad Request`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "username": "cappriciosec",
      "token": "<JWT-STRING>",
      "tokenType": "Bearer",
      "expiresIn": "2h"
    }
  }
  ```
- **Exact Token Field Name:** **`data.token`** (inside the top-level `data` envelope object).
- **JWT Attributes:**
  - Secret: Hardcoded 64-char hex string (`includes/server.js#L28`)
  - Expiry: `2h` (`JWT_EXPIRES_IN`, `includes/server.js#L23,L225`)
  - Issuer: `"SubsRecon"` (`includes/server.js#L226`)
  - Audience: `"SubsRecon-API"` (`includes/server.js#L227`)
  - Subject: `config.username` (`includes/server.js#L228`)
  - Payload: `{ "username": config.username }` (`includes/server.js#L222`)
- **Refresh Token Support:** **None**. The backend does not issue refresh tokens, has no token refresh endpoint, and has no sliding session extension.

### 2.3 Authentication Middleware (`authenticateToken`)
- **Source Reference:** `includes/server.js#L82-L116`
- **Header Format:** `Authorization: Bearer <token>` (parsed case-insensitively via `/^Bearer\s+(.+)$/i`).
- **Token Invalidation:** Server maintains an in-memory `Set` of `revokedTokens` (`includes/server.js#L25,L95-L100,L254`). Calling `POST /logout` adds the current token to this set.
- **Middleware Failure Responses:**
  | Condition | HTTP Status | Response Body |
  | :--- | :--- | :--- |
  | Missing or malformed header | `401 Unauthorized` | `{"success": false, "message": "Authorization token required"}` |
  | Token is in `revokedTokens` | `401 Unauthorized` | `{"success": false, "message": "Session has been logged out"}` |
  | Expired or invalid signature | `401 Unauthorized` | `{"success": false, "message": "Invalid or expired token"}` |

---

## 3. Comprehensive Endpoint Catalog

### Summary Table

| Method | Endpoint | Auth | Request Body | Success Status & Body | Error Codes | Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | No | None | `200` `{"success": true, "message": "SubsRecon API is running"}` | `500` | `includes/server.js#L140-L148` |
| `POST` | `/login` | No | `{"username": string, "password": string}` | `200` `{"success": true, "message": "Login successful", "data": {"username", "token", "tokenType", "expiresIn"}}` | `400, 401, 500` | `includes/server.js#L151-L250` |
| `POST` | `/logout` | Yes | None | `200` `{"success": true, "message": "Logout successful"}` | `401, 500` | `includes/server.js#L253-L260` |
| `GET` | `/subsrecon` | Yes | None | `200` `{"success": true, "message": "Recon records retrieved successfully", "data": {"total": number, "recons": ReconSummary[]}}` | `401, 500` | `includes/server.js#L363-L396` |
| `POST` | `/newrecon` | Yes | `{"name": string, "reportTo": string, "domains": string[]}` | `201` `{"success": true, "message": "Recon created successfully. Enumeration queued.", "data": ReconCreationRecord}` | `400, 401, 500` | `includes/server.js#L498-L612` |
| `GET` | `/subsrecon/:uuid` | Yes | None | `200` `{"success": true, "message": "Recon details retrieved successfully", "data": ReconDetailRecord}` | `400, 401, 404, 500` | `includes/server.js#L263-L299` |
| `DELETE` | `/subsrecon/:uuid` | Yes | None | `200` `{"success": true, "message": "Recon deleted successfully", "data": {"id": string, "deleted": true}}` | `400, 401, 404, 409, 500` | `includes/server.js#L303-L360` |
| `POST` | `/subsrecon/:id/hunt-subdomains` | Yes | `{"hostname": string}` | `200` `{"success": true, "message": "Subdomain hunt completed.", "data": {"parent": string, "discovered": string[], "count": number}}` | `400, 401, 403, 404, 500` | `includes/server.js#L399-L440` |
| `PATCH` | `/subsrecon/:id/domain-status` | Yes | `{"hostname": string, "status": "new" \| "pending" \| "success"}` | `200` `{"success": true, "message": "Domain status saved.", "data": {"hostname": string, "status": string}}` | `400, 401, 404, 500` | `includes/server.js#L447-L495` |

---

### Endpoint Details

#### 1. API Health Check: `GET /`
- **Source:** `includes/server.js#L140-L148`
- **Auth Required:** No
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "SubsRecon API is running"
  }
  ```

#### 2. User Login: `POST /login`
- **Source:** `includes/server.js#L151-L250`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "cappriciosec",
    "password": "mypassword"
  }
  ```
- **Validation Rules:**
  - `username`: string, non-empty.
  - `password`: string, non-empty.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "username": "cappriciosec",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": "2h"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: `{"success": false, "message": "Username and password are required"}`
  - `401 Unauthorized`: `{"success": false, "message": "Invalid username or password"}`
  - `500 Internal Server Error`: `{"success": false, "message": "Authentication configuration error"}` (if stored hash is invalid) or `{"success": false, "message": "Internal server error"}`

#### 3. User Logout: `POST /logout`
- **Source:** `includes/server.js#L253-L260`
- **Auth Required:** Yes (`authenticateToken`)
- **Request Body:** None
- **Behavior:** The bearer token from `Authorization` header is stored in server in-memory `revokedTokens` set. Subsequent requests with this token fail with `401 Session has been logged out`.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

#### 4. List Recon Records: `GET /subsrecon`
- **Source:** `includes/server.js#L363-L396`, `includes/dbgateway.js#L155-L173`
- **Auth Required:** Yes (`authenticateToken`)
- **Query Parameters:** **None supported**. Any query params (`?page=1`, `?search=...`, `?limit=10`) are ignored by the backend.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Recon records retrieved successfully",
    "data": {
      "total": 1,
      "recons": [
        {
          "id": "c138f654-71d3-469a-8e2b-fbc625de0247",
          "name": "Acme Corp Scope",
          "reportTo": "security@acme.com",
          "domains": ["acme.com", "api-acme.com"],
          "database": "c138f654-71d3-469a-8e2b-fbc625de0247.json",
          "status": "completed",
          "domainCount": 2,
          "subdomainCount": 14,
          "createdAt": "2026-11-01T10:00:00.000Z",
          "lastUsedAt": "2026-11-01T10:05:00.000Z",
          "completedAt": "2026-11-01T10:05:00.000Z"
        }
      ]
    }
  }
  ```
- **Errors:**
  - `401 Unauthorized`
  - `500 Internal Server Error`: `{"success": false, "message": "Failed to retrieve recon records"}`

#### 5. Create Recon: `POST /newrecon`
- **Source:** `includes/server.js#L498-L612`, `includes/dbgateway.js#L79-L153`, `includes/runner.js#L148-L302`
- **Auth Required:** Yes (`authenticateToken`)
- **Request Body:**
  ```json
  {
    "name": "Target Organization",
    "reportTo": "analyst@target.com",
    "domains": ["target.com", "target.io"]
  }
  ```
- **Validation Rules:**
  - `name`: string, trimmed non-empty, trimmed length `<= 120`. Otherwise `400 Valid organization name is required`.
  - `reportTo`: string, trimmed length `<= 254`, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Otherwise `400 Valid report-to email is required`.
  - `domains`: Array of strings, `1 <= length <= 100`. Otherwise `400 domains must contain between 1 and 100 domains`.
  - Domain normalization: trimmed, lowercase, trailing dot stripped.
  - Domain validation: length 1..253, at least 2 dot-separated labels, each label length 1..63 matching `/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i`. Otherwise `400 One or more domains are invalid`.
  - Domain uniqueness: No duplicates. Otherwise `400 Duplicate domains are not allowed`.
- **Asynchronous Execution:**
  - Creates record in `~/db/subsrecon/recon.db` with status `"pending"`.
  - Creates detailed database `~/db/subsrecon/<uuid>.json`.
  - Responds with `201 Created` immediately.
  - Schedules background execution via `setImmediate(() => runRecon(recon.id))`.
- **Success (201):**
  ```json
  {
    "success": true,
    "message": "Recon created successfully. Enumeration queued.",
    "data": {
      "id": "c138f654-71d3-469a-8e2b-fbc625de0247",
      "name": "Target Organization",
      "reportTo": "analyst@target.com",
      "domains": ["target.com", "target.io"],
      "database": "c138f654-71d3-469a-8e2b-fbc625de0247.json",
      "status": "pending",
      "domainCount": 2,
      "subdomainCount": 0,
      "createdAt": "2026-11-01T10:00:00.000Z",
      "lastUsedAt": "2026-11-01T10:00:00.000Z"
    }
  }
  ```
  *(Note: `completedAt` is omitted from the response data of `/newrecon`, unlike `/subsrecon`)*
- **Errors:**
  - `400 Bad Request` (see validation rules above)
  - `401 Unauthorized`
  - `500 Internal Server Error`: `{"success": false, "message": "Failed to create recon"}`

#### 6. Get Recon Details: `GET /subsrecon/:uuid`
- **Source:** `includes/server.js#L263-L299`, `includes/dbgateway.js#L175-L214`
- **Auth Required:** Yes (`authenticateToken`)
- **Path Parameter:**
  - `:uuid`: Validated against UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
- **Side Effect:** Calling this endpoint touches `lastUsedAt = new Date().toISOString()` and persists it in both the recon JSON file and the registry `recon.db`.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Recon details retrieved successfully",
    "data": {
      "id": "c138f654-71d3-469a-8e2b-fbc625de0247",
      "name": "Target Organization",
      "reportTo": "analyst@target.com",
      "domains": ["target.com"],
      "database": "c138f654-71d3-469a-8e2b-fbc625de0247.json",
      "status": "completed",
      "createdAt": "2026-11-01T10:00:00.000Z",
      "lastUsedAt": "2026-11-01T10:05:00.000Z",
      "completedAt": "2026-11-01T10:05:00.000Z",
      "domainCount": 1,
      "subdomainCount": 2,
      "scan": {
        "startedAt": "2026-11-01T10:00:01.000Z",
        "completedAt": "2026-11-01T10:05:00.000Z",
        "errors": []
      },
      "subdomains": [
        {
          "hostname": "api.target.com",
          "rootDomain": "target.com",
          "parent": "target.com",
          "depth": 1,
          "source": "subfinder",
          "firstSeenAt": "2026-11-01T10:05:00.000Z",
          "lastSeenAt": "2026-11-01T10:05:00.000Z"
        }
      ],
      "relationships": [
        {
          "parent": "target.com",
          "child": "api.target.com",
          "type": "subdomain"
        }
      ],
      "domainStatuses": {
        "api.target.com": "success"
      }
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: `{"success": false, "message": "Invalid recon UUID"}`
  - `401 Unauthorized`
  - `404 Not Found`: `{"success": false, "message": "Recon not found"}`
  - `500 Internal Server Error`: `{"success": false, "message": "Failed to retrieve recon details"}`

#### 7. Delete Recon: `DELETE /subsrecon/:uuid`
- **Source:** `includes/server.js#L303-L360`, `includes/dbgateway.js#L446-L462`
- **Auth Required:** Yes (`authenticateToken`)
- **Path Parameter:**
  - `:uuid`: Validated against standard UUID regex.
- **Pre-condition Check:** If `recon.status === "running"`, returns `409 Conflict`.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Recon deleted successfully",
    "data": {
      "id": "c138f654-71d3-469a-8e2b-fbc625de0247",
      "deleted": true
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: `{"success": false, "message": "Invalid recon UUID"}`
  - `401 Unauthorized`
  - `404 Not Found`: `{"success": false, "message": "Recon not found"}`
  - `409 Conflict`: `{"success": false, "message": "Cannot delete a running recon. Stop or finish the scan first."}`
  - `500 Internal Server Error`: `{"success": false, "message": "Failed to delete recon"}`

#### 8. Targeted Subdomain Hunt: `POST /subsrecon/:id/hunt-subdomains`
- **Source:** `includes/server.js#L399-L440`, `includes/runner.js#L349-L382`, `includes/dbgateway.js#L507-L593`
- **Auth Required:** Yes (`authenticateToken`)
- **Path Parameter:** `:id` (Recon UUID)
- **Request Body:**
  ```json
  {
    "hostname": "api.target.com"
  }
  ```
- **Validation & Scope:**
  - `hostname` is required, trimmed, lowercase, trailing dot removed.
  - Regex check: Valid FQDN hostname up to 253 chars (`includes/runner.js#L355`).
  - Recon must exist.
  - Scope check: Target hostname must equal or end with `.<root>` for one of the recon's root domains. If outside scope, returns `403`.
- **Behavior:**
  - Runs Subfinder synchronously for the domain with no timeout (`includes/runner.js#L305`).
  - Saves newly discovered descendants under the parent host into `recon.subdomains` and adds parent-child edges into `recon.relationships`.
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Subdomain hunt completed.",
    "data": {
      "parent": "api.target.com",
      "discovered": ["v1.api.target.com", "v2.api.target.com"],
      "count": 2
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: `{"success": false, "message": "hostname is required."}` or `{"success": false, "message": "Invalid hostname."}`
  - `401 Unauthorized`
  - `403 Forbidden`: `{"success": false, "message": "Hostname is outside the configured recon scope."}`
  - `404 Not Found`: `{"success": false, "message": "Recon not found."}`
  - `500 Internal Server Error`: `{"success": false, "message": "Subdomain hunt failed."}`

#### 9. Update Domain Status: `PATCH /subsrecon/:id/domain-status`
- **Source:** `includes/server.js#L447-L495`, `includes/dbgateway.js#L465-L505`
- **Auth Required:** Yes (`authenticateToken`)
- **Path Parameter:** `:id` (Recon UUID)
- **Request Body:**
  ```json
  {
    "hostname": "api.target.com",
    "status": "success"
  }
  ```
- **Validation:**
  - `hostname`: trimmed, lowercase, stripped leading `*.` and trailing `.`.
  - `status`: lowercase, must be one of `"new"`, `"pending"`, `"success"`.
  - Hostname must exist in known hosts (configured roots or subdomains of that recon).
- **Success (200):**
  ```json
  {
    "success": true,
    "message": "Domain status saved.",
    "data": {
      "hostname": "api.target.com",
      "status": "success"
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: `{"success": false, "message": "Invalid hostname or status."}`
  - `401 Unauthorized`
  - `404 Not Found`: `{"success": false, "message": "Recon record or domain not found."}`
  - `500 Internal Server Error`: `{"success": false, "message": "Failed to save domain status."}`

---

## 4. Recon Lifecycle, Data Shapes & Status Values

### 4.1 Recon State Machine
```
[POST /newrecon]
       │
       ▼
   "pending"
       │
       ▼ (setImmediate runRecon)
   "running"
    ┌──┴──────────┐
    ▼             ▼
"completed"    "failed"
```

- **Valid Status Values (`includes/dbgateway.js#L262-L268`):**
  1. `"pending"`: Recon created, waiting for worker to spawn.
  2. `"running"`: Subfinder enumeration in progress.
  3. `"completed"`: Enumeration completed successfully.
  4. `"failed"`: Subfinder encountered an error or crashed.
  5. `"cancelled"`: Recognized by schema validation, but **no endpoint or CLI command triggers cancellation**.

### 4.2 Database Storage Structure
1. **Registry Database:** `~/db/subsrecon/recon.db`
   - Managed via LowDB. Contains a `recons` array of lightweight metadata records.
2. **Individual Recon Files:** `~/db/subsrecon/<uuid>.json`
   - Created atomically on recon creation.
   - Holds full scan diagnostics, complete subdomain list, relationships, and domain status map.

### 4.3 Data Shapes

#### Recon Summary (from `GET /subsrecon`)
```typescript
interface ReconSummary {
  id: string;              // UUID v4
  name: string;            // 1-120 chars
  reportTo: string;        // Valid email
  domains: string[];       // Array of root domain strings
  database: string;        // "<id>.json"
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  domainCount: number;     // Number of root domains
  subdomainCount: number;  // Number of discovered subdomains
  createdAt: string;       // ISO 8601 timestamp
  lastUsedAt: string;      // ISO 8601 timestamp
  completedAt: string | null; // ISO 8601 timestamp or null
}
```

#### Recon Detail (from `GET /subsrecon/:uuid`)
```typescript
interface ReconDetail extends ReconSummary {
  scan: {
    startedAt: string | null;
    completedAt: string | null;
    errors: string[];
  };
  subdomains: SubdomainEntry[];
  relationships: ReconRelationship[];
  domainStatuses?: Record<string, "new" | "pending" | "success">;
}

// Subdomains have polymorphic shapes depending on origin:
interface SubdomainEntry {
  hostname: string;
  // Present when created via runner.js:
  rootDomain?: string;
  parent?: string | null;
  depth?: number | null;
  source?: "subfinder" | "enumeration" | string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  // Present when added via hunt-subdomains:
  type?: "subdomain" | string;
  status?: "new" | "pending" | "success" | string;
  discoveredAt?: string;
}

interface ReconRelationship {
  parent: string;
  child: string;
  type?: "subdomain" | string;
}
```

---

## 5. Query Capabilities (Pagination, Search, Filtering)

- **Backend Reality:**
  - `GET /subsrecon` has **no query parameter processing**.
  - No `page`, `limit`, `skip`, `search`, `status`, or `sort` params exist in `includes/server.js#L363-L396`.
  - It loads the entire array `registry.get("recons").value()` and returns it under `{ total, recons }`.
- **Architectural Requirement:**
  - **All pagination, search, status filtering, and date/count sorting MUST be executed client-side** in the frontend.
  - The frontend should fetch the full array and maintain client-side state for page index, page size, search keyword, status filter, and sort field.

---

## 6. Unsupported Features / Backend Limitations

The following capabilities **do NOT exist** in the backend and must be omitted from the UI or designated as unsupported:

1. **User Profile / Credential Management:**
   - There are **no endpoints** for updating passwords, changing usernames, or managing profile data.
   - The settings view will be read-only (displaying session information, username, token expiration, and API connectivity).
2. **Scan Abort / Cancellation:**
   - Although `"cancelled"` is listed in `validReconStatuses`, there is no endpoint (`POST /subsrecon/:id/cancel` or `stop`) to terminate an active Subfinder process.
3. **Server-side Search / Filter / Pagination:**
   - Completely absent on `GET /subsrecon`. Handled entirely on the client.
4. **Token Refresh / Sliding Sessions:**
   - No refresh tokens or renewal routes exist. When the 2-hour JWT expires, the user must re-authenticate.
5. **Recon Renaming or Metadata Modification:**
   - Although `dbgateway.updateRecon()` exists internally, no HTTP endpoint exposes editing recon names or `reportTo` emails after creation.
6. **Data Export:**
   - There is no `/subsrecon/:uuid/export` endpoint. Any CSV or JSON export must be formatted client-side from the retrieved `ReconDetail` object.

---

## 7. Ambiguities & Frontend Design Decisions

| Finding / Ambiguity | Backend Code Detail | Frontend Architectural Decision |
| :--- | :--- | :--- |
| **1. Local Host vs 127.0.0.1** | `server.js` binds strictly to `127.0.0.1`. | The Vite proxy and `.env.example` will use `http://127.0.0.1:9090` to avoid Node.js IPv6 resolution delays (`::1` vs `127.0.0.1`) on macOS. |
| **2. Delete Running Recon** | `DELETE /subsrecon/:uuid` returns `409 Conflict` if `status === "running"`. | UI will disable the Delete action for recons in `"running"` status and provide a clear tooltip explaining that running scans cannot be deleted. |
| **3. Polymorphic Subdomains** | Subdomains created by `runner.js` have `{ rootDomain, parent, depth, source, firstSeenAt, lastSeenAt }`, while hunted subdomains have `{ type, status, discoveredAt }`. | The TypeScript interface `SubdomainEntry` models these variations with optional fields to ensure strict typing with zero `any`. |
| **4. Subfinder Missing at Runtime** | `POST /newrecon` returns `201 Created` with `"pending"` immediately. If Subfinder is not installed, the async worker sets status to `"failed"` and populates `scan.errors`. | The UI will poll or allow refreshing recon details to display scan error diagnostics if the scan fails. |
| **5. In-Memory Token Revocation** | `revokedTokens` is an in-memory `Set`. If the Node server restarts, previously revoked tokens become valid again until their 2h JWT expiry. | On frontend logout, we call `POST /logout` and immediately clear `localStorage` / memory state. |
