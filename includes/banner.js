


/**
 * SubsRecon - Subdomain Reconnaissance & Attack Surface Intelligence Toolkit
 * ----------------------------------------------------------------------------
 *
 * Author      : Karthikeyan (https://karthithehacker.com)
 * GitHub      : https://github.com/karthi-the-hacker/subsrecon
 * Project     : SubsRecon - A Node.js CLI toolkit for subdomain reconnaissance,
 *               target management, and interactive attack surface visualization.
 *
 * License     : Open-source — intended for educational purposes and authorized
 *               security testing ONLY.
 *
 * Note to Users:
 * --------------
 * 🔐 Use this tool only on assets you own or are authorized to assess.
 * 🚫 Unauthorized reconnaissance may violate applicable laws or program scope.
 * ❗ Please credit the original author when using or modifying this project.
 *
 * banner.js
 */

const RED = "\x1b[31m";
const ORANGE = "\x1b[38;5;208m";
const CYAN = "\x1b[36m";
const PURPLE = "\x1b[35m";
const GREEN = "\x1b[32m";
const WHITE = "\x1b[37m";
const RESET = "\x1b[0m";

function mainbanner(version = "v1.0.0") {
  console.clear();

  const banner = `
${ORANGE}
                                                                      ${RESET}${version}${ORANGE}
███████╗██╗   ██╗██████╗ ███████╗██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║
███████╗██║   ██║██████╔╝███████╗██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║
╚════██║██║   ██║██╔══██╗╚════██║██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║
███████║╚██████╔╝██████╔╝███████║██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝            ${RESET}
                                                    Author: @karthithehacker${RESET}
                                                    Website: karthithehacker.com${RESET}

`;

  console.log(banner);
}

function showBanner(version = "v1.0.0") {
  console.clear();

  const banner = `

                                                                      ${RESET}${version}${ORANGE}
███████╗██╗   ██╗██████╗ ███████╗██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║
███████╗██║   ██║██████╔╝███████╗██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║
╚════██║██║   ██║██╔══██╗╚════██║██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║
███████║╚██████╔╝██████╔╝███████║██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝            ${RESET}
                                                    Author: @karthithehacker${RESET}
                                                    Website: karthithehacker.com${RESET}


`;


  console.log(banner);
   console.log(
        `${WHITE}[+] Login  URL: ${RESET}${ORANGE}https://cappriciosec.com/subsrecon/${RESET}`
    );

    console.log(
        `${WHITE}[+] API running at: ${RESET}${ORANGE}http://localhost:9090/${RESET}`
    );

    console.log(
        `${WHITE}[+] Enter ${ORANGE}x${WHITE} to stop the server${RESET}`
    );

    console.log(
        `${ORANGE}[✓]${RESET} ${WHITE}Server running on port ${ORANGE}9090${RESET}`
    );
}


function clearScreen() {
    console.clear();
}
module.exports = {
  showBanner,
  mainbanner,
  clearScreen
};
