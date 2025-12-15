import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

export interface ChatResponse {
    response: string;
}

export const sendMessage = async (message: string, history: any[]) => {
    const response = await api.post<ChatResponse>('/chat', { message, history });
    return response.data;
};
