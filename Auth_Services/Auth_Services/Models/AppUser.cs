using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;

namespace Auth_Services.Models
{
    public class AppUser
    {
        public int Id { get; set; } = 0;
        public string Username { get; set; } = "";
        public string Email { get; set; } = "";
        [DataType(DataType.Date)] // Tells the UI/Framework to treat this as Date only
        public DateTime BirthDate { get; set; }
        public string Role { get; set; } = "";
        public int Activated { get; set; } = 0;

        public string OldPasswordHash { get; set; } = "";
        public string NewPasswordHash { get; set; } = "";
    }
}
