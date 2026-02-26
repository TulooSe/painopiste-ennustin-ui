// =========================
// USER HANDLING
// =========================

const User = {

  storageKey: "pp_user_email",

  getId() {
    let email = localStorage.getItem(this.storageKey);

    if (!email) {
      email = this.askEmail();
      localStorage.setItem(this.storageKey, email);
    }

    return email;
  },

  askEmail() {
    let email = "";

    while (!email) {
      email = prompt("Anna sähköpostiosoitteesi:");
      if (!email) {
        alert("Sähköposti vaaditaan.");
      }
    }

    return email.trim().toLowerCase();
  },

  changeUser() {
    localStorage.removeItem(this.storageKey);
    location.reload();
  }
};
