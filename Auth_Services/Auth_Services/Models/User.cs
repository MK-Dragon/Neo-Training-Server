namespace Auth_Services.Models
{
    public class User
    {
        public int Id { get; set; } = 0;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string Token { get; set; } = "";
        public DateTime? CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ExpiresAt { get; set; } = DateTime.Now.AddHours(1);
    }
}
