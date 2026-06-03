namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class AuthResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string[]? Errors { get; set; }
        public TokenResponse? Token { get; set; }
        public UserProfile? User { get; set; }

        public static AuthResult SuccessResult(TokenResponse token, UserProfile user, string message = "")
        {
            return new AuthResult
            {
                Success = true,
                Message = message,
                Token = token,
                User = user
            };
        }

        public static AuthResult ErrorResult(params string[] errors)
        {
            return new AuthResult
            {
                Success = false,
                Errors = errors
            };
        }
    }
}
