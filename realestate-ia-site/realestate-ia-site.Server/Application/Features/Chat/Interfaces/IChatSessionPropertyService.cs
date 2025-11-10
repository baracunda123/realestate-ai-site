using realestate_ia_site.Server.Application.Common.DTOs;

namespace realestate_ia_site.Server.Application.Features.Chat.Interfaces
{
    public interface IChatSessionPropertyService
    {
        /// <summary>
        /// Associa uma lista de propriedades a uma sessão de chat
        /// </summary>
        Task AddPropertiesToSessionAsync(string sessionId, IEnumerable<string> propertyIds, CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Obtém todas as propriedades associadas a uma sessão
        /// </summary>
        Task<List<PropertySearchDto>> GetSessionPropertiesAsync(string sessionId, CancellationToken cancellationToken = default);
        
        /// <summary>
        /// Remove todas as propriedades de uma sessão (útil ao fazer nova pesquisa na mesma sessão)
        /// </summary>
        Task ClearSessionPropertiesAsync(string sessionId, CancellationToken cancellationToken = default);
    }
}
