using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;

namespace realestate_ia_site.Server.Application.Features.Payments.Interfaces
{
    public interface ISubscriptionService
    {
        Task<SubscriptionResult> CreateSubscriptionAsync(string userId, string priceId);
        Task<SubscriptionResult> UpdateSubscriptionAsync(string userId, string newPriceId);
        Task<SubscriptionResult> CancelSubscriptionAsync(string userId, string? reason = null, string? comment = null);
        Task<Subscription?> GetActiveSubscriptionAsync(string userId);
        Task<List<Subscription>> GetUserSubscriptionsAsync(string userId);
        Task<bool> HasActiveSubscriptionAsync(string userId);
        Task UpdateSubscriptionFromStripeAsync(Stripe.Subscription stripeSubscription);
        Task HandleSubscriptionDeletedAsync(string subscriptionId);
    }
}

