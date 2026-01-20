using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;

namespace Auth_Services.Models
{
    public class UserProfile // Rip??
    {
        public int Id { get; set; } = 0;
        public string Username { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";


        [DataType(DataType.Date)] // Tells the UI/Framework to treat this as Date only
        public DateTime BirthDate { get; set; }

        // Additional profile fields can be added here

    }
}
