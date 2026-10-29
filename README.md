# SubsRecon

SubsRecon is a subdomain discovery and attack surface intelligence CLI framework designed to support authorized reconnaissance and security assessments.

<div align="center">

![SubsRecon Logo](https://cappriciosec.com/subsrecon/assets/subsrecon.png)

[![GitHub Stars](https://img.shields.io/github/stars/karthi-the-hacker/subsrecon?style=for-the-badge&logo=github&color=00ff41&logoColor=white)](https://github.com/karthi-the-hacker/subsrecon)
[![MIT License](https://img.shields.io/badge/License-MIT-00ff41?style=for-the-badge)](LICENSE)
[![npm version](https://img.shields.io/npm/v/subsrecon?style=for-the-badge&color=00ff41)](https://www.npmjs.com/package/subsrecon)
[![Node Version](https://img.shields.io/badge/Node.js-v18+-00ff41?style=for-the-badge&logo=node.js)](https://nodejs.org/)

</div>

<br>

## 🎯 What is SubsRecon?

**SubsRecon** is a command-line framework for subdomain discovery, DNS reconnaissance, and attack surface intelligence. It is designed for ethical hackers, penetration testers, bug bounty hunters, and security teams conducting assessments within an authorized scope.

SubsRecon aims to help security practitioners:

- ✅ Organize subdomain reconnaissance workflows.
- 🔎 Discover and review subdomains within an authorized scope.
- 🌐 Support DNS and attack-surface investigation workflows.
- 📊 Work with reconnaissance results through the project's supporting interface and data components.
- 🛡️ Improve visibility into an organization's externally exposed assets.

> 🚨 **DISCLAIMER:** SubsRecon is intended for authorized security assessments, educational use, and legitimate bug bounty programs. Only scan systems you own or have explicit permission to assess. Unauthorized reconnaissance may violate laws or program rules.

---

## 📌 Features

- 🔎 **Subdomain Reconnaissance** — Supports subdomain discovery workflows for authorized targets.
- 🌐 **DNS Enumeration Workflow** — Designed for DNS-focused reconnaissance and asset discovery.
- 🧭 **Attack Surface Intelligence** — Helps organize findings for security assessment.
- 🖥️ **Local Service** — The CLI starts the local service on port `9090` when the required tools are available.
- 🧰 **Dependency Checks** — Checks required external tools before continuing.
- 📂 **Reconnaissance Data Support** — Uses lightweight local data components for project workflows.
- 📈 **Visualization Support** — Includes Cytoscape for graph-based visualization where used by the application.

> Feature availability depends on the installed version and the external tools configured in your environment.

---

## ⚠️ Requirements

- GIT CLI
- Node JS
- npm
- subfider
  
---
### ✅ Supported Platforms

| Platform | Support | Notes |
|---|---|---|
| **Debian / Kali / Ubuntu** | ✅ | Recommended for security-testing environments |
| **macOS** | ✅ | Requires Node.js and any configured external tools |
| **Windows** | ⚠️ | Use WSL for a Linux-oriented reconnaissance toolchain |

---

### 📦 Libraries Used

SubsRecon uses the following Node.js packages:

- `cors` — Cross-origin resource sharing.
- `cytoscape` — Graph visualization and network relationships.
- `express` — Web server framework.
- `jsonwebtoken` — JSON Web Token support.
- `lowdb` — Lightweight JSON database.
- `yaml` — YAML parsing and processing.

> 💡 **Tip:** Use a current Node.js LTS release and keep dependencies updated.

---

## ⚡Installation and Config

```bash
# Install globally
npm install subsrecon -g
````

```bash
# Start the subsrecon tool
subsrecon
```

* Open the Admin page: `https://cappriciosec.com/subsrecon`
  👉 [Click here to open](https://cappriciosec.com/subsrecon) and log in.

| Parameter  | Type     | Default Credentials   |
| :--------- | :------- | :-------------------- |
| `username` | `string` | `cappriciosec`        |
| `password` | `string` | `cappriciosec` |

> 🚨 **Note:**
> Before opening the webpage, make sure the **subsrecon tool is running locally**.
> This URL internally checks `http://localhost:9090` to verify whether the service is running.
>
> * If the local service is running, the **login page** will be displayed.
> * If it is not running, you will be **redirected to the landing page**.
> * If you're a CamJacking user, you can use your existing CamJacking login credentials to log in to SubsRecon, as both tools share the same configuration file: `~/db/maindb.json`.

After logging in with the default credentials, you can **update your username and password** from the Admin Dashboard.

### Local service

When the required tools are available, the current CLI entry point starts the local service on port `9090`.

```text
http://localhost:9090
```

The exact pages and routes available depend on the version of the local service included in your installation.

---

## ⚡ Quick Start

To start a new campaign, simply run:

```bash
subsrecon
````

You will be greeted with the main menu:

```bash
┌──(Hacker@linux)-[~]
└─$ subsrecon
                                                                      v1.0.0
███████╗██╗   ██╗██████╗ ███████╗██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║
███████╗██║   ██║██████╔╝███████╗██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║
╚════██║██║   ██║██╔══██╗╚════██║██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║
███████║╚██████╔╝██████╔╝███████║██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝            
                                                    Author: @karthithehacker
                                                    Website: karthithehacker.com



[+] Login  URL: https://cappriciosec.com/subsrecon/
[+] API running at: http://localhost:9090/
[+] Enter x to stop the server
[✓] Server running on port 9090
```




SubsRecon checks its configured external dependencies before starting the local service. If required tools are missing, install them and run the command again.

### 🧰 Dependency Check

If SubsRecon reports missing tools:

1. Read the names shown in the terminal.
2. Install the required tools using their official installation instructions.
3. Confirm that each tool is available in your system's `PATH`.
4. Restart SubsRecon.

Check your Node.js and npm versions:

```bash
node --version
npm --version
```

---


### Required tools are missing

SubsRecon checks required external tools at startup. Install the tools reported by the dependency checker and make sure their executable paths are available to your terminal.

### The local service does not open

- Confirm that SubsRecon is still running.
- Check whether port `9090` is already in use.
- Review the terminal output for startup errors.
- Confirm that your firewall or local security software is not blocking local access.

---

## 🔐 Responsible Use

SubsRecon is intended for legitimate security work, including:

- Authorized penetration testing.
- Bug bounty programs within their published scope.
- Internal asset inventory and attack-surface reviews.
- Cybersecurity education and lab environments.

Always verify the scope and rules of engagement before running reconnaissance. Do not use the tool against systems without permission.

---

## 🔮 Planned Features

Future improvements may include additional reconnaissance integrations, reporting improvements, and expanded attack-surface visualization. Planned features are subject to development and release.

---
## 🎯 Our Mission

Our mission is to make **cybersecurity simple, accessible, and easy for everyone**.

We believe that while experienced hackers and security professionals may love the command line, **powerful tools shouldn’t be limited to complex commands and scripts**. Our goal is to build cybersecurity tools that are:

- ✅ Easy to install  
- 🧭 Simple to navigate  
- 🔢 Menu-driven (numeric options instead of hard commands)  
- 🖥️ Friendly for beginners with a clean GUI  
- 🎓 Designed to help learners understand cybersecurity concepts easily  

We aim to bridge the gap between **beginners and professionals** by creating tools that combine the **power of CLI** with the **simplicity of modern user interfaces**, making cybersecurity learning and practice more approachable for everyone.

> 💡 *“Cybersecurity should be powerful, but it should also be simple.”*


## 👨‍💻 Authors

**KarthiTheHacker**  
- 🌐 Website: [karthithehacker.com](https://karthithehacker.com)  
- 🐙 GitHub: [@karthi-the-hacker](https://github.com/karthi-the-hacker)  
- 🛠️ Contributions: Core CLI, database layer, APIs, authentication, and core backend logic  


<p align="center">
<  <em>Built by hackers who care about security — Team Cappricio Securities.</em> /><br/> 
  <a href="https://www.cappriciosec.com">www.cappriciosec.com</a>
</p>
