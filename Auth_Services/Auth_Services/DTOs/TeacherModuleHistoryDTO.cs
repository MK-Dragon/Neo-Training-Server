namespace Auth_Services.DTOs
{
    public class TeacherModuleHistoryDTO
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int CourseId { get; set; }
        public string CourseName { get; set; }
        public int HoursTaught { get; set; }
    }
}
