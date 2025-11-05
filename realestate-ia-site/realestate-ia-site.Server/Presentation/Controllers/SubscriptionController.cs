using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Payments;
using realestate_ia_site.Server.Application.Payments.DTOs;
using realestate_ia_site.Server.Infrastructure.Payments;
using AppSubscriptionDto = realestate_ia_site.Server.Application.Payments.DTOs.SubscriptionDto;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("PaymentPolicy")]
    public class SubscriptionController : ControllerBase
    {
        private readonly SubscriptionApplicationService _appService;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(
            SubscriptionApplicationService appService,
            ILogger<SubscriptionController> logger)
        {
            _appService = appService;
            _logger = logger;
        }

        private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpPost("create")]
        public async Task<ActionResult<SubscriptionResult>> CreateSubscription([FromBody] CreateSubscriptionRequest request, CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");

            // Mapear planId para priceId do Stripe
            try
            {
                var priceId = StripePriceMapping.GetPriceId(request.PlanId);
                _logger.LogInformation("[Subscription] Create user={UserId} plan={PlanId} price={PriceId}", userId, request.PlanId, priceId);
                var result = await _appService.CreateAsync(userId, priceId);
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("[Subscription] Invalid plan: {Message}", ex.Message);
                return BadRequest(new SubscriptionResult { Success = false, Error = ex.Message });
            }
        }

        [HttpPut("update")]
        public async Task<ActionResult<SubscriptionResult>> UpdateSubscription([FromBody] UpdateSubscriptionRequest request, CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");
            _logger.LogInformation("[Subscription] Update user={UserId} newPrice={PriceId}", userId, request.NewPriceId);
            var result = await _appService.UpdateAsync(userId, request.NewPriceId);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("cancel")]
        public async Task<ActionResult<SubscriptionResult>> CancelSubscription([FromBody] CancelSubscriptionRequest? request, CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");
            _logger.LogInformation("[Subscription] Cancel user={UserId} reason={Reason}", userId, request?.Reason);
            var result = await _appService.CancelAsync(userId, request?.Reason, request?.Comment);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet("current")]
        public async Task<ActionResult<AppSubscriptionDto?>> GetCurrentSubscription(CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");
            var subscription = await _appService.GetActiveAsync(userId);
            return Ok(subscription == null ? null : AppSubscriptionDto.FromDomain(subscription));
        }

        [HttpGet("history")]
        public async Task<ActionResult<List<AppSubscriptionDto>>> GetSubscriptionHistory(CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");
            var subs = await _appService.GetHistoryAsync(userId);
            return Ok(subs.Select(AppSubscriptionDto.FromDomain).ToList());
        }

        [HttpGet("status")]
        public async Task<ActionResult<object>> GetSubscriptionStatus(CancellationToken ct)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized("Usuário não identificado");
            var hasActive = await _appService.HasActiveAsync(userId);
            return Ok(new { hasActiveSubscription = hasActive });
        }
    }
}
