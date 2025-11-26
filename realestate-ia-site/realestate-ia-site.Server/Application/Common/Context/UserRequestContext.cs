using realestate_ia_site.Server.Application.Features.Properties.Feedback;

namespace realestate_ia_site.Server.Application.Common.Context
{
    /// <summary>
    /// Contexto do request atual. Scoped service que mantém informação
    /// do utilizador durante todo o request sem precisar passar por parâmetro.
    /// </summary>
    public class UserRequestContext
    {
        public string UserPlan { get; set; } = "free";
        public string? UserId { get; set; }
        public string? SessionId { get; set; }
        public string? CurrentQuery { get; set; }
        
        /// <summary>
        /// Preferências do utilizador extraídas dos favoritos (para scoring)
        /// </summary>
        public PropertyPreferencePattern? UserPreferences { get; set; }
        
        public bool IsPremium => UserPlan == "premium";
    }
}
