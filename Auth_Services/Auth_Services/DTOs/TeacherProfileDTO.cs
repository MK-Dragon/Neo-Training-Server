namespace Auth_Services.DTOs
{
    public class TeacherProfileDTO
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public int ClassesTaughtCount { get; set; }
    }
}
 