using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Domain.Validation
{
    /// <summary>
    /// Valida email apenas se o campo estiver preenchido
    /// </summary>
    public class ConditionalEmailAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var email = value as string;
            
            // Se vazio ou null, não valida (deixa Required tratar)
            if (string.IsNullOrWhiteSpace(email))
            {
                return ValidationResult.Success;
            }
            
            // Se preenchido, valida formato
            var emailAttribute = new EmailAddressAttribute();
            if (!emailAttribute.IsValid(email))
            {
                return new ValidationResult(ErrorMessage ?? "Email inválido");
            }
            
            return ValidationResult.Success;
        }
    }
    
    /// <summary>
    /// Valida tamanho apenas se o campo estiver preenchido
    /// </summary>
    public class ConditionalStringLengthAttribute : ValidationAttribute
    {
        public int MinimumLength { get; set; }
        public int MaximumLength { get; set; }
        
        public ConditionalStringLengthAttribute(int maximumLength, int minimumLength = 0)
        {
            MaximumLength = maximumLength;
            MinimumLength = minimumLength;
        }
        
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var text = value as string;
            
            // Se vazio ou null, não valida (deixa Required tratar)
            if (string.IsNullOrWhiteSpace(text))
            {
                return ValidationResult.Success;
            }
            
            // Se preenchido, valida tamanho
            if (text.Length < MinimumLength || text.Length > MaximumLength)
            {
                return new ValidationResult(ErrorMessage ?? $"Deve ter entre {MinimumLength} e {MaximumLength} caracteres.");
            }
            
            return ValidationResult.Success;
        }
    }
    
    /// <summary>
    /// Valida regex apenas se o campo estiver preenchido
    /// </summary>
    public class ConditionalRegularExpressionAttribute : ValidationAttribute
    {
        public string Pattern { get; set; }
        
        public ConditionalRegularExpressionAttribute(string pattern)
        {
            Pattern = pattern;
        }
        
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var text = value as string;
            
            // Se vazio ou null, não valida (deixa Required tratar)
            if (string.IsNullOrWhiteSpace(text))
            {
                return ValidationResult.Success;
            }
            
            // Se preenchido, valida regex
            var regexAttribute = new RegularExpressionAttribute(Pattern);
            if (!regexAttribute.IsValid(text))
            {
                return new ValidationResult(ErrorMessage ?? "Formato inválido");
            }
            
            return ValidationResult.Success;
        }
    }
}
