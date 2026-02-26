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
