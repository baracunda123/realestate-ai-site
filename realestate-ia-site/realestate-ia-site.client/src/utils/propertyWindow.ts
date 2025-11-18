import { logger } from './logger';

// Gestor global de janela de propriedades
// Mantém referência única para reutilizar o mesmo separador

class PropertyWindowManager {
  private windowRef: Window | null = null;

  openProperty(url: string): void {
    try {
      // Verificar se a janela ainda está aberta
      if (this.windowRef && !this.windowRef.closed) {
        logger.debug('Reutilizando separador existente', 'PROPERTY_WINDOW');
        this.windowRef.location.href = url;
        this.windowRef.focus();
      } else {
        logger.debug('Abrindo novo separador', 'PROPERTY_WINDOW');
        this.windowRef = window.open(url, '_blank');
        
        if (!this.windowRef) {
          logger.warn('Popup bloqueado pelo browser - utilizador precisa permitir popups', 'PROPERTY_WINDOW');
        }
      }
    } catch (error) {
      logger.error('Erro ao abrir propriedade', 'PROPERTY_WINDOW', error as Error);
      // Fallback final
      window.open(url, '_blank');
    }
  }

  isOpen(): boolean {
    return this.windowRef !== null && !this.windowRef.closed;
  }

  close(): void {
    if (this.windowRef && !this.windowRef.closed) {
      this.windowRef.close();
    }
    this.windowRef = null;
  }
}

// Instância singleton
export const propertyWindowManager = new PropertyWindowManager();
