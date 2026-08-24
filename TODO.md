# 🛠️ ProtoBot — Development Roadmap & TODO List

Track active tasks, upcoming features, bug fixes, and long-term milestones for ProtoBot.

---

## 📌 High Priority & Licensing

- [x] **Transition to AGPL-3.0 License**
  - [x] Replace [LICENSE](LICENSE) file text with full AGPL v3.0 declaration.
  - [x] Update `"license": "AGPL-3.0-only"` in `package.json`.
  - [x] Add license header/notice in `README.md`.
- [ ] **Tag System Optimization (`tags.json`)**
  - [ ] Enhance fallback handling if GitHub API rate limits are hit.
  - [ ] Add command options to remove/manage individual user tags easily.

---

## ⚡ Active Command Tasks & Submissions

- [x] **Community Submission System (`/command` & `/suggestion`)**
  - [x] Create built-in command templates and submission forms for users.
  - [x] Build flow for owner approval of incoming submission code.
- [x] **Species & Custom Mechanics**
  - [x] Build `/feed` food matrices for non-cybernetic vs. cybernetic targets.
  - [x] Refine Pale Virus infection rates and immunity triggers in `/infect` and `/transfur`.
- [ ] **Command Code Polish**
  - [ ] Standardize custom emoji fallbacks across all interaction response strings.
  - [ ] Add auto-deletion reaction collectors across remaining roleplay commands.
  - [ ] Refine /help command.       
---

## 🌐 Server Integration & Host Management

- [ ] **User App vs. Guild Contexts**
  - [ ] Verify all command builders use `.setIntegrationTypes([0, 1])` and `.setContexts([0, 1, 2])`.
  - [ ] Test cross-server execution stability when installed as a User App.
- [ ] **24/7 Hosting Health**
  - [ ] Optimize Express HTTP server keep-alive endpoints for Render / Pterodactyl hosting.
  - [ ] Add structured error logging for failed command executions in console.

---

## 💡 Future Feature Backlog

- [ ] Add `/profile` command showing user tags, species status, and interaction stats.
- [ ] Create dynamic `/fight` duel balancing based on assigned user tags.
- [ ] Implement custom server-wide toggle for specific interaction commands (`/transfurconfig`, `/snapconfig`).
