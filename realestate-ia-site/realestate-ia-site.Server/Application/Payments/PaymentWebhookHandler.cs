using Stripe;
using System.Text.Json;
using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Infrastructure.Configurations;

namespace realestate_ia_site.Server.Application.Payments;

public class PaymentWebhookHandler
{
    private readonly StripeOptions _stripeOptions;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IWebhookService _webhookService;
    private readonly ILogger<PaymentWebhookHandler> _logger;

    public PaymentWebhookHandler(
        StripeOptions stripeOptions,
        ISubscriptionService subscriptionService,
        IWebhookService webhookService,
        ILogger<PaymentWebhookHandler> logger)
    {
        _stripeOptions = stripeOptions;
        _subscriptionService = subscriptionService;
        _webhookService = webhookService;
        _logger = logger;
    }

    public async Task<WebhookProcessResult> HandleAsync(string json, string signatureHeader, CancellationToken ct = default)
    {
        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, _stripeOptions.WebhookSecret);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "[Webhook] Assinatura inválida");
            return WebhookProcessResult.Failure("Assinatura inválida");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Webhook] Erro a construir evento Stripe");
            return WebhookProcessResult.Failure("Evento inválido");
        }

        if (await _webhookService.IsEventProcessedAsync(stripeEvent.Id))
        {
            _logger.LogInformation("[Webhook] Evento já processado id={EventId} type={Type}", stripeEvent.Id, stripeEvent.Type);
            return WebhookProcessResult.SuccessResult("Evento já processado");
        }

        try
        {
            switch (stripeEvent.Type)
            {
                case "customer.subscription.created":
                case "customer.subscription.updated":
                    if (stripeEvent.Data.Object is Stripe.Subscription subCreatedUpdated)
                    {
                        await _subscriptionService.UpdateSubscriptionFromStripeAsync(subCreatedUpdated);
                        _logger.LogInformation("[Webhook] Assinatura sincronizada stripeId={StripeSubId}", subCreatedUpdated.Id);
                    }
                    else
                    {
                        var subscription = JsonSerializer.Deserialize<Stripe.Subscription>(stripeEvent.Data.Object.ToString() ?? "{}");
                        if (subscription != null)
                        {
                            await _subscriptionService.UpdateSubscriptionFromStripeAsync(subscription);
                            _logger.LogInformation("[Webhook] Assinatura (deserializada) sincronizada stripeId={StripeSubId}", subscription.Id);
                        }
                    }
                    break;
                case "customer.subscription.deleted":
                    if (stripeEvent.Data.Object is Stripe.Subscription subDeleted)
                    {
                        await _subscriptionService.HandleSubscriptionDeletedAsync(subDeleted.Id);
                        _logger.LogInformation("[Webhook] Assinatura marcada cancelada stripeId={StripeSubId}", subDeleted.Id);
                    }
                    break;
                case "invoice.payment_succeeded":
                    _logger.LogInformation("[Webhook] Pagamento invoice bem-sucedido id={EventId}", stripeEvent.Id);
                    break;
                case "invoice.payment_failed":
                    _logger.LogWarning("[Webhook] Pagamento invoice falhou id={EventId}", stripeEvent.Id);
                    break;
                default:
                    _logger.LogDebug("[Webhook] Evento ignorado type={Type} id={EventId}", stripeEvent.Type, stripeEvent.Id);
                    break;
            }

            await _webhookService.MarkEventAsProcessedAsync(stripeEvent.Id, stripeEvent.Type, stripeEvent.Data.Object);
            return WebhookProcessResult.SuccessResult("Webhook processado");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Webhook] Erro no processamento type={Type} id={EventId}", stripeEvent.Type, stripeEvent.Id);
            return WebhookProcessResult.Failure("Erro interno ao processar webhook");
        }
    }
}

public record WebhookProcessResult(bool Success, string Message)
{
    public static WebhookProcessResult SuccessResult(string message) => new(true, message);
    public static WebhookProcessResult Failure(string message) => new(false, message);
}
