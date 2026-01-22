using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;

namespace Auth_Services.Models
{
    public class User
    {
        public int Id { get; set; } = 0;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string Email { get; set; } = "";
        [DataType(DataType.Date)] // Tells the UI/Framework to treat this as Date only
        public DateTime BirthDate { get; set; }
        public int RoleId { get; set; }
        public string Role { get; set; } = "";
        public int Activated { get; set; } = 0;
        public int IsDeleted { get; set; } = 0;

        // OAuth related properties
        public string? Provider { get; set; }
        public string? ProviderKey { get; set; }

        // Token related properties
        public string Token { get; set; } = "";
        public DateTime? CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ExpiresAt { get; set; } = DateTime.Now.AddHours(1);
    }
}
