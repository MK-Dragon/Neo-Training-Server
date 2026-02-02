namespace Auth_Services.DTOs
{
    public class NewTurma
    {
        public string TurmaName { get; set; }
        public int CourseId { get; set; }
        public DateTime? DateStart { get; set; } // Added
        public DateTime? DateEnd { get; set; }   // Added
    }
}
