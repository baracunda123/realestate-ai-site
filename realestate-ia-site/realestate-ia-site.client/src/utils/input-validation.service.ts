// input-validation.service.ts
export class InputValidationService {
  // Validação básica de email para UX
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254 && email.length >= 5;
  }

  // Validação básica de senha para UX (ajudar o usuário)
  static validatePassword(password: string): { isValid: boolean; errors: string[]; strength: 'weak' | 'medium' | 'strong' } {
    const errors: string[] = [];
    let score = 0;
    
    // Verificações básicas para ajudar o usuário
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    if (!/[a-z]/.test(password)) errors.push('Pelo menos 1 letra minúscula');
    else score += 1;
    
    if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula');
    else score += 1;
    
    if (!/\d/.test(password)) errors.push('Pelo menos 1 número');
    else score += 1;
    
    if (!/[@$!%*?&.#^()_+=-[\]{}|\\:";'<>?,./]/.test(password)) errors.push('Pelo menos 1 caractere especial');
    else score += 1;
    
    // Verificações de UX
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Evite mais de 2 caracteres repetidos consecutivos');
      score -= 1;
    }
    
    if (/123|abc|qwe|asd|zxc/i.test(password)) {
      errors.push('Evite sequências comuns');
      score -= 1;
    }
    
    // Calcular força
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 6) strength = 'strong';
    else if (score >= 4) strength = 'medium';
    
    return { isValid: errors.length === 0, errors, strength };
  }

  // Validação simples de tamanho
  static validateLength(input: string, maxLength: number, fieldName: string): { isValid: boolean; error?: string } {
    if (input.length > maxLength) {
      return {
        isValid: false,
        error: `${fieldName} deve ter no máximo ${maxLength} caracteres`
      };
    }
    return { isValid: true };
  }

  // Validação básica APENAS para UX - o servidor fará a validação real
  static validateUserInput(input: string, type: 'text' | 'email' | 'password' | 'search' | 'url' | 'phone'): ValidationResult {
    const result: ValidationResult = { 
      isValid: true, 
      errors: [], 
      sanitized: input // Não sanitizar - deixar o servidor fazer isso
    };

    // Validações básicas apenas para melhorar UX
    switch (type) {
      case 'email': {
        if (!this.isValidEmail(input)) {
          result.errors.push('Email inválido');
          result.isValid = false;
        }
        break;
      }
      
      case 'password': {
        const passwordValidation = this.validatePassword(input);
        if (!passwordValidation.isValid) {
          result.errors.push(...passwordValidation.errors);
          result.isValid = false;
        }
        break;
      }

      case 'url': {
        try {
          const url = new URL(input);
          if (!['http:', 'https:'].includes(url.protocol)) {
            result.errors.push('URL deve usar HTTP ou HTTPS');
            result.isValid = false;
          }
        } catch {
          result.errors.push('URL inválida');
          result.isValid = false;
        }
        break;
      }

      case 'phone': {
        const phoneRegex = /^[+]?[1-9][\d\s-()]{7,15}$/;
        if (!phoneRegex.test(input.replace(/\s/g, ''))) {
          result.errors.push('Número de telefone inválido');
          result.isValid = false;
        }
        break;
      }
      
      case 'search': {
        const searchLength = this.validateLength(input, 500, 'Consulta de pesquisa');
        if (!searchLength.isValid) {
          result.errors.push(searchLength.error!);
          result.isValid = false;
        }
        break;
      }
      
      case 'text':
      default: {
        const textLength = this.validateLength(input, 2000, 'Texto');
        if (!textLength.isValid) {
          result.errors.push(textLength.error!);
          result.isValid = false;
        }
        break;
      }
    }

    return result;
  }

  // Validação de múltiplos campos para UX
  static validateForm(fields: Record<string, { value: string; type: 'text' | 'email' | 'password' | 'search' | 'url' | 'phone' }>): FormValidationResult {
    const results: Record<string, ValidationResult> = {};
    let isFormValid = true;

    for (const [fieldName, field] of Object.entries(fields)) {
      const result = this.validateUserInput(field.value, field.type);
      results[fieldName] = result;
      
      if (!result.isValid) {
        isFormValid = false;
      }
    }

    return {
      isValid: isFormValid,
      fields: results
    };
  }
}

// Interfaces simplificadas
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: string;
}

interface FormValidationResult {
  isValid: boolean;
  fields: Record<string, ValidationResult>;
}

// Hook personalizado para React
export function useInputValidation() {
  const validateInput = (input: string, type: Parameters<typeof InputValidationService.validateUserInput>[1]) => {
    return InputValidationService.validateUserInput(input, type);
  };

  const validateForm = (fields: Parameters<typeof InputValidationService.validateForm>[0]) => {
    return InputValidationService.validateForm(fields);
  };

  return { validateInput, validateForm };
}

export type { ValidationResult, FormValidationResult };