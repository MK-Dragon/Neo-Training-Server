namespace Auth_Services.DTOs
{
    public class TurmaToEnrollStudents
    {
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int CourseId { get; set; }
        public string CourseName { get; set; }
        public int StudentCount { get; set; }
    }
}
