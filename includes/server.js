
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const dbgateway = require("./dbgateway");
const { runRecon } = require("./runner");

const { huntSubdomains } = require("./runner");

const cors = require("cors");

const CONFIG_PATH = path.join(
    os.homedir(),
    "db",
    "maindb.json"
);

const HOST = "127.0.0.1";
const JWT_EXPIRES_IN = "2h";
const MAX_BODY_SIZE = "10kb";
const revokedTokens = new Set();

function startServer(port = 9090) {
    const JWT_SECRET = "322d653729229ef371e34847bcec187f0cec32e2674a86dc341402610d7ae04a";

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error(
            "SUBSRECON_JWT_SECRET must be set to a secret of at least 32 characters."
        );
    }

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400
}));

app.use(express.json({
    limit: "10kb",
    strict: true
}));

    // General API configuration
    app.disable("x-powered-by");
    app.use(express.json({
        limit: MAX_BODY_SIZE,
        strict: true
    }));

    app.use((req, res, next) => {
        res.set("Cache-Control", "no-store");
        res.set("X-Content-Type-Options", "nosniff");
        next();
    });

    function readConfig() {
        if (!fs.existsSync(CONFIG_PATH)) {
            throw new Error("Configuration file not found.");
        }

        const config = JSON.parse(
            fs.readFileSync(CONFIG_PATH, "utf8")
        );

        if (
            typeof config.username !== "string" ||
            typeof config.password !== "string"
        ) {
            throw new Error("Invalid credentials configuration.");
        }

        return config;
    }

    function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            success: false,
            message: "Authorization token required"
        });
    }

    const token = match[1];

    if (revokedTokens.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Session has been logged out"
        });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET, {
            issuer: "SubsRecon",
            audience: "SubsRecon-API"
        });

        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

    function isValidDomain(domain) {
        if (
            typeof domain !== "string" ||
            domain.length === 0 ||
            domain.length > 253
        ) {
            return false;
        }

        const labels = domain.split(".");

        // Require a fully qualified DNS hostname.
        if (labels.length < 2) return false;

        return labels.every(label =>
            label.length >= 1 &&
            label.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
        );
    }

    // --------------------------------------------------
    // GET /
    // API health check
    // --------------------------------------------------
    app.get("/", (req, res) => {
        return res.status(200).json({
            success: true,
            message: "SubsRecon API is running"
        });
    });

    // --------------------------------------------------
    // POST /login
    // Validate credentials and issue JWT
    // --------------------------------------------------
    app.post("/login", (req, res) => {
        try {
            const { username, password } = req.body || {};

            if (
                typeof username !== "string" ||
                typeof password !== "string" ||
                !username ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required"
                });
            }

            const config = readConfig();

            // Existing database stores the password as an MD5 hash.
            if (!/^[a-f0-9]{32}$/i.test(config.password)) {
                console.error(
                    "[ERROR] Stored password is not a valid MD5 hash."
                );

                return res.status(500).json({
                    success: false,
                    message: "Authentication configuration error"
                });
            }

            const submittedHash = crypto
                .createHash("md5")
                .update(password, "utf8")
                .digest();

            const storedHash = Buffer.from(
                config.password,
                "hex"
            );

            const submittedUsernameHash = crypto
                .createHash("sha256")
                .update(username, "utf8")
                .digest();

            const storedUsernameHash = crypto
                .createHash("sha256")
                .update(config.username, "utf8")
                .digest();

            const usernameMatches = crypto.timingSafeEqual(
                submittedUsernameHash,
                storedUsernameHash
            );

            const passwordMatches = crypto.timingSafeEqual(
                submittedHash,
                storedHash
            );

            if (!usernameMatches || !passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }

            const token = jwt.sign(
                { username: config.username },
                JWT_SECRET,
                {
                    expiresIn: JWT_EXPIRES_IN,
                    issuer: "SubsRecon",
                    audience: "SubsRecon-API",
                    subject: config.username
                }
            );

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    username: config.username,
                    token,
                    tokenType: "Bearer",
                    expiresIn: JWT_EXPIRES_IN
                }
            });
        } catch (error) {
            console.error("[LOGIN ERROR]", error.message);

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    });

    // POST /logout
app.post("/logout", authenticateToken, (req, res) => {
    revokedTokens.add(req.token);

    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
});


app.get("/subsrecon/:uuid", authenticateToken, (req, res) => {
    try {
        const { uuid } = req.params;

        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid recon UUID"
            });
        }

        // Checks the registry and reads the associated detailed JSON file.
        const recon = dbgateway.getRecon(uuid);

        if (!recon) {
            return res.status(404).json({
                success: false,
                message: "Recon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Recon details retrieved successfully",
            data: recon
        });
    } catch (error) {
        console.error("[RECON DETAIL ERROR]", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve recon details"
        });
    }
});



app.delete("/subsrecon/:uuid", authenticateToken, (req, res) => {
    try {
        const { uuid } = req.params;

        // Validate UUID format before accessing the database.
        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid recon UUID"
            });
        }

        // Confirm that the recon exists.
        const recon = dbgateway.getRecon(uuid);

        if (!recon) {
            return res.status(404).json({
                success: false,
                message: "Recon not found"
            });
        }

        // Avoid deleting a database while enumeration is running.
        if (recon.status === "running") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete a running recon. Stop or finish the scan first."
            });
        }

        const deleted = dbgateway.deleteRecon(uuid);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Recon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Recon deleted successfully",
            data: {
                id: uuid,
                deleted: true
            }
        });
    } catch (error) {
        console.error("[DELETE RECON ERROR]", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to delete recon"
        });
    }
});

    
app.get("/subsrecon", authenticateToken, (req, res) => {
    try {
        const recons = dbgateway.getAllRecons();

        return res.status(200).json({
            success: true,
            message: "Recon records retrieved successfully",
            data: {
                total: recons.length,
                recons: recons.map(recon => ({
                    id: recon.id,
                    name: recon.name,
                    reportTo: recon.reportTo,
                    domains: recon.domains || [],
                    database: recon.database,
                    status: recon.status,
                    domainCount: recon.domainCount ??
                        (recon.domains || []).length,
                    subdomainCount: recon.subdomainCount ?? 0,
                    createdAt: recon.createdAt,
                    lastUsedAt: recon.lastUsedAt,
                    completedAt: recon.completedAt ?? null
                }))
            }
        });
    } catch (error) {
        console.error("[SUBSRECON LIST ERROR]", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve recon records"
        });
    }
});


