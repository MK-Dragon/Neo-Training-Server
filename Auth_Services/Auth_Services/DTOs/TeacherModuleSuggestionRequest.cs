namespace Auth_Services.DTOs
{
    public class TeacherModuleSuggestionRequest
    {
        public int TurmaId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }
}
