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
    body: JSON.stringify({
      action: action,
      userId: user,
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return await response.json();
}


async function loadLennokit() {
  try {
    const data = await API("haeLennokitAloitukseen");

    if (!Array.isArray(data)) {
      console.error("Virheellinen vastaus:", data);
      state.lennokit = [];
    } else {
      state.lennokit = data;
    }

    renderStartTable();

  } catch (err) {
    console.error("loadLennokit virhe:", err);
  }
}



async function lataaOsat() {
  try {
    const response = await API("haeOsatAktiiviselleLennokille");
    state.osat = response.osat;
    state.kokoonpanot = response.kokoonpanot;
    renderOsat();
  } catch (err) {
    alert("Osien lataus epäonnistui: " + err);
  }
}

async function lataaYhteenveto() {
  try {
    const data = await API("haeYhteenvetoAktiiviselleLennokille")
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
    await API("tallennaOsatAktiiviselleLennokille", { osat: muuttuneet });
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

function renderStartTable() {
  const body = document.getElementById("startTableBody");
  if (!body) return;

  body.innerHTML = "";

  state.lennokit.forEach(l => {
    const tr = document.createElement("tr");
    tr.dataset.id = l.id;
    tr.innerHTML = `
      <td>${l.id}</td>
      <td>${l.massa ?? ""}</td>
      <td>${l.pp ?? ""}</td>
      <td>${l.pvm ?? ""}</td>
    `;
    tr.onclick = () => {
      document.querySelectorAll("#startTableBody tr")
        .forEach(r => r.classList.remove("selected"));
      tr.classList.add("selected");
      state.valittuLennokkiId = l.id;
    };
    body.appendChild(tr);
  });
}

function renderOsat() {
  const container = document.getElementById("osatView");
  if (!container) return;

  container.innerHTML = "";

  if (!state.osat || !state.osat.length) {
    container.innerHTML = "<p>Ei osia.</p>";
    return;
  }

  const table = document.createElement("table");

  table.innerHTML = `
    <thead>
      <tr>
        <th class="col-nro">Nro</th>
        <th class="col-osa">Osa</th>
        <th class="col-num">Massa</th>
        <th class="col-num">Varsi</th>
        <th class="col-kok">Kokoonpano</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  state.osat.forEach(o => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="col-nro">${o.osanro ?? ""}</td>
      <td class="col-osa">${o.osa ?? ""}</td>
      <td class="col-num">
        <input type="number" value="${o.massa ?? 0}">
      </td>
      <td class="col-num">
        <input type="number" value="${o.varsi ?? 0}">
      </td>
      <td class="col-kok">${o.kokoonpano ?? ""}</td>
    `;

    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

// ===============================
// EVENT HANDLERS
// ===============================

function bindStartEvents() {
  const container = document.getElementById("startView");
  if (!container) return;

  container.addEventListener("click", e => {
    const row = e.target.closest("tr");

    if (row) {
      state.valittuLennokkiId = row.dataset.id;
      container.querySelectorAll("#startTableBody tr")
        .forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
    }

    // Jos joskus lisäät napin ID:llä openEditorBtn
    if (e.target.id === "openEditorBtn" && state.valittuLennokkiId) {
      document.getElementById("startView").style.display = "none";
      document.getElementById("appView").style.display = "block";
    }
  });
}


function bindEditorEvents() {
  const container = document.getElementById("appView");
  if (!container) return;

  const backBtn = container.querySelector("#backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.getElementById("appView").style.display = "none";
      document.getElementById("startView").style.display = "block";
    });
  }
}

// ===============================
// START VIEW BUTTON FUNCTIONS
// ===============================

function avaaOhje() {
  document.getElementById("ohjeTeksti").innerHTML ="Painopiste_ohje"
    "<h2>Painopisteen Ennustin</h2><p>Painopiste_ohje.html</p>";
  document.getElementById("ohjeModal").style.display = "block";
}

function suljeOhje() {
  document.getElementById("ohjeModal").style.display = "none";
}

function avaaLennokki() {
  if (!state.valittuLennokkiId) {
    alert("Valitse ensin lennokki taulukosta.");
    return;
  }
  
  document.getElementById("startView").style.display = "none";
  document.getElementById("appView").style.display = "block";

  lataaOsat();
  lataaYhteenveto();
}



// ===============================
// INIT 
// ===============================

function init() {
  console.log("Sovellus käynnistyy");

  document.getElementById("startView").style.display = "block";
  document.getElementById("appView").style.display = "none";

  const versionEls = document.querySelectorAll("#appVersion, #appVersion2");
  versionEls.forEach(el => el.textContent = APP_VERSION);

  bindStartEvents();
  bindEditorEvents();

  loadLennokit();
}

// ===============================
// DOMREADY & AUTH
// ===============================

// Kun DOM valmis → käynnistetään auth
document.addEventListener("DOMContentLoaded", () => Auth.init());

// Kun kirjautuminen valmis → käynnistetään sovellus
document.addEventListener("userLoggedIn", () => {
  console.log("Käyttäjä kirjautunut:", Auth.getUser());
  init();
});


