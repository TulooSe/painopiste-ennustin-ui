const APP_VERSION = "1.50";

document.addEventListener("DOMContentLoaded", init);

/* =========================
   API HELPERS
========================= */

function apiGet(action) {
  return fetch(`${API_BASE}?action=${action}`)
    .then(r => r.json());
}

function apiPost(action, payload = {}) {
  return fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  }).then(r => r.json());
}

/* =========================
   INIT
========================= */

function init() {
  renderStartTable();
  loadLennokit();
}

/* =========================
   LENNOKIT
========================= */

function loadLennokit() {
  apiGet("getLennokit")
    .then(data => {
      state.lennokit = data;
      renderStartTable();
    })
    .catch(err => alert("Latausvirhe: " + err));
}

function lataaLennokit() {
  apiGet("listaaLennokit")
    .then(lista => {
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
    });
}

/* =========================
   OSAT
========================= */

function lataaOsat() {
  apiGet("haeOsat")
    .then(response => {
      osat = response.osat;
      kokoonpanot = response.kokoonpanot;
      piirraOsat();
    })
    .catch(err => alert("Osien lataus epäonnistui: " + err));
}

/* =========================
   YHTEENVETO
========================= */

function lataaYhteenveto() {
  apiGet("haeYhteenveto")
    .then(data => {

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

      html += `</tbody></table>`;
      yhteenvetoView.innerHTML = html;
    })
    .catch(err => alert("Yhteenveto-virhe: " + err));
}

/* =========================
   TALLENNUS
========================= */

function tallenna() {

  const virhe = osat.find(o => Number(o.massa) < 0);
  if (virhe) {
    alert("Massa ei voi olla negatiivinen.\n\nOsa: " + virhe.osa);
    return;
  }

  const muuttuneet = osat.filter(o => o._dirty);
  if (!muuttuneet.length) return;

  tallennaBtn.disabled = true;

  apiPost("tallennaOsat", {
    osat: muuttuneet,
    aktiivinenLennokkiId,
    currentUserId
  })
  .then(() => {

    muuttuneet.forEach(o => delete o._dirty);
    muutoksia = false;

    tallennaBtn.disabled = false;
    tallennaBtn.classList.remove("unsaved");

    naytaTallennusKuittaus();
  })
  .catch(err => {
    alert("Tallennus epäonnistui: " + err);
    tallennaBtn.disabled = false;
  });
}

/* =========================
   LENNOKIN HALLINTA
========================= */

function avaaLennokki() {

  apiPost("asetaAktiivinen", {
    id: valittuLennokkiId
  })
  .then(() => {
    aktiivinenLennokkiId = valittuLennokkiId;
    siirryAppiin();
    lataaOsat();
  });
}

function avaaUusiLennokki() {

  apiPost("luoUusiLennokki", {
    nimi: uusiLennokkiNimi,
    malli: document.getElementById("uusiMalliSelect")?.value
  })
  .then(uusiId => {

    aktiivinenLennokkiId = uusiId;
    uusiLennokkiNimi = "";
    valittuLennokkiId = null;

    paivitaAloitus();
    siirryAppiin();
    lataaOsat();
  });
}

function kopioiValittuLennokki() {

  const alkuperainen = valittuLennokkiId;
  const uusiNimi = prompt("Anna kopion nimi:", alkuperainen + "_kopio");
  if (!uusiNimi) return;

  apiPost("kopioiLennokki", {
    alkuperainen,
    uusiNimi
  }).then(() => {
    valittuLennokkiId = null;
    paivitaAloitus();
  });
}

function poistaValittuLennokki() {

  if (!confirm("Poistetaanko lennokki?")) return;

  apiPost("poistaLennokki", {
    nimi: valittuLennokkiId
  }).then(() => {
    valittuLennokkiId = null;
    paivitaAloitus();
  });
}

function muokkaaValittuaLennokkia() {

  const uusi = prompt("Anna uusi nimi:", valittuLennokkiId);
  if (!uusi) return;

  apiPost("nimeaLennokkiUudelleen", {
    vanha: valittuLennokkiId,
    uusi
  }).then(() => {
    valittuLennokkiId = null;
    paivitaAloitus();
  });
}
