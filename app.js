// ===============================
// LOGIN.JS – Selainpohjainen kirjautuminen
// ===============================
/*
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


async function avaaLennokki() {

  if (!state.valittuLennokkiId) {
    alert("Valitse lennokki");
    return;
  }

  // 1 Aseta aktiivinen backendille
  await API("asetaAktiivinen", {
  id: state.valittuLennokkiId
  });

  // 2 Vaihda näkymä
  document.getElementById("startView").style.display = "none";
  document.getElementById("appView").style.display = "block";

  // 3 Päivitä dropdown
  await paivitaLennokkiLista();
  select.onchange = (e) => {
  vaihdaLennokki(e.target.value);
  };
  
  // 4 Hae osat
  await lataaOsat();

  // 5 Piirrä osat
  renderOsat();

}

async function paivitaLennokkiLista() {

  const vastaus = await API("listaaLennokit");
  const lista = vastaus.lennokit || [];

  const select = document.getElementById("lennokkiSelect");
  if (!select) return;

  select.innerHTML = "";

  lista.forEach(l => {

    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.id;

    if (l.aktiivinen) opt.selected = true;

    select.appendChild(opt);

  });

  select.onchange = (e) => {
    vaihdaLennokki(e.target.value);
  };

}


async function vaihdaLennokki(id) {
  await API({
    action: "asetaAktiivinen",
    id: id
  });

  state.valittuLennokkiId = id;

  await lataaOsat();
  renderOsat();
}


async function lataaOsat() {
  console.log("Ladataan osat ID:", state.valittuLennokkiId);

  try {
    const response = await API("haeOsat", {
      lennokkiId: state.valittuLennokkiId
    });

    console.log("Backend vastaus:", response);   // 👈 LISÄÄ TÄMÄ

    state.osat = response.osat || [];
    state.kokoonpanot = response.kokoonpanot || [];

    renderOsat();

  } catch (err) {
    alert("Osien lataus epäonnistui: " + err);
  }
}

function naytaOsat() {

  document.getElementById("osatView").style.display = "block";
  document.getElementById("yhteenvetoView").style.display = "none";

}


async function lataaYhteenveto() {
  try {
    const data = await API("haeYhteenveto", {
     lennokkiId: state.valittuLennokkiId
    });

    if (!yhteenvetoView) return;

    if (!data || !data.length) {
      yhteenvetoView.innerHTML = "<p>Ei yhteenvetotietoja.</p>";
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Kokoonpano</th>
            <th class="col-num">Kokonaismassa</th>
            <th class="col-num">Painopiste</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    
    data.forEach(r => {
      const isYhteensa = r[0] === "Yhteensä";
      html += `
        <tr class="${isYhteensa ? 'yhteensa' : ''}">
          <td>${r[0]}</td>
          <td class="col-num">${r[1]}</td>
          <td class="col-num">${Math.round(r[3] || 0)}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    yhteenvetoView.innerHTML = html;

  } catch (err) {
    alert("Yhteenveto-virhe: " + err);
  }
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

async function naytaYhteenveto() {

  const data = await API({
    action: "haeYhteenveto"
  });

  const view = document.getElementById("yhteenvetoView");

  view.style.display = "block";
  document.getElementById("osatView").style.display = "none";

  if (!data.length) {
    view.innerHTML = "<p>Ei tietoja</p>";
    return;
  }

  let html = "<table class='summary'>";

  data.forEach(r => {

    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
        <td>${r[3]}</td>
      </tr>
    `;

  });

  html += "</table>";

  view.innerHTML = html;

}


// ===============================
// RENDER LOGIIKKA
// ===============================

function renderStartTable() {
  console.log("Lennokit data:", state.lennokit);
  const body = document.getElementById("startTableBody");
  if (!body) return;

  body.innerHTML = "";

  state.lennokit.forEach(l => {
    const tr = document.createElement("tr");
    tr.dataset.id = l.id;
    tr.onclick = () => {
      state.valittuLennokkiId = l.id; };
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
  table.id = "osatTable";

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
  fetch("Painopiste_ohje.html")
    .then(r => r.text())
    .then(html => {
      document.getElementById("ohjeTeksti").innerHTML = html;
      document.getElementById("ohjeModal").style.display = "block";
    });
}

function suljeOhje() {
  document.getElementById("ohjeModal").style.display = "none";
}

function scrollOhje(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
*/

