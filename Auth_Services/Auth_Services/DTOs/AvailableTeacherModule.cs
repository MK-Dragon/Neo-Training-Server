namespace Auth_Services.DTOs
{
    public class AvailableTeacherModule
    {
        public int TeacherId { get; set; }
        public string TeacherName { get; set; }

        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int OrderIndex { get; set; }
        public int HoursCompleted { get; set; }
        public int TotalDuration { get; set; }
    }
}
