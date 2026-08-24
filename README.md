# 🤖 ProtoBot

ProtoBot is a feature-rich, customizable Discord interaction bot built with **`discord.js` v14** and running on **Node.js**. It comes with dynamic command loading, a GitHub API-synced user tag system, species-aware interactions, community command submission templates, and an Express server setup for 24/7 uptime hosting.

---

## ✨ Features

* **Dynamic Command Handler:** Automatically reads and registers all interaction commands directly from the `commands/` directory on boot.
* **Community Submissions (`/command`):** Includes built-in command templates allowing users to create, test, and suggest custom interactions directly to the bot owner for official approval.
* **Tag & Immunity System (`/tag`):** GitHub-backed persistent user tag management, including custom tag slots, species tags, and Pale Virus immunity keywords[span_0](start_span)[span_0](end_span).
* **Species-Aware Interactions (`/feed`):** Cybernetic species (Protogens, Primagens, Synths) can consume RAM and batteries, while non-cybernetic users trigger realistic choking and physical indigestion responses.
* **Cross-Context & Server Support:** Fully configured for both Server Installations (Guild Apps) and User App Installations across servers, DMs, and group chats.
* **Custom Bot Emojis:** Native integration of custom Discord emojis across interaction responses for maximum visual flavor.
* **24/7 Uptime Ready:** Integrated Express HTTP server for automated health checks and keep-alive pinging on web hosts.
* **Copyleft Protected:** Licensed under GNU AGPLv3 to ensure derivative versions remain open source and give credit to original contributors.

---

## ⚙️ Commands List

### 🏷️ Management, Submissions & Tools
* `/command` — Generates custom command templates and guides for users to design and upload their own interactions.
* `/tag` — Manage custom user tags, assign species roles, and configure Pale Virus immunity rules[span_1](start_span)[span_1](end_span).
* `/suggestion` — Submit feature ideas, custom command code, or bug reports directly to the host.
* `/config` — Manage global bot configurations and response settings.
* `/changelog` — View the latest updates and additions to ProtoBot.
* `/help` — Display detailed command information and usage guides.

### 🎮 Roleplay & Interactions
* `/bap` — Gently bap a target user.
* `/bite` — Take a bite out of a target user.
* `/blow-up` — Trigger a dramatic explosion event for a target.
* `/carry` — Carry a target user (includes self-carry physics glitches).
* `/cheese` — Slap a slice of cheese onto someone's face.
* `/dropkick` — Deliver a high-impact dropkick to a target user.
* `/feed` — Feed yourself or a target (RAM/batteries for cybernetic species, fish/pastries/junk for everyone).
* `/fight` — Start a chaotic cartoon brawl or 1v1 duel with custom knockouts and RAM clashes.
* `/goober` — Interact with your target like a complete goober.
* `/hamburger` — Serve up a fresh hamburger.
* `/hit` — Whack someone with a random object (e.g., metal pipe, DDR5 RAM) or a custom item.
* `/hug` — Give a warm or customized hug.
* `/infect` — Attempt to spread the Pale Virus to a target user.
* `/kidnap` — Initiate a stealthy kidnapping sequence.
* `/kiss` — Send an affection-filled kiss.
* `/maid-dress` — Force a targeted user (or yourself) into a frilly maid dress.
* `/meow` — Meow playfully at someone.
* `/murder` — Trigger a dramatic elimination sequence.
* `/overclock` — Forcefully overclock someone's system core (requires Protogen/Primagen/Synth tag).
* `/pat` — Pat a targeted user on the head.
* `/photo` — Take a quick snapshot of a target.
* `/revive` — Revive a knocked-out user back into action.
* `/snap` / `/snapconfig` — Trigger the Thanos snap event or adjust its drop chances.
* `/springlock` — Initiate a FNAF-style springlock failure sequence.
* `/strangle` — Initiate a wrestling-style strangle move.
* `/thing` — Send a completely unexplainable object toward someone.
* `/transfur` / `/transfurconfig` — Transform a target or yourself with latex mechanics.
* `/trip` — Trigger a sudden stumble or trip event.
* `/yeet` — Launch a targeted user into orbit.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16.9.0 or higher)
* **GitHub Personal Access Token** (with `repo` scope for `tags.json` syncing)[span_2](start_span)[span_2](end_span)
* **Discord Bot Application Token**

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Agro388-owo/ProtoBot.git](https://github.com/Agro388-owo/ProtoBot.git)
   cd ProtoBot

 * Install dependencies:
   npm install discord.js express

 * Configure Environment Variables:
   Create a .env file or set the following variables in your hosting panel:
   TOKEN=your_discord_bot_token
GITHUB_TOKEN=your_github_personal_access_token
OWNER_ID=your_discord_user_id

 * Launch ProtoBot:
   node index.js

📄 License
ProtoBot is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
Under this license, you are free to fork, host, and modify ProtoBot, provided that:
 * All modified or derivative versions hosted publicly must remain open source under AGPL-3.0.
 * Original copyright notices and contributor credits are preserved.
 * Full source code is made accessible to all users interacting with the instance