// UUSI APP

// ===============================
// STATE – Sovelluksen tila
// ===============================

const state = {
  view: "start",
  lennokit: [],
  valittuLennokkiId: null,
  osat: [],
  user: null
};



// ===============================
// SOVELLUKSEN KÄYNNISTYS
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

  console.log("Sovellus käynnistyy");

  await haeKayttaja();
  await haeLennokit();

});



// ===============================
// KÄYTTÄJÄ
// ===============================

async function haeKayttaja() {

  const res = await fetch("?action=haeKayttaja");
  const data = await res.json();

  state.user = data.email;

  console.log("Käyttäjä kirjautunut:", state.user);

}



// ===============================
// LENNOKIT
// ===============================

async function haeLennokit() {

  const res = await fetch("?action=haeLennokit");
  const data = await res.json();

  console.log("Lennokit data:", data);

  if (!Array.isArray(data)) {
    console.error("Lennokit ei ole lista:", data);
    return;
  }

  state.lennokit = data;

  piirraLennokkiLista();

}



function piirraLennokkiLista() {

  const lista = document.getElementById("lennokkiLista");

  if (!lista) return;

  lista.innerHTML = "";

  state.lennokit.forEach(lennokki => {

    const btn = document.createElement("button");

    btn.textContent = lennokki.Nimi;

    btn.onclick = () => avaaLennokki(lennokki["Lennokki-ID"]);

    lista.appendChild(btn);

  });

}



// ===============================
// LENNON AVAUS
// ===============================

async function avaaLennokki(lennokkiId) {

  console.log("Avataan lennokki:", lennokkiId);

  state.valittuLennokkiId = lennokkiId;

  await haeOsat();

  naytaOsatNakyma();

}



// ===============================
// OSIEN HAKU
// ===============================

async function haeOsat() {

  if (!state.valittuLennokkiId) {
    console.error("Lennokki ID puuttuu");
    return;
  }

  console.log("Ladataan osat ID:", state.valittuLennokkiId);

  const res = await fetch(
    `?action=haeOsatAktiiviselleLennokille&lennokkiId=${state.valittuLennokkiId}`
  );

  const data = await res.json();

  console.log("Backend vastaus:", data);

  if (data.error) {
    console.error(data.error);
    return;
  }

  if (!Array.isArray(data)) {
    console.error("Osat eivät ole lista:", data);
    return;
  }

  state.osat = data;

  piirraOsat();

}



// ===============================
// OSIEN PIIRTO
// ===============================

function piirraOsat() {

  const taulu = document.getElementById("osatTaulu");

  if (!taulu) return;

  taulu.innerHTML = "";

  if (state.osat.length === 0) {

    taulu.innerHTML = "<tr><td>Ei osia</td></tr>";
    return;

  }

  state.osat.forEach(osa => {

    const rivi = document.createElement("tr");

    rivi.innerHTML = `
      <td>${osa["Osanro"] || ""}</td>
      <td>${osa["Osa"] || ""}</td>
      <td>${osa["Massa"] || ""}</td>
      <td>${osa["Varsi"] || ""}</td>
      <td>${osa["Momentti"] || ""}</td>
      <td>${osa["Kokoonpano"] || ""}</td>
    `;

    taulu.appendChild(rivi);

  });

}



// ===============================
// NÄKYMÄT
// ===============================

function naytaOsatNakyma() {

  const start = document.getElementById("startView");
  const editor = document.getElementById("editorView");

  if (start) start.style.display = "none";
  if (editor) editor.style.display = "block";

}



// ===============================
// OHJE
// ===============================

function avaaOhje() {

  const ohje = document.getElementById("ohje");

  if (!ohje) return;

  if (ohje.style.display === "block")
    ohje.style.display = "none";
  else
    ohje.style.display = "block";

}
