/**
 * Gera um fingerprint único e persistente para o dispositivo
 * Este fingerprint é usado para identificar o mesmo dispositivo entre sessões
 */

import { logger } from './logger';

const FINGERPRINT_KEY = 'device_fingerprint';

/**
 * Gera um hash simples de uma string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Coleta informações do navegador/dispositivo para criar um fingerprint
 */
function collectDeviceInfo(): string {
  const info = [];
  
  // Screen resolution
  info.push(`${screen.width}x${screen.height}`);
  info.push(`${screen.colorDepth}`);
  
  // Timezone
  info.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Language
  info.push(navigator.language);
  
  // Platform
  info.push(navigator.platform);
  
  // User Agent (simplificado - apenas browser e OS principais)
  const ua = navigator.userAgent;
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = ua.match(/(Windows|Mac|Linux|Android|iOS)/);
  if (browserMatch) info.push(browserMatch[0]);
  if (osMatch) info.push(osMatch[0]);
  
  // Hardware concurrency (número de cores do CPU)
  if (navigator.hardwareConcurrency) {
    info.push(`cores:${navigator.hardwareConcurrency}`);
  }
  
  // Device memory (se disponível)
  if ('deviceMemory' in navigator) {
    info.push(`mem:${(navigator as any).deviceMemory}`);
  }
  
  return info.join('|');
}

/**
 * Obtém ou cria um fingerprint único para o dispositivo
 * O fingerprint é armazenado no localStorage para persistir entre sessões
 */
export function getDeviceFingerprint(): string {
  try {
    // Tentar obter fingerprint existente do localStorage
    let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
    
    if (fingerprint) {
      logger.debug('Device fingerprint recuperado do localStorage', 'FINGERPRINT');
      return fingerprint;
    }
    
    // Gerar novo fingerprint baseado em características do dispositivo
    const deviceInfo = collectDeviceInfo();
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    
    // Combinar informações do dispositivo + timestamp + random para criar fingerprint único
    const combined = `${deviceInfo}|${timestamp}|${random}`;
    fingerprint = simpleHash(combined);
    
    // Armazenar no localStorage
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
    
    logger.info(`Novo device fingerprint gerado: ${fingerprint}`, 'FINGERPRINT');
    return fingerprint;
    
  } catch (error) {
    // Fallback: se localStorage não estiver disponível, gerar fingerprint temporário
    logger.warn('Erro ao acessar localStorage, usando fingerprint temporário', 'FINGERPRINT');
    const deviceInfo = collectDeviceInfo();
    return simpleHash(deviceInfo);
  }
}

/**
 * Limpa o fingerprint armazenado (útil para testes ou logout completo)
 */
export function clearDeviceFingerprint(): void {
  try {
    localStorage.removeItem(FINGERPRINT_KEY);
    logger.info('Device fingerprint removido', 'FINGERPRINT');
  } catch (error) {
    logger.error('Erro ao remover fingerprint', 'FINGERPRINT', error as Error);
  }
}
