
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const dbgateway = require("./dbgateway");

const SUBFINDER_BIN = process.env.SUBFINDER_BIN || "subfinder";

function normalizeHostname(hostname) {
    return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isValidHostname(hostname) {
    if (
        typeof hostname !== "string" ||
        hostname.length === 0 ||
        hostname.length > 253
    ) {
        return false;
    }

    return hostname.split(".").every(label =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ) && hostname.includes(".");
}

function runSubfinder(domainsFile, outputFile) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            SUBFINDER_BIN,
            ["-dL", domainsFile, "-o", outputFile, "-all"],
            { stdio: ["ignore", "ignore", "pipe"] }
        );

        let stderr = "";

        child.stderr.setEncoding("utf8");
        child.stderr.on("data", chunk => {
            stderr += chunk;
        });

        child.on("error", error => {
            reject(
                error.code === "ENOENT"
                    ? new Error("Subfinder not found. Install it or set SUBFINDER_BIN.")
                    : error
            );
        });

        child.on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(
                    `Subfinder exited with code ${code}: ${stderr.trim()}`
                ));
            }
        });
    });
}

function readDiscoveredSubdomains(outputFile, roots) {
    if (!fs.existsSync(outputFile)) {
        return [];
    }

    const output = fs.readFileSync(outputFile, "utf8");
    const discovered = new Set();

    for (const line of output.split(/\r?\n/)) {
        if (!line.trim()) continue;

        const hostname = normalizeHostname(line);

        if (!isValidHostname(hostname)) continue;

        // Exclude root domains and anything outside configured scope.
        const inScope = roots.some(root =>
            hostname.endsWith(`.${root}`)
        );

        if (inScope) {
            discovered.add(hostname);
        }
    }

    return [...discovered].sort();
}

function buildTree(discovered, roots, previousSubdomains = []) {
    const discoveredSet = new Set(discovered);

    const previousMap = new Map(
        previousSubdomains.map(item => [item.hostname, item])
    );

    const now = new Date().toISOString();

    const subdomains = discovered.map(hostname => {
        const rootDomain = roots
            .filter(root => hostname.endsWith(`.${root}`))
            .sort((a, b) => b.length - a.length)[0];

        const relativeLabels = hostname
            .slice(0, -(rootDomain.length + 1))
            .split(".");

        // Default parent is the root domain.
        let parent = rootDomain;

        // Find the closest discovered ancestor.
        for (let i = 1; i < relativeLabels.length; i++) {
            const candidate =
                `${relativeLabels.slice(i).join(".")}.${rootDomain}`;

            if (discoveredSet.has(candidate)) {
                parent = candidate;
                break;
            }
        }

        const previous = previousMap.get(hostname);

        return {
            hostname,
            rootDomain,
            parent,
            depth: relativeLabels.length,
            source: "subfinder",
            firstSeenAt: previous?.firstSeenAt || now,
            lastSeenAt: now
        };
    });

    const relationships = subdomains.map(item => ({
        parent: item.parent,
        child: item.hostname,
        type: "subdomain"
    }));

    return { subdomains, relationships };
}

