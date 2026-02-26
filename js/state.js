export const state = {
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
