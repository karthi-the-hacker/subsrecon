
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const BASE_DIR = path.join(os.homedir(), "db", "subsrecon");
const REGISTRY_PATH = path.join(BASE_DIR, "recon.db");

function openDB(filePath, defaults) {
    const db = low(new FileSync(filePath));
    db.defaults(defaults).write();
    return db;
}

function initDB() {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    return openDB(REGISTRY_PATH, { recons: [] });
}

function getReconPath(id) {
    if (
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
        throw new Error("Invalid recon UUID");
    }

    return path.join(BASE_DIR, `${id}.json`);
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
    if (labels.length < 2) return false;

    return labels.every(label =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    );
}

function normalizeDomains(domains) {
    if (!Array.isArray(domains) || domains.length === 0) {
        throw new Error("At least one root domain is required");
    }

    const normalized = domains.map(domain => {
        if (typeof domain !== "string") {
            throw new Error("Every domain must be a string");
        }

        const value = domain.trim().toLowerCase().replace(/\.$/, "");

        if (!isValidDomain(value)) {
            throw new Error(`Invalid domain: ${domain}`);
        }

        return value;
    });

    if (new Set(normalized).size !== normalized.length) {
        throw new Error("Duplicate root domains are not allowed");
    }

    return normalized;
}

function createRecon({ name, reportTo, domains }) {
    if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 120
    ) {
        throw new Error("A valid recon name is required");
    }

    if (
        typeof reportTo !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reportTo.trim())
    ) {
        throw new Error("A valid report-to email is required");
    }

    const normalizedDomains = normalizeDomains(domains);
    const registry = initDB();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const database = `${id}.json`;

    const record = {
        id,
        name: name.trim(),
        reportTo: reportTo.trim(),
        domains: normalizedDomains,
        database,
        status: "pending",
        createdAt: now,
        lastUsedAt: now,
        completedAt: null,
        domainCount: normalizedDomains.length,
        subdomainCount: 0
    };

    const reconData = {
        ...record,
        scan: {
            startedAt: null,
            completedAt: null,
            errors: []
        },
        // Root domains are scope entries, not discovered subdomains.
        subdomains: [],
        relationships: []
    };

    const reconPath = getReconPath(id);
    const tempPath = `${reconPath}.tmp`;

    try {
        fs.writeFileSync(
            tempPath,
            JSON.stringify(reconData, null, 2),
            { encoding: "utf8", flag: "wx" }
        );

        fs.renameSync(tempPath, reconPath);
        registry.get("recons").push(record).write();
    } catch (error) {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }

        if (fs.existsSync(reconPath)) {
            fs.unlinkSync(reconPath);
        }

        throw error;
    }

    return record;
}

function getAllRecons() {
    const registry = initDB();
    const records = registry.get("recons").value();

    for (const record of records) {
        if (!Number.isInteger(record.domainCount)) {
            record.domainCount = Array.isArray(record.domains)
                ? record.domains.length
                : 0;
        }

        if (!Number.isInteger(record.subdomainCount)) {
            record.subdomainCount = 0;
        }
    }

    registry.write();
    return records;
}

function getRecon(id) {
    const registry = initDB();
    const record = registry.get("recons").find({ id }).value();

    if (!record) return null;

    const reconPath = getReconPath(id);

    if (!fs.existsSync(reconPath)) return null;

    const reconDB = openDB(reconPath, {});
    const data = reconDB.value();

    if (!Number.isInteger(data.domainCount)) {
        data.domainCount = Array.isArray(data.domains)
            ? data.domains.length
            : 0;
    }

    if (!Array.isArray(data.subdomains)) {
        data.subdomains = [];
    }

    if (!Number.isInteger(data.subdomainCount)) {
        data.subdomainCount = data.subdomains.length;
    }

    const now = new Date().toISOString();
    data.lastUsedAt = now;

    reconDB.write();

    registry.get("recons").find({ id }).assign({
        lastUsedAt: now,
        domainCount: data.domainCount,
        subdomainCount: data.subdomainCount
    }).write();

    return data;
}

