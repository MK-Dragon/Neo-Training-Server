namespace Auth_Services.DTOs
{
    public class StudentInTurmaDTO
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public int UserIsDeleted { get; set; }      // From users table
        public int EnrollmentIsDeleted { get; set; } // From enrollments table
    }
}
