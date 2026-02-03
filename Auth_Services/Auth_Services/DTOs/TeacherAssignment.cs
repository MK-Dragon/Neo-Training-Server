namespace Auth_Services.DTOs
{
    public class TeacherAssignment
    {
        public int TurmaId { get; set; }
        public string TurmaName { get; set; }
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int HoursCompleted { get; set; }
        public int TotalDuration { get; set; }
        public int IsCompleted { get; set; }
    }
}
