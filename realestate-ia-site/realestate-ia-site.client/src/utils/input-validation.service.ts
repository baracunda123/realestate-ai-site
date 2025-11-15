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
    
    if (!/[!@#$%^&*(),.?\":{}|<>_+=\-\[\]\\;'/]/.test(password)) errors.push('Pelo menos 1 caractere especial');
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
  static isValidLength(input: string, min: number, max: number): boolean {
    return input.length >= min && input.length <= max;
  }

  // Validação básica APENAS para UX - o servidor fará a validação real
  static validateUserInput(input: string, type: 'text' | 'email' | 'password' | 'search' | 'url' | 'phone'): ValidationResult {
    const result: ValidationResult = { 
      isValid: true, 
      errors: [], 
      warnings: [] 
    };
    
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
      
      case 'text': {
        if (input.length < 2) {
          result.errors.push('Mínimo 2 caracteres');
          result.isValid = false;
        }
        if (input.length > 500) {
          result.errors.push('Máximo 500 caracteres');
          result.isValid = false;
        }
        break;
      }
      
      case 'search': {
        if (input.length > 200) {
          if (!result.warnings) result.warnings = [];
          result.warnings.push('Pesquisa muito longa');
        }
        break;
      }
      
      case 'url': {
        try {
          new URL(input);
        } catch {
          result.errors.push('URL inválida');
          result.isValid = false;
        }
        break;
      }
      
      case 'phone': {
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
        if (!phoneRegex.test(input)) {
          result.errors.push('Telefone inválido');
          result.isValid = false;
        }
        break;
      }
    }
    
    return result;
  }

  // Sanitização básica de input (remover scripts, etc)
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }

  // Validação de múltiplos campos para UX
  static validateForm(fields: Record<string, { value: string; type: 'text' | 'email' | 'password' | 'search' | 'url' | 'phone' }>): FormValidationResult {
    const results: Record<string, ValidationResult> = {};
    let isFormValid = true;

    Object.entries(fields).forEach(([fieldName, fieldData]) => {
      const validation = this.validateUserInput(fieldData.value, fieldData.type);
      results[fieldName] = validation;
      if (!validation.isValid) {
        isFormValid = false;
      }
    });

    return { isValid: isFormValid, fields: results };
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  fields: Record<string, ValidationResult>;
}
