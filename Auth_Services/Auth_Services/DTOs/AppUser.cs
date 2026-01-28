using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;

namespace Auth_Services.DTOs
{
    public class AppUser
    {
        // User Identification
        public int Id { get; set; } = 0;
        public string Username { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
        public int IsDeleted { get; set; } = 0; // Soft delete flag for Admin use


        // General Information about User
        [DataType(DataType.Date)] // Tells the UI/Framework to treat this as Date only
        public DateTime BirthDate { get; set; }


        // for specific use ONLY (e.g., during updates)
        public int Activated { get; set; } = 0;
        public string OldPasswordHash { get; set; } = "";
        public string NewPasswordHash { get; set; } = "";
    }
}
