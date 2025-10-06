import apiClient from './client';
import { auth as logger } from '../utils/logger';

export interface UploadResponse {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}

/**
 * Serviço para upload de imagem de perfil
 */
export class UploadService {
  /**
   * Upload de imagem de perfil
   */
  static async uploadProfileImage(file: File): Promise<UploadResponse> {
    try {
      // Validar arquivo
      if (!file) {
        return {
          success: false,
          error: 'Nenhum arquivo selecionado'
        };
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Por favor, selecione apenas imagens'
        };
      }

      // Validar tamanho (maximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'A imagem deve ter no maximo 5MB'
        };
      }

      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);

      logger.info(`Fazendo upload da imagem de perfil: ${file.name}, tamanho: ${file.size} bytes`);

      // Fazer upload
      const response = await apiClient.post<UploadResponse>('/api/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      logger.info('Upload concluido com sucesso');
      return response;

    } catch (error: unknown) {
      logger.error('Erro no upload da imagem', error as Error);
      
      const errorResponse = error as { response?: { data?: { message?: string } } };
      if (errorResponse.response?.data?.message) {
        return {
          success: false,
          error: errorResponse.response.data.message
        };
      }

      return {
        success: false,
        error: 'Erro interno no upload da imagem'
      };
    }
  }

  /**
   * Converter file para base64 para preview
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Validar dimensoes da imagem
   */
  static validateImageDimensions(file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width <= maxWidth && img.height <= maxHeight);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Redimensionar imagem se necessario
   */
  static resizeImage(file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular novas dimensoes mantendo aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter canvas para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Erro ao redimensionar imagem'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  }
}

export default UploadService;