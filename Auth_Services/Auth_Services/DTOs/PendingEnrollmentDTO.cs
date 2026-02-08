namespace Auth_Services.DTOs
{
    public class PendingEnrollmentDTO
    {
        public int PreEnrollId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; }
        public string StudentEmail { get; set; }
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public string CourseName { get; set; }
        public DateTime? StartDate { get; set; }
    }
}
