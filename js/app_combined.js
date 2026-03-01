// ===============================
// LOGIN.JS – Selainpohjainen kirjautuminen
// ===============================

const LOGIN_STORAGE_KEY = "pp_user_email";
const LOGIN_REMEMBER_KEY = "pp_user_remember";

const Auth = (function () {
  let currentUser = null;

  function init() {
    const remembered = localStorage.getItem(LOGIN_REMEMBER_KEY) === "true";
    const savedEmail = localStorage.getItem(LOGIN_STORAGE_KEY);

    if (remembered && savedEmail) {
      currentUser = savedEmail;
      hideLogin();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    const overlay = document.createElement("div");
    overlay.id = "loginOverlay";
  
    overlay.innerHTML = `
      <div class="login-overlay">
        <div class="login-box">
          <h2>Kirjaudu</h2>
  
          <input type="email"
                 id="loginEmail"
                 class="login-input"
                 placeholder="Sähköpostiosoite"
                 required>
  
          <label class="login-remember">
            <input type="checkbox" id="rememberMe">
            Muista minut
          </label>
  
          <button id="loginBtn" class="login-button">
            Kirjaudu
          </button>
  
          <p id="loginError" class="login-error"></p>
        </div>
      </div>
    `;
  
    document.body.appendChild(overlay);
  
    document
      .getElementById("loginBtn")
      .addEventListener("click", handleLogin);
  }

  function hideLogin() {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.remove();
    document.dispatchEvent(new Event("userLoggedIn"));
  }

  function handleLogin() {
    const emailInput = document.getElementById("loginEmail");
    const remember = document.getElementById("rememberMe").checked;
    const error = document.getElementById("loginError");
    const email = emailInput.value.trim().toLowerCase();

    if (!validateEmail(email)) {
      error.textContent = "Anna kelvollinen sähköpostiosoite.";
      return;
    }

    currentUser = email;

    if (remember) {
      localStorage.setItem(LOGIN_STORAGE_KEY, email);
      localStorage.setItem(LOGIN_REMEMBER_KEY, "true");
    } else {
      localStorage.removeItem(LOGIN_STORAGE_KEY);
      localStorage.setItem(LOGIN_REMEMBER_KEY, "false");
    }

    hideLogin();
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getUser() {
    return currentUser || localStorage.getItem(LOGIN_STORAGE_KEY);
  }

  function logout() {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    localStorage.removeItem(LOGIN_REMEMBER_KEY);
    location.reload();
  }

  return { init, getUser, logout };
})();

// ===============================
// STATE.JS – Sovelluksen tila
// ===============================

const state = {
  view: "start",        // start | editor
  lennokit: [],
  valittuLennokkiId: null,
  osat: [],
  aktiivinenRyhma: null,
  suodataNollat: false,
  kokoonpanot: [],
  uusiLennokki: { nimi: "", malli: "RAKENTEILLA" }
};

function setView(view) { state.view = view; }
function setOsat(osat) { state.osat = osat; }
function setLennokit(lennokit) { state.lennokit = lennokit; }

// ===============================
// APP.JS – Sovelluslogiikka
// ===============================

const APP_VERSION = "1.50";
let osat = [];
let kokoonpanot = [];
let tallennaBtn = document.getElementById("tallennaBtn");
let yhteenvetoView = document.getElementById("yhteenvetoView");
let valittuLennokkiId = null;
let aktiivinenLennokkiId = null;
let uusiLennokkiNimi = "";
let muutoksia = false;


async function API(action, payload = {}) {
  const user = Auth.getUser();
  if (!user) throw new Error("Käyttäjä ei ole kirjautunut");

  const response = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify({ action, userId: user, ...payload })
  });

  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}


async function loadLennokit() {
  console.log("loadLennokit käynnistyi");
  try {
    const data = await API("haeLennokitAloitukseen");
    state.lennokit = Array.isArray(data) ? data : [];
    renderStart();
  } catch (err) {
    console.error("Latausvirhe:", err);
    alert("Latausvirhe: " + err.message);
  }
}

async function lataaOsat() {
  try {
    const response = await API("haeOsat");
    state.osat = response.osat;
    state.kokoonpanot = response.kokoonpanot;
    renderOsat();
  } catch (err) {
    alert("Osien lataus epäonnistui: " + err);
  }
}

