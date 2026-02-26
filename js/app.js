const APP_VERSION = "1.50";

document.addEventListener("DOMContentLoaded", init);

/* =========================
   API WRAPPER
========================= */

async function API(action, payload = {}) {

   console.log("API kutsu:", action);
   
  const response = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action,
      userId: PP_User.getId(),
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return response.json();
}


/* =========================
   INIT
========================= */

function init() {
  console.log("INIT käynnistyi");
  renderStart();
  loadLennokit();
}

/* =========================
   LENNOKIT
========================= */

async function loadLennokit() {
   console.log("loadLennokit käynnistyi");
   try {
    const data = await API("haeLennokitAloitukseen");
    state.lennokit = data;
    renderStart();
  } catch (err) {
    alert("Latausvirhe: " + err);
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

/* =========================
   OSAT
========================= */

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

/* =========================
   YHTEENVETO
========================= */

async function lataaYhteenveto() {
  try {
    const data = await API("haeYhteenveto");

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

  } catch (err) {
    alert("Yhteenveto-virhe: " + err);
  }
}

/* =========================
   TALLENNUS
========================= */

async function tallenna() {

  const virhe = osat.find(o => Number(o.massa) < 0);
  if (virhe) {
    alert("Massa ei voi olla negatiivinen.\n\nOsa: " + virhe.osa);
    return;
  }

  const muuttuneet = osat.filter(o => o._dirty);
  if (!muuttuneet.length) return;

  tallennaBtn.disabled = true;

  try {
    await API("tallennaOsat", {
      osat: muuttuneet
    });

    muuttuneet.forEach(o => delete o._dirty);
    muutoksia = false;

    tallennaBtn.disabled = false;
    tallennaBtn.classList.remove("unsaved");

    naytaTallennusKuittaus();

  } catch (err) {
    alert("Tallennus epäonnistui: " + err);
    tallennaBtn.disabled = false;
  }
}

/* =========================
   LENNOKIN HALLINTA
========================= */

async function avaaLennokki() {
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

  const alkuperainen = valittuLennokkiId;
  const uusiNimi = prompt("Anna kopion nimi:", alkuperainen + "_kopio");
  if (!uusiNimi) return;

  await API("kopioiLennokki", { alkuperainen, uusiNimi });

  valittuLennokkiId = null;
  paivitaAloitus();
}

async function poistaValittuLennokki() {

  if (!confirm("Poistetaanko lennokki?")) return;

  await API("poistaLennokki", { nimi: valittuLennokkiId });

  valittuLennokkiId = null;
  paivitaAloitus();
}

async function muokkaaValittuaLennokkia() {

  const uusi = prompt("Anna uusi nimi:", valittuLennokkiId);
  if (!uusi) return;

  await API("nimeaLennokkiUudelleen", {
    vanha: valittuLennokkiId,
    uusi
  });

  valittuLennokkiId = null;
  paivitaAloitus();
}
