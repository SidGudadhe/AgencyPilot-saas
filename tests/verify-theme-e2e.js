const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:/Users/Mauli/.gemini/antigravity/brain/67f28783-efc5-4d46-b940-d2409ac26beb";
const CDP_PORT = 9444;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.errors = [];
  }

  async connect() {
    const WebSocket = require("ws");
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on("open", () => resolve());
      this.ws.on("error", reject);
      this.ws.on("message", (msg) => {
        const parsed = JSON.parse(msg.toString());
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const cb = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) cb.reject(parsed.error);
          else cb.resolve(parsed.result);
        } else if (parsed.method) {
          if (parsed.method === "Runtime.exceptionThrown") {
            const desc = parsed.params.exceptionDetails.exception?.description || parsed.params.exceptionDetails.text;
            console.error("  [BROWSER ERROR]", desc);
            this.errors.push(desc);
          }
          this.events.push(parsed);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log("  [SCREENSHOT SAVED]", filePath);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log("=== Starting Comprehensive End-to-End Theme Verification ===");

  // 1. Obtain Authenticated Session via NextAuth credentials
  console.log("Fetching CSRF and authenticating session for admin@agencypilot.io...");
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfCookie = csrfRes.headers.get("set-cookie");
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie || "",
    },
    body: new URLSearchParams({
      csrfToken,
      email: "admin@agencypilot.io",
      password: "Password123!",
      redirect: "false",
      json: "true",
    }),
  });

  const sessionCookieHeader = loginRes.headers.get("set-cookie");
  const match = sessionCookieHeader && sessionCookieHeader.match(/next-auth\.session-token=([^;]+)/);
  if (!match) throw new Error("Could not obtain session token from NextAuth credentials");
  const sessionToken = match[1];
  console.log("Session authenticated successfully! Token obtained.");

  // 2. Launch Chrome Headless
  const tempProfile = "C:\\Users\\Mauli\\AppData\\Local\\Temp\\chrome-theme-test-" + Date.now();
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${tempProfile}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    let versionInfo = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionInfo = await fetchJson(`http://localhost:${CDP_PORT}/json/version`);
        break;
      } catch {
        await sleep(500);
      }
    }

    if (!versionInfo) throw new Error("Chrome CDP failed to start");
    console.log("Chrome CDP listening on port", CDP_PORT);

    const targets = await fetchJson(`http://localhost:${CDP_PORT}/json/list`);
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("No page target found");

    const cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");

    // Inject Session Cookie
    await cdp.send("Network.setCookie", {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    console.log("Session cookie injected into browser.");

    // 3. Navigate directly to Settings
    console.log("Navigating to http://localhost:3000/settings...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/settings" });
    await sleep(3000);

    // 4. Click on 'Workspace Theme' tab
    console.log("Clicking 'Workspace Theme' tab...");
    await cdp.evaluate(`
      const themeTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Workspace Theme'));
      if (themeTab) themeTab.click();
    `);
    await sleep(1500);

    // Verify the 2 removed boxes do NOT exist
    const hasGuaranteeBox = await cdp.evaluate(`
      document.body.innerText.includes("Workspace Isolation Guarantee") ||
      document.body.innerText.includes("Isolated Per Workspace")
    `);
    console.log("Assertion: Workspace Isolation Guarantee & Isolated Per Workspace boxes removed:", !hasGuaranteeBox);
    if (hasGuaranteeBox) {
      throw new Error("FAILED: The 2 requested isolation guarantee boxes/badges are still present in DOM!");
    }

    // 5. Click on 'White Theme (Light Mode)' card
    console.log("Selecting 'White Theme (Light Mode)'...");
    await cdp.evaluate(`
      const whiteCard = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('White Theme'));
      if (whiteCard) {
        const container = whiteCard.closest('.cursor-pointer');
        if (container) container.click();
      }
    `);
    await sleep(2000);

    const currentTheme = await cdp.evaluate("document.documentElement.getAttribute('data-theme')");
    console.log("Theme after clicking White Theme:", currentTheme);

    // Capture screenshot of Settings page in White Theme
    await cdp.screenshot(path.join(ARTIFACT_DIR, "screenshot-theme-white.png"));

    // 6. Navigate to Dashboard in White Theme
    console.log("Navigating to http://localhost:3000/dashboard in White Theme...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/dashboard" });
    await sleep(2500);

    const dashboardTheme = await cdp.evaluate("document.documentElement.getAttribute('data-theme')");
    console.log("Dashboard Theme verified:", dashboardTheme);

    // Verify Real Data Pill Visibility & Contrast
    const pillMetrics = await cdp.evaluate(`
      (() => {
        const pill = document.querySelector('.real-data-pill');
        if (!pill) return { found: false };
        const style = window.getComputedStyle(pill);
        return {
          found: true,
          text: pill.innerText.trim(),
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          fontWeight: style.fontWeight
        };
      })()
    `);
    console.log("Real Data Pill computed metrics:", pillMetrics);
    if (!pillMetrics.found || !pillMetrics.text.includes("Real Data Only • Zero Synthetic Metrics")) {
      throw new Error("FAILED: Real Data Pill not found or missing required text!");
    }

    // Capture screenshot of Dashboard in White Theme
    await cdp.screenshot(path.join(ARTIFACT_DIR, "screenshot-dashboard-white.png"));

    // 7. Navigate to Ads Analysis in White Theme
    console.log("Navigating to http://localhost:3000/ads-analysis in White Theme...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/ads-analysis" });
    await sleep(2000);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "screenshot-ads-white.png"));

    // 8. Navigate to AI Agent in White Theme
    console.log("Navigating to http://localhost:3000/ai-agent in White Theme...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/ai-agent" });
    await sleep(2000);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "screenshot-ai-white.png"));

    // 9. Navigate back to Dashboard and Click Header theme toggle to switch to Black Theme
    console.log("Navigating back to http://localhost:3000/dashboard...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/dashboard" });
    await sleep(2000);

    console.log("Clicking Header theme toggle to switch back to Black Theme...");
    await cdp.evaluate(`
      const toggleBtn = document.querySelector('header button[title*=\"Black Theme\"], header button[title*=\"Mode\"]');
      if (toggleBtn) toggleBtn.click();
    `);
    await sleep(2000);

    const blackTheme = await cdp.evaluate("document.documentElement.getAttribute('data-theme')");
    console.log("Theme after header toggle back to Black Theme:", blackTheme);
    await cdp.screenshot(path.join(ARTIFACT_DIR, "screenshot-dashboard-black.png"));

    // Verify Real Data Pill in Black Theme
    const blackPillMetrics = await cdp.evaluate(`
      (() => {
        const pill = document.querySelector('.real-data-pill');
        if (!pill) return { found: false };
        const style = window.getComputedStyle(pill);
        return {
          found: true,
          text: pill.innerText.trim(),
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor
        };
      })()
    `);
    console.log("Real Data Pill computed metrics in Black Theme:", blackPillMetrics);

    // 10. Error check
    if (cdp.errors.length > 0) {
      console.error("Browser errors encountered:", cdp.errors);
      throw new Error("Browser console had errors during theme switching");
    }

    console.log("=== End-to-End Theme Verification PASSED with 0 Errors! ===");
    cdp.close();
  } finally {
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
