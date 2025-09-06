using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Payments
{
    // Infra service agora apenas para idempotência / persistência
    public class WebhookService : IWebhookService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<WebhookService> _logger;
        public WebhookService(IApplicationDbContext context, ILogger<WebhookService> logger)
        {
            _context = context;
            _logger = logger;
        }
        public async Task<bool> IsEventProcessedAsync(string stripeEventId) =>
            await _context.WebhookEvents.AnyAsync(e => e.StripeEventId == stripeEventId);

        public async Task<WebhookEvent> MarkEventAsProcessedAsync(string stripeEventId, string eventType, object eventData)
        {
            var existing = await _context.WebhookEvents.FirstOrDefaultAsync(e => e.StripeEventId == stripeEventId);
            if (existing != null) return existing;
            var webhookEvent = new WebhookEvent
            {
                Id = Guid.NewGuid().ToString(),
                EventType = eventType,
                Type = eventType,
                StripeEventId = stripeEventId,
                Data = JsonSerializer.SerializeToDocument(eventData),
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow
            };
            _context.WebhookEvents.Add(webhookEvent);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Webhook event persistido: {EventId} {Type}", stripeEventId, eventType);
            return webhookEvent;
        }
    }
}