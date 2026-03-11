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
  suodatus: false,
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
let viimeRyhmä = null;


async function API(action, payload = {}) {

  const user = Auth.getUser();
  if (!user) throw new Error("Käyttäjä ei ole kirjautunut");

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: action,
      userId: user,
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();
  console.log("API vastaus:", action, data);
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}


async function loadLennokit() {
  console.log("Haetaan lennokit käyttäjälle:", Auth.getUser());
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
  
  // 4 Hae osat
  await lataaOsat();

  // 5 Piirrä osat
  renderOsat();

}

async function paivitaLennokkiLista() {

  const vastaus = await API("listaaLennokit");

  const lista = Array.isArray(vastaus)
    ? vastaus
    : (vastaus?.lennokit || []);

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
  await API("asetaAktiivinen", {
    id: id
  });

  state.valittuLennokkiId = id;

  await lataaOsat();
  renderOsat();
}


async function lataaOsat() {

  console.log("Ladataan osat ID:", state.valittuLennokkiId);

  try {

    const response = await API("haeOsat");

    console.log("Backend vastaus:", response);

    state.osat = response.osat || [];
    state.kokoonpanot = response.kokoonpanot || [];

    renderOsat();

  } catch (err) {

    alert("Osien lataus epäonnistui: " + err);

  }

}

function naytaOsat() {

  const osatView = document.getElementById("osatView");
  const yhteenvetoView = document.getElementById("yhteenvetoView");

  if (osatView) osatView.style.display = "block";
  if (yhteenvetoView) yhteenvetoView.style.display = "none";

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

  if (virhe) {
    alert("Massa ei voi olla negatiivinen.\n\nOsa: " + virhe.osa);
    return;
  }

  const muuttuneet = state.osat.filter(o => o._dirty);

  if (!muuttuneet.length) return;

  if (tallennaBtn) tallennaBtn.disabled = true;

  try {

    await API("tallennaOsat", {
      id: state.valittuLennokkiId,
      osat: muuttuneet
    });

    muuttuneet.forEach(o => delete o._dirty);

    muutoksia = false;

    if (tallennaBtn) {
      tallennaBtn.disabled = false;
      tallennaBtn.classList.remove("unsaved");
    }

  } catch (err) {

    alert("Tallennus epäonnistui: " + err);

    if (tallennaBtn) {
      tallennaBtn.disabled = false;
    }

  }
}


async function naytaYhteenveto() {

  const view = document.getElementById("yhteenvetoView");
  const osatView = document.getElementById("osatView");
  const table = document.getElementById("yhteenvetoTable");

  if (!view || !osatView || !table) {
    console.error("Yhteenveto elementtejä puuttuu HTML:stä");
    return;
  }

  try {

    const data = await API("haeYhteenveto", {
      id: state.valittuLennokkiId
    });

    // TALLENNA KOKOONPANOT
    state.kokoonpanot = data.map(r => r[0]).filter(Boolean);
    
    osatView.style.display = "none";
    view.style.display = "block";

    if (!data || !data.length) {
      table.innerHTML = "<p>Ei tietoja</p>";
      return;
    }

    let html = "<table class='summary'>";

    data.forEach(r => {

      html += `
        <tr>
          <td>${r[0] ?? ""}</td>
          <td>${r[1] ?? ""}</td>
          <td>${r[2] ?? ""}</td>
          <td>${r[3] ?? ""}</td>
        </tr>
      `;

    });

    html += "</table>";

    table.innerHTML = html;

  } catch (err) {

    console.error("Yhteenveto epäonnistui:", err);

  }
}


function vaihdaSuodatus() {
  state.suodatus = !state.suodatus;
  renderOsat();
}


function palaaAloitukseen() {
  document.getElementById("appView").style.display = "none";
  document.getElementById("startView").style.display = "block";
}



// ===============================
// RENDER LOGIIKKA
// ===============================

