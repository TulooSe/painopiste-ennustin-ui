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
    document.body.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        font-family:sans-serif;
        background:#f2f2f2;
      ">
        <div style="
          background:white;
          padding:30px;
          border-radius:10px;
          box-shadow:0 5px 15px rgba(0,0,0,0.1);
          width:300px;
        ">
          <h2 style="margin-top:0;">Kirjaudu</h2>

          <input 
            type="email" 
            id="loginEmail" 
            placeholder="Sähköpostiosoite"
            style="width:100%;padding:8px;margin-bottom:10px;"
            required
          />

          <label style="font-size:14px;">
            <input type="checkbox" id="rememberMe" />
            Muista minut
          </label>

          <button 
            id="loginBtn"
            style="
              width:100%;
              padding:10px;
              margin-top:15px;
              background:#007bff;
              color:white;
              border:none;
              border-radius:5px;
              cursor:pointer;
            ">
            Kirjaudu
          </button>

          <p id="loginError" style="color:red;font-size:13px;"></p>
        </div>
      </div>
    `;

    document
      .getElementById("loginBtn")
      .addEventListener("click", handleLogin);
  }

  function hideLogin() {
    document.body.style.visibility = "visible";
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

})();
