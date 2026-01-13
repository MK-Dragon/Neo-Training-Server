namespace Auth_Services.ModelRequests
{
    public class ValidateTokenRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
