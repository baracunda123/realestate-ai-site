using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.Application.Payments;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WebhookController : ControllerBase
    {
        private readonly PaymentWebhookHandler _handler;
        private readonly ILogger<WebhookController> _logger;

        public WebhookController(PaymentWebhookHandler handler, ILogger<WebhookController> logger)
        {
            _handler = handler;
            _logger = logger;
        }

        [HttpPost("stripe")]
        public async Task<ActionResult<WebhookProcessResult>> HandleStripeWebhook(CancellationToken cancellationToken)
        {
            try
            {
                var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
                var signature = Request.Headers["Stripe-Signature"].ToString();
                if (string.IsNullOrWhiteSpace(signature))
                {
                    return BadRequest(WebhookProcessResult.Failure("Assinatura Stripe obrigatória"));
                }

                var result = await _handler.HandleAsync(json, signature, cancellationToken);
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao processar webhook Stripe");
                return StatusCode(500, WebhookProcessResult.Failure("Erro interno"));
            }
        }
    }
}