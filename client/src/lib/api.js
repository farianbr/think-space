import axios from "axios";
import { getToken } from "./auth";

export const api = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});

// Request interceptor: add Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchNotes(boardId) {
  const res = await api.get(`/boards/${boardId}/notes`);
  return res.data.notes;
}

export async function fetchBoard(boardId) {
  const res = await api.get(`/boards/${boardId}`);
  return res.data.board;
}
