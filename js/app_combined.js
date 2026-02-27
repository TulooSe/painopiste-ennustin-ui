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
      <div style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.4);
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:sans-serif;
        z-index:9999;
      ">
        <div style="
          background:white;
          padding:30px;
          border-radius:10px;
          width:300px;
        ">
          <h2>Kirjaudu</h2>
  
          <input type="email" id="loginEmail"
            placeholder="Sähköpostiosoite"
            style="width:100%;padding:8px;margin-bottom:10px;" />
  
          <label style="font-size:14px;">
            <input type="checkbox" id="rememberMe" />
            Muista minut
          </label>
  
          <button id="loginBtn"
            style="width:100%;padding:10px;margin-top:15px;">
            Kirjaudu
          </button>
  
          <p id="loginError" style="color:red;font-size:13px;"></p>
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
    location.reload(); // ladataan sovellus uudelleen kirjautumisen jälkeen
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

  return {
    init,
    getUser,
    logout
  };



const state = {
  view: "start",        // start | editor
  lennokit: [],
  valittuLennokkiId: null,

  osat: [],
  aktiivinenRyhma: null,
  suodataNollat: false,
  kokoonpanot: [],

  uusiLennokki: {
    nimi: "",
    malli: "RAKENTEILLA"
  }
};

function setView(view) {
  state.view = view;
}

function setOsat(osat) {
  state.osat = osat;
}

function setLennokit(lennokit) {
  state.lennokit = lennokit;
}
  
})();



// =========================
// USER HANDLING
// =========================

const PP_User = (function () {

  const storageKey = "pp_user_email";

  function getId() {
    let email = localStorage.getItem(storageKey);

    if (!email) {
      email = askEmail();
      localStorage.setItem(storageKey, email);
    }

    return email;
  }

  function askEmail() {
    let email = "";

    while (!email) {
      email = prompt("Anna sähköpostiosoitteesi:");
      if (!email) {
        alert("Sähköposti vaaditaan.");
      }
    }

    return email.trim().toLowerCase();
  }

  function changeUser() {
    localStorage.removeItem(storageKey);
    location.reload();
  }

  return {
    getId,
    changeUser
  };

})();





function initRender(initialState) {
  Object.assign(state, initialState);
  bindEvents();
  render();
}

function setOsat(osat) {
  state.osat = osat;
  render();
}


/*Uusi render()*/

function render() {
  renderOsat();
}


/*Uusi renderOsat() (puhdas versio)*/

function renderOsat() {
  const container = document.getElementById("osatView");
  if (!container) return;

  const groups = ryhmitteleOsat(state.osat);

  if (!state.aktiivinenRyhma) {
    state.aktiivinenRyhma = Object.keys(groups)[0] || null;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Osa</th>
        <th>Massa</th>
        <th>Varsi</th>
        <th>Kokoonpano</th>
      </tr>
    </thead>
  `;

  Object.entries(groups).forEach(([ryhma, data]) => {
    table.appendChild(createGroupHeader(ryhma, data.massa));
    table.appendChild(createGroupBody(ryhma, data.items));
  });

  container.innerHTML = "";
  container.appendChild(table);
}


/*Header builder (EI inline-eventtiä)*/

function createGroupHeader(ryhma, massa) {
  const tbody = document.createElement("tbody");
  tbody.className = "osa-group-head";

  const tr = document.createElement("tr");
  tr.className = "osa-group-header";
  tr.dataset.ryhma = ryhma;

  tr.innerHTML = `
    <td colspan="5">
      <span class="group-arrow">
        ${state.aktiivinenRyhma === ryhma ? "▼" : "▶"}
      </span>
      <span class="group-name">${ryhma}</span>
      <span class="group-massa">${Math.round(massa)} g</span>
    </td>
  `;

  tbody.appendChild(tr);
  return tbody;
}


/*Body builder*/

function createGroupBody(ryhma, items) {
  const tbody = document.createElement("tbody");
  tbody.className = "osa-group-body";
  tbody.dataset.ryhma = ryhma;

  tbody.style.display =
    state.aktiivinenRyhma === ryhma
      ? "table-row-group"
      : "none";

  items.forEach((o, index) => {
    if (state.suodataNollat && Number(o.massa) === 0) return;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${o.osanro}</td>
      <td>${o.osa}</td>
      <td><input data-row="${index}" data-col="massa" value="${o.massa}"></td>
      <td><input data-row="${index}" data-col="varsi" value="${o.varsi}"></td>
      <td>
        <select data-row="${index}" data-col="kokoonpano">
          ${state.kokoonpanot.map(k =>
            `<option ${k===o.kokoonpano?'selected':''}>${k}</option>`
          ).join("")}
        </select>
      </td>
    `;

    tbody.appendChild(tr);
  });

  return tbody;
}


/*Event delegation (tärkein osa)*/

function bindEvents() {

  const container = document.getElementById("osatView");

  // Ryhmän avaus
  container.addEventListener("click", e => {
    const header = e.target.closest(".osa-group-header");
    if (!header) return;

    const ryhma = header.dataset.ryhma;

    state.aktiivinenRyhma =
      state.aktiivinenRyhma === ryhma ? null : ryhma;

    render();
  });

  // Input change
  container.addEventListener("change", e => {
    const input = e.target;
    const row = input.dataset.row;
    const col = input.dataset.col;
    if (row == null || !col) return;

    state.osat[row][col] = input.value;
  });
}


console.log("STARTVIEW VERSION 1.50");

function renderStart() {

  const container = document.getElementById("startView");
  container.style.display = "block";

  container.innerHTML = `
    <h2>Lennokit</h2>
    <table>
      <tbody>
        ${state.lennokit.map(l => `
          <tr data-id="${l.id}">
            <td>${l.id}</td>
            <td>${l.massa ?? ""}</td>
            <td>${l.pp ?? ""}</td>
            <td>${l.pvm ?? ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <button id="openEditorBtn">Avaa</button>
  `;

  bindStartEvents();
}


function bindStartEvents() {

  const container = document.getElementById("startView");

  container.addEventListener("click", e => {

    const row = e.target.closest("tr");
    if (row) {
      state.valittuLennokkiId = row.dataset.id;

      container.querySelectorAll("tr")
        .forEach(r => r.classList.remove("selected"));

      row.classList.add("selected");
    }

    if (e.target.id === "openEditorBtn") {
      if (!state.valittuLennokkiId) return;

      setView("editor");
      renderApp();
    }
  });
}