function updateRecon(id, updates = {}) {
    const registry = initDB();
    const record = registry.get("recons").find({ id }).value();

    if (!record) {
        throw new Error("Recon not found");
    }

    const reconPath = getReconPath(id);

    if (!fs.existsSync(reconPath)) {
        throw new Error("Recon database file not found");
    }

    // Fields stored in the main registry.
    const metadata = {};

    for (const key of ["name", "reportTo", "status", "completedAt"]) {
        if (updates[key] !== undefined) {
            metadata[key] = updates[key];
        }
    }

    if (metadata.name !== undefined) {
        if (
            typeof metadata.name !== "string" ||
            !metadata.name.trim() ||
            metadata.name.trim().length > 120
        ) {
            throw new Error("Invalid recon name");
        }

        metadata.name = metadata.name.trim();
    }

    if (metadata.reportTo !== undefined) {
        if (
            typeof metadata.reportTo !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.reportTo.trim())
        ) {
            throw new Error("Invalid report-to email");
        }

        metadata.reportTo = metadata.reportTo.trim();
    }

    const validReconStatuses = [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled"
    ];

    if (
        metadata.status !== undefined &&
        !validReconStatuses.includes(metadata.status)
    ) {
        throw new Error("Invalid recon status");
    }

    // Fields stored in the individual recon JSON file.
    const detailUpdates = {};

    for (const key of [
        "domainStatuses",
        "subdomains",
        "relationships",
        "scan",
        "domains"
    ]) {
        if (updates[key] !== undefined) {
            detailUpdates[key] = updates[key];
        }
    }

    if (
        detailUpdates.domainStatuses !== undefined &&
        (
            !detailUpdates.domainStatuses ||
            typeof detailUpdates.domainStatuses !== "object" ||
            Array.isArray(detailUpdates.domainStatuses)
        )
    ) {
        throw new Error("Invalid domainStatuses object");
    }

    if (
        detailUpdates.subdomains !== undefined &&
        !Array.isArray(detailUpdates.subdomains)
    ) {
        throw new Error("subdomains must be an array");
    }

    if (
        detailUpdates.relationships !== undefined &&
        !Array.isArray(detailUpdates.relationships)
    ) {
        throw new Error("relationships must be an array");
    }

    const now = new Date().toISOString();

    // Persist detailed data, including domainStatuses, first.
    const reconDB = openDB(reconPath, {});
    const currentData = reconDB.value();

    reconDB.assign({
        ...metadata,
        ...detailUpdates,
        lastUsedAt: now
    }).write();

    // Keep the registry synchronized without copying detailed
    // subdomain data or domainStatuses into the registry.
    const registryUpdates = {
        ...metadata,
        lastUsedAt: now
    };

    if (detailUpdates.domains !== undefined) {
        registryUpdates.domainCount = detailUpdates.domains.length;
    } else if (!Number.isInteger(record.domainCount)) {
        registryUpdates.domainCount = (record.domains || []).length;
    }

    if (detailUpdates.subdomains !== undefined) {
        registryUpdates.subdomainCount = detailUpdates.subdomains.length;
    }

    registry.get("recons").find({ id }).assign(registryUpdates).write();

    return {
        ...currentData,
        ...metadata,
        ...detailUpdates,
        lastUsedAt: now
    };
}

/**
 * Update discovered subdomains after enumeration.
 * `discovered` must contain hostnames, not root domains.
 */
function setDiscoveredSubdomains(id, discovered) {
    if (!Array.isArray(discovered)) {
        throw new Error("discovered must be an array");
    }

    const registry = initDB();
    const record = registry.get("recons").find({ id }).value();

    if (!record) {
        throw new Error("Recon not found");
    }

    const roots = record.domains || [];

    const unique = [
        ...new Set(
            discovered.map(hostname => {
                if (typeof hostname !== "string") {
                    throw new Error("Every hostname must be a string");
                }

                const value = hostname
                    .trim()
                    .toLowerCase()
                    .replace(/\.$/, "");

                if (!isValidDomain(value)) {
                    throw new Error(`Invalid hostname: ${hostname}`);
                }

                return value;
            })
        )
    ].filter(hostname => {
        // Exclude exact root domains.
        if (roots.includes(hostname)) return false;

        // Keep only hosts that belong to one of the configured roots.
        return roots.some(root => hostname.endsWith(`.${root}`));
    });

    const now = new Date().toISOString();
    const reconPath = getReconPath(id);

    if (!fs.existsSync(reconPath)) {
        throw new Error("Recon database file not found");
    }

    const reconDB = openDB(reconPath, {});
    const data = reconDB.value();

    data.subdomains = unique.map(hostname => {
        const rootDomain = roots.find(root =>
            hostname.endsWith(`.${root}`)
        );

        return {
            hostname,
            rootDomain,
            parent: null,
            depth: null,
            source: "enumeration",
            firstSeenAt: now,
            lastSeenAt: now
        };
    });

    data.domainCount = roots.length;
    data.subdomainCount = unique.length;
    data.lastUsedAt = now;

    reconDB.write();

    registry.get("recons").find({ id }).assign({
        domainCount: roots.length,
        subdomainCount: unique.length,
        lastUsedAt: now
    }).write();

    return {
        id,
        domainCount: roots.length,
        subdomainCount: unique.length
    };
}

