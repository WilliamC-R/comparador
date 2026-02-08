const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

async function sendAuth(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Não foi possível concluir.");
    return;
  }
  window.location.href = "/";
}

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    sendAuth("/api/login", Object.fromEntries(formData.entries()));
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    sendAuth("/api/register", Object.fromEntries(formData.entries()));
  });
}