app.post(
  "/subsrecon/:id/hunt-subdomains",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const hostname = String(req.body.hostname || "")
        .trim()
        .toLowerCase()
        .replace(/\.$/, "");

      if (!hostname) {
        return res.status(400).json({
          success: false,
          message: "hostname is required."
        });
      }

      const result = await huntSubdomains(id, hostname);

      return res.json({
        success: true,
        message: "Subdomain hunt completed.",
        data: result
      });
    } catch (error) {
      console.error("[SubsRecon] Scoped hunt failed:", error);

      const message = error.message || "Subdomain hunt failed.";

      const status =
        /not found/i.test(message) ? 404 :
        /outside|scope/i.test(message) ? 403 :
        /invalid hostname/i.test(message) ? 400 : 500;

      return res.status(status).json({
        success: false,
        message
      });
    }
  }
);

/* ----------------------------------------------------------
   Update a domain's status
   PATCH /subsrecon/:id/domain-status
   ---------------------------------------------------------- */

app.patch(
  "/subsrecon/:id/domain-status",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const hostname = String(req.body.hostname || "")
        .trim()
        .toLowerCase()
        .replace(/^\*\./, "")
        .replace(/\.$/, "");

      const status = String(req.body.status || "").toLowerCase();

      if (!hostname || !["new", "pending", "success"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid hostname or status."
        });
      }

      const updated = await dbgateway.setDomainStatus(
        id,
        hostname,
        status
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Recon record or domain not found."
        });
      }

      return res.json({
        success: true,
        message: "Domain status saved.",
        data: updated
      });
    } catch (error) {
      console.error("[SubsRecon] Status update failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save domain status."
      });
    }
  }
);

    // --------------------------------------------------
    // POST /newrecon
    // Create a recon after JWT verification
    // --------------------------------------------------
    app.post("/newrecon", authenticateToken, (req, res) => {
        try {
            const { name, reportTo, domains } = req.body || {};

            // Validate organization name
            if (
                typeof name !== "string" ||
                !name.trim() ||
                name.trim().length > 120
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid organization name is required"
                });
            }

            // Validate reporting email
            if (
                typeof reportTo !== "string" ||
                reportTo.length > 254 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reportTo.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid report-to email is required"
                });
            }

            // Validate scope
            if (
                !Array.isArray(domains) ||
                domains.length === 0 ||
                domains.length > 100
            ) {
                return res.status(400).json({
                    success: false,
                    message: "domains must contain between 1 and 100 domains"
                });
            }

            const normalizedDomains = domains.map(domain => {
                if (typeof domain !== "string") return domain;

                return domain
                    .trim()
                    .toLowerCase()
                    .replace(/\.$/, "");
            });

            if (!normalizedDomains.every(isValidDomain)) {
                return res.status(400).json({
                    success: false,
                    message: "One or more domains are invalid"
                });
            }

            if (
                new Set(normalizedDomains).size !==
                normalizedDomains.length
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate domains are not allowed"
                });
            }

            // Create registry entry and UUID database.
            // This assumes dbgateway.js exports createRecon().
            const recon = dbgateway.createRecon({
            name: name.trim(),
            reportTo: reportTo.trim(),
            domains: normalizedDomains
        });

        // Return the response before starting the scan.
        res.status(201).json({
            success: true,
            message: "Recon created successfully. Enumeration queued.",
            data: {
                id: recon.id,
                name: recon.name,
                reportTo: recon.reportTo,
                domains: recon.domains,
                database: recon.database,
                status: recon.status,
                domainCount: recon.domainCount,
                subdomainCount: recon.subdomainCount,
                createdAt: recon.createdAt,
                lastUsedAt: recon.lastUsedAt
            }
        });

        // Start enumeration asynchronously.
        setImmediate(() => {
            runRecon(recon.id).catch(error => {
                console.error(
                    `[SubsRecon] Enumeration failed for ${recon.id}:`,
                    error.message
                );
            });
        });

        return;
        } catch (error) {
            console.error("[NEW RECON ERROR]", error.message);

            return res.status(500).json({
                success: false,
                message: "Failed to create recon"
            });
        }
    });

    // --------------------------------------------------
    // 404 handler
    // --------------------------------------------------
    app.use((req, res) => {
        return res.status(404).json({
            success: false,
            message: "Route not found"
        });
    });

    // --------------------------------------------------
    // JSON and request errors
    // --------------------------------------------------
    app.use((error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }

        if (error.type === "entity.too.large") {
            return res.status(413).json({
                success: false,
                message: "Request body too large"
            });
        }

        if (
            error instanceof SyntaxError &&
            error.status === 400 &&
            Object.prototype.hasOwnProperty.call(error, "body")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid JSON request"
            });
        }

        console.error("[SERVER ERROR]", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    });

    const server = app.listen(port, HOST, () => {
       
    });

    server.on("error", error => {
        console.error(`[SERVER ERROR] ${error.message}`);
    });

    return server;
}

module.exports = {
    startServer
};
