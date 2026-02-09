namespace Auth_Services.DTOs
{
    public class StudentProfileDTO
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public int? TurmaId { get; set; }
        public string TurmaName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string CourseName { get; set; }
        public int Duration { get; set; }
        public string Level { get; set; }
    }
}
