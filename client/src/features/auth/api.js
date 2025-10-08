import { api } from "../../lib/api";

export async function loginRequest({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // { user, token }
}

export async function registerRequest({ email, name, password }) {
  const res = await api.post("/auth/register", { email, name, password });
  return res.data; // { user, token }
}
