namespace Auth_Services.ModelRequests
{
    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Password { get; set; } = "";
        public string Email { get; set; }
        public DateTime BirthDate { get; set; }
        public string Role { get; set; }
    }
}
