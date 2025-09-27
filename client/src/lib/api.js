import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:4000/api",
    withCredentials: true,
});

export async function fetchNotes(boardId) {
    const res = await api.get(`/boards/${boardId}/notes`);
    return res.data.notes;
}
    