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

export function setView(view) {
  state.view = view;
}

export function setOsat(osat) {
  state.osat = osat;
}

export function setLennokit(lennokit) {
  state.lennokit = lennokit;
}
