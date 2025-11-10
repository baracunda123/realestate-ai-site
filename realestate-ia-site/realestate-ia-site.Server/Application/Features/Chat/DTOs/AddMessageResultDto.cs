namespace realestate_ia_site.Server.Application.Features.Chat.DTOs
{
    /// <summary>
    /// Resultado de adicionar uma mensagem, incluindo informação sobre atualização de título
    /// </summary>
    public class AddMessageResultDto
    {
        public ChatMessageDto Message { get; set; } = null!;
        public bool TitleUpdated { get; set; }
        public string? UpdatedTitle { get; set; }
    }
}
