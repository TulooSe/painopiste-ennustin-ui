// =========================
// APP.JS VERSION 1.50
// =========================

const APP_VERSION = "1.50";

let osat = [];
let kokoonpanot = [];
let tallennaBtn = document.getElementById("tallennaBtn"); // jos on
let yhteenvetoView = document.getElementById("yhteenvetoView"); // jos on
let valittuLennokkiId = null;
let aktiivinenLennokkiId = null;
let uusiLennokkiNimi = "";
let muutoksia = false;

// =========================
// API WRAPPER
// =========================

async function API(action, payload = {}) {
  console.log("API kutsu:", action);

  const response = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action,
      userId: Auth.getUser(),
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return response.json();
}

// =========================
// INIT
// =========================

document.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("INIT käynnistyi");
  renderStart();     // näyttää start-view
  loadLennokit();    // async kutsu lennokkien lataukseen
}

// =========================
// LENNOKIT
// =========================

async function loadLennokit() {
  console.log("loadLennokit käynnistyi");
  try {
    const data = await API("haeLennokitAloitukseen");
    console.log("API palautti dataa:", data);
    state.lennokit = data;
    renderStart();
  } catch (err) {
    console.error("Latausvirhe:", err);
    alert("Latausvirhe: " + err.message);
  }
}

async function lataaLennokit() {
  try {
    const lista = await API("listaaLennokit");

    const select = document.getElementById("lennokkiSelect");
    select.innerHTML = "";

    lista.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.id;

      if (l.aktiivinen) {
        opt.selected = true;
        aktiivinenLennokkiId = l.id;
      }

      select.appendChild(opt);
    });

  } catch (err) {
    alert("Lennokkien latausvirhe: " + err);
  }
}

// =========================
// OSAT
// =========================

async function lataaOsat() {
  try {
    const response = await API("haeOsat");

    osat = response.osat;
    kokoonpanot = response.kokoonpanot;

    piirraOsat();

  } catch (err) {
    alert("Osien lataus epäonnistui: " + err);
  }
}

// =========================
// YHTEENVETO
// =========================

async function lataaYhteenveto() {
  try {
    const data = await API("haeYhteenveto");

    if (!data || !data.length) {
      if (yhteenvetoView) yhteenvetoView.innerHTML = "<p>Ei yhteenvetotietoja.</p>";
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

    html += `</tbody></table>`;

    if (yhteenvetoView) yhteenvetoView.innerHTML = html;

  } catch (err) {
    alert("Yhteenveto-virhe: " + err);
  }
}

// =========================
// TALLENNUS
// =========================

async function tallenna() {
  const virhe = osat.find(o => Number(o.massa) < 0);
  if (virhe) {
    alert("Massa ei voi olla negatiivinen.\n\nOsa: " + virhe.osa);
    return;
  }

  const muuttuneet = osat.filter(o => o._dirty);
  if (!muuttuneet.length) return;

  if (tallennaBtn) tallennaBtn.disabled = true;

  try {
    await API("tallennaOsat", { osat: muuttuneet });

    muuttuneet.forEach(o => delete o._dirty);
    muutoksia = false;

    if (tallennaBtn) {
      tallennaBtn.disabled = false;
      tallennaBtn.classList.remove("unsaved");
    }

    naytaTallennusKuittaus();

  } catch (err) {
    alert("Tallennus epäonnistui: " + err);
    if (tallennaBtn) tallennaBtn.disabled = false;
  }
}

// =========================
// LENNOKIN HALLINTA
// =========================

async function avaaLennokki() {
  if (!valittuLennokkiId) return;
  await API("asetaAktiivinen", { id: valittuLennokkiId });

  aktiivinenLennokkiId = valittuLennokkiId;

  siirryAppiin();
  lataaOsat();
}

async function avaaUusiLennokki() {
  const uusiId = await API("luoUusiLennokki", {
    nimi: uusiLennokkiNimi,
    malli: document.getElementById("uusiMalliSelect")?.value
  });

  aktiivinenLennokkiId = uusiId;
  uusiLennokkiNimi = "";
  valittuLennokkiId = null;

  paivitaAloitus();
  siirryAppiin();
  lataaOsat();
}

async function kopioiValittuLennokki() {
  if (!valittuLennokkiId) return;

  const alkuperainen = valittuLennokkiId;
  const uusiNimi = prompt("Anna kopion nimi:", alkuperainen + "_kopio");
  if (!uusiNimi) return;

  await API("kopioiLennokki", { alkuperainen, uusiNimi });

  valittuLennokkiId = null;
  paivitaAloitus();
}

async function poistaValittuLennokki() {
  if (!valittuLennokkiId) return;
  if (!confirm("Poistetaanko lennokki?")) return;

  await API("poistaLennokki", { nimi: valittuLennokkiId });

  valittuLennokkiId = null;
  paivitaAloitus();
}

async function muokkaaValittuaLennokkia() {
  if (!valittuLennokkiId) return;

  const uusi = prompt("Anna uusi nimi:", valittuLennokkiId);
  if (!uusi) return;

  await API("nimeaLennokkiUudelleen", { vanha: valittuLennokkiId, uusi });

  valittuLennokkiId = null;
  paivitaAloitus();
}
