const API_BASE = "http://127.0.0.1:8000/api";

export const api = {
    get: async (url) => fetch(`${API_BASE}${url}`).then(r => r.json()),
    post: async (url, data) =>
        fetch(`${API_BASE}${url}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }).then(r => r.json()),
};
