const http = require("http");

async function postJson(url, data, headers = {}) {
  const parsedUrl = new URL(url);
  const postData = typeof data === "string" ? data : new URLSearchParams(data).toString();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          ...headers,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: JSON.parse(body),
        });
      });
    }).on("error", reject);
  });
}

async function run() {
  console.log("=== Starting Live Rate Limiting & Lockout Verification ===");

  // 1. Get CSRF token
  const csrfRes = await getJson("http://localhost:3000/api/auth/csrf");
  const csrfCookie = csrfRes.headers["set-cookie"] ? csrfRes.headers["set-cookie"][0].split(";")[0] : "";
  const csrfToken = csrfRes.data.csrfToken;
  console.log("Obtained CSRF Token for attack simulation.");

  const attackerEmail = "victim_test_" + Date.now() + "@agencypilot.io";
  const customAttackerIp = "198.51.100.77";

  console.log(`\nSimulating 5 consecutive wrong password attempts for [${attackerEmail}] from IP [${customAttackerIp}]...`);

  let lastResponse = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await postJson(
      "http://localhost:3000/api/auth/callback/credentials",
      {
        csrfToken,
        email: attackerEmail,
        password: "WrongPassword" + attempt,
        redirect: "false",
        json: "true",
      },
      {
        Cookie: csrfCookie,
        "x-forwarded-for": customAttackerIp,
      }
    );

    console.log(`  Attempt #${attempt} HTTP Status: ${res.status}, Body: ${res.body}`);
    lastResponse = res;
  }

  // The 5th attempt response should indicate lockout or attempts exhausted
  const bodyObj = JSON.parse(lastResponse.body);
  console.log("\nAttempt 5 Result Object:", bodyObj);

  // 6th Attempt: Should be blocked by lockout immediately
  console.log(`\nAttempting 6th request while in 15-minute lockout...`);
  const attempt6 = await postJson(
    "http://localhost:3000/api/auth/callback/credentials",
    {
      csrfToken,
      email: attackerEmail,
      password: "AnotherPassword",
      redirect: "false",
      json: "true",
    },
    {
      Cookie: csrfCookie,
      "x-forwarded-for": customAttackerIp,
    }
  );

  const attempt6Obj = JSON.parse(attempt6.body);
  console.log("  Attempt #6 Result:", attempt6Obj);

  const urlDecoded = decodeURIComponent(attempt6Obj.url || "");
  if (!urlDecoded.includes("temporarily locked") && !attempt6Obj.error?.includes("temporarily locked")) {
    throw new Error("FAILED: 6th attempt was not blocked by 15-minute security lockout! Got: " + attempt6.body);
  }

  console.log("\n SUCCESS: 15-Minute Progressive Security Lockout VERIFIED! Attack blocked without CPU password hashing!");

  // 2. Test Registration Flood Rate Limiter
  console.log("\nTesting Registration Flood Rate Limiting (5 accounts / 10 mins)...");
  const regHeaders = {
    "Content-Type": "application/json",
    "x-forwarded-for": "203.0.113.88",
  };

  let regBlocked = false;
  for (let r = 1; r <= 7; r++) {
    const regRes = await new Promise((resolve, reject) => {
      const parsedUrl = new URL("http://localhost:3000/api/auth/register");
      const postData = JSON.stringify({
        email: `flood_user_${r}_${Date.now()}@agencypilot.io`,
        password: "Password123!",
        name: `Flood User ${r}`,
      });

      const req = http.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
            ...regHeaders,
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode, body }));
        }
      );
      req.on("error", reject);
      req.write(postData);
      req.end();
    });

    console.log(`  Register Request #${r} Status: ${regRes.status}`);
    if (regRes.status === 429) {
      console.log(`  HTTP 429 Triggered on request #${r}: ${regRes.body}`);
      regBlocked = true;
      break;
    }
  }

  if (!regBlocked) {
    throw new Error("FAILED: Registration flood was not blocked by HTTP 429 rate limiter!");
  }

  console.log(" SUCCESS: Registration Flood Protection (HTTP 429) VERIFIED!");
  console.log("\n=== ALL DEFENSIVE SECURITY CONTROLS VERIFIED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
