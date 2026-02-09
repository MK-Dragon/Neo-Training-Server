namespace Auth_Services.Controllers
{
    public class TeacherProfileDTO
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public int ClassesTaughtCount { get; set; }
    }
}
 