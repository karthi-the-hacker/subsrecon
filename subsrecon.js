#!/usr/bin/env node
/**
 * SubsRecon - Subdomain Discovery & Attack Surface Intelligence (CLI)
 * -------------------------------------------------------------------
 *
 * Author      : Karthikeyan (https://karthithehacker.com)
 * LinkedIn    : https://www.linkedin.com/in/karthikeyan--v/
 * GitHub      : https://github.com/karthi-the-hacker
 * Project     : SubsRecon - A CLI framework for subdomain discovery,
 *               DNS enumeration, reconnaissance, and attack surface
 *               intelligence for authorized security assessments.
 *
 * Website     : https://cappriciosec.com/subsrecon
 *
 * License     : Open-source — subject to the project's applicable license.
 *
 * Note to Users:
 * --------------
 * 🔐 This tool is intended for educational use, security research,
 *    authorized penetration testing, and legitimate bug bounty programs.
 * 🚫 Unauthorized reconnaissance against systems without permission is
 *    prohibited and may violate applicable laws or program policies.
 * ❗ If you use or modify this code, PLEASE GIVE PROPER CREDIT to the
 *    original author and repository.
 *
 * Warning to Code Thieves:
 * ------------------------
 * ❌ Removing attribution or claiming this project as your own without
 *    credit is unethical and undermines open-source community principles.
 * 🧠 Writing your own code earns respect. Copying without attribution does not.
 * ✅ Be an ethical hacker. Respect developers' efforts and give credit
 *    where it is due.
 */

const { mainbanner, showBanner, clearScreen } = require("./includes/banner");
const { checkTools } = require("./includes/utils");
const { startServer } = require("./includes/server");
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";


try {
    // Check dependencies first
    const missingTools = checkTools();

    if (missingTools.length > 0) {
        clearScreen();
        mainbanner("v1.0.0");
        console.log(`\n${RED}[!] Missing required tools:${RESET}`);

        for (const tool of missingTools) {
            console.log(`${RED}[-] ${tool}: NOT INSTALLED${RESET}`);
        }

        console.log(`${RED}\n[!] Please install the missing tools before running SubsRecon.${RESET}\n`);
        process.exit(1);
    }

    clearScreen();
    const server = startServer(9090);
    showBanner("v1.0.0");


} catch (error) {
    clearScreen();
    mainbanner("v1.0.0");
    console.error(`${RED}[ERROR] ${error.message}${RESET}`);
    process.exit(1);
}