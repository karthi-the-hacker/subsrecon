
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const YAML = require("yaml");

const CONFIG_PATH = path.join(__dirname, "config.yaml");




function readConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        throw new Error(`Config file not found: ${CONFIG_PATH}`);
    }

    const config = YAML.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    if (!config || !Array.isArray(config.tools)) {
        throw new Error('Invalid config.yaml: expected "tools" to be a list.');
    }

    return config;
}

function isToolInstalled(tool) {
    if (
        typeof tool !== "string" ||
        !/^[a-zA-Z0-9_.+-]+$/.test(tool)
    ) {
        return false;
    }

    const command = process.platform === "win32"
        ? "where.exe"
        : "which";

    const result = spawnSync(command, [tool], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true
    });

    return !result.error && result.status === 0;
}


function checkTools() {
    const config = readConfig();
    const missingTools = [];

    console.log("\nSubsRecon — Tool Check\n");

    for (const tool of config.tools) {
        const installed = isToolInstalled(tool);

        console.log(
            `${installed ? "[+]" : "[-]"} ${tool}: ${
                installed ? "INSTALLED" : "NOT INSTALLED"
            }`
        );

        if (!installed) {
            missingTools.push(tool);
        }
    }

    console.log("");
    return missingTools;
}


module.exports = {
    readConfig,
    isToolInstalled,
    checkTools
};