function deleteRecon(id) {
    const registry = initDB();
    const record = registry.get("recons").find({ id }).value();

    if (!record) return false;

    const reconPath = getReconPath(id);

    registry.get("recons").remove({ id }).write();

    if (fs.existsSync(reconPath)) {
        fs.unlinkSync(reconPath);
    }

    return true;
}



async function setDomainStatus(reconId, hostname, status) {
  const allowed = new Set(["new", "pending", "success"]);
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  const normalizedStatus = String(status || "").toLowerCase();

  if (!host || !allowed.has(normalizedStatus)) {
    throw new Error("Invalid hostname or status.");
  }

  const recon = await getRecon(reconId);
  if (!recon) throw new Error("Recon not found.");

  const roots = (recon.domains || [])
    .map(item => typeof item === "string"
      ? item
      : item.hostname || item.domain || item.name || "")
    .map(item => String(item).toLowerCase().replace(/\.$/, ""));

  const knownHosts = new Set([
    ...roots,
    ...(recon.subdomains || []).map(item =>
      typeof item === "string"
        ? item.toLowerCase().replace(/\.$/, "")
        : String(item.hostname || item.domain || item.name || "")
            .toLowerCase().replace(/\.$/, "")
    )
  ]);

  if (!knownHosts.has(host)) {
    throw new Error("Domain is not present in this recon.");
  }

  const domainStatuses = {
    ...(recon.domainStatuses || {}),
    [host]: normalizedStatus
  };

  await updateRecon(reconId, { domainStatuses });

  return { hostname: host, status: normalizedStatus };
}

async function saveHuntedSubdomains(reconId, parentHost, discoveredHosts) {
  const parent = String(parentHost || "")
    .trim().toLowerCase().replace(/\.$/, "");

  const recon = await getRecon(reconId);
  if (!recon) throw new Error("Recon not found.");

  const roots = (recon.domains || [])
    .map(item => typeof item === "string"
      ? item
      : item.hostname || item.domain || item.name || "")
    .map(item => String(item).toLowerCase().replace(/\.$/, ""));

  // Only hunt within an explicitly configured root domain.
  if (!roots.some(root => parent === root || parent.endsWith("." + root))) {
    throw new Error("Selected hostname is outside the configured scope.");
  }

  const existing = Array.isArray(recon.subdomains)
    ? recon.subdomains
    : [];

  const existingHosts = new Set(
    existing.map(item =>
      String(typeof item === "string"
        ? item
        : item.hostname || item.domain || item.name || "")
        .toLowerCase().replace(/\.$/, "")
    )
  );

  const normalized = [...new Set(
    (discoveredHosts || [])
      .map(item => String(item).trim().toLowerCase().replace(/\.$/, ""))
      .filter(host =>
        host &&
        host !== parent &&
        host.endsWith("." + parent) &&
        roots.some(root => host === root || host.endsWith("." + root))
      )
  )];

  const newHosts = normalized.filter(host => !existingHosts.has(host));

  const updatedSubdomains = [
    ...existing,
    ...newHosts.map(host => ({
      hostname: host,
      type: "subdomain",
      status: "new",
      discoveredAt: new Date().toISOString()
    }))
  ];

  const relationships = Array.isArray(recon.relationships)
    ? [...recon.relationships]
    : [];

  const existingEdges = new Set(
    relationships.map(edge =>
      `${String(edge.parent || edge.source || "").toLowerCase()}->${String(edge.child || edge.target || "").toLowerCase()}`
    )
  );

  for (const host of newHosts) {
    const edgeKey = `${parent}->${host}`;

    if (!existingEdges.has(edgeKey)) {
      relationships.push({
        parent,
        child: host
      });
      existingEdges.add(edgeKey);
    }
  }

  await updateRecon(reconId, {
    subdomains: updatedSubdomains,
    relationships
  });

  return {
    parent,
    discovered: newHosts,
    count: newHosts.length
  };
}

module.exports = {
    initDB,
    createRecon,
    getAllRecons,
    getRecon,
    updateRecon,
    setDomainStatus,
  saveHuntedSubdomains,
    setDiscoveredSubdomains,
    deleteRecon
};
