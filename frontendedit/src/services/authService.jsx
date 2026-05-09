const BASE_URL = "http://localhost:8000/auth";
export async function login(mailId, password) {
  return fetch(BASE_URL + "/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ mailId, password })
  }).then(res => res.json());
}
export async function signup(payload) {
  return fetch(BASE_URL + "/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).then(res => res.json());
}