async function lataaYhteenveto() {
  try {
    const data = await API("haeYhteenveto");
    if (!yhteenvetoView) return;
    if (!data || !data.length) {
      yhteenvetoView.innerHTML = "<p>Ei yhteenvetotietoja.</p>";
      return;
    }
    let html = `<table><thead><tr><th>Kokoonpano</th><th class="col-num">Kokonaismassa</th><th class="col-num">Painopiste</th></tr></thead><tbody>`;
    data.forEach(r => {
      const isYhteensa = r[0] === "Yhteensä";
      html += `<tr class="${isYhteensa?'yhteensa':''}"><td>${r[0]}</td><td class="col-num">${r[1]}</td><td class="col-num">${Math.round(r[3]||0)}</td></tr>`;
    });
    html += `</tbody></table>`;
    yhteenvetoView.innerHTML = html;
  } catch (err) { alert("Yhteenveto-virhe: " + err); }
}

async function tallenna() {
  const virhe = state.osat.find(o => Number(o.massa) < 0);
  if (virhe) { alert("Massa ei voi olla negatiivinen.\n\nOsa: " + virhe.osa); return; }
  const muuttuneet = state.osat.filter(o => o._dirty);
  if (!muuttuneet.length) return;
  if (tallennaBtn) tallennaBtn.disabled = true;
  try {
    await API("tallennaOsat", { osat: muuttuneet });
    muuttuneet.forEach(o => delete o._dirty);
    muutoksia = false;
    if (tallennaBtn) { tallennaBtn.disabled = false; tallennaBtn.classList.remove("unsaved"); }
  } catch (err) {
    alert("Tallennus epäonnistui: " + err);
    if (tallennaBtn) tallennaBtn.disabled = false;
  }
}

// ===============================
// RENDER LOGIIKKA
// ===============================

function render() {
  hideAllViews();
  switch (state.view) {
    case "start":
      renderStart();
      break;
    case "editor":
      renderEditor();
      break;
  }
}

function renderStart() {
  const container = document.getElementById("startView");
  if (!container) return;

  container.style.display = "block";

  container.innerHTML = `
    <div class="start-card">
      <h2 class="start-title">Lennokit</h2>

      <div class="start-table-wrapper">
        <table class="start-table">
          <thead>
            <tr>
              <th class="col-name">ID</th>
              <th class="col-num">Massa</th>
              <th class="col-num">PP</th>
              <th class="col-date">PVM</th>
            </tr>
          </thead>
          <tbody>
            ${state.lennokit.map(l => `
              <tr data-id="${l.id}">
                <td class="col-name">${l.id}</td>
                <td class="col-num">${l.massa ?? ''}</td>
                <td class="col-num">${l.pp ?? ''}</td>
                <td class="col-date">${l.pvm ?? ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="start-actions">
        <button id="openEditorBtn">Avaa</button>
      </div>
    </div>
  `;

  bindStartEvents();
}

function renderEditor() {
  const container = document.getElementById("editorView");
  if (!container) return;
  container.style.display = "block";
  container.innerHTML = `<h2>Editor</h2><div id="osatView"></div><button id="backBtn">Takaisin</button>`;
  bindEditorEvents();
}

function hideAllViews() {
  const start = document.getElementById("startView");
  const editor = document.getElementById("editorView");
  if(start) start.style.display = "none";
  if(editor) editor.style.display = "none";
}

// ===============================
// EVENT HANDLERS
// ===============================

function bindStartEvents() {
  const container = document.getElementById("startView");
  if (!container) return;
  container.addEventListener("click", e => {
    const row = e.target.closest("tr");
    if (row) { state.valittuLennokkiId = row.dataset.id; container.querySelectorAll("tr").forEach(r=>r.classList.remove("selected")); row.classList.add("selected"); }
    if (e.target.id === "openEditorBtn" && state.valittuLennokkiId) { setView("editor"); render(); }
  });
}

function bindEditorEvents() {
  const container = document.getElementById("editorView");
  const backBtn = container.querySelector("#backBtn");
  if (backBtn) backBtn.addEventListener("click", () => { setView("start"); render(); });
}

// ===============================
// INIT
// ===============================

function init() {
  console.log("Sovellus käynnistyy");
  hideAllViews();
  setView("start");
  loadLennokit();
}

document.addEventListener("userLoggedIn", () => {
  console.log("Käyttäjä kirjautunut:", Auth.getUser());
  init();
});

document.addEventListener("DOMContentLoaded", () => Auth.init());


