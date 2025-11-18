// Gestor global de janela de propriedades
// Mantém referência única para reutilizar o mesmo separador

class PropertyWindowManager {
  private windowRef: Window | null = null;

  openProperty(url: string): void {
    try {
      // Verificar se a janela ainda está aberta
      if (this.windowRef && !this.windowRef.closed) {
        console.log('✅ Reutilizando separador existente');
        this.windowRef.location.href = url;
        this.windowRef.focus();
      } else {
        console.log('🆕 Abrindo novo separador');
        this.windowRef = window.open(url, '_blank');
        
        if (!this.windowRef) {
          console.error('❌ Popup bloqueado');
          // Fallback: tentar abrir de qualquer forma
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao abrir propriedade:', error);
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
