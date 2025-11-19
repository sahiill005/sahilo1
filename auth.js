
// ===============================
//        AWS COGNITO CONFIG
// ===============================
const COGNITO_DOMAIN = "https://ap-south-1yzdd1yqun.auth.ap-south-1.amazoncognito.com";
const CLIENT_ID = "4jeul47opmuiuo5o4vipii9hdf";

// Your deployed production website:
const SITE_ROOT = "https://sahilo1.vercel.app";
const REDIRECT_URI = `${SITE_ROOT}/index.html`;
const LOGOUT_REDIRECT_URI = `${SITE_ROOT}/index.html`;

// Build login + signup URLs
function buildLoginUrl({ screenHint = null } = {}) {
  let url = `${COGNITO_DOMAIN}/login?client_id=${encodeURIComponent(CLIENT_ID)}` +
            `&response_type=token&scope=${encodeURIComponent("openid email profile")}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  if (screenHint) url += `&screen_hint=${encodeURIComponent(screenHint)}`;
  return url;
}

const LOGIN_URL = buildLoginUrl();
const SIGNUP_URL = buildLoginUrl({ screenHint: "signup" }); 
const LOGOUT_URL =
  `${COGNITO_DOMAIN}/logout?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&logout_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;


// ===============================
//             UTILS
// ===============================
function parseHashTokens(hash) {
  if (!hash) return null;
  const cleaned = hash.startsWith("#") ? hash.substring(1) : hash;
  if (!cleaned.includes("=")) return null;

  const params = new URLSearchParams(cleaned);
  return {
    id_token: params.get("id_token"),
    access_token: params.get("access_token"),
    expires_in: params.get("expires_in")
  };
}

function parseJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    console.error("JWT parse error", e);
    return null;
  }
}

function saveTokens(tokens) {
  if (tokens.id_token) localStorage.setItem("id_token", tokens.id_token);
  if (tokens.access_token) localStorage.setItem("access_token", tokens.access_token);
  if (tokens.expires_in) {
    const expiry = Date.now() + Number(tokens.expires_in) * 1000;
    localStorage.setItem("token_expires_at", expiry.toString());
  }
}

function clearAuth() {
  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_expires_at");
}


// ===============================
//           MAIN FLOW
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("auth.js loaded.");

  attachLoginHandlers();
  attachLogoutHandler();
  handleRedirectFromCognito();

  updateUI();
  protectCart();
  protectAddToCartButtons();
});


// ===============================
//       HANDLE LOGIN REDIRECT
// ===============================
function handleRedirectFromCognito() {
  const tokens = parseHashTokens(window.location.hash);
  if (!tokens) return;

  saveTokens(tokens);

  // Clean URL after login
  history.replaceState(null, "", window.location.pathname + window.location.search);

  const payload = parseJwt(tokens.id_token);

  if (payload && !payload.email_verified) {
    alert("Please verify your email. Check your inbox.");
    clearAuth();
    window.location.href = SIGNUP_URL;
    return;
  }

  updateUI();
}


// ===============================
//          LOGIN / LOGOUT
// ===============================
function attachLoginHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.onclick = () => {
      window.location.href = LOGIN_URL;
    };
  }
}

function attachLogoutHandler() {
  document.addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") {
      clearAuth();
      window.location.href = LOGOUT_URL;
    }
  });
}


// ===============================
//         UPDATE NAVBAR UI
// ===============================
function updateUI() {
  const idToken = localStorage.getItem("id_token");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userDisplay = document.getElementById("userDisplay");

  if (!loginBtn || !logoutBtn || !userDisplay) return;

  if (idToken) {
    const payload = parseJwt(idToken);
    const name = payload?.email || "Logged In";

    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userDisplay.textContent = name + (payload?.email_verified ? " ✓" : "");
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userDisplay.textContent = "";
  }
}


// ===============================
//       CART PROTECTION
// ===============================
function protectCart() {
  const cartLink = document.getElementById("cartLink");
  if (!cartLink) return;

  cartLink.onclick = (e) => {
    const idToken = localStorage.getItem("id_token");

    if (!idToken) {
      e.preventDefault();
      alert("Please login to access your cart.");
      window.location.href = LOGIN_URL;
    } else {
      window.location.href = "cart.html";
    }
  };
}


// ===============================
//     ADD-TO-CART PROTECTION
// ===============================
function protectAddToCartButtons() {
  const buttons = document.querySelectorAll(".addToCartBtn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idToken = localStorage.getItem("id_token");
      if (!idToken) {
        e.preventDefault();
        alert("Please login before adding items.");
        window.location.href = LOGIN_URL;
        return;
      }

      const id = btn.dataset.id;
      if (typeof addToCartFromCard === "function") {
        addToCartFromCard(id);
      }
    });
  });
}
