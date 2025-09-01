// client.ts - API client for realestate-ia-site

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import sessionService from './session.service';

//const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';  para mais tarde, se necess�rio separar o backend do frontend

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar headers automaticamente
    this.client.interceptors.request.use(
      (config) => {
        const sessionId = sessionService.getSessionId();
        console.log('🔍 Enviando X-Session-ID:', sessionId);
        
        // Sempre adiciona o session ID
        config.headers['X-Session-ID'] = sessionId;
        
        // Adiciona token de autenticação se o usuário estiver logado
        const accessToken = sessionService.getAccessToken();
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        console.log('📤 Headers enviados:', config.headers);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para lidar com respostas de erro de autenticação
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          sessionService.logout();
          console.warn('Token expirado, usuário deslogado automaticamente');
        }
        return Promise.reject(error);
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };