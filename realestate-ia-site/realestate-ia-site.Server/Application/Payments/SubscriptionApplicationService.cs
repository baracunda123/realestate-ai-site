using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models; 

namespace realestate_ia_site.Server.Application.Payments;

public class SubscriptionApplicationService
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ILogger<SubscriptionApplicationService> _logger;

    public SubscriptionApplicationService(ISubscriptionService subscriptionService, ILogger<SubscriptionApplicationService> logger)
    {
        _subscriptionService = subscriptionService;
        _logger = logger;
    }

    public Task<SubscriptionResult> CreateAsync(string userId, string priceId) => _subscriptionService.CreateSubscriptionAsync(userId, priceId);
    public Task<SubscriptionResult> UpdateAsync(string userId, string newPriceId) => _subscriptionService.UpdateSubscriptionAsync(userId, newPriceId);
    public Task<SubscriptionResult> CancelAsync(string userId, string? reason, string? comment) => _subscriptionService.CancelSubscriptionAsync(userId, reason, comment);
    public Task<Subscription?> GetActiveAsync(string userId) => _subscriptionService.GetActiveSubscriptionAsync(userId);
    public Task<List<Subscription>> GetHistoryAsync(string userId) => _subscriptionService.GetUserSubscriptionsAsync(userId);
    public Task<bool> HasActiveAsync(string userId) => _subscriptionService.HasActiveSubscriptionAsync(userId);
}
