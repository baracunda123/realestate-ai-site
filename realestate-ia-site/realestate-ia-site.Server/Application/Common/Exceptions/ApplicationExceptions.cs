namespace realestate_ia_site.Server.Application.Common.Exceptions
{
    /// <summary>
    /// Exceção base para erros específicos da aplicação
    /// </summary>
    public abstract class ApplicationException : Exception
    {
        public string ErrorCode { get; }
        public string UserMessage { get; }
        public object? Details { get; }

        protected ApplicationException(
            string errorCode, 
            string userMessage, 
            string? technicalMessage = null, 
            object? details = null,
            Exception? innerException = null) 
            : base(technicalMessage ?? userMessage, innerException)
        {
            ErrorCode = errorCode;
            UserMessage = userMessage;
            Details = details;
        }
    }

    /// <summary>
    /// Exceção para propriedades não encontradas
    /// </summary>
    public class PropertyNotFoundException : ApplicationException
    {
        public PropertyNotFoundException(string propertyId) 
            : base(
                "PROPERTY_NOT_FOUND", 
                "Propriedade não encontrada",
                $"Property with ID '{propertyId}' was not found",
                new { PropertyId = propertyId })
        {
        }
    }

    /// <summary>
    /// Exceção para filtros de pesquisa inválidos
    /// </summary>
    public class InvalidSearchFiltersException : ApplicationException
    {
        public InvalidSearchFiltersException(string message, object? filters = null) 
            : base(
                "INVALID_SEARCH_FILTERS", 
                "Filtros de pesquisa inválidos",
                message,
                filters)
        {
        }
    }

    /// <summary>
    /// Exceção para limites de busca excedidos
    /// </summary>
    public class SearchLimitExceededException : ApplicationException
    {
        public SearchLimitExceededException(int limit, int requested) 
            : base(
                "SEARCH_LIMIT_EXCEEDED", 
                $"Limite de pesquisa excedido. Máximo permitido: {limit}",
                $"Requested {requested} results but limit is {limit}",
                new { Limit = limit, Requested = requested })
        {
        }
    }

    /// <summary>
    /// Exceção para usuário não autorizado
    /// </summary>
    public class UnauthorizedAccessException : ApplicationException
    {
        public UnauthorizedAccessException(string action) 
            : base(
                "UNAUTHORIZED_ACCESS", 
                "Acesso não autorizado",
                $"User is not authorized to perform action: {action}",
                new { Action = action })
        {
        }
    }

    /// <summary>
    /// Exceção para recursos que requerem Premium
    /// </summary>
    public class PremiumRequiredException : ApplicationException
    {
        public PremiumRequiredException(string feature) 
            : base(
                "PREMIUM_REQUIRED", 
                "Esta funcionalidade requer uma conta Premium",
                $"Feature '{feature}' requires Premium subscription",
                new { Feature = feature })
        {
        }
    }

    /// <summary>
    /// Exceção para dados de propriedade inválidos
    /// </summary>
    public class InvalidPropertyDataException : ApplicationException
    {
        public InvalidPropertyDataException(string field, string? value = null) 
            : base(
                "INVALID_PROPERTY_DATA", 
                $"Dados da propriedade inválidos: {field}",
                $"Invalid property data for field '{field}'{(value != null ? $" with value '{value}'" : "")}",
                new { Field = field, Value = value })
        {
        }
    }

    /// <summary>
    /// Exceção para localizações não encontradas
    /// </summary>
    public class LocationNotFoundException : ApplicationException
    {
        public LocationNotFoundException(string location) 
            : base(
                "LOCATION_NOT_FOUND", 
                "Localização não encontrada",
                $"Location '{location}' was not found",
                new { Location = location })
        {
        }
    }

    /// <summary>
    /// Exceção para serviços externos indisponíveis
    /// </summary>
    public class ExternalServiceException : ApplicationException
    {
        public ExternalServiceException(string serviceName, string? message = null, Exception? innerException = null) 
            : base(
                "EXTERNAL_SERVICE_ERROR", 
                "Serviço temporariamente indisponível. Tente novamente em alguns instantes.",
                $"External service '{serviceName}' is unavailable: {message}",
                new { ServiceName = serviceName },
                innerException)
        {
        }
    }

    /// <summary>
    /// Exceção para dados duplicados
    /// </summary>
    public class DuplicateDataException : ApplicationException
    {
        public DuplicateDataException(string resource, string identifier) 
            : base(
                "DUPLICATE_DATA", 
                $"{resource} já existe",
                $"Duplicate {resource} with identifier '{identifier}'",
                new { Resource = resource, Identifier = identifier })
        {
        }
    }

    /// <summary>
    /// Exceção para validação de dados
    /// </summary>
    public class ValidationException : ApplicationException
    {
        public Dictionary<string, string[]> ValidationErrors { get; }

        public ValidationException(Dictionary<string, string[]> validationErrors) 
            : base(
                "VALIDATION_ERROR", 
                "Dados inválidos fornecidos",
                "Validation failed for one or more fields",
                validationErrors)
        {
            ValidationErrors = validationErrors;
        }

        public ValidationException(string field, string error) 
            : this(new Dictionary<string, string[]> { { field, new[] { error } } })
        {
        }
    }
}