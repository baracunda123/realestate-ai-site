namespace realestate_ia_site.Server.Infrastructure.Configurations
{
    // Renomeado de StripeConfiguration para StripeOptions para evitar conflito com Stripe.StripeConfiguration (classe estática do SDK)
    public class StripeOptions
    {
        private readonly ILogger<StripeOptions> _logger;
        public string PublishableKey { get; }
        public string SecretKey { get; }
        public string WebhookSecret { get; }
        public string SuccessUrl { get; }
        public string CancelUrl { get; }

        public StripeOptions(IConfiguration config, ILogger<StripeOptions> logger)
        {
            _logger = logger;
            SecretKey = config["Stripe:SecretKey"] ?? throw new InvalidOperationException("Stripe Secret Key não configurada");
            PublishableKey = config["Stripe:PublishableKey"] ?? throw new InvalidOperationException("Stripe Publishable Key não configurada");
            WebhookSecret = config["Stripe:WebhookSecret"] ?? throw new InvalidOperationException("Stripe Webhook Secret não configurada");
            
            // URLs de redirecionamento (com fallback para desenvolvimento)
            SuccessUrl = config["Stripe:SuccessUrl"] ?? "http://localhost:64222/subscription/success?session_id={CHECKOUT_SESSION_ID}";
            CancelUrl = config["Stripe:CancelUrl"] ?? "http://localhost:64222/subscription/cancel";
            
            Stripe.StripeConfiguration.ApiKey = SecretKey;
            _logger.LogInformation("Stripe configurado com sucesso - SuccessUrl: {SuccessUrl}, CancelUrl: {CancelUrl}", SuccessUrl, CancelUrl);
        }
    }
}
