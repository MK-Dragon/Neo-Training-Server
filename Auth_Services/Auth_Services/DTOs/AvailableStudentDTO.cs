namespace Auth_Services.DTOs
{
    public class AvailableStudentDTO
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime? BirthDate { get; set; }
    }
}
