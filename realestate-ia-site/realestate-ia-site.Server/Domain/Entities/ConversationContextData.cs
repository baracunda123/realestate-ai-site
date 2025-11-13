namespace realestate_ia_site.Server.Domain.Entities
{
    /// <summary>
    /// Persistência do contexto de conversa para manter histórico de filtros e estado
    /// mesmo após reinício do servidor ou expiração do cache
    /// </summary>
    public class ConversationContextData
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string SessionId { get; set; } = string.Empty;
        
        /// <summary>
        /// Filtros atuais da conversa (JSON serializado)
        /// </summary>
        public string LastFiltersJson { get; set; } = "{}";
        
        /// <summary>
        /// Histórico de filtros das últimas 10 pesquisas (JSON serializado)
        /// </summary>
        public string FilterHistoryJson { get; set; } = "[]";
        
        /// <summary>
        /// Última query do utilizador
        /// </summary>
        public string? LastQuery { get; set; }
        
        /// <summary>
        /// Última atividade na conversa
        /// </summary>
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Data de criação
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Data de atualização
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation
        public ChatSession? Session { get; set; }
    }
}
