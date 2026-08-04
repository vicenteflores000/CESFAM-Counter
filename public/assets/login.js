const devLogin = document.querySelector("#devLogin");
const configNotice = document.querySelector("#configNotice");

fetch("/api/auth-status")
  .then((response) => response.json())
  .then((status) => {
    if (!status.authConfigured) {
      configNotice.classList.remove("is-hidden");
    }

    if (status.devLogin) {
      devLogin.classList.remove("is-hidden");
    }
  })
  .catch(() => {
    configNotice.classList.remove("is-hidden");
  });
