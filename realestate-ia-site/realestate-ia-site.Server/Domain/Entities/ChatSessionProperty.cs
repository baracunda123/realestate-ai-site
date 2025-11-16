namespace realestate_ia_site.Server.Domain.Entities
{
    /// <summary>
    /// Relaciona propriedades retornadas em pesquisas com sessões de chat
    /// Permite recuperar os imóveis quando uma conversa antiga é reaberta
    /// </summary>
    public class ChatSessionProperty
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string SessionId { get; set; } = string.Empty;
        public string PropertyId { get; set; } = string.Empty;
        public int DisplayOrder { get; set; } // Ordem em que foi retornado na pesquisa
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// Features encontradas nesta propriedade (JSON serializado)
        /// Exemplo: ["varanda", "jardim", "moderno"]
        /// </summary>
        public string? MatchedFeaturesJson { get; set; }
        
        // Navigation properties
        public virtual ChatSession? Session { get; set; }
        public virtual Property? Property { get; set; }
    }
}