function renderStartTable() {
  if (!Array.isArray(state.lennokit)) {
  console.error("Lennokit ei ole array", state.lennokit);
  return;
  }
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
      <td class="col-num">${Number(l.massa ?? 0).toFixed(0)}</td>
      <td class="col-num">${Number(l.pp ?? 0).toFixed(0)}</td>
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

  if (!container) {
    console.error("osatView puuttuu HTML:stä");
    return;
  }

  container.innerHTML = "";

  if (!state.osat || state.osat.length === 0) {
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

  let viimeKokoonpano = null;

  // LASKE RYHMIEN MASSAT
  const ryhmaMassat = {};
    
  state.osat.forEach(o => {
    
    if (state.suodatus && (!o.massa || Number(o.massa) === 0)) return;
    
    const r = o.ryhma || "Muut";
    
    if (!ryhmaMassat[r]) ryhmaMassat[r] = 0;
    
    ryhmaMassat[r] += Number(o.massa || 0);
    
  });


  
  state.osat.forEach(o => {

    // SUODATUS
    if (state.suodatus && (!o.massa || Number(o.massa) === 0)) {
      return;
    }

    // RYHMÄRIVI
    if (o.ryhma !== viimeRyhmä) {
    
      const header = document.createElement("tr");
      header.className = "osa-group-header";
      header.dataset.group = o.ryhma;
    
      header.innerHTML = `
        <td colspan="5">
          <span class="group-arrow">▾</span>
          <span class="group-name">${o.ryhma}</span>
          <span class="group-massa">${Math.round(ryhmaMassat[o.ryhma] || 0)} g</span>
        </td>
      `;
    
      header.onclick = () => toggleGroup(o.ryhma);
    
      tbody.appendChild(header);
    
      viimeRyhmä = o.ryhma;
    }

    
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

      <td class="col-kok">
        <select></select>
      </td>
    `;

    const massaInput = tr.querySelectorAll("input")[0];
    const varsiInput = tr.querySelectorAll("input")[1];
    const select = tr.querySelector("select");

    // KOKOONPANOLISTA
    const kokoonpanot = state.kokoonpanot.length
      ? state.kokoonpanot
      : [...new Set(state.osat.map(x => x.kokoonpano))];

    kokoonpanot.forEach(k => {

      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;

      if (k === o.kokoonpano) opt.selected = true;

      select.appendChild(opt);

    });

    // MUUTOS -> _dirty
    massaInput.oninput = () => {
      o.massa = Number(massaInput.value);
      o._dirty = true;
      muutoksia = true;
      if (tallennaBtn) tallennaBtn.classList.add("unsaved");
    };

    varsiInput.oninput = () => {
      o.varsi = Number(varsiInput.value);
      o._dirty = true;
      muutoksia = true;
      if (tallennaBtn) tallennaBtn.classList.add("unsaved");
    };

    select.onchange = () => {
      o.kokoonpano = select.value;
      o._dirty = true;
      muutoksia = true;
      if (tallennaBtn) tallennaBtn.classList.add("unsaved");
    };
    tr.dataset.group = o.ryhma;
    tbody.appendChild(tr);

  });
  const suodatusBtn = document.getElementById("suodatusBtn");
  if (suodatusBtn) {
    suodatusBtn.classList.toggle("active", state.suodatus);
  }
  container.appendChild(table);
}

function toggleGroup(ryhma){

  const rows = document.querySelectorAll(`#osatTable tr[data-group='${ryhma}']`);
  const header = document.querySelector(`.osa-group-header[data-group='${ryhma}']`);
  const arrow = header?.querySelector(".group-arrow");

  let hidden = false;

  rows.forEach(r=>{
    if(r.classList.contains("osa-group-header")) return;

    if(r.style.display==="none"){
      r.style.display="";
    } else {
      r.style.display="none";
      hidden=true;
    }
  });

  if(arrow){
    arrow.textContent = hidden ? "▸" : "▾";
  }
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
