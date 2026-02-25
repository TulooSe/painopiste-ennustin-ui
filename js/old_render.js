
 /* =========================
   ALOITUSNÄYTTÖ
========================= */

function paivitaAloitus() {
  console.log("paivitaAloitus kutsuttu");

  google.script.run
    .withSuccessHandler(lennokit => {
     piirraAloitusTaulukko(lennokit);
    })

    .withFailureHandler(err => {
      console.error("Apps Script virhe:", err);
    })
    .haeLennokitAloitukseen(); // 👈 UUSI, PUHDAS NIMI
}

function valitseRivi(tr, id) {
  document
    .querySelectorAll("#startTableBody tr")
    .forEach(r => r.classList.remove("selected"));

  tr.classList.add("selected");
  valittuLennokkiId = id;

  paivitaAloitusNapinTilat();
}

function piirraAloitusTaulukko(lennokit) {
  const tbody = document.getElementById("startTableBody");
  tbody.innerHTML = "";

  /* 1️⃣ OLEMASSA OLEVAT – EI RAJOITUSTA */
  lennokit.forEach(l => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="col-name">${l.id}</td>
      <td class="col-num">${l.massa ?? ""}</td>
      <td class="col-num">${Number.isFinite(l.pp) ? Math.round(l.pp) : ""}</td>
      <td class="col-date">${l.pvm ?? ""}</td>
    `;

    tr.onclick = () => valitseRivi(tr, l.id);

    if (valittuLennokkiId === l.id) tr.classList.add("selected");

    tbody.appendChild(tr);
  });


  /* 2️⃣ UUSI LENNOkki (AINOA) */
  const tr = document.createElement("tr");
  tr.classList.add("new-row");

  tr.innerHTML = `
    <td class="new-lennokki-cell" colspan="4">
      <div class="new-lennokki-row">

        <input
          id="uusiLennokkiInput"
          placeholder="Anna uuden lennokin nimi"
          value="${uusiLennokkiNimi}"

          oninput="uusiLennokkiNimi = this.value; paivitaAloitusNapinTilat();"
          onkeydown="uusiLennokkiKey(event)"
          onclick="valitseRivi(this.closest('tr'), '__UUSI__')">

        <select
          id="uusiMalliSelect"
          class="uusi-malli-select"
          onchange="uusiLennokkiMalli = this.value"
          onclick="valitseRivi(this.closest('tr'), '__UUSI__')">
            <option value="RAKENTEILLA">Rakenteilla</option>
            <option value="PUOLIVALMIS">Puolivalmis</option>
            <option value="VALMIS">Valmis</option>
            <option value="TYHJA">Tyhjä</option>
        </select>
      </div>
    </td>
  `;

  if (valittuLennokkiId === "__UUSI__") tr.classList.add("selected");

  tbody.appendChild(tr);


    // 🔁 Palauta uuden lennokin valinta ja lukitus
  if (valittuLennokkiId === UUSI_LENNOKKI_ID && uusiLennokkiValmis) {
    const input = document.getElementById("uusiLennokkiInput");
    if (input) {
      input.setAttribute("readonly", "true");
    }
  }

  paivitaAloitusNapinTilat();
}



/* ===== ROW ===== */
function aktivoiRivi(el) {
  document.querySelectorAll("tr.active-row")
    .forEach(r=>r.classList.remove("active-row"));
  el.closest("tr")?.classList.add("active-row");
}

if (DEBUG) {
  console.log("Painopisteen Ennustin v" + APP_VERSION);
}


/* =========================
   PIIRTO (UI)
========================= */

function piirraOsat() {
  if (!Array.isArray(osat)) {
    console.warn("piirraOsat: osat ei ole array", osat);
    return;
  }  
  const groups = ryhmitteleOsat(osat);

  if (!aktiivinenRyhma) {
    aktiivinenRyhma = Object.keys(groups)[0] || null;
  }

  let html = `
  <table>
    <thead>
      <tr>
        <th class="col-nro">#</th>
        <th class="col-osa">Osa</th>
        <th class="col-num">Massa</th>
        <th class="col-num">Varsi</th>
        <th class="col-kok">Kokoonpano</th>
      </tr>
    </thead>
  `;

  Object.entries(groups).forEach(([ryhma, data], idx) => {
  const items = data.items;
  const ryhmaMassa = Math.round(data.massa);


    /* ===== OTSIKKO (AINA NÄKYVISSÄ) ===== */
   html += `
    <tbody class="osa-group-head">
      <tr class="osa-group-header"
          onclick="toggleRyhma('${ryhma}')">
        <td colspan="5">
          <span class="group-arrow">
            ${ryhma === aktiivinenRyhma ? "▼" : "▶"}
          </span>
          <span class="group-name">${ryhma}</span>

          <span class="group-massa">${ryhmaMassa}&nbsp;g</span>
        </td>
      </tr>
    </tbody>
  `;


    /* ===== SISÄLTÖ (PIILOTETTAVA) ===== */
    html += `
      <tbody class="osa-group-body"
            data-ryhma="${ryhma}"
            style="display:${idx === 0 ? 'table-row-group' : 'none'}">
    `;

    items.forEach(o => {
      if (suodataNollat && Number(o.massa) === 0) return;
      const i = osat.indexOf(o);
      const varsiClass =
        o.varsi > 0 ? "varsi-pos" :
        o.varsi < 0 ? "varsi-neg" : "";

      html += `
        <tr>
          <td class="col-nro">${o.osanro}</td>
          <td class="col-osa">${o.osa}</td>

          <td class="col-num">
            <input value="${o.massa}"
              data-row="${i}" data-col="massa"
              onfocus="aktivoiRivi(this)"
              onkeydown="soluKey(event,this)"
              oninput="vainNumero(this,false)">
          </td>

          <td class="col-num">
            <input value="${o.varsi}"
              class="${varsiClass}"
              data-row="${i}" data-col="varsi"
              onfocus="aktivoiRivi(this)"
              onkeydown="soluKey(event,this)"
              oninput="vainNumero(this,true)">
          </td>

          <td class="col-kok">
            <select
              data-row="${i}" data-col="kokoonpano"
              onfocus="aktivoiRivi(this)"
              onchange="kokoonpanoVaihdettu(this)">
              ${kokoonpanot.map(k =>
                `<option ${k===o.kokoonpano?'selected':''}>${k}</option>`
              ).join("")}
            </select>
          </td>
        </tr>
      `;
    });

    html += `</tbody>`;
  });

  html += `</table>`;
  osatView.innerHTML = html;
    if (aktiivinenRyhma) {
    paivitaRyhmatNakyvyys();
  }
}

function ryhmitteleOsat(osatLista) {

  // 🔒 Turvasuoja
  if (!Array.isArray(osatLista)) {
    console.warn("ryhmitteleOsat sai ei-arrayn:", osatLista);
    console.trace(); /*Tämä lisätty. */
    return {};
  }

  const groups = {};

  osatLista.forEach(o => {

    const ryhma = o.ryhma || "(Ei ryhmää)";

    if (!groups[ryhma]) {
      groups[ryhma] = {
        items: [],
        massa: 0
      };
    }

    groups[ryhma].items.push(o);

    const m = Number(o.massa) || 0;
    groups[ryhma].massa += m;
  });

  return groups;
}


function toggleRyhma(ryhma) {
  aktiivinenRyhma =
    aktiivinenRyhma === ryhma ? null : ryhma;

  paivitaRyhmatNakyvyys();
}


function paivitaRyhmatNakyvyys() {
  document.querySelectorAll(".osa-group-body").forEach(tb => {
    tb.style.display =
      tb.dataset.ryhma === aktiivinenRyhma
        ? "table-row-group"
        : "none";
  });

  document.querySelectorAll(".osa-group-header").forEach(h => {
    const arrow = h.querySelector(".group-arrow");
    if (!arrow) return;

    arrow.textContent =
      h.dataset.ryhma === aktiivinenRyhma ? "▼" : "▶";
  });
}


function avaaOhje() {
  const modal = document.getElementById("ohjeModal");
  const ohje  = document.getElementById("ohjeTeksti");

  modal.style.display = "block";
  ohje.innerHTML = "<p>Ladataan ohjetta…</p>";

  google.script.run
    .withSuccessHandler(html => {
      ohje.innerHTML = html || "<p>Ohje on tyhjä.</p>";
    })
    .withFailureHandler(err => {
      ohje.innerHTML =
        "<p style='color:red'>Ohjetta ei voitu ladata.</p><pre>" +
        err.message +
        "</pre>";
    })
    .haeOhjeHtml();
}

function scrollOhje(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function suljeOhje() {
  document.getElementById("ohjeModal").style.display = "none";
}
