namespace Auth_Services.DTOs
{
    public class TurmaDTO
    {
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public int CourseId { get; set; }
        public string CourseName { get; set; }
        public int isDeleted { get; set; }
        public DateTime? DateStart { get; set; } // Added
        public DateTime? DateEnd { get; set; }   // Added
    }
}