async function runRecon(reconId) {
    const recon = dbgateway.getRecon(reconId);

    if (!recon) {
        throw new Error(`Recon not found: ${reconId}`);
    }

    const roots = [...new Set(
        (recon.domains || []).map(normalizeHostname)
    )];

    if (!roots.length || !roots.every(isValidHostname)) {
        throw new Error("Recon contains invalid root domains");
    }

    const dbDir = path.join(os.homedir(), "db", "subsrecon");
    const reconPath = path.join(dbDir, `${reconId}.json`);

    if (!fs.existsSync(reconPath)) {
        throw new Error("Recon JSON database file not found");
    }

    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "subsrecon-")
    );

    const domainsFile = path.join(tempDir, "domains.txt");
    const outputFile = path.join(tempDir, "outtmp.txt");

    const startedAt = new Date().toISOString();

    try {
        fs.writeFileSync(
            domainsFile,
            `${roots.join("\n")}\n`,
            "utf8"
        );

        dbgateway.updateRecon(reconId, {
            status: "running",
            completedAt: null
        });

        const data = JSON.parse(
            fs.readFileSync(reconPath, "utf8")
        );

        data.scan = data.scan || {};
        data.scan.startedAt = startedAt;
        data.scan.completedAt = null;
        data.scan.errors = [];
        data.status = "running";

        fs.writeFileSync(
            reconPath,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        console.log(`[+] Running Subfinder for ${roots.length} root domain(s)`);

        await runSubfinder(domainsFile, outputFile);

        const discovered = readDiscoveredSubdomains(
            outputFile,
            roots
        );

        const latestData = JSON.parse(
            fs.readFileSync(reconPath, "utf8")
        );

        const tree = buildTree(
            discovered,
            roots,
            latestData.subdomains || []
        );

        const completedAt = new Date().toISOString();

        latestData.domains = roots;
        latestData.domainCount = roots.length;
        latestData.subdomains = tree.subdomains;
        latestData.subdomainCount = tree.subdomains.length;
        latestData.relationships = tree.relationships;
        latestData.status = "completed";
        latestData.completedAt = completedAt;
        latestData.lastUsedAt = completedAt;
        latestData.scan.completedAt = completedAt;

        const tempDatabase = `${reconPath}.tmp`;

        fs.writeFileSync(
            tempDatabase,
            JSON.stringify(latestData, null, 2),
            "utf8"
        );

        fs.renameSync(tempDatabase, reconPath);

        dbgateway.updateRecon(reconId, {
            status: "completed",
            completedAt
        });

        // Sync the discovered count into the registry.
        dbgateway.setDiscoveredSubdomains(reconId, discovered);

        console.log("[+] Recon completed");
        console.log(`    Root domains: ${roots.length}`);
        console.log(`    Discovered subdomains: ${discovered.length}`);

        return {
            success: true,
            id: reconId,
            domainCount: roots.length,
            subdomainCount: discovered.length
        };
    } catch (error) {
        try {
            dbgateway.updateRecon(reconId, {
                status: "failed",
                completedAt: new Date().toISOString()
            });

            const failedData = JSON.parse(
                fs.readFileSync(reconPath, "utf8")
            );

            failedData.status = "failed";
            failedData.lastUsedAt = new Date().toISOString();
            failedData.scan = failedData.scan || {};
            failedData.scan.completedAt = failedData.lastUsedAt;
            failedData.scan.errors = [
                ...(failedData.scan.errors || []),
                error.message
            ];

            fs.writeFileSync(
                reconPath,
                JSON.stringify(failedData, null, 2),
                "utf8"
            );
        } catch (saveError) {
            console.error("[-] Could not save failure status:", saveError.message);
        }

        throw error;
    } finally {
        fs.rmSync(tempDir, {
            recursive: true,
            force: true
        });
    }
}


function runSubfinderForDomain(hostname) {
  return new Promise((resolve, reject) => {
    const bin = process.env.SUBFINDER_BIN || "subfinder";
    const output = [];
    let stderr = "";

    const child = spawn(
      bin,
      ["-d", hostname, "-silent"],
      {
        shell: false,
        windowsHide: true,
        timeout: 120000
      }
    );

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", chunk => output.push(chunk));
    child.stderr.on("data", chunk => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", code => {
      if (code !== 0) {
        return reject(
          new Error(stderr.trim() || `Subfinder exited with code ${code}`)
        );
      }

      const hosts = output
        .join("")
        .split(/\r?\n/)
        .map(host => host.trim().toLowerCase().replace(/\.$/, ""))
        .filter(Boolean);

      resolve([...new Set(hosts)]);
    });
  });
}

async function huntSubdomains(reconId, hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (!host || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/.test(host)) {
    throw new Error("Invalid hostname.");
  }

  const recon = await dbgateway.getRecon(reconId);
  if (!recon) throw new Error("Recon not found.");

  const roots = (recon.domains || [])
    .map(item => typeof item === "string"
      ? item
      : item.hostname || item.domain || item.name || "")
    .map(item => String(item).toLowerCase().replace(/\.$/, ""));

  if (!roots.some(root => host === root || host.endsWith("." + root))) {
    throw new Error("Hostname is outside the configured recon scope.");
  }

  const discovered = await runSubfinderForDomain(host);

  // Persist only descendants of the selected host and its configured scope.
  const valid = discovered.filter(found =>
    found !== host &&
    found.endsWith("." + host) &&
    roots.some(root => found === root || found.endsWith("." + root))
  );

  return dbgateway.saveHuntedSubdomains(reconId, host, valid);
}

module.exports = { runRecon };
module.exports.huntSubdomains = huntSubdomains;

if (require.main === module) {
    const reconId = process.argv[2];

    if (!reconId) {
        console.error("Usage: node runner.js <recon-uuid>");
        process.exitCode = 1;
    } else {
        runRecon(reconId).catch(error => {
            console.error(`[-] Recon failed: ${error.message}`);
            process.exitCode = 1;
        });
    }
}
