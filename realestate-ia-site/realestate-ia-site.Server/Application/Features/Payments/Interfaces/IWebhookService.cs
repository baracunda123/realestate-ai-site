using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Features.Payments.Interfaces
{
    // Agora focada apenas em idempotência / persistência de eventos
    public interface IWebhookService
    {
        Task<bool> IsEventProcessedAsync(string stripeEventId);
        Task<WebhookEvent> MarkEventAsProcessedAsync(string stripeEventId, string eventType, object eventData);
    }
}
