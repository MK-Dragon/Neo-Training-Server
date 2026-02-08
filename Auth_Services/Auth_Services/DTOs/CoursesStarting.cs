namespace Auth_Services.DTOs
{
    public class CoursesStarting
    {
        public int TurmaId { get; set; }
        public int CourseId { get; set; }
        public string CourseName { get; set; }
        public int durationInHours { get; set; }
        public string Level { get; set; }
        public DateTime? DateStart { get; set; }
    }
}
