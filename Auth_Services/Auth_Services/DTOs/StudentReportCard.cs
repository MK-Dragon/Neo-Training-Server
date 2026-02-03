namespace Auth_Services.DTOs
{
    public class StudentReportCard
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public int? Grade { get; set; }
        public int IsCompleted { get; set; }
    }
}
