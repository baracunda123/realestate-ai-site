using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Stripe;
using Stripe.Checkout;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Infrastructure.Configurations;
using realestate_ia_site.Server.Application.Common.Interfaces; // use abstraction

namespace realestate_ia_site.Server.Infrastructure.Payments
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly IApplicationDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly StripeOptions _stripeOptions;
        private readonly ILogger<SubscriptionService> _logger;

        private readonly CustomerService _customerService;
        private readonly SessionService _sessionService;
        private readonly Stripe.SubscriptionService _subscriptionService;

        public SubscriptionService(
            IApplicationDbContext context,
            UserManager<User> userManager,
            StripeOptions stripeOptions,
            ILogger<SubscriptionService> logger)
        {
            _context = context;
            _userManager = userManager;
            _stripeOptions = stripeOptions;
            _logger = logger;

            _customerService = new CustomerService();
            _sessionService = new SessionService();
            _subscriptionService = new Stripe.SubscriptionService();
        }

        public async Task<SubscriptionResult> CreateSubscriptionAsync(string userId, string priceId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return new SubscriptionResult { Success = false, Error = "Utilizador não encontrado" };
                }

                var existingSubscription = await GetActiveSubscriptionAsync(userId);
                if (existingSubscription != null)
                {
                    return new SubscriptionResult { Success = false, Error = "Utilizador já possui uma assinatura ativa" };
                }

                string customerId;
                if (string.IsNullOrEmpty(user.UserId))
                {
                    var customer = await _customerService.CreateAsync(new CustomerCreateOptions
                    {
                        Email = user.Email!,
                        Name = user.Name
                    });
                    customerId = customer.Id;
                    user.UserId = customerId;
                    await _userManager.UpdateAsync(user);
                }
                else
                {
                    customerId = user.UserId;
                }

                var session = await _sessionService.CreateAsync(new SessionCreateOptions
                {
                    PaymentMethodTypes = new List<string> { "card" },
                    LineItems = new List<SessionLineItemOptions>
                    {
                        new SessionLineItemOptions
                        {
                            Price = priceId,
                            Quantity = 1,
                        },
                    },
                    Mode = "subscription",
                    ClientReferenceId = userId,
                    Metadata = new Dictionary<string, string>
                    {
                        { "user_id", userId },
                        { "price_id", priceId }
                    }
                });

                _logger.LogInformation("[Subscription] Checkout session criada: session={SessionId} utilizador={UserId}", session.Id, userId);

                return new SubscriptionResult
                {
                    Success = true,
                    Message = "Sessão de checkout criada com sucesso",
                    CheckoutUrl = session.Url,
                    CustomerId = customerId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Subscription] Erro ao criar assinatura utilizador={UserId}", userId);
                return new SubscriptionResult { Success = false, Error = "Erro interno do servidor" };
            }
        }

        public async Task<SubscriptionResult> UpdateSubscriptionAsync(string userId, string newPriceId)
        {
            try
            {
                var subscription = await GetActiveSubscriptionAsync(userId);
                if (subscription == null)
                {
                    return new SubscriptionResult { Success = false, Error = "Nenhuma assinatura ativa encontrada" };
                }

                var updatedSubscription = await _subscriptionService.UpdateAsync(subscription.StripeId!, new SubscriptionUpdateOptions
                {
                    Items = new List<SubscriptionItemOptions>
                    {
                        new SubscriptionItemOptions
                        {
                            Id = subscription.StripeId,
                            Price = newPriceId,
                        },
                    },
                    ProrationBehavior = "always_invoice",
                });

                await UpdateSubscriptionFromStripeAsync(updatedSubscription);

                _logger.LogInformation("[Subscription] Assinatura atualizada stripeId={StripeSubId} utilizador={UserId}", updatedSubscription.Id, userId);
                return new SubscriptionResult
                {
                    Success = true,
                    Message = "Assinatura atualizada com sucesso",
                    SubscriptionId = updatedSubscription.Id
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Subscription] Erro ao atualizar assinatura utilizador={UserId}", userId);
                return new SubscriptionResult { Success = false, Error = "Erro interno do servidor" };
            }
        }

        public async Task<SubscriptionResult> CancelSubscriptionAsync(string userId, string? reason = null, string? comment = null)
        {
            try
            {
                var subscription = await GetActiveSubscriptionAsync(userId);
                if (subscription == null)
                {
                    return new SubscriptionResult { Success = false, Error = "Nenhuma assinatura ativa encontrada" };
                }

                var canceledSubscription = await _subscriptionService.UpdateAsync(subscription.StripeId!, new SubscriptionUpdateOptions
                {
                    CancelAtPeriodEnd = true,
                });

                subscription.Status = canceledSubscription.Status;
                subscription.CancelAtPeriodEnd = canceledSubscription.CancelAtPeriodEnd;
                subscription.CustomerCancellationReason = reason;
                subscription.CustomerCancellationComment = comment;
                subscription.UpdatedAt = DateTime.UtcNow;

                _context.Subscriptions.Update(subscription);
                await _context.SaveChangesAsync();

                _logger.LogInformation("[Subscription] Cancelamento agendado stripeId={StripeSubId} utilizador={UserId} periodEnd={PeriodEnd} reason={Reason}",
                    canceledSubscription.Id,
                    userId,
                    canceledSubscription.CancelAtPeriodEnd,
                    reason ?? "-");
                return new SubscriptionResult { Success = true, Message = "Assinatura cancelada com sucesso" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Subscription] Erro ao cancelar assinatura utilizador={UserId}", userId);
                return new SubscriptionResult { Success = false, Error = "Erro interno do servidor" };
            }
        }

        public async Task<Domain.Entities.Subscription?> GetActiveSubscriptionAsync(string userId)
        {
            return await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId &&
                    (s.Status == "active" || s.Status == "trialing"));
        }

        public async Task<List<Domain.Entities.Subscription>> GetUserSubscriptionsAsync(string userId)
        {
            return await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> HasActiveSubscriptionAsync(string userId)
        {
            return await GetActiveSubscriptionAsync(userId) != null;
        }

        public async Task UpdateSubscriptionFromStripeAsync(Stripe.Subscription stripeSubscription)
        {
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeId == stripeSubscription.Id);

            if (subscription == null)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == stripeSubscription.CustomerId);
                if (user == null) return;

                subscription = new Domain.Entities.Subscription
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = user.Id,
                    StripeId = stripeSubscription.Id,
                    CustomerId = stripeSubscription.CustomerId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Subscriptions.Add(subscription);
                _logger.LogInformation("[Subscription] Nova assinatura registada stripeId={StripeSubId} utilizador={UserId}", stripeSubscription.Id, user.Id);
            }

            long? ToEpoch(DateTime? dt)
            {
                if (!dt.HasValue) return null;
                var specified = DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc);
                return new DateTimeOffset(specified).ToUnixTimeSeconds();
            }

            subscription.Status = stripeSubscription.Status;
            subscription.PriceId = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Id;
            subscription.StripePriceId = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Id;
            subscription.Currency = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Currency;
            subscription.Interval = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Recurring?.Interval;
            subscription.Amount = stripeSubscription.Items.Data.FirstOrDefault()?.Price.UnitAmount;
            subscription.StartedAt = ToEpoch(stripeSubscription.StartDate);
            subscription.EndedAt = ToEpoch(stripeSubscription.EndedAt);
            subscription.CanceledAt = ToEpoch(stripeSubscription.CanceledAt);
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogDebug("[Subscription] Sincronizada assinatura stripeId={StripeSubId} status={Status}", stripeSubscription.Id, subscription.Status);
        }

        public async Task HandleSubscriptionDeletedAsync(string subscriptionId)
        {
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeId == subscriptionId);

            if (subscription != null)
            {
                subscription.Status = "canceled";
                subscription.EndedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                subscription.UpdatedAt = DateTime.UtcNow;

                _context.Subscriptions.Update(subscription);
                await _context.SaveChangesAsync();
                _logger.LogInformation("[Subscription] Assinatura marcada como cancelada stripeId={StripeSubId}", subscriptionId);
            }
        }
    }
}